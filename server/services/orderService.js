import db from '../../database/connection.js';
import pricingService from './pricingService.js';
import whatsAppService from '../integrations/whatsapp/WhatsAppService.js';
import razorpayService from '../integrations/razorpay/RazorpayService.js';

class OrderService {
  /**
   * Create an Order atomically in a Database Transaction
   * Used by BOTH Online checkout and In-House POS!
   */
  async createOrder({
    userId,
    items,
    couponCode = null,
    useBonus = false,
    areaId = null,
    subAreaId = null,
    deliverySlotId = null,
    deliveryAddress = '',
    landmark = '',
    pincode = '',
    paymentMethod = 'COD',
    notificationPhone = null,
    notes = '',
    source = 'ONLINE', // 'ONLINE', 'IN_HOUSE', 'ADMIN'
    createdBy = null,
  }) {
    // 1. Run Pricing Engine
    const calculation = await pricingService.calculateOrder({
      items,
      userId,
      couponCode,
      useBonus,
      areaId,
      subAreaId,
      source,
    });

    // 2. Fetch User & Notification Details
    const customer = await db.get('SELECT id, name, mobile FROM users WHERE id = ?', [userId]);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
    const initialOrderStatus = paymentMethod === 'COD' || source === 'IN_HOUSE' ? 'CONFIRMED' : 'PENDING';
    const initialPaymentStatus = paymentMethod === 'COD'
      ? 'COD_PENDING_COLLECTION'
      : (source === 'IN_HOUSE' && (paymentMethod === 'CASH' || paymentMethod === 'CARD' || paymentMethod === 'UPI') ? 'PAID' : 'PENDING');

    // 3. Atomic Database Transaction
    const result = await db.transaction(async (tx) => {
      // Re-verify stock inside transaction
      for (const item of calculation.items) {
        const prod = await tx.get('SELECT id, stock, name FROM products WHERE id = ?', [item.product_id]);
        if (!prod || prod.stock < item.quantity) {
          throw new Error(`Insufficient stock for "${item.product_name}" during order placement`);
        }
      }

      // Insert Order record
      const orderRes = await tx.run(
        `INSERT INTO orders (
          order_number, user_id, source, area_id, sub_area_id, delivery_slot_id,
          delivery_address, landmark, pincode, subtotal, membership_discount,
          coupon_discount, bonus_discount, delivery_charge, tax, grand_total,
          payment_method, payment_status, order_status, notification_phone, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderNumber,
          userId,
          source,
          areaId,
          subAreaId,
          deliverySlotId,
          deliveryAddress,
          landmark,
          pincode,
          calculation.subtotal,
          calculation.membership_discount,
          calculation.coupon_discount,
          calculation.bonus_discount,
          calculation.delivery_charge,
          calculation.tax,
          calculation.grand_total,
          paymentMethod,
          initialPaymentStatus,
          initialOrderStatus,
          notificationPhone || null,
          notes || '',
          createdBy || userId,
        ]
      );

      const orderId = orderRes.lastInsertRowid;

      // Insert Order Items and Update Inventory
      for (const item of calculation.items) {
        await tx.run(
          `INSERT INTO order_items (
            order_id, product_id, product_code, product_name, quantity, unit,
            original_price, selling_price, applied_price, discount, tax, total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            item.product_id,
            item.product_code,
            item.product_name,
            item.quantity,
            item.unit,
            item.original_price,
            item.selling_price,
            item.applied_price,
            item.discount,
            item.tax,
            item.total,
          ]
        );

        // Deduct Inventory Ledger & Product stock
        const currentProd = await tx.get('SELECT stock FROM products WHERE id = ?', [item.product_id]);
        const previousStock = currentProd.stock;
        const newStock = previousStock - item.quantity;

        await tx.run('UPDATE products SET stock = ? WHERE id = ?', [newStock, item.product_id]);

        await tx.run(
          `INSERT INTO inventory_transactions (
            product_id, type, quantity, previous_stock, new_stock,
            reference_type, reference_id, user_id, note
          ) VALUES (?, 'ORDER', ?, ?, ?, 'ORDER', ?, ?, ?)`,
          [
            item.product_id,
            item.quantity,
            previousStock,
            newStock,
            String(orderId),
            createdBy || userId,
            `Deduction for Order #${orderNumber}`,
          ]
        );
      }

      // Record Coupon Usage if coupon was applied
      if (calculation.applied_coupon) {
        await tx.run(
          `INSERT INTO coupon_usages (coupon_id, user_id, order_id, discount_amount)
           VALUES (?, ?, ?, ?)`,
          [calculation.applied_coupon.id, userId, orderId, calculation.coupon_discount]
        );
      }

      // Record Welcome Bonus Redemption if bonus was applied
      if (calculation.bonus_discount > 0) {
        await tx.run(
          `INSERT INTO customer_bonus_transactions (
            user_id, type, amount, reference_type, reference_id, status, description
          ) VALUES (?, 'REDEMPTION', ?, 'ORDER', ?, 'COMPLETED', ?)`,
          [
            userId,
            calculation.bonus_discount,
            String(orderId),
            `Redeemed on Order #${orderNumber}`,
          ]
        );
      }

      // Record Initial Payment
      const payRes = await tx.run(
        `INSERT INTO payments (order_id, transaction_ref, payment_method, amount, currency, status)
         VALUES (?, ?, ?, ?, 'INR', ?)`,
        [orderId, `PAY-${orderNumber}`, paymentMethod, calculation.grand_total, initialPaymentStatus]
      );
      const paymentId = payRes.lastInsertRowid;

      // Record Status History
      await tx.run(
        `INSERT INTO order_status_history (
          order_id, previous_status, old_status, new_status,
          changed_by, changed_by_role, notes, note
        ) VALUES (?, NULL, NULL, ?, ?, 'System', 'Order created', 'Order created')`,
        [orderId, initialOrderStatus, createdBy || userId]
      );

      // Clear customer's cart if exists
      const userCart = await tx.get('SELECT id FROM carts WHERE user_id = ?', [userId]);
      if (userCart) {
        await tx.run('DELETE FROM cart_items WHERE cart_id = ?', [userCart.id]);
      }

      return {
        orderId,
        orderNumber,
        paymentId,
        grandTotal: calculation.grand_total,
      };
    });

