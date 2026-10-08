import db from '../../database/connection.js';

class ReportService {
  /**
   * Helper to generate date filter clause and parameters for SQLite
   */
  getDateFilter(colName = 'created_at', period = 'last30', fromDate = null, toDate = null) {
    if (period === 'today') {
      return { clause: `DATE(${colName}) = DATE('now')`, args: [] };
    }
    if (period === 'yesterday') {
      return { clause: `DATE(${colName}) = DATE('now', '-1 day')`, args: [] };
    }
    if (period === 'last7') {
      return { clause: `DATE(${colName}) >= DATE('now', '-7 days')`, args: [] };
    }
    if (period === 'last30') {
      return { clause: `DATE(${colName}) >= DATE('now', '-30 days')`, args: [] };
    }
    if (period === 'thisMonth') {
      return { clause: `strftime('%Y-%m', ${colName}) = strftime('%Y-%m', 'now')`, args: [] };
    }
    if (period === 'lastMonth') {
      return { clause: `strftime('%Y-%m', ${colName}) = strftime('%Y-%m', 'now', '-1 month')`, args: [] };
    }
    if (period === 'custom' && fromDate && toDate) {
      return { clause: `DATE(${colName}) >= DATE(?) AND DATE(${colName}) <= DATE(?)`, args: [fromDate, toDate] };
    }
    if (period === 'custom' && fromDate) {
      return { clause: `DATE(${colName}) >= DATE(?)`, args: [fromDate] };
    }
    // Default last 30 days
    return { clause: `DATE(${colName}) >= DATE('now', '-30 days')`, args: [] };
  }


