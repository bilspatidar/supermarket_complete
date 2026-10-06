import orderService from '../services/orderService.js';
import pricingService from '../services/pricingService.js';
import db from '../../database/connection.js';

export async function calculateOrderPricing(req, res) {
  try {
    const { items, couponCode, useBonus, areaId, subAreaId, source = 'ONLINE', userId: targetUserId } = req.body;

    // Security check: Customer checkout pricing calculation cannot be accessed by internal staff
    if (source === 'ONLINE' && req.user && req.user.account_type === 'INTERNAL') {
      return res.status(403).json({
        success: false,
        message: 'Internal staff/admin accounts cannot perform customer store operations or access customer checkout.',
      });
    }

    // For POS: staff can pass targetUserId; for customer: req.user.id
    const effectiveUserId = targetUserId || req.user?.id || null;

    const calculation = await pricingService.calculateOrder({
      items,
      userId: effectiveUserId,
      couponCode,
      useBonus: Boolean(useBonus),
      areaId,
      subAreaId,
      source,
    });

    return res.json({ success: true, data: calculation });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function createOrder(req, res) {
  try {
    const {
      items,
      couponCode,
      useBonus,
      areaId,
      subAreaId,
      deliverySlotId,
      deliveryAddress,
      landmark,
      pincode,
      paymentMethod = 'COD',
      notificationPhone,
      notes,
      source = 'ONLINE',
      targetCustomerId = null, // In-House POS: cashier selects customer
    } = req.body;

    let orderUserId = req.user.id;

    // Security check: Customer can only place ONLINE orders
    if (source === 'ONLINE') {
      if (req.user.account_type !== 'CUSTOMER') {
        return res.status(403).json({
          success: false,
          message: 'Internal staff/admin accounts cannot place customer online store orders.',
        });
      }
    }

    // In-House POS mode: staff creates order on behalf of chosen or walk-in customer
    if (source === 'IN_HOUSE' || source === 'ADMIN') {
      if (req.user.account_type !== 'INTERNAL') {
        return res.status(403).json({
          success: false,
          message: 'Only internal staff can create in-house POS orders.',
        });
      }

      const hasPosPerm = req.user.roles.includes('SUPER_ADMIN') || req.user.permissions.includes('orders.create');
      if (!hasPosPerm) {
        return res.status(403).json({ success: false, message: 'You do not have permission to create in-house orders' });
      }

      if (targetCustomerId) {
        orderUserId = targetCustomerId;
      }
    }

    const result = await orderService.createOrder({
      userId: orderUserId,
      items,
      couponCode,
      useBonus: Boolean(useBonus),
      areaId,
      subAreaId,
      deliverySlotId,
      deliveryAddress,
      landmark,
      pincode,
      paymentMethod,
      notificationPhone,
      notes,
      source,
      createdBy: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: 'Order created successfully!',
      data: result,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/**
 * Helper to build SQL WHERE clause from query filters
 */
function buildOrdersWhereClause(query, reqUser) {
  const isStaff = reqUser.account_type === 'INTERNAL' && (reqUser.roles.includes('SUPER_ADMIN') || reqUser.permissions.includes('orders.view'));
  const conditions = [];
  const args = [];

  if (!isStaff) {
    // Customer: strictly scoped to own orders
    conditions.push('o.user_id = ?');
    args.push(reqUser.id);
  } else if (query.userId) {
    conditions.push('o.user_id = ?');
    args.push(query.userId);
  }

  // 1. Status Filter
  if (query.status && query.status !== 'ALL') {
    conditions.push('o.order_status = ?');
    args.push(query.status);
  }

  // 2. Source Filter (ONLINE vs IN_HOUSE)
  if (query.source && query.source !== 'ALL') {
    conditions.push('o.source = ?');
    args.push(query.source);
  }

  // 3. Payment Status Filter (PENDING, PAID, FAILED, REFUNDED)
  if (query.paymentStatus && query.paymentStatus !== 'ALL') {
    conditions.push('o.payment_status = ?');
    args.push(query.paymentStatus);
  }

  // 4. Payment Method Filter (COD, RAZORPAY, CASH, CARD, UPI)
  if (query.paymentMethod && query.paymentMethod !== 'ALL') {
    conditions.push('o.payment_method = ?');
    args.push(query.paymentMethod);
  }

  // 5. From Date Filter
  if (query.fromDate) {
    conditions.push('DATE(o.created_at) >= DATE(?)');
    args.push(query.fromDate);
  }

  // 6. To Date Filter
  if (query.toDate) {
    conditions.push('DATE(o.created_at) <= DATE(?)');
    args.push(query.toDate);
  }

  // 7. Order Number Filter
  if (query.orderNumber && query.orderNumber.trim()) {
    conditions.push('o.order_number LIKE ?');
    args.push(`%${query.orderNumber.trim()}%`);
  }

  // 8. Customer Name Filter
  if (query.customer && query.customer.trim()) {
    conditions.push('u.name LIKE ?');
    args.push(`%${query.customer.trim()}%`);
  }

  // 9. Mobile Filter
  if (query.mobile && query.mobile.trim()) {
    conditions.push('u.mobile LIKE ?');
    args.push(`%${query.mobile.trim()}%`);
  }

  // 10. Area Filter
  if (query.areaId && query.areaId !== 'ALL') {
    conditions.push('o.area_id = ?');
    args.push(query.areaId);
  }

  // 11. Sub-Area Filter
  if (query.subAreaId && query.subAreaId !== 'ALL') {
    conditions.push('o.sub_area_id = ?');
    args.push(query.subAreaId);
  }

  // General Search Filter
  if (query.search && query.search.trim()) {
    const q = `%${query.search.trim()}%`;
    conditions.push('(o.order_number LIKE ? OR u.name LIKE ? OR u.mobile LIKE ?)');
    args.push(q, q, q);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, args };
}

export async function getOrders(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const { whereClause, args } = buildOrdersWhereClause(req.query, req.user);

    const countRow = await db.get(
      `SELECT COUNT(o.id) as total FROM orders o 
       JOIN users u ON o.user_id = u.id 
       ${whereClause}`,
      args
    );
    const total = Number(countRow?.total || 0);

    const orders = await db.query(
      `SELECT o.*, u.name as customer_name, u.mobile as customer_mobile,
              da.name as area_name, dsa.name as sub_area_name, ds.name as slot_name
       FROM orders o
       JOIN users u ON o.user_id = u.id
       LEFT JOIN delivery_areas da ON o.area_id = da.id
       LEFT JOIN delivery_sub_areas dsa ON o.sub_area_id = dsa.id
       LEFT JOIN delivery_slots ds ON o.delivery_slot_id = ds.id
       ${whereClause}
       ORDER BY o.id DESC
       LIMIT ? OFFSET ?`,
      [...args, Number(limit), offset]
    );

    return res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function exportOrders(req, res) {
  try {
    const { whereClause, args } = buildOrdersWhereClause(req.query, req.user);

    const orders = await db.query(
      `SELECT o.order_number, o.created_at, o.source, o.order_status, o.payment_status,
              o.payment_method, o.subtotal, o.tax, o.delivery_charge,
              (COALESCE(o.membership_discount, 0) + COALESCE(o.coupon_discount, 0) + COALESCE(o.bonus_discount, 0)) as discount_total,
              o.grand_total, u.name as customer_name, u.mobile as customer_mobile,
              da.name as area_name, dsa.name as sub_area_name, o.delivery_address
       FROM orders o
       JOIN users u ON o.user_id = u.id
       LEFT JOIN delivery_areas da ON o.area_id = da.id
       LEFT JOIN delivery_sub_areas dsa ON o.sub_area_id = dsa.id
       ${whereClause}
       ORDER BY o.id DESC LIMIT 5000`,
      args
    );

    // Format CSV
    const headers = [
      'Order Number',
      'Date',
      'Source',
      'Status',
      'Payment Status',
      'Payment Method',
      'Customer Name',
      'Customer Mobile',
      'Subtotal',
      'Tax',
      'Delivery Charge',
      'Discount',
      'Grand Total',
      'Area',
      'Sub Area',
    ];

    const rows = orders.map(o => [
      `"${o.order_number}"`,
      `"${o.created_at}"`,
      `"${o.source}"`,
      `"${o.order_status}"`,
      `"${o.payment_status}"`,
      `"${o.payment_method}"`,
      `"${(o.customer_name || '').replace(/"/g, '""')}"`,
      `"${o.customer_mobile || ''}"`,
      o.subtotal,
      o.tax,
      o.delivery_charge,
      o.discount_total,
      o.grand_total,
      `"${(o.area_name || '').replace(/"/g, '""')}"`,
      `"${(o.sub_area_name || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=orders-export-${Date.now()}.csv`);
    return res.send(csvContent);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    const order = await db.get(
      `SELECT o.*, u.name as customer_name, u.mobile as customer_mobile, u.email as customer_email,
              da.name as area_name, dsa.name as sub_area_name, ds.name as slot_name
       FROM orders o
       JOIN users u ON o.user_id = u.id
       LEFT JOIN delivery_areas da ON o.area_id = da.id
       LEFT JOIN delivery_sub_areas dsa ON o.sub_area_id = dsa.id
       LEFT JOIN delivery_slots ds ON o.delivery_slot_id = ds.id
       WHERE o.id = ? OR o.order_number = ?`,
      [id, id]
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Authorization check
    const isStaff = req.user.account_type === 'INTERNAL' && (req.user.roles.includes('SUPER_ADMIN') || req.user.permissions.includes('orders.view'));
    if (!isStaff && order.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied to this order' });
    }

    const items = await db.query(
      `SELECT oi.*, p.image as product_image, p.slug as product_slug 
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [order.id]
    );

    const history = await db.query(
      `SELECT osh.*, u.name as changed_by_name 
       FROM order_status_history osh
       LEFT JOIN users u ON osh.changed_by = u.id
       WHERE osh.order_id = ? 
       ORDER BY osh.id ASC`,
      [order.id]
    );

    const payments = await db.query(
      'SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC',
      [order.id]
    );

    return res.json({
      success: true,
      data: {
        order,
        items,
        history,
        payments,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    // Verify existing order lock status
    const existing = await db.get('SELECT id, order_status, locked_at, order_number FROM orders WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (existing.locked_at || existing.order_status === 'DELIVERED') {
      return res.status(400).json({
        success: false,
        message: `Order #${existing.order_number} is locked (Delivered) and cannot be modified. Items, prices, and status are permanently sealed.`,
      });
    }

    const updated = await orderService.updateOrderStatus(id, status, req.user.id, notes);
    return res.json({
      success: true,
      message: `Order status updated to ${status}`,
      data: updated,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/**
 * Customer Orders List (Customer Only)
 */
export async function getCustomerOrders(req, res) {
  try {
    const orders = await db.query(
      `SELECT o.*, da.name as area_name, dsa.name as sub_area_name, ds.name as slot_name
       FROM orders o
       LEFT JOIN delivery_areas da ON o.area_id = da.id
       LEFT JOIN delivery_sub_areas dsa ON o.sub_area_id = dsa.id
       LEFT JOIN delivery_slots ds ON o.delivery_slot_id = ds.id
       WHERE o.user_id = ?
       ORDER BY o.id DESC`,
      [req.user.id]
    );

    return res.json({
      success: true,
      data: {
        orders,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Customer Order Detail (Customer Only)
 */
export async function getCustomerOrderById(req, res) {
  try {
    const { id } = req.params;
    const order = await db.get(
      `SELECT o.*, da.name as area_name, dsa.name as sub_area_name, ds.name as slot_name
       FROM orders o
       LEFT JOIN delivery_areas da ON o.area_id = da.id
       LEFT JOIN delivery_sub_areas dsa ON o.sub_area_id = dsa.id
       LEFT JOIN delivery_slots ds ON o.delivery_slot_id = ds.id
       WHERE (o.id = ? OR o.order_number = ?) AND o.user_id = ?`,
      [id, id, req.user.id]
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const items = await db.query(
      `SELECT oi.*, p.image as product_image, p.slug as product_slug 
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [order.id]
    );

    const history = await db.query(
      `SELECT osh.* FROM order_status_history osh WHERE osh.order_id = ? ORDER BY osh.id ASC`,
      [order.id]
    );

    return res.json({
      success: true,
      data: {
        order,
        items,
        history,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createCustomerOrder(req, res) {
  req.body.source = 'ONLINE';
  return createOrder(req, res);
}

export default {
  calculateOrderPricing,
  createOrder,
  createCustomerOrder,
  getOrders,
  exportOrders,
  getOrderById,
  getCustomerOrders,
  getCustomerOrderById,
  updateOrderStatus,
};