    // 4. Razorpay Order Generation if paymentMethod === 'RAZORPAY'
    let razorpayOrder = null;
    if (paymentMethod === 'RAZORPAY' && result.grandTotal > 0) {
      razorpayOrder = await razorpayService.createOrder({
        amount: result.grandTotal,
        receipt: result.orderNumber,
        notes: {
          order_id: String(result.orderId),
          user_id: String(userId),
        },
      });
      // Update payment record with razorpay order ID
      await db.run(
        'UPDATE payments SET transaction_ref = ?, gateway_response = ? WHERE id = ?',
        [razorpayOrder.id, JSON.stringify(razorpayOrder), result.paymentId]
      );
    }

    // 5. Asynchronous WhatsApp Notifications
    this.sendOrderNotificationsAsync({
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      userId,
      customerName: customer.name,
      customerPhone: customer.mobile,
      notificationPhone,
      source,
      grandTotal: calculation.grand_total,
      paymentMethod,
      areaName: calculation.area?.name || 'In-Store',
      subAreaName: calculation.sub_area?.name || 'Walk-in',
    });

    return {
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      calculation,
      razorpayOrder,
    };
  }

  /**
   * Trigger WhatsApp notifications asynchronously
   */
  async sendOrderNotificationsAsync({
    orderId,
    orderNumber,
    userId,
    customerName,
    customerPhone,
    notificationPhone,
    source,
    grandTotal,
    paymentMethod,
    areaName,
    subAreaName,
  }) {
    try {
      // 1. Resolve Customer Recipient (assigned notification phone has priority if valid, else customer mobile)
      const recipientPhone = notificationPhone && notificationPhone.length >= 10 ? notificationPhone : customerPhone;

      // Customer Notification
      await whatsAppService.send({
        recipient: recipientPhone,
        templateKey: 'orders.placed',
        variables: {
          customer_name: customerName,
          order_number: orderNumber,
          grand_total: grandTotal,
          payment_method: paymentMethod,
        },
        userId,
        orderId,
      });

      // 2. Admin WhatsApp Notifications (to all active configured recipient numbers)
      const adminPhones = new Set();
      const recipientsSetting = await db.get("SELECT value FROM store_settings WHERE key = 'order_notification_recipients'");
      if (recipientsSetting?.value) {
        try {
          const parsed = JSON.parse(recipientsSetting.value);
          if (Array.isArray(parsed)) {
            parsed
              .filter(r => r.active !== false && r.mobile)
              .forEach(r => adminPhones.add(String(r.mobile).replace(/[^0-9]/g, '')));
          }
        } catch (e) {
          console.warn('[OrderService] Could not parse order_notification_recipients:', e.message);
        }
      }

      // Fallback to legacy single admin number if no list is configured
      if (adminPhones.size === 0) {
        const legacyAdminSetting = await db.get("SELECT value FROM store_settings WHERE key = 'admin_whatsapp_number'");
        if (legacyAdminSetting?.value) {
          adminPhones.add(String(legacyAdminSetting.value).replace(/[^0-9]/g, ''));
        }
      }

      for (const adminPhone of adminPhones) {
        if (!adminPhone) continue;
        await whatsAppService.send({
          recipient: adminPhone,
          templateKey: 'admin.new_order',
          variables: {
            source,
            order_number: orderNumber,
            grand_total: grandTotal,
            customer_name: customerName,
            customer_phone: customerPhone,
            delivery_area: areaName,
            delivery_sub_area: subAreaName,
          },
          orderId,
        });
      }
    } catch (notifyErr) {
      console.error('[OrderService] Async notification error:', notifyErr.message);
    }
  }

  /**
   * Update Order Status & Enforce DELIVERED LOCK & Status Transition Rules
   */
  async updateOrderStatus(orderId, newStatus, changedBy = null, notes = '', deliveryStaffId = null, changedByRole = null) {
    const order = await db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      throw new Error('Order not found');
    }

    // CHECK LOCK RULE: Once locked, normal order edits cannot proceed
    if (order.locked_at) {
      throw new Error(`Order #${order.order_number} is locked (Delivered) and cannot be modified.`);
    }

    const previousStatus = order.order_status;
    if (previousStatus === newStatus) return order;

    // Strict Status Transition Rules
    const VALID_TRANSITIONS = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['READY', 'OUT_FOR_DELIVERY', 'CANCELLED'],
      READY: ['OUT_FOR_DELIVERY', 'CANCELLED'],
      OUT_FOR_DELIVERY: ['DELIVERED', 'RETURNED', 'CANCELLED'],
      DELIVERED: [], // Immutable locked
      CANCELLED: [],
      RETURNED: [],
    };

    const allowed = VALID_TRANSITIONS[previousStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Invalid status transition from "${previousStatus}" to "${newStatus}". Allowed next status: ${
          allowed.length > 0 ? allowed.join(', ') : 'None (Terminal state)'
        }`
      );
    }

    // Resolve changed_by_role
    let role = changedByRole;
    if (!role && changedBy) {
      const u = await db.get(
        `SELECT u.account_type, r.name as role_name 
         FROM users u 
         LEFT JOIN user_roles ur ON u.id = ur.user_id 
         LEFT JOIN roles r ON ur.role_id = r.id 
         WHERE u.id = ? LIMIT 1`,
        [changedBy]
      );
      role = u?.role_name || (u?.account_type === 'INTERNAL' ? 'Staff' : 'Customer') || 'Admin';
    }

    // Handle delivery staff assignment
    let finalDeliveryStaffId = order.delivery_staff_id;
    let finalNote = notes || '';
    if (newStatus === 'OUT_FOR_DELIVERY' && deliveryStaffId) {
      finalDeliveryStaffId = Number(deliveryStaffId);
      const delUser = await db.get('SELECT name FROM users WHERE id = ?', [finalDeliveryStaffId]);
      if (delUser) {
        finalNote = finalNote
          ? `${finalNote} (Delivered By: ${delUser.name})`
          : `Delivered By: ${delUser.name}`;
      }
    }

    // Handle DELIVERED transition: LOCK THE ORDER!
    let deliveredAt = order.delivered_at;
    let lockedAt = order.locked_at;

    if (newStatus === 'DELIVERED') {
      const nowIso = new Date().toISOString();
      deliveredAt = nowIso;
      lockedAt = nowIso;
    }

    await db.transaction(async (tx) => {
      // Update order
      await tx.run(
        `UPDATE orders 
         SET order_status = ?, delivered_at = ?, locked_at = ?, delivery_staff_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [newStatus, deliveredAt, lockedAt, finalDeliveryStaffId, orderId]
      );

      // Record in status history with complete audit details
      await tx.run(
        `INSERT INTO order_status_history (
          order_id, previous_status, old_status, new_status,
          changed_by, changed_by_role, notes, note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, previousStatus, previousStatus, newStatus, changedBy, role || 'Admin', finalNote, finalNote]
      );

      // Track COD collection upon delivery
      if (newStatus === 'DELIVERED' && order.payment_method === 'COD') {
        const collectorId = finalDeliveryStaffId || changedBy;
        await tx.run(
          `UPDATE payments 
           SET status = 'COD_COLLECTED', collected_by = ?, collected_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE order_id = ?`,
          [collectorId, orderId]
        );
        await tx.run(
          `UPDATE orders SET payment_status = 'COD_COLLECTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [orderId]
        );
      }

      // Handle CANCELLED: Restore inventory & reverse welcome bonus
      if (newStatus === 'CANCELLED') {
        const items = await tx.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
        for (const item of items) {
          const prod = await tx.get('SELECT stock FROM products WHERE id = ?', [item.product_id]);
          if (prod) {
            const newStock = prod.stock + item.quantity;
            await tx.run('UPDATE products SET stock = ? WHERE id = ?', [newStock, item.product_id]);
            await tx.run(
              `INSERT INTO inventory_transactions (
                product_id, type, quantity, previous_stock, new_stock,
                reference_type, reference_id, user_id, note
              ) VALUES (?, 'CANCEL', ?, ?, ?, 'ORDER_CANCEL', ?, ?, ?)`,
              [item.product_id, item.quantity, prod.stock, newStock, String(orderId), changedBy, `Restored from cancelled Order #${order.order_number}`]
            );
          }
        }

        // Reverse bonus if redeemed
        if (order.bonus_discount > 0) {
          await tx.run(
            `INSERT INTO customer_bonus_transactions (
              user_id, type, amount, reference_type, reference_id, status, description
            ) VALUES (?, 'REVERSAL', ?, 'ORDER_CANCEL', ?, 'ACTIVE', ?)`,
            [order.user_id, order.bonus_discount, String(orderId), `Bonus reversed from cancelled Order #${order.order_number}`]
          );
        }
      }
    });

    // Send corresponding WhatsApp event
    const customer = await db.get('SELECT name, mobile FROM users WHERE id = ?', [order.user_id]);
    const recipient = order.notification_phone || customer?.mobile;
    const templateKeyMap = {
      CONFIRMED: 'orders.confirmed',
      PROCESSING: 'orders.processing',
      READY: 'orders.ready',
      OUT_FOR_DELIVERY: 'orders.out_for_delivery',
      DELIVERED: 'orders.delivered',
      CANCELLED: 'orders.cancelled',
      RETURNED: 'orders.returned',
    };

    const targetTpl = templateKeyMap[newStatus];
    if (targetTpl && recipient) {
      whatsAppService.send({
        recipient,
        templateKey: targetTpl,
        variables: {
          customer_name: customer?.name || 'Valued Customer',
          order_number: order.order_number,
          delivery_address: order.delivery_address || 'In-store',
          delivery_slot: 'Scheduled slot',
        },
        userId: order.user_id,
        orderId,
      });
    }

    return await db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
  }
}

export default new OrderService();
