import db from '../../database/connection.js';
import pricingService from './pricingService.js';
import whatsAppService from '../integrations/whatsapp/WhatsAppService.js';
import razorpayService from '../integrations/razorpay/RazorpayService.js';
import { toMySQLDateTime } from '../../src/utils/dateTime.js';

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
  const recipientPhone =
    notificationPhone &&
    String(notificationPhone).replace(/\D/g, '').length >= 10
      ? notificationPhone
      : customerPhone;

  // 1. Customer notification — independent error handling
  try {
    if (recipientPhone) {
      await whatsAppService.send({
        recipient: recipientPhone,
        templateKey: 'orders.placed',
        variables: {
          customer_name: customerName || 'Valued Customer',
          grand_total: String(grandTotal),
          store_name: 'Swastik Supermarket',
        },
        userId,
        orderId,
      });
    } else {
      console.warn('[OrderService] Customer notification skipped: no phone');
    }
  } catch (err) {
    console.error(
      '[OrderService] Customer order notification failed:',
      err.message
    );
  }

  // 2. Load configured admin recipients
  const adminPhones = new Set();

  try {
    // Use setting_key, consistent with your store_settings schema.
    const recipientsSetting = await db.get(
      'SELECT value FROM store_settings WHERE setting_key = ?',
      ['order_notification_recipients']
    );

    if (recipientsSetting?.value) {
      const parsed = JSON.parse(recipientsSetting.value);

      if (Array.isArray(parsed)) {
        for (const recipient of parsed) {
          if (recipient.active === false || !recipient.mobile) continue;

          const phone = String(recipient.mobile).replace(/\D/g, '');
          if (phone) adminPhones.add(phone);
        }
      }
    }
  } catch (err) {
    console.error(
      '[OrderService] Could not load admin recipients:',
      err.message
    );
  }

  // Legacy single-recipient fallback
  if (adminPhones.size === 0) {
    try {
      const legacySetting = await db.get(
        'SELECT value FROM store_settings WHERE setting_key = ?',
        ['admin_whatsapp_number']
      );

      if (legacySetting?.value) {
        const phone = String(legacySetting.value).replace(/\D/g, '');
        if (phone) adminPhones.add(phone);
      }
    } catch (err) {
      console.error(
        '[OrderService] Could not load legacy admin number:',
        err.message
      );
    }
  }

  // 3. Send to every admin independently
  for (const adminPhone of adminPhones) {
    try {
          await whatsAppService.send({
          recipient: adminPhone,
          templateKey: 'admin.new_order',
          variables: {
            source: paymentMethod,
            order_number: orderNumber,
            grand_total: String(grandTotal),
            customer_name: customerName || 'Valued Customer',
            customer_phone: customerPhone || 'N/A',
            delivery_area: `${areaName || 'In-Store'} - ${subAreaName || 'Walk-in'}`,
            store_name: 'Swastik Supermarket',
          },
          userId,
          orderId,
        });
    } catch (err) {
      console.error(
        `[OrderService] Admin notification failed for ${adminPhone}:`,
        err.message
      );
    }
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
      const nowIso = toMySQLDateTime();
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


  async updateOrderStatus(
  orderId,
  newStatus,
  changedBy = null,
  notes = '',
  deliveryStaffId = null,
  changedByRole = null
) {
  const VALID_STATUSES = [
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'READY',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'RETURNED',
  ];

  newStatus = String(newStatus || '').trim().toUpperCase();

  if (!VALID_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid order status: "${newStatus}"`);
  }

  const order = await db.get(
    'SELECT * FROM orders WHERE id = ?',
    [orderId]
  );

  if (!order) {
    throw new Error('Order not found');
  }

  const previousStatus = String(order.order_status || '').toUpperCase();

  if (previousStatus === newStatus) {
    return order;
  }

  // Keep delivered orders locked against further status changes.
  if (order.locked_at || previousStatus === 'DELIVERED') {
    throw new Error(
      `Order #${order.order_number} is locked (Delivered) and cannot be modified.`
    );
  }

  // Do not reopen cancelled or returned orders through normal status updates.
  if (['CANCELLED', 'RETURNED'].includes(previousStatus)) {
    throw new Error(
      `Order #${order.order_number} is ${previousStatus} and cannot be modified.`
    );
  }

  // Resolve the user's role for audit history.
  let role = changedByRole;

  if (!role && changedBy) {
    const user = await db.get(
      `SELECT u.account_type, r.name AS role_name
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.id = ?
       LIMIT 1`,
      [changedBy]
    );

    role =
      user?.role_name ||
      (user?.account_type === 'INTERNAL' ? 'Staff' : 'Customer');
  }

  role = role || 'Admin';

  // Resolve delivery staff.
  let finalDeliveryStaffId = order.delivery_staff_id;
  let finalNote = notes || '';

  if (newStatus === 'OUT_FOR_DELIVERY' && deliveryStaffId) {
    finalDeliveryStaffId = Number(deliveryStaffId);

    if (!Number.isInteger(finalDeliveryStaffId) || finalDeliveryStaffId <= 0) {
      throw new Error('Invalid delivery staff ID');
    }

    const deliveryStaff = await db.get(
      'SELECT name FROM users WHERE id = ?',
      [finalDeliveryStaffId]
    );

    if (!deliveryStaff) {
      throw new Error('Delivery staff not found');
    }

    finalNote = finalNote
      ? `${finalNote} (Delivery By: ${deliveryStaff.name})`
      : `Delivery By: ${deliveryStaff.name}`;
  }

  let deliveredAt = order.delivered_at;
  let lockedAt = order.locked_at;

  if (newStatus === 'DELIVERED') {
    const nowIso = toMySQLDateTime();
    deliveredAt = nowIso;
    lockedAt = nowIso;
  }

  // A status jump to CANCELLED must restore stock and reverse the bonus
  // only once. This method blocks further changes after cancellation.
  await db.transaction(async (tx) => {
    await tx.run(
      `UPDATE orders
       SET order_status = ?,
           delivered_at = ?,
           locked_at = ?,
           delivery_staff_id = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        newStatus,
        deliveredAt,
        lockedAt,
        finalDeliveryStaffId,
        orderId,
      ]
    );

    // Record the status transition.
    await tx.run(
      `INSERT INTO order_status_history (
        order_id,
        previous_status,
        old_status,
        new_status,
        changed_by,
        changed_by_role,
        notes,
        note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        previousStatus,
        previousStatus,
        newStatus,
        changedBy,
        role,
        finalNote,
        finalNote,
      ]
    );

    // Mark COD as collected when delivered.
    if (
      newStatus === 'DELIVERED' &&
      String(order.payment_method || '').toUpperCase() === 'COD'
    ) {
      const collectorId = finalDeliveryStaffId || changedBy;

      await tx.run(
        `UPDATE payments
         SET status = 'COD_COLLECTED',
             collected_by = ?,
             collected_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE order_id = ?`,
        [collectorId, orderId]
      );

      await tx.run(
        `UPDATE orders
         SET payment_status = 'COD_COLLECTED',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [orderId]
      );
    }

    // Restore stock and reverse bonus when cancelled.
    if (newStatus === 'CANCELLED') {
      const items = await tx.query(
        `SELECT product_id, quantity
         FROM order_items
         WHERE order_id = ?`,
        [orderId]
      );

      for (const item of items) {
        const product = await tx.get(
          'SELECT stock FROM products WHERE id = ?',
          [item.product_id]
        );

        if (product) {
          const previousStock = Number(product.stock || 0);
          const quantity = Number(item.quantity || 0);
          const updatedStock = previousStock + quantity;

          await tx.run(
            'UPDATE products SET stock = ? WHERE id = ?',
            [updatedStock, item.product_id]
          );

          await tx.run(
            `INSERT INTO inventory_transactions (
              product_id,
              type,
              quantity,
              previous_stock,
              new_stock,
              reference_type,
              reference_id,
              user_id,
              note
            ) VALUES (?, 'CANCEL', ?, ?, ?, 'ORDER_CANCEL', ?, ?, ?)`,
            [
              item.product_id,
              quantity,
              previousStock,
              updatedStock,
              String(orderId),
              changedBy,
              `Restored from cancelled Order #${order.order_number}`,
            ]
          );
        }
      }

      if (Number(order.bonus_discount || 0) > 0 && order.user_id) {
        await tx.run(
          `INSERT INTO customer_bonus_transactions (
            user_id,
            type,
            amount,
            reference_type,
            reference_id,
            status,
            description
          ) VALUES (?, 'REVERSAL', ?, 'ORDER_CANCEL', ?, 'ACTIVE', ?)`,
          [
            order.user_id,
            order.bonus_discount,
            String(orderId),
            `Bonus reversed from cancelled Order #${order.order_number}`,
          ]
        );
      }
    }
  });

  // Send WhatsApp notification after the database transaction succeeds.
  const customer = await db.get(
    'SELECT name, mobile FROM users WHERE id = ?',
    [order.user_id]
  );

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

  const targetTemplate = templateKeyMap[newStatus];

  if (targetTemplate && recipient) {
    try {
      const result = await whatsAppService.send({
        recipient,
        templateKey: targetTemplate,
        variables: {
          customer_name: customer?.name || 'Valued Customer',
          order_number: order.order_number,
          delivery_address: order.delivery_address || 'In-store',
          delivery_slot: 'Scheduled slot',
          store_name: 'Swastik Supermarket',
        },
        userId: order.user_id,
        orderId,
      });

      console.log(
        `[OrderService] WhatsApp notification accepted for order ${order.order_number}, status ${newStatus}`,
        result?.messageId || ''
      );
    } catch (err) {
      console.error(
        `[OrderService] WhatsApp notification failed for order ${order.order_number}, status ${newStatus}:`,
        err.message
      );
    }
  }

  return await db.get(
    'SELECT * FROM orders WHERE id = ?',
    [orderId]
  );
}