    /**
   * Get customer statistics for authenticated user
   */
    async getCustomerStats(userId) {
      const customer = await db.get(
        `
        SELECT
          u.id,
          u.name,
          u.mobile,
          u.email,
          u.account_type,
          u.status,
          u.profile_image,
          u.dob,
          u.anniversary_date,
          u.created_at,
          u.last_login_at
        FROM users u
        WHERE u.id = ?
        LIMIT 1
        `,
        [userId]
      );
  
      if (!customer) {
        return null;
      }
  
      const orderStats = await db.get(
        `
        SELECT
          COUNT(id) AS total_orders,
          COALESCE(
            SUM(
              CASE
                WHEN order_status != 'CANCELLED'
                THEN grand_total
                ELSE 0
              END
            ),
            0
          ) AS total_spent
        FROM orders
        WHERE user_id = ?
        `,
        [userId]
      );
  
      const membership = await db.get(
        `
        SELECT
          cm.id,
          cm.plan_id,
          cm.start_date,
          cm.end_date,
          cm.status,
          mp.name AS plan_name,
          mp.price AS plan_price,
          mp.discount_percent,
          mp.free_delivery
        FROM customer_memberships cm
        LEFT JOIN membership_plans mp
          ON cm.plan_id = mp.id
        WHERE cm.user_id = ?
          AND cm.status = 'ACTIVE'
          AND cm.end_date >= NOW()
        ORDER BY cm.end_date DESC
        LIMIT 1
        `,
        [userId]
      );
  
      const bonusStats = await db.get(
        `
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN type IN ('WELCOME_BONUS', 'ADMIN_CREDIT')
                     AND status = 'ACTIVE'
                THEN amount
                ELSE 0
              END
            ),
            0
          ) AS credited,
  
          COALESCE(
            SUM(
              CASE
                WHEN type IN ('REDEMPTION', 'ADMIN_DEBIT')
                     AND status = 'ACTIVE'
                THEN amount
                ELSE 0
              END
            ),
            0
          ) AS debited,
  
          COALESCE(
            SUM(
              CASE
                WHEN type = 'REVERSAL'
                     AND status = 'ACTIVE'
                THEN amount
                ELSE 0
              END
            ),
            0
          ) AS reversed
  
        FROM customer_bonus_transactions
        WHERE user_id = ?
        `,
        [userId]
      );
  
      const recentOrders = await db.query(
        `
        SELECT
          id,
          order_number,
          source,
          grand_total,
          payment_method,
          payment_status,
          order_status,
          created_at
        FROM orders
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 5
        `,
        [userId]
      );
  
      const credited = Number(bonusStats?.credited || 0);
      const debited = Number(bonusStats?.debited || 0);
      const reversed = Number(bonusStats?.reversed || 0);
  
      return {
        customer,
  
        orders: {
          total: Number(orderStats?.total_orders || 0),
          totalSpent: Number(orderStats?.total_spent || 0),
          recent: recentOrders,
        },
  
        membership: membership || null,
  
        bonus: {
          credited,
          debited,
          reversed,
          balance: Math.max(0, credited - debited + reversed),
        },
      };
    }
  /**
   * Aggregate Real Data for Admin Dashboard Summary
   */
  async getDashboardSummary() {
    const orderStats = await db.get(
      `SELECT 
        COUNT(id) as total_orders,
        COALESCE(SUM(grand_total), 0) as total_revenue,
        COALESCE(AVG(grand_total), 0) as avg_order_value,
        SUM(CASE WHEN order_status = 'DELIVERED' THEN 1 ELSE 0 END) as delivered_orders,
        SUM(CASE WHEN order_status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_orders,
        SUM(CASE WHEN order_status NOT IN ('DELIVERED', 'CANCELLED') THEN 1 ELSE 0 END) as pending_orders
       FROM orders`
    );

    const paymentStats = await db.query(
      `SELECT payment_method, status, COUNT(id) as count, COALESCE(SUM(amount), 0) as total_amount
       FROM payments
       GROUP BY payment_method, status`
    );

    const totalCustomers = await db.get("SELECT COUNT(id) as count FROM users WHERE account_type = 'CUSTOMER'");

    const productStats = await db.get(
      `SELECT 
        COUNT(id) as total_products,
        SUM(CASE WHEN stock <= minimum_stock AND stock > 0 THEN 1 ELSE 0 END) as low_stock_count,
        SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END) as out_of_stock_count
       FROM products WHERE status = 'ACTIVE'`
    );

    const membershipStats = await db.get(
      `SELECT 
        COUNT(id) as total_subscribers,
        SUM(CASE WHEN status = 'ACTIVE' AND end_date >= CURRENT_TIMESTAMP THEN 1 ELSE 0 END) as active_subscribers
       FROM customer_memberships`
    );

    const bonusStats = await db.get(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'WELCOME_BONUS' THEN amount ELSE 0 END), 0) as total_issued,
        COALESCE(SUM(CASE WHEN type = 'REDEMPTION' THEN amount ELSE 0 END), 0) as total_redeemed,
        COALESCE(SUM(CASE WHEN type = 'REVERSAL' THEN amount ELSE 0 END), 0) as total_reversed
       FROM customer_bonus_transactions`
    );

    const couponStats = await db.get(
      `SELECT COUNT(id) as total_uses, COALESCE(SUM(discount_amount), 0) as total_discount_given FROM coupon_usages`
    );

    const recentOrders = await db.query(
      `SELECT o.id, o.order_number, o.source, o.grand_total, o.payment_method, 
              o.payment_status, o.order_status, o.created_at, u.name as customer_name, u.mobile as customer_mobile
       FROM orders o
       JOIN users u ON o.user_id = u.id
       ORDER BY o.id DESC LIMIT 10`
    );

    const topProducts = await db.query(
      `SELECT oi.product_id, p.name as product_name, p.product_code, p.image as product_image,
              SUM(oi.quantity) as units_sold,
              SUM(oi.total) as total_sales
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       JOIN orders o ON oi.order_id = o.id
       WHERE o.order_status != 'CANCELLED'
       GROUP BY oi.product_id
       ORDER BY units_sold DESC LIMIT 5`
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
      },
      inventory: {
        total: Number(productStats?.total_products || 0),
        lowStock: Number(productStats?.low_stock_count || 0),
        outOfStock: Number(productStats?.out_of_stock_count || 0),
      },
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
      topProducts,
    };
  }

  /**
   * Comprehensive 11 Relational Database Reports Engine
   * Reports: Sales, Orders, Payments, Customers, Products, Categories, Brands, Membership, Coupons, Welcome Bonus, Inventory
   */
  async getDetailedReport({ type = 'sales', period = 'last30', fromDate = null, toDate = null }) {
    const dateInfo = this.getDateFilter('created_at', period, fromDate, toDate);

    switch (type.toLowerCase()) {
      case 'sales': {
        const oDate = this.getDateFilter('o.created_at', period, fromDate, toDate);
        const summary = await db.get(
          `SELECT 
            COUNT(o.id) as total_orders,
            COALESCE(SUM(o.subtotal), 0) as gross_subtotal,
            COALESCE(SUM(o.tax), 0) as tax_collected,
            COALESCE(SUM(o.delivery_charge), 0) as delivery_fees,
            COALESCE(SUM(COALESCE(o.membership_discount, 0) + COALESCE(o.coupon_discount, 0) + COALESCE(o.bonus_discount, 0)), 0) as discounts_given,
            COALESCE(SUM(o.grand_total), 0) as net_revenue,
            COALESCE(AVG(o.grand_total), 0) as avg_order_value
           FROM orders o
           WHERE o.order_status != 'CANCELLED' AND ${oDate.clause}`,
          oDate.args
        );

        const breakdown = await db.query(
          `SELECT DATE(o.created_at) as date,
                  COUNT(o.id) as order_count,
                  COALESCE(SUM(o.subtotal), 0) as subtotal,
                  COALESCE(SUM(o.tax), 0) as tax,
                  COALESCE(SUM(o.delivery_charge), 0) as delivery,
                  COALESCE(SUM(COALESCE(o.membership_discount, 0) + COALESCE(o.coupon_discount, 0) + COALESCE(o.bonus_discount, 0)), 0) as discount,
                  COALESCE(SUM(o.grand_total), 0) as total_sales
           FROM orders o
           WHERE o.order_status != 'CANCELLED' AND ${oDate.clause}
           GROUP BY DATE(o.created_at)
           ORDER BY date DESC`,
          oDate.args
        );

        return { summary, rows: breakdown };
      }

      case 'orders': {
        const oDate = this.getDateFilter('o.created_at', period, fromDate, toDate);
        const summary = await db.get(
          `SELECT 
            COUNT(o.id) as total_orders,
            SUM(CASE WHEN o.order_status = 'DELIVERED' THEN 1 ELSE 0 END) as delivered,
            SUM(CASE WHEN o.order_status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
            SUM(CASE WHEN o.order_status NOT IN ('DELIVERED', 'CANCELLED') THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN o.source = 'ONLINE' THEN 1 ELSE 0 END) as online_count,
            SUM(CASE WHEN o.source = 'IN_HOUSE' THEN 1 ELSE 0 END) as pos_count,
            COALESCE(SUM(o.grand_total), 0) as total_value
           FROM orders o
           WHERE ${oDate.clause}`,
          oDate.args
        );

        const rows = await db.query(
          `SELECT o.order_number, o.created_at, o.source, o.order_status, o.payment_status,
                  o.payment_method, o.grand_total, u.name as customer_name, u.mobile as customer_mobile
           FROM orders o
           JOIN users u ON o.user_id = u.id
           WHERE ${oDate.clause}
           ORDER BY o.id DESC LIMIT 500`,
          oDate.args
        );

        return { summary, rows };
      }

      case 'payments': {
        const pDate = this.getDateFilter('p.created_at', period, fromDate, toDate);
        const summary = await db.get(
          `SELECT 
            COUNT(p.id) as total_transactions,
            COALESCE(SUM(p.amount), 0) as total_amount,
            SUM(CASE WHEN p.status = 'SUCCESS' THEN 1 ELSE 0 END) as success_count,
            SUM(CASE WHEN p.status = 'PENDING' THEN 1 ELSE 0 END) as pending_count,
            SUM(CASE WHEN p.status = 'FAILED' THEN 1 ELSE 0 END) as failed_count
           FROM payments p
           WHERE ${pDate.clause}`,
          pDate.args
        );

        const rows = await db.query(
          `SELECT p.payment_method, p.status, COUNT(p.id) as txn_count, COALESCE(SUM(p.amount), 0) as volume
           FROM payments p
           WHERE ${pDate.clause}
           GROUP BY p.payment_method, p.status
           ORDER BY volume DESC`,
          pDate.args
        );

        return { summary, rows };
      }

      case 'cod': {
        const pDate = this.getDateFilter('p.created_at', period, fromDate, toDate);
        const summary = await db.get(
          `SELECT 
            COUNT(p.id) as total_cod_orders,
            COALESCE(SUM(CASE WHEN p.status = 'COD_COLLECTED' THEN p.amount ELSE 0 END), 0) as cod_pending_settlement,
            COALESCE(SUM(CASE WHEN p.status = 'COD_SETTLED' THEN p.amount ELSE 0 END), 0) as cod_settled,
            COALESCE(SUM(CASE WHEN p.status IN ('COD_COLLECTED', 'COD_SETTLED') THEN p.amount ELSE 0 END), 0) as cod_total_collected,
            COALESCE(SUM(CASE WHEN p.status = 'COD_PENDING_COLLECTION' THEN p.amount ELSE 0 END), 0) as cod_pending_collection
           FROM payments p
           WHERE p.payment_method = 'COD' AND ${pDate.clause}`,
          pDate.args
        );

        // Staff-wise collection breakdown
        const staffWise = await db.query(
          `SELECT 
            u.id as staff_id,
            COALESCE(u.name, 'Unassigned / Store') as staff_name,
            u.mobile as staff_mobile,
            COUNT(p.id) as collections_count,
            COALESCE(SUM(CASE WHEN p.status = 'COD_COLLECTED' THEN p.amount ELSE 0 END), 0) as pending_settlement_amount,
            COALESCE(SUM(CASE WHEN p.status = 'COD_SETTLED' THEN p.amount ELSE 0 END), 0) as settled_amount,
            COALESCE(SUM(p.amount), 0) as total_collected_amount
           FROM payments p
           LEFT JOIN users u ON p.collected_by = u.id
           WHERE p.payment_method = 'COD' AND p.status IN ('COD_COLLECTED', 'COD_SETTLED') AND ${pDate.clause}
           GROUP BY p.collected_by
           ORDER BY total_collected_amount DESC`,
          pDate.args
        );

        // Recent COD transactions
        const rows = await db.query(
          `SELECT 
            p.id, p.order_id, o.order_number, p.amount, p.status, p.created_at,
            p.collected_at, uColl.name as collected_by_name,
            p.settled_at, uSett.name as settled_by_name, p.settlement_ref, p.settlement_note
           FROM payments p
           JOIN orders o ON p.order_id = o.id
           LEFT JOIN users uColl ON p.collected_by = uColl.id
           LEFT JOIN users uSett ON p.settled_by = uSett.id
           WHERE p.payment_method = 'COD' AND ${pDate.clause}
           ORDER BY p.id DESC LIMIT 200`,
          pDate.args
        );

        return { summary, staffWise, rows };
      }

      case 'customers': {
        const uDate = this.getDateFilter('u.created_at', period, fromDate, toDate);
        const summary = await db.get(
          `SELECT 
            COUNT(u.id) as new_signups,
            SUM(CASE WHEN u.status = 'ACTIVE' THEN 1 ELSE 0 END) as active_accounts
           FROM users u
           WHERE u.account_type = 'CUSTOMER' AND ${uDate.clause}`,
          uDate.args
        );

        const rows = await db.query(
          `SELECT u.id, u.name, u.mobile, u.email, u.created_at, u.status,
                  COUNT(o.id) as order_count,
                  COALESCE(SUM(CASE WHEN o.order_status != 'CANCELLED' THEN o.grand_total ELSE 0 END), 0) as total_spent
           FROM users u
           LEFT JOIN orders o ON u.id = o.user_id
           WHERE u.account_type = 'CUSTOMER' AND ${uDate.clause}
           GROUP BY u.id
           ORDER BY total_spent DESC LIMIT 200`,
          uDate.args
        );

        return { summary, rows };
      }

      case 'products': {
        const oiDate = this.getDateFilter('o.created_at', period, fromDate, toDate);
        const summary = await db.get(
          `SELECT 
            COUNT(DISTINCT oi.product_id) as products_sold,
            COALESCE(SUM(oi.quantity), 0) as total_units_sold,
            COALESCE(SUM(oi.total), 0) as gross_product_revenue
           FROM order_items oi
           JOIN orders o ON oi.order_id = o.id
           WHERE o.order_status != 'CANCELLED' AND ${oiDate.clause}`,
          oiDate.args
        );

        const rows = await db.query(
          `SELECT p.id, p.product_code, p.name, c.name as category_name, p.stock,
                  COALESCE(SUM(oi.quantity), 0) as units_sold,
                  COALESCE(SUM(oi.total), 0) as total_revenue
           FROM products p
           JOIN order_items oi ON p.id = oi.product_id
           JOIN orders o ON oi.order_id = o.id
           LEFT JOIN categories c ON p.category_id = c.id
           WHERE o.order_status != 'CANCELLED' AND ${oiDate.clause}
           GROUP BY p.id
           ORDER BY total_revenue DESC LIMIT 200`,
          oiDate.args
        );

        return { summary, rows };
      }

      case 'categories': {
        const oDate = this.getDateFilter('o.created_at', period, fromDate, toDate);
        const rows = await db.query(
          `SELECT c.id, c.name, c.slug,
                  COUNT(DISTINCT p.id) as product_count,
                  COALESCE(SUM(oi.quantity), 0) as units_sold,
                  COALESCE(SUM(oi.total), 0) as revenue
           FROM categories c
           LEFT JOIN products p ON c.id = p.category_id
           LEFT JOIN order_items oi ON p.id = oi.product_id
           LEFT JOIN orders o ON oi.order_id = o.id AND o.order_status != 'CANCELLED' AND ${oDate.clause}
           GROUP BY c.id
           ORDER BY revenue DESC`,
          oDate.args
        );

        const totalRevenue = rows.reduce((acc, r) => acc + Number(r.revenue || 0), 0);
        return { summary: { totalCategories: rows.length, totalRevenue }, rows };
      }

      case 'brands': {
        const oDate = this.getDateFilter('o.created_at', period, fromDate, toDate);
        const rows = await db.query(
          `SELECT b.id, b.name, b.slug,
                  COUNT(DISTINCT p.id) as product_count,
                  COALESCE(SUM(oi.quantity), 0) as units_sold,
                  COALESCE(SUM(oi.total), 0) as revenue
           FROM brands b
           LEFT JOIN products p ON b.id = p.brand_id
           LEFT JOIN order_items oi ON p.id = oi.product_id
           LEFT JOIN orders o ON oi.order_id = o.id AND o.order_status != 'CANCELLED' AND ${oDate.clause}
           GROUP BY b.id
           ORDER BY revenue DESC`,
          oDate.args
        );

        const totalRevenue = rows.reduce((acc, r) => acc + Number(r.revenue || 0), 0);
        return { summary: { totalBrands: rows.length, totalRevenue }, rows };
      }

      case 'membership': {
        const cmDate = this.getDateFilter('cm.created_at', period, fromDate, toDate);
        const summary = await db.get(
          `SELECT 
            COUNT(cm.id) as new_subscriptions,
            COALESCE(SUM(mp.price), 0) as revenue_collected
           FROM customer_memberships cm
           JOIN membership_plans mp ON cm.plan_id = mp.id
           WHERE ${cmDate.clause}`,
          cmDate.args
        );

        const rows = await db.query(
          `SELECT cm.id, u.name as customer_name, u.mobile as customer_mobile,
                  mp.name as plan_name, mp.price, cm.start_date, cm.end_date, cm.status
           FROM customer_memberships cm
           JOIN users u ON cm.user_id = u.id
           JOIN membership_plans mp ON cm.plan_id = mp.id
           WHERE ${cmDate.clause}
           ORDER BY cm.id DESC`,
          cmDate.args
        );

        return { summary, rows };
      }

      case 'coupons': {
        const cuDate = this.getDateFilter('cu.created_at', period, fromDate, toDate);
        const summary = await db.get(
          `SELECT 
            COUNT(cu.id) as total_redemptions,
            COALESCE(SUM(cu.discount_amount), 0) as total_discount_given
           FROM coupon_usages cu
           WHERE ${cuDate.clause}`,
          cuDate.args
        );

        const rows = await db.query(
          `SELECT c.code, c.discount_type, c.discount_value,
                  COUNT(cu.id) as redemption_count,
                  COALESCE(SUM(cu.discount_amount), 0) as total_discount
           FROM coupons c
           LEFT JOIN coupon_usages cu ON c.id = cu.coupon_id AND ${cuDate.clause}
           GROUP BY c.id
           ORDER BY redemption_count DESC`,
          cuDate.args
        );

        return { summary, rows };
      }

      case 'welcomebonus':
      case 'welcome_bonus': {
        const bDate = this.getDateFilter('created_at', period, fromDate, toDate);
        const summary = await db.get(
          `SELECT 
            COALESCE(SUM(CASE WHEN type = 'WELCOME_BONUS' THEN amount ELSE 0 END), 0) as issued,
            COALESCE(SUM(CASE WHEN type = 'REDEMPTION' THEN amount ELSE 0 END), 0) as redeemed,
            COALESCE(SUM(CASE WHEN type = 'REVERSAL' THEN amount ELSE 0 END), 0) as reversed
           FROM customer_bonus_transactions
           WHERE ${bDate.clause}`,
          bDate.args
        );

        const rows = await db.query(
          `SELECT cbt.id, u.name as customer_name, u.mobile, cbt.type, cbt.amount,
                  cbt.reference_type, cbt.reference_id, cbt.created_at, cbt.status, cbt.description
           FROM customer_bonus_transactions cbt
           JOIN users u ON cbt.user_id = u.id
           WHERE ${this.getDateFilter('cbt.created_at', period, fromDate, toDate).clause}
           ORDER BY cbt.id DESC LIMIT 300`,
          this.getDateFilter('cbt.created_at', period, fromDate, toDate).args
        );

        return { summary, rows };
      }

      case 'inventory': {
        const summary = await db.get(
          `SELECT 
            COUNT(id) as total_sku,
            COALESCE(SUM(stock), 0) as total_units_in_stock,
            COALESCE(SUM(stock * selling_price), 0) as total_stock_value,
            SUM(CASE WHEN stock <= minimum_stock AND stock > 0 THEN 1 ELSE 0 END) as low_stock_count,
            SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END) as out_of_stock_count
           FROM products WHERE status = 'ACTIVE'`
        );

        const rows = await db.query(
          `SELECT p.id, p.product_code, p.name, c.name as category_name,
                  p.stock, p.minimum_stock, p.selling_price,
                  (p.stock * p.selling_price) as stock_valuation,
                  p.status
           FROM products p
           LEFT JOIN categories c ON p.category_id = c.id
           ORDER BY p.stock ASC LIMIT 500`
        );

        return { summary, rows };
      }

      default:
        throw new Error(`Invalid report type: "${type}". Supported: sales, orders, payments, customers, products, categories, brands, membership, coupons, welcomebonus, inventory.`);
    }
  }
}

export default new ReportService();
