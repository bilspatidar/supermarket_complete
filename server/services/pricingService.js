import db from '../../database/connection.js';

class PricingService {
  /**
   * Single Centralized Pricing Engine for both Online and In-House POS orders
   * @param {Object} params
   * @param {Array} params.items - [{ product_id, quantity }]
   * @param {number|null} params.userId - Optional customer user ID
   * @param {string|null} params.couponCode - Optional coupon code applied
   * @param {boolean} params.useBonus - Whether customer requested welcome bonus redemption
   * @param {number|null} params.areaId - Selected delivery area ID
   * @param {number|null} params.subAreaId - Selected delivery sub-area ID
   * @param {string} params.source - 'ONLINE' or 'IN_HOUSE'
   * @returns {Object} Comprehensive pricing breakdown
   */
  async calculateOrder({
    items = [],
    userId = null,
    couponCode = null,
    useBonus = false,
    areaId = null,
    subAreaId = null,
    source = 'ONLINE',
  }) {
    if (!items || items.length === 0) {
      throw new Error('Cart or order must contain at least one item');
    }

    // 1. Load products and validate current prices and stock
    let subtotal = 0;
    let totalTax = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await db.get(
        `SELECT id, product_code, name, original_price, selling_price, tax_percent, unit, stock, status
         FROM products WHERE id = ?`,
        [item.product_id]
      );

      if (!product) {
        throw new Error(`Product ID ${item.product_id} not found`);
      }

      if (product.status !== 'ACTIVE') {
        throw new Error(`Product "${product.name}" is currently unavailable`);
      }

      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        throw new Error(`Invalid quantity for product "${product.name}"`);
      }