/**
 * Create a temporary Razorpay checkout.
 *
 * This method does NOT create an order, deduct stock, consume a coupon,
 * or redeem bonus points.
 */
 async createRazorpayCheckoutSession({
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
  notificationPhone = null,
  notes = '',
  source = 'ONLINE',
}) {
  if (String(source).toUpperCase() !== 'ONLINE') {
    throw new Error('Razorpay checkout is available only for online orders');
  }

  const customer = await db.get(
    'SELECT id, name, mobile FROM users WHERE id = ?',
    [userId]
  );

  if (!customer) {
    throw new Error('Customer not found');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Your cart is empty');
  }

  // Always calculate pricing on the server.
  const calculation = await pricingService.calculateOrder({
    items,
    userId,
    couponCode,
    useBonus,
    areaId,
    subAreaId,
    source: 'ONLINE',
  });

  const grandTotal = Number(calculation.grand_total);

  if (!Number.isFinite(grandTotal) || grandTotal <= 0) {
    throw new Error('Checkout total must be greater than zero');
  }

  if (!Array.isArray(calculation.items) || calculation.items.length === 0) {
    throw new Error('No valid checkout items were calculated');
  }

  const { randomUUID } = await import('crypto');
  const checkoutKey = randomUUID();

  // Persist the pricing snapshot before calling the payment provider.
  await db.transaction(async (tx) => {
    await tx.run(
      `INSERT INTO checkout_sessions (
        checkout_key,
        user_id,
        source,
        area_id,
        sub_area_id,
        delivery_slot_id,
        delivery_address,
        landmark,
        pincode,
        notification_phone,
        notes,
        subtotal,
        membership_discount,
        coupon_discount,
        applied_coupon_id,
        bonus_discount,
        delivery_charge,
        tax,
        grand_total,
        payment_status,
        checkout_status,
        expires_at
      ) VALUES (
        ?, ?, 'ONLINE', ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?,
        'PENDING', 'PENDING_PAYMENT',
        DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 30 MINUTE)
      )`,
      [
        checkoutKey,
        userId,
        areaId,
        subAreaId,
        deliverySlotId,
        deliveryAddress || '',
        landmark || '',
        pincode || '',
        notificationPhone || null,
        notes || '',
        calculation.subtotal,
        calculation.membership_discount,
        calculation.coupon_discount,
        calculation.applied_coupon?.id ?? null,
        calculation.bonus_discount,
        calculation.delivery_charge,
        calculation.tax,
        grandTotal,
      ]
    );

    const session = await tx.get(
      'SELECT id FROM checkout_sessions WHERE checkout_key = ?',
      [checkoutKey]
    );

    if (!session) {
      throw new Error('Unable to create checkout session');
    }

    for (const item of calculation.items) {
      await tx.run(
        `INSERT INTO checkout_items (
          checkout_id,
          product_id,
          product_code,
          product_name,
          quantity,
          unit,
          original_price,
          selling_price,
          applied_price,
          discount,
          tax,
          total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          session.id,
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
    }
  });

  try {
    const razorpayOrder = await razorpayService.createOrder({
      amount: grandTotal,
      currency: 'INR',
      receipt: `CHK-${checkoutKey.replace(/-/g, '').slice(0, 20)}`,
      notes: {
        checkout_key: checkoutKey,
        user_id: String(userId),
      },
    });

    if (!razorpayOrder?.id) {
      throw new Error('Razorpay did not return a valid order ID');
    }

      const updateResult = await db.run(
      `UPDATE checkout_sessions
          SET razorpay_order_id = ?,
              updated_at = CURRENT_TIMESTAMP
        WHERE checkout_key = ?
          AND payment_status = 'PENDING'
          AND checkout_status = 'PENDING_PAYMENT'
          AND razorpay_order_id IS NULL`,
      [razorpayOrder.id, checkoutKey]
    );

    if (updateResult.changes !== 1 && updateResult.affectedRows !== 1) {
      throw new Error('Unable to associate Razorpay order with checkout session');
    }

    return {
      checkoutKey,
      razorpayOrder: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      },
      keyId: process.env.RAZORPAY_KEY_ID,
      amount: Math.round(grandTotal * 100),
      currency: 'INR',
      customer: {
        name: customer.name || '',
        mobile: customer.mobile || '',
      },
    };
  } catch (error) {
    // Remove the temporary snapshot if provider order creation fails.
    // checkout_items are removed through the FK cascade.
    await db.run(
      `DELETE FROM checkout_sessions
        WHERE checkout_key = ?
          AND payment_status = 'PENDING'
          AND razorpay_order_id IS NULL`,
      [checkoutKey]
    ).catch((cleanupError) => {
      console.error(
        '[OrderService] Checkout cleanup failed:',
        cleanupError.message
      );
    });

    throw error;
  }
  }


/**
 * Finalize a captured Razorpay checkout exactly once.
 *
 * Called only after the controller verifies the payment with Razorpay.
 */
async finalizePaidCheckout({
  checkoutKey,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature = null,
}) {
  if (!checkoutKey || !razorpayOrderId || !razorpayPaymentId) {
    throw new Error('Missing checkout or payment identifiers');
  }

  const result = await db.transaction(async (tx) => {
    // Lock the session to serialize simultaneous browser and webhook calls.
    const session = await tx.get(
      `SELECT *
         FROM checkout_sessions
        WHERE checkout_key = ?
        FOR UPDATE`,
      [checkoutKey]
    );

    if (!session) {
      throw new Error('Checkout session not found');
    }

    if (session.razorpay_order_id !== razorpayOrderId) {
      throw new Error('Razorpay order does not match the checkout session');
    }

    // Idempotency: return the order already created for this checkout.
    if (session.order_id && session.payment_status === 'PAID') {
      const existingOrder = await tx.get(
        'SELECT * FROM orders WHERE id = ?',
        [session.order_id]
      );

      if (!existingOrder) {
        throw new Error('Finalized checkout has no associated order');
      }

      if (
        session.razorpay_payment_id &&
        session.razorpay_payment_id !== razorpayPaymentId
      ) {
        throw new Error('Checkout is associated with a different payment');
      }

      return {
        order: existingOrder,
        alreadyFinalized: true,
      };
    }

    if (
      session.checkout_status !== 'PENDING_PAYMENT' &&
      session.checkout_status !== 'PROCESSING'
    ) {
      throw new Error('Checkout is not eligible for finalization');
    }

    if (
      session.expires_at &&
      new Date(session.expires_at).getTime() < Date.now()
    ) {
      throw new Error('Checkout session has expired');
    }

    if (
      session.razorpay_payment_id &&
      session.razorpay_payment_id !== razorpayPaymentId
    ) {
      throw new Error('A different payment is already associated with checkout');
    }

    const items = await tx.query(
      `SELECT *
         FROM checkout_items
        WHERE checkout_id = ?
        ORDER BY id`,
      [session.id]
    );

    if (!items.length) {
      throw new Error('Checkout has no items');
    }

    const userId = Number(session.user_id);
    const orderNumber =
      `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;

    // Lock and validate stock before inserting the order.
    for (const item of items) {
      const product = await tx.get(
        'SELECT id, stock, name FROM products WHERE id = ? FOR UPDATE',
        [item.product_id]
      );

      if (
        !product ||
        Number(product.stock) < Number(item.quantity)
      ) {
        throw new Error(
          `Insufficient stock for "${item.product_name}" during payment finalization`
        );
      }
    }

    const orderRes = await tx.run(
      `INSERT INTO orders (
        order_number,
        user_id,
        source,
        area_id,
        sub_area_id,
        delivery_slot_id,
        delivery_address,
        landmark,
        pincode,
        subtotal,
        membership_discount,
        coupon_discount,
        bonus_discount,
        delivery_charge,
        tax,
        grand_total,
        payment_method,
        payment_status,
        order_status,
        notification_phone,
        notes,
        created_by
      ) VALUES (
        ?, ?, 'ONLINE', ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        'RAZORPAY', 'PAID', 'CONFIRMED', ?, ?, ?
      )`,
      [
        orderNumber,
        userId,
        session.area_id,
        session.sub_area_id,
        session.delivery_slot_id,
        session.delivery_address || '',
        session.landmark || '',
        session.pincode || '',
        session.subtotal,
        session.membership_discount,
        session.coupon_discount,
        session.bonus_discount,
        session.delivery_charge,
        session.tax,
        session.grand_total,
        session.notification_phone || null,
        session.notes || '',
        userId,
      ]
    );

    const orderId = orderRes.lastInsertRowid;

    if (!orderId) {
      throw new Error('Unable to create the paid order');
    }

    // Persist the exact price snapshot used for checkout.
    for (const item of items) {
      await tx.run(
        `INSERT INTO order_items (
          order_id,
          product_id,
          product_code,
          product_name,
          quantity,
          unit,
          original_price,
          selling_price,
          applied_price,
          discount,
          tax,
          total
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

      const product = await tx.get(
        'SELECT stock FROM products WHERE id = ? FOR UPDATE',
        [item.product_id]
      );

      const previousStock = Number(product.stock);
      const quantity = Number(item.quantity);
      const newStock = previousStock - quantity;

      await tx.run(
        'UPDATE products SET stock = ? WHERE id = ?',
        [newStock, item.product_id]
      );

      await tx.run(
        `INSERT INTO inventory_transactions (
          product_id,
          type,
          quantity,
          previous_stock,
          new_stock,
          reference_type,
          reference_id,
          user_id,
          note
        ) VALUES (?, 'ORDER', ?, ?, ?, 'ORDER', ?, ?, ?)`,
        [
          item.product_id,
          quantity,
          previousStock,
          newStock,
          String(orderId),
          userId,
          `Deduction for Order #${orderNumber}`,
        ]
      );
    }

    // Record coupon usage only after payment has been captured.
    if (
      session.applied_coupon_id &&
      Number(session.coupon_discount) > 0
    ) {
      await tx.run(
        `INSERT INTO coupon_usages (
          coupon_id,
          user_id,
          order_id,
          discount_amount
        ) VALUES (?, ?, ?, ?)`,
        [
          session.applied_coupon_id,
          userId,
          orderId,
          session.coupon_discount,
        ]
      );
    }

    // Record bonus redemption only once.
    if (Number(session.bonus_discount) > 0) {
      await tx.run(
        `INSERT INTO customer_bonus_transactions (
          user_id,
          type,
          amount,
          reference_type,
          reference_id,
          status,
          description
        ) VALUES (?, 'REDEMPTION', ?, 'ORDER', ?, 'COMPLETED', ?)`,
        [
          userId,
          session.bonus_discount,
          String(orderId),
          `Redeemed on Order #${orderNumber}`,
        ]
      );
    }

    await tx.run(
      `INSERT INTO payments (
        order_id,
        transaction_ref,
        payment_method,
        amount,
        currency,
        status,
        gateway_response
      ) VALUES (?, ?, 'RAZORPAY', ?, 'INR', 'PAID', ?)`,
      [
        orderId,
        razorpayPaymentId,
        session.grand_total,
        JSON.stringify({
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: razorpaySignature,
        }),
      ]
    );

    await tx.run(
      `INSERT INTO order_status_history (
        order_id,
        previous_status,
        old_status,
        new_status,
        changed_by,
        changed_by_role,
        notes,
        note
      ) VALUES (?, NULL, NULL, 'CONFIRMED', ?, 'System', ?, ?)`,
      [
        orderId,
        userId,
        'Razorpay payment captured; order confirmed',
        'Razorpay payment captured; order confirmed',
      ]
    );

    // Mark the session finalized inside the same transaction.
    await tx.run(
      `UPDATE checkout_sessions
          SET razorpay_payment_id = ?,
              razorpay_signature = ?,
              payment_status = 'PAID',
              checkout_status = 'COMPLETED',
              order_id = ?,
              paid_at = CURRENT_TIMESTAMP,
              completed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND order_id IS NULL`,
      [
        razorpayPaymentId,
        razorpaySignature,
        orderId,
        session.id,
      ]
    );

    // Clear the cart only after successful finalization.
    const cart = await tx.get(
      'SELECT id FROM carts WHERE user_id = ?',
      [userId]
    );

    if (cart) {
      await tx.run(
        'DELETE FROM cart_items WHERE cart_id = ?',
        [cart.id]
      );
    }

    const order = await tx.get(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );

    return {
      order,
      alreadyFinalized: false,
    };
  });

  if (!result.alreadyFinalized) {
    const order = result.order;
    const customer = await db.get(
      'SELECT name, mobile FROM users WHERE id = ?',
      [order.user_id]
    );

    // Preserve existing order notification behavior.
    this.sendOrderNotificationsAsync({
      orderId: order.id,
      orderNumber: order.order_number,
      userId: order.user_id,
      customerName: customer?.name,
      customerPhone: customer?.mobile,
      notificationPhone: order.notification_phone,
      source: 'ONLINE',
      grandTotal: order.grand_total,
      paymentMethod: 'RAZORPAY',
      areaName: '',
      subAreaName: '',
    }).catch((error) => {
      console.error(
        '[OrderService] Paid-order notification failed:',
        error.message
      );
    });
  }

  return result;
}
}


export default new OrderService();
