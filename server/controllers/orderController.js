import orderService from '../services/orderService.js';
import pricingService from '../services/pricingService.js';
import db from '../../database/connection.js';

export async function calculateOrderPricing(req, res) {
  try {
    const { items, couponCode, useBonus, areaId, subAreaId, source = 'ONLINE' } = req.body;
    const userId = req.user?.id || null;

    const calculation = await pricingService.calculateOrder({
      items,
      userId,
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

    // In-House POS mode: staff creates order on behalf of chosen or walk-in customer
    if (source === 'IN_HOUSE' || source === 'ADMIN') {
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

export async function getOrders(req, res) {
  try {
    const { status, source, page = 1, limit = 20, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const isStaff = req.user.roles.includes('SUPER_ADMIN') || req.user.permissions.includes('orders.view');
    const conditions = [];
    const args = [];

    if (!isStaff) {
      // Customer: strictly scoped to own orders
      conditions.push('o.user_id = ?');
      args.push(req.user.id);
    } else if (req.query.userId) {
      conditions.push('o.user_id = ?');
      args.push(req.query.userId);
    }

    if (status && status !== 'ALL') {
      conditions.push('o.order_status = ?');
      args.push(status);
    }

    if (source && source !== 'ALL') {
      conditions.push('o.source = ?');
      args.push(source);
    }

    if (search) {
      conditions.push('(o.order_number LIKE ? OR u.name LIKE ? OR u.mobile LIKE ?)');
      const q = `%${search.trim()}%`;
      args.push(q, q, q);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

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
    const isStaff = req.user.roles.includes('SUPER_ADMIN') || req.user.permissions.includes('orders.view');
    if (!isStaff && order.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
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

export default {
  calculateOrderPricing,
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
};
