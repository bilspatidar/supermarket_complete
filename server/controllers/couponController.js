import db from '../../database/connection.js';

export async function getCoupons(req, res) {
  try {
    const isStaff = req.user?.roles?.includes('SUPER_ADMIN') || req.user?.permissions?.includes('coupons.view');
    let coupons;
    if (isStaff) {
      coupons = await db.query('SELECT * FROM coupons ORDER BY id DESC');
    } else {
      coupons = await db.query("SELECT id, code, description, discount_type, discount_value, max_discount, min_order_amount FROM coupons WHERE status = 'ACTIVE'");
    }
    return res.json({ success: true, data: coupons });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createCoupon(req, res) {
  try {
    const {
      code,
      description,
      discount_type = 'PERCENTAGE',
      discount_value,
      max_discount = null,
      min_order_amount = 0,
      total_usage_limit = null,
      per_user_limit = 1,
      first_order_only = 0,
      requires_membership = 0,
    } = req.body;

    if (!code || discount_value === undefined) {
      return res.status(400).json({ success: false, message: 'Coupon code and discount value are required' });
    }

    const result = await db.run(
      `INSERT INTO coupons (
        code, description, discount_type, discount_value, max_discount,
        min_order_amount, total_usage_limit, per_user_limit, first_order_only,
        requires_membership, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [
        String(code).toUpperCase().trim(),
        description || '',
        discount_type,
        discount_value,
        max_discount,
        min_order_amount,
        total_usage_limit,
        per_user_limit,
        first_order_only ? 1 : 0,
        requires_membership ? 1 : 0,
      ]
    );

    const created = await db.get('SELECT * FROM coupons WHERE id = ?', [result.lastInsertRowid]);
    return res.status(201).json({ success: true, message: 'Coupon created successfully', data: created });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function deleteCoupon(req, res) {
  try {
    const { id } = req.params;
    await db.run("UPDATE coupons SET status = 'INACTIVE' WHERE id = ?", [id]);
    return res.json({ success: true, message: 'Coupon deactivated successfully' });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export default {
  getCoupons,
  createCoupon,
  deleteCoupon,
};
