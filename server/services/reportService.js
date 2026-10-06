import db from '../../database/connection.js';

class ReportService {
  /**
   * Aggregate Real Data for Admin Dashboard & Reports
   */
  async getDashboardSummary() {
    // Orders & Revenue
    const orderStats = await db.get(
      `SELECT 
        COUNT(id) as total_orders,
        SUM(CASE WHEN order_status = 'DELIVERED' THEN 1 ELSE 0 END) as delivered_orders,
        SUM(CASE WHEN order_status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_orders,
        SUM(CASE WHEN order_status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'OUT_FOR_DELIVERY') THEN 1 ELSE 0 END) as pending_orders,
        COALESCE(SUM(CASE WHEN order_status != 'CANCELLED' THEN grand_total ELSE 0 END), 0) as total_revenue,
        COALESCE(AVG(CASE WHEN order_status != 'CANCELLED' THEN grand_total ELSE NULL END), 0) as avg_order_value
       FROM orders`
    );

    // Payments Breakdown
    const paymentStats = await db.query(
      `SELECT payment_method, status, COUNT(id) as count, COALESCE(SUM(amount), 0) as total_amount
       FROM payments
       GROUP BY payment_method, status`
    );

    // Customer Stats
    const totalCustomers = await db.get(
      `SELECT COUNT(DISTINCT u.id) as count FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       WHERE r.name = 'CUSTOMER'`
    );

    const repeatCustomers = await db.get(
      `SELECT COUNT(user_id) as count FROM (
        SELECT user_id FROM orders WHERE order_status != 'CANCELLED' GROUP BY user_id HAVING COUNT(id) > 1
      )`
    );

    // Product Inventory Alerts
    const productStats = await db.get(
      `SELECT 
        COUNT(id) as total_products,
        SUM(CASE WHEN stock <= minimum_stock AND stock > 0 THEN 1 ELSE 0 END) as low_stock_count,
        SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock_count
       FROM products WHERE status = 'ACTIVE'`
    );

    // Best Selling Products
    const topProducts = await db.query(
      `SELECT oi.product_id, oi.product_name, oi.product_code, 
              SUM(oi.quantity) as units_sold, SUM(oi.total) as total_sales
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.order_status != 'CANCELLED'
       GROUP BY oi.product_id
       ORDER BY units_sold DESC
       LIMIT 5`
    );

    // Membership Stats
    const nowIso = new Date().toISOString();
    const membershipStats = await db.get(
      `SELECT 
        COUNT(id) as total_subscribers,
        SUM(CASE WHEN status = 'ACTIVE' AND end_date >= ? THEN 1 ELSE 0 END) as active_subscribers
       FROM customer_memberships`,
      [nowIso]
    );

    // Welcome Bonus Stats
    const bonusStats = await db.get(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'WELCOME_BONUS' THEN amount ELSE 0 END), 0) as total_issued,
        COALESCE(SUM(CASE WHEN type = 'REDEMPTION' THEN amount ELSE 0 END), 0) as total_redeemed,
        COALESCE(SUM(CASE WHEN type = 'REVERSAL' THEN amount ELSE 0 END), 0) as total_reversed
       FROM customer_bonus_transactions`
    );

    // Coupon Usage Stats
    const couponStats = await db.get(
      `SELECT COUNT(id) as total_uses, COALESCE(SUM(discount_amount), 0) as total_discount_given
       FROM coupon_usages`
    );

    // Recent 10 Orders
    const recentOrders = await db.query(
      `SELECT o.id, o.order_number, o.source, o.grand_total, o.payment_method, 
              o.payment_status, o.order_status, o.created_at, u.name as customer_name, u.mobile as customer_mobile
       FROM orders o
       JOIN users u ON o.user_id = u.id
       ORDER BY o.id DESC LIMIT 10`
    );

    return {
      orders: {
        total: Number(orderStats?.total_orders || 0),
        delivered: Number(orderStats?.delivered_orders || 0),
        cancelled: Number(orderStats?.cancelled_orders || 0),
        pending: Number(orderStats?.pending_orders || 0),
        revenue: Math.round(Number(orderStats?.total_revenue || 0)),
        avgOrderValue: Math.round(Number(orderStats?.avg_order_value || 0)),
      },
      payments: paymentStats,
      customers: {
        total: Number(totalCustomers?.count || 0),
        repeat: Number(repeatCustomers?.count || 0),
      },
      inventory: {
        total: Number(productStats?.total_products || 0),
        lowStock: Number(productStats?.low_stock_count || 0),
        outOfStock: Number(productStats?.out_of_stock_count || 0),
      },
      topProducts,
      membership: {
        total: Number(membershipStats?.total_subscribers || 0),
        active: Number(membershipStats?.active_subscribers || 0),
      },
      welcomeBonus: {
        issued: Number(bonusStats?.total_issued || 0),
        redeemed: Number(bonusStats?.total_redeemed || 0),
        reversed: Number(bonusStats?.total_reversed || 0),
        outstanding: Math.max(0, Number(bonusStats?.total_issued || 0) - Number(bonusStats?.total_redeemed || 0) + Number(bonusStats?.total_reversed || 0)),
      },
      coupons: {
        uses: Number(couponStats?.total_uses || 0),
        totalDiscount: Math.round(Number(couponStats?.total_discount_given || 0)),
      },
      recentOrders,
    };
  }

  /**
   * Real stats for a specific customer
   */
  async getCustomerStats(userId) {
    const stats = await db.get(
      `SELECT 
        COUNT(id) as total_orders,
        COALESCE(SUM(CASE WHEN order_status != 'CANCELLED' THEN grand_total ELSE 0 END), 0) as total_spent,
        COALESCE(AVG(CASE WHEN order_status != 'CANCELLED' THEN grand_total ELSE NULL END), 0) as avg_order_value,
        MIN(created_at) as first_order_date,
        MAX(created_at) as last_order_date
       FROM orders WHERE user_id = ?`,
      [userId]
    );

    // Active membership
    const nowIso = new Date().toISOString();
    const membership = await db.get(
      `SELECT cm.id, mp.name as plan_name, cm.end_date 
       FROM customer_memberships cm
       JOIN membership_plans mp ON cm.plan_id = mp.id
       WHERE cm.user_id = ? AND cm.status = 'ACTIVE' AND cm.end_date >= ?
       ORDER BY cm.id DESC LIMIT 1`,
      [userId, nowIso]
    );

    // Active Bonus
    const bonusCredits = await db.get(
      `SELECT SUM(amount) as total FROM customer_bonus_transactions 
       WHERE user_id = ? AND type IN ('WELCOME_BONUS', 'ADMIN_CREDIT', 'REVERSAL') 
       AND status = 'ACTIVE' AND (expires_at IS NULL OR expires_at >= ?)`,
      [userId, nowIso]
    );
    const bonusDebits = await db.get(
      `SELECT SUM(amount) as total FROM customer_bonus_transactions 
       WHERE user_id = ? AND type IN ('REDEMPTION', 'ADMIN_DEBIT', 'EXPIRY')`,
      [userId]
    );

    const availableBonus = Math.max(0, Number(bonusCredits?.total || 0) - Number(bonusDebits?.total || 0));

    return {
      totalOrders: Number(stats?.total_orders || 0),
      totalSpent: Math.round(Number(stats?.total_spent || 0)),
      avgOrderValue: Math.round(Number(stats?.avg_order_value || 0)),
      firstOrderDate: stats?.first_order_date || null,
      lastOrderDate: stats?.last_order_date || null,
      activeMembership: membership ? { plan: membership.plan_name, expires: membership.end_date } : null,
      availableBonus,
    };
  }
}

export default new ReportService();
