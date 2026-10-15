
import db from '../../database/connection.js';

export async function getCoupons(req, res) {
  try {
    const isStaff =
      req.user?.roles?.includes('SUPER_ADMIN') ||
      req.user?.permissions?.includes('coupons.view');

    let coupons;

    if (isStaff) {
      // Admin/staff can see ACTIVE and INACTIVE coupons.
      coupons = await db.query(
        'SELECT * FROM coupons ORDER BY id DESC'
      );
    } else {
      // Customers can only see active coupons.
      coupons = await db.query(`
        SELECT
          id,
          code,
          description,
          discount_type,
          discount_value,
          max_discount,
          min_order_amount
        FROM coupons
        WHERE status = 'ACTIVE'
        ORDER BY id DESC
      `);
    }

    return res.json({ success: true, data: coupons });
  } catch (err) {
    console.error('getCoupons error:', err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

export async function createCoupon(req, res) {
  try {
    const {
      code,
      description = '',
      discount_type = 'PERCENTAGE',
      discount_value,
      max_discount = null,
      min_order_amount = 0,
      total_usage_limit = null,
      per_user_limit = 1,
      first_order_only = 0,
      requires_membership = 0,
    } = req.body;

    const normalizedCode = String(code || '').trim().toUpperCase();
    const discountValue = Number(discount_value);
    const maxDiscount =
      max_discount === '' || max_discount == null
        ? null
        : Number(max_discount);
    const minOrderAmount = Number(min_order_amount);
    const perUserLimit = Number(per_user_limit);

    if (!normalizedCode || discount_value === undefined || discount_value === '') {
      return res.status(400).json({
        success: false,
        message: 'Coupon code and discount value are required',
      });
    }

    if (!['PERCENTAGE', 'FIXED'].includes(discount_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid discount type',
      });
    }

    if (
      !Number.isFinite(discountValue) ||
      discountValue <= 0 ||
      (discount_type === 'PERCENTAGE' && discountValue > 100)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Discount value must be greater than 0; percentage cannot exceed 100',
      });
    }

    if (
      maxDiscount !== null &&
      (!Number.isFinite(maxDiscount) || maxDiscount < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Maximum discount must be a valid non-negative number',
      });
    }

    if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Minimum order amount must be a valid non-negative number',
      });
    }

    if (!Number.isInteger(perUserLimit) || perUserLimit < 1) {
      return res.status(400).json({
        success: false,
        message: 'Per-user limit must be at least 1',
      });
    }

    const result = await db.run(
      `INSERT INTO coupons (
        code,
        description,
        discount_type,
        discount_value,
        max_discount,
        min_order_amount,
        total_usage_limit,
        per_user_limit,
        first_order_only,
        requires_membership,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [
        normalizedCode,
        description || '',
        discount_type,
        discountValue,
        maxDiscount,
        minOrderAmount,
        total_usage_limit || null,
        perUserLimit,
        first_order_only ? 1 : 0,
        requires_membership ? 1 : 0,
      ]
    );

    const created = await db.get(
      'SELECT * FROM coupons WHERE id = ?',
      [result.lastInsertRowid]
    );

    return res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: created,
    });
  } catch (err) {
    console.error('createCoupon error:', err);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}

export async function updateCoupon(req, res) {
  try {
    const { id } = req.params;

    const existing = await db.get(
      'SELECT * FROM coupons WHERE id = ?',
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    const {
      code,
      description = '',
      discount_type = 'PERCENTAGE',
      discount_value,
      max_discount = null,
      min_order_amount = 0,
      total_usage_limit = null,
      per_user_limit = 1,
      first_order_only = 0,
      requires_membership = 0,
      status = existing.status,
    } = req.body;

    const normalizedCode = String(code || '').trim().toUpperCase();
    const discountValue = Number(discount_value);
    const maxDiscount =
      max_discount === '' || max_discount == null
        ? null
        : Number(max_discount);
    const minOrderAmount = Number(min_order_amount);
    const perUserLimit = Number(per_user_limit);

    if (!normalizedCode || discount_value === undefined || discount_value === '') {
      return res.status(400).json({
        success: false,
        message: 'Coupon code and discount value are required',
      });
    }

    if (!['PERCENTAGE', 'FIXED'].includes(discount_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid discount type',
      });
    }

    if (
      !Number.isFinite(discountValue) ||
      discountValue <= 0 ||
      (discount_type === 'PERCENTAGE' && discountValue > 100)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Discount value must be greater than 0; percentage cannot exceed 100',
      });
    }

    if (
      maxDiscount !== null &&
      (!Number.isFinite(maxDiscount) || maxDiscount < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Maximum discount must be a valid non-negative number',
      });
    }

    if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Minimum order amount must be a valid non-negative number',
      });
    }

    if (!Number.isInteger(perUserLimit) || perUserLimit < 1) {
      return res.status(400).json({
        success: false,
        message: 'Per-user limit must be at least 1',
      });
    }

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coupon status',
      });
    }

    // Avoid assigning the same coupon code to another coupon.
    const duplicate = await db.get(
      'SELECT id FROM coupons WHERE code = ? AND id != ?',
      [normalizedCode, id]
    );

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'This coupon code already exists',
      });
    }

    await db.run(
      `UPDATE coupons SET
        code = ?,
        description = ?,
        discount_type = ?,
        discount_value = ?,
        max_discount = ?,
        min_order_amount = ?,
        total_usage_limit = ?,
        per_user_limit = ?,
        first_order_only = ?,
        requires_membership = ?,
        status = ?
      WHERE id = ?`,
      [
        normalizedCode,
        description || '',
        discount_type,
        discountValue,
        maxDiscount,
        minOrderAmount,
        total_usage_limit || null,
        perUserLimit,
        first_order_only ? 1 : 0,
        requires_membership ? 1 : 0,
        status,
        id,
      ]
    );

    const updated = await db.get(
      'SELECT * FROM coupons WHERE id = ?',
      [id]
    );

    return res.json({
      success: true,
      message: 'Coupon updated successfully',
      data: updated,
    });
  } catch (err) {
    console.error('updateCoupon error:', err);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}

export async function deleteCoupon(req, res) {
  try {
    const { id } = req.params;

    const existing = await db.get(
      'SELECT id FROM coupons WHERE id = ?',
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    await db.run(
      "UPDATE coupons SET status = 'INACTIVE' WHERE id = ?",
      [id]
    );

    return res.json({
      success: true,
      message: 'Coupon deactivated successfully',
    });
  } catch (err) {
    console.error('deleteCoupon error:', err);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}

export default {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
};