      if (product.stock < qty) {
        throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${qty}`);
      }

      const appliedPrice = Number(product.selling_price);
      const originalPrice = Number(product.original_price);
      const lineSubtotal = appliedPrice * qty;
      const taxRate = Number(product.tax_percent || 0);
      const lineTax = (lineSubtotal * taxRate) / 100;

      subtotal += lineSubtotal;
      totalTax += lineTax;

      validatedItems.push({
        product_id: product.id,
        product_code: product.product_code,
        product_name: product.name,
        quantity: qty,
        unit: product.unit,
        original_price: originalPrice,
        selling_price: appliedPrice,
        applied_price: appliedPrice,
        discount: (originalPrice - appliedPrice) * qty,
        tax_percent: taxRate,
        tax: Math.round(lineTax * 100) / 100,
        total: Math.round((lineSubtotal + lineTax) * 100) / 100,
      });
    }

    subtotal = Math.round(subtotal * 100) / 100;
    totalTax = Math.round(totalTax * 100) / 100;

    // 2. Membership Evaluation
    let membershipDiscount = 0;
    let memberHasFreeDelivery = false;
    let activeMembership = null;

    if (userId) {
      const nowIso = new Date().toISOString();
      activeMembership = await db.get(
        `SELECT cm.id, cm.plan_id, cm.end_date, mp.name as plan_name, mp.discount_percent, mp.free_delivery
         FROM customer_memberships cm
         JOIN membership_plans mp ON cm.plan_id = mp.id
         WHERE cm.user_id = ? AND cm.status = 'ACTIVE' AND cm.end_date >= ?
         ORDER BY cm.id DESC LIMIT 1`,
        [userId, nowIso]
      );

      if (activeMembership) {
        if (activeMembership.discount_percent > 0) {
          membershipDiscount = (subtotal * activeMembership.discount_percent) / 100;
          membershipDiscount = Math.round(membershipDiscount * 100) / 100;
        }
        if (activeMembership.free_delivery) {
          memberHasFreeDelivery = true;
        }
      }
    }

    // 3. Coupon Evaluation
    let couponDiscount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      const codeClean = String(couponCode).trim().toUpperCase();
      const coupon = await db.get(
        "SELECT * FROM coupons WHERE code = ? AND status = 'ACTIVE'",
        [codeClean]
      );

      if (!coupon) {
        throw new Error(`Coupon "${codeClean}" is invalid or inactive`);
      }

      // Check dates
      const now = new Date();
      if (coupon.start_date && new Date(coupon.start_date) > now) {
        throw new Error(`Coupon "${codeClean}" is not yet active`);
      }
      if (coupon.end_date && new Date(coupon.end_date) < now) {
        throw new Error(`Coupon "${codeClean}" has expired`);
      }

      // Check minimum order
      if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
        throw new Error(`Coupon requires a minimum order of ₹${coupon.min_order_amount}`);
      }

      // Check membership requirement
      if (coupon.requires_membership && !activeMembership) {
        throw new Error(`Coupon "${codeClean}" is exclusive to active members`);
      }

      // Check first order only
      if (coupon.first_order_only && userId) {
        const orderCount = await db.get(
          "SELECT COUNT(id) as count FROM orders WHERE user_id = ? AND order_status != 'CANCELLED'",
          [userId]
        );
        if (orderCount?.count > 0) {
          throw new Error(`Coupon "${codeClean}" is valid for first-time orders only`);
        }
      }

      // Check per-user limit
      if (userId && coupon.per_user_limit) {
        const userUsage = await db.get(
          'SELECT COUNT(id) as count FROM coupon_usages WHERE coupon_id = ? AND user_id = ?',
          [coupon.id, userId]
        );
        if (userUsage?.count >= coupon.per_user_limit) {
          throw new Error(`You have reached the maximum usage limit for coupon "${codeClean}"`);
        }
      }

      // Check total limit
      if (coupon.total_usage_limit) {
        const totalUsage = await db.get(
          'SELECT COUNT(id) as count FROM coupon_usages WHERE coupon_id = ?',
          [coupon.id]
        );
        if (totalUsage?.count >= coupon.total_usage_limit) {
          throw new Error(`Coupon "${codeClean}" limit has been reached`);
        }
      }

      // Calculate discount amount
      if (coupon.discount_type === 'PERCENTAGE') {
        let disc = (subtotal * coupon.discount_value) / 100;
        if (coupon.max_discount && disc > coupon.max_discount) {
          disc = coupon.max_discount;
        }
        couponDiscount = Math.round(disc * 100) / 100;
      } else {
        // FIXED
        couponDiscount = Math.min(coupon.discount_value, subtotal);
      }

      appliedCoupon = coupon;
    }

    // 4. Welcome Bonus Evaluation
    let bonusDiscount = 0;
    let availableBonus = 0;

    if (userId) {
      // Calculate available unexpired promotional credit
      const nowIso = new Date().toISOString();
      const credits = await db.get(
        `SELECT SUM(amount) as total FROM customer_bonus_transactions 
         WHERE user_id = ? AND type IN ('WELCOME_BONUS', 'ADMIN_CREDIT', 'REVERSAL') 
         AND status = 'ACTIVE' AND (expires_at IS NULL OR expires_at >= ?)`,
        [userId, nowIso]
      );
      const debits = await db.get(
        `SELECT SUM(amount) as total FROM customer_bonus_transactions 
         WHERE user_id = ? AND type IN ('REDEMPTION', 'ADMIN_DEBIT', 'EXPIRY')`,
        [userId]
      );

      const netCredits = Number(credits?.total || 0);
      const netDebits = Number(debits?.total || 0);
      availableBonus = Math.max(0, netCredits - netDebits);

      if (useBonus && availableBonus > 0) {
        // Load store settings for bonus rules
        const bonusSettingsRows = await db.query(
          "SELECT key, value FROM store_settings WHERE key LIKE 'welcome_bonus_%'"
        );
        const settings = {};
        for (const row of bonusSettingsRows) settings[row.key] = row.value;

        const bonusEnabled = settings.welcome_bonus_enabled !== 'false';
        const minOrder = Number(settings.welcome_bonus_min_order || 0);
        const maxRedemption = Number(settings.welcome_bonus_max_redemption || availableBonus);
        const allowCoupon = settings.welcome_bonus_allow_coupon !== 'false';
        const allowMembership = settings.welcome_bonus_allow_membership !== 'false';

        if (bonusEnabled) {
          let eligible = true;
          if (subtotal < minOrder) eligible = false;
          if (couponDiscount > 0 && !allowCoupon) eligible = false;
          if (membershipDiscount > 0 && !allowMembership) eligible = false;

          if (eligible) {
            const maxAllowed = Math.min(availableBonus, maxRedemption, subtotal - couponDiscount - membershipDiscount);
            bonusDiscount = Math.max(0, Math.round(maxAllowed * 100) / 100);
          }
        }
      }
    }

    // 5. Delivery Charge & Time Window Calculation (for ONLINE or delivered POS)
    let deliveryCharge = 0;
    let areaDetails = null;
    let subAreaDetails = null;

    if (source === 'ONLINE' || (areaId && subAreaId)) {
      if (!areaId || !subAreaId) {
        throw new Error('Please select delivery Area and Sub-Area');
      }

      areaDetails = await db.get("SELECT * FROM delivery_areas WHERE id = ? AND status = 'ACTIVE'", [areaId]);
      if (!areaDetails) {
        throw new Error('Selected delivery area is inactive or not found');
      }

      subAreaDetails = await db.get(
        "SELECT * FROM delivery_sub_areas WHERE id = ? AND area_id = ? AND status = 'ACTIVE'",
        [subAreaId, areaId]
      );
      if (!subAreaDetails) {
        throw new Error('Selected delivery sub-area is inactive or not found');
      }

      // Validate operational delivery hours on backend clock (e.g. 08:00 - 22:00)
      const startTime = subAreaDetails.start_time || areaDetails.start_time || '00:00';
      const endTime = subAreaDetails.end_time || areaDetails.end_time || '23:59';

      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      if (currentTimeStr < startTime || currentTimeStr > endTime) {
        throw new Error(
          `Delivery for ${subAreaDetails.name} is available only between ${startTime} and ${endTime}. Current time: ${currentTimeStr}`
        );
      }

      // Check minimum order requirement
      const minOrder = subAreaDetails.minimum_order ?? areaDetails.minimum_order ?? 0;
      if (subtotal < minOrder) {
        throw new Error(`Minimum order amount for ${subAreaDetails.name} is ₹${minOrder}`);
      }

      // Resolve delivery fee & free delivery threshold
      const standardCharge = subAreaDetails.delivery_charge ?? areaDetails.delivery_charge ?? 40.0;
      const freeDeliveryMin = subAreaDetails.free_delivery_minimum ?? areaDetails.free_delivery_minimum ?? 499.0;

      if (memberHasFreeDelivery || subtotal >= freeDeliveryMin) {
        deliveryCharge = 0;
      } else {
        deliveryCharge = Number(standardCharge);
      }
    }

    // 6. Grand Total
    const discountsTotal = membershipDiscount + couponDiscount + bonusDiscount;
    const grandTotal = Math.max(0, Math.round((subtotal - discountsTotal + deliveryCharge + totalTax) * 100) / 100);

    return {
      subtotal,
      tax: totalTax,
      membership_discount: membershipDiscount,
      coupon_discount: couponDiscount,
      bonus_discount: bonusDiscount,
      delivery_charge: deliveryCharge,
      grand_total: grandTotal,
      items: validatedItems,
      applied_coupon: appliedCoupon ? { code: appliedCoupon.code, id: appliedCoupon.id, discount: couponDiscount } : null,
      active_membership: activeMembership ? { plan_name: activeMembership.plan_name, discount: membershipDiscount } : null,
      available_bonus: availableBonus,
      used_bonus: bonusDiscount,
      area: areaDetails ? { id: areaDetails.id, name: areaDetails.name } : null,
      sub_area: subAreaDetails ? { id: subAreaDetails.id, name: subAreaDetails.name } : null,
    };
  }
}

export default new PricingService();
