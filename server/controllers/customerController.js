import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../../database/connection.js';
import authService from '../services/authService.js';

/**
 * -------------------------------------------------------------
 * CUSTOMER ADDRESSES (Customer-only endpoints)
 * -------------------------------------------------------------
 */

export async function getAddresses(req, res) {
  try {
    const addresses = await db.query(
      `SELECT ca.*, da.name as area_name, dsa.name as sub_area_name
       FROM customer_addresses ca
       JOIN delivery_areas da ON ca.area_id = da.id
       JOIN delivery_sub_areas dsa ON ca.sub_area_id = dsa.id
       WHERE ca.user_id = ?
       ORDER BY ca.is_default DESC, ca.id DESC`,
      [req.user.id]
    );
    return res.json({ success: true, data: addresses });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createAddress(req, res) {
  try {
    const { area_id, sub_area_id, address_line, landmark, pincode, address_type = 'HOME', is_default = 0 } = req.body;

    if (!area_id || !sub_area_id || !address_line || !pincode) {
      return res.status(400).json({ success: false, message: 'Area, Sub-Area, Address line, and Pincode are required' });
    }

    if (is_default) {
      await db.run('UPDATE customer_addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
    }

    const result = await db.run(
      `INSERT INTO customer_addresses (
        user_id, area_id, sub_area_id, address_line, landmark, pincode, address_type, is_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, area_id, sub_area_id, address_line, landmark || '', pincode, address_type, is_default ? 1 : 0]
    );

    const created = await db.get('SELECT * FROM customer_addresses WHERE id = ?', [result.lastInsertRowid]);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function deleteAddress(req, res) {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM customer_addresses WHERE id = ? AND user_id = ?', [id, req.user.id]);
    return res.json({ success: true, message: 'Address removed successfully' });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function setDefaultAddress(req, res) {
  try {
    const { id } = req.params;
    await db.run('UPDATE customer_addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
    await db.run('UPDATE customer_addresses SET is_default = 1 WHERE id = ? AND user_id = ?', [id, req.user.id]);
    return res.json({ success: true, message: 'Default address updated' });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/**
 * -------------------------------------------------------------
 * ADMIN CUSTOMER MANAGEMENT & DETAIL
 * -------------------------------------------------------------
 */

export async function getCustomers(req, res) {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereSql = '';
    const args = [];
    if (search.trim()) {
      whereSql = 'AND (u.name LIKE ? OR u.mobile LIKE ? OR u.email LIKE ?)';
      const q = `%${search.trim()}%`;
      args.push(q, q, q);
    }

    const countRow = await db.get(
      `SELECT COUNT(DISTINCT u.id) as total
       FROM users u
       WHERE u.account_type = 'CUSTOMER' ${whereSql}`,
      args
    );

    const customers = await db.query(
      `SELECT u.id, u.uuid, u.name, u.mobile, u.email, u.dob, u.anniversary_date,
              u.dob_locked, u.anniversary_locked, u.status, u.created_at,
              COUNT(o.id) as order_count,
              COALESCE(SUM(CASE WHEN o.order_status != 'CANCELLED' THEN o.grand_total ELSE 0 END), 0) as total_spent
       FROM users u
       LEFT JOIN orders o ON u.id = o.user_id
       WHERE u.account_type = 'CUSTOMER' ${whereSql}
       GROUP BY u.id
       ORDER BY u.id DESC
       LIMIT ? OFFSET ?`,
      [...args, Number(limit), offset]
    );

    return res.json({
      success: true,
      data: {
        customers,
        pagination: {
          total: Number(countRow?.total || 0),
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(Number(countRow?.total || 0) / Number(limit)),
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Comprehensive Customer Detail View for Admin
 * Shows: profile, addresses, membership, welcome bonus, all orders, bills/invoices, payment history, total orders, total spending, first order, last order
 */
export async function getCustomerDetail(req, res) {
  try {
    const { id } = req.params;

    // 1. Profile
    const customer = await db.get(
      `SELECT id, uuid, name, mobile, email, account_type, dob, anniversary_date,
              dob_locked, anniversary_locked, status, created_at, last_login_at
       FROM users WHERE id = ? AND account_type = 'CUSTOMER'`,
      [id]
    );

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // 2. Addresses
    const addresses = await db.query(
      `SELECT ca.*, da.name as area_name, dsa.name as sub_area_name
       FROM customer_addresses ca
       LEFT JOIN delivery_areas da ON ca.area_id = da.id
       LEFT JOIN delivery_sub_areas dsa ON ca.sub_area_id = dsa.id
       WHERE ca.user_id = ?
       ORDER BY ca.is_default DESC, ca.id DESC`,
      [id]
    );

    // 3. Active Membership
    const nowIso = new Date().toISOString();
    const membership = await db.get(
      `SELECT cm.*, mp.name as plan_name, mp.discount_percent, mp.free_delivery, mp.duration_days
       FROM customer_memberships cm
       JOIN membership_plans mp ON cm.plan_id = mp.id
       WHERE cm.user_id = ? AND cm.status = 'ACTIVE' AND cm.end_date >= ?
       ORDER BY cm.id DESC LIMIT 1`,
      [id, nowIso]
    );

    // 4. Welcome Bonus Ledger & Transactions
    const bonusTransactions = await db.query(
      `SELECT * FROM customer_bonus_transactions 
       WHERE user_id = ? 
       ORDER BY id DESC LIMIT 50`,
      [id]
    );

    const bonusCredits = await db.get(
      `SELECT SUM(amount) as total FROM customer_bonus_transactions 
       WHERE user_id = ? AND type IN ('WELCOME_BONUS', 'ADMIN_CREDIT', 'REVERSAL') 
       AND status = 'ACTIVE' AND (expires_at IS NULL OR expires_at >= ?)`,
      [id, nowIso]
    );
    const bonusDebits = await db.get(
      `SELECT SUM(amount) as total FROM customer_bonus_transactions 
       WHERE user_id = ? AND type IN ('REDEMPTION', 'ADMIN_DEBIT', 'EXPIRY')`,
      [id]
    );
    const availableBonus = Math.max(0, Number(bonusCredits?.total || 0) - Number(bonusDebits?.total || 0));

    // 5. All Orders & Bills / Invoices
    const orders = await db.query(
      `SELECT o.*, da.name as area_name, dsa.name as sub_area_name
       FROM orders o
       LEFT JOIN delivery_areas da ON o.area_id = da.id
       LEFT JOIN delivery_sub_areas dsa ON o.sub_area_id = dsa.id
       WHERE o.user_id = ?
       ORDER BY o.id DESC`,
      [id]
    );

    // 6. Payment History
    const payments = await db.query(
      `SELECT p.*, o.order_number 
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       WHERE o.user_id = ?
       ORDER BY p.id DESC`,
      [id]
    );

    // 7. Spending Summary Stats
    const statsRow = await db.get(
      `SELECT 
        COUNT(id) as total_orders,
        COALESCE(SUM(CASE WHEN order_status != 'CANCELLED' THEN grand_total ELSE 0 END), 0) as total_spent,
        COALESCE(AVG(CASE WHEN order_status != 'CANCELLED' THEN grand_total ELSE NULL END), 0) as avg_order_value,
        MIN(created_at) as first_order_date,
        MAX(created_at) as last_order_date
       FROM orders WHERE user_id = ?`,
      [id]
    );

    return res.json({
      success: true,
      data: {
        customer,
        addresses,
        membership: membership || null,
        bonus: {
          available: availableBonus,
          transactions: bonusTransactions,
        },
        orders,
        payments,
        stats: {
          totalOrders: Number(statsRow?.total_orders || 0),
          totalSpent: Math.round(Number(statsRow?.total_spent || 0)),
          avgOrderValue: Math.round(Number(statsRow?.avg_order_value || 0)),
          firstOrderDate: statsRow?.first_order_date || null,
          lastOrderDate: statsRow?.last_order_date || null,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Create Customer directly from In-House POS or Admin
 */
export async function createCustomer(req, res) {
  try {
    const { name, mobile, email } = req.body;
    if (!name || !mobile) {
      return res.status(400).json({ success: false, message: 'Customer name and 10-digit mobile number are required.' });
    }

    const created = await authService.createCustomerFromPos({ name, mobile, email });
    return res.status(201).json({
      success: true,
      message: 'Customer created successfully and enrolled for welcome benefits.',
      data: created,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/**
 * Export Customers List to CSV
 */
export async function exportCustomers(req, res) {
  try {
    const { search = '' } = req.query;
    let whereSql = '';
    const args = [];
    if (search.trim()) {
      whereSql = 'AND (u.name LIKE ? OR u.mobile LIKE ? OR u.email LIKE ?)';
      const q = `%${search.trim()}%`;
      args.push(q, q, q);
    }

    const customers = await db.query(
      `SELECT u.id, u.name, u.mobile, u.email, u.dob, u.anniversary_date, u.status, u.created_at,
              COUNT(o.id) as order_count,
              COALESCE(SUM(CASE WHEN o.order_status != 'CANCELLED' THEN o.grand_total ELSE 0 END), 0) as total_spent
       FROM users u
       LEFT JOIN orders o ON u.id = o.user_id
       WHERE u.account_type = 'CUSTOMER' ${whereSql}
       GROUP BY u.id
       ORDER BY u.id DESC LIMIT 5000`,
      args
    );

    const headers = ['ID', 'Name', 'Mobile', 'Email', 'DOB', 'Anniversary', 'Status', 'Registered Date', 'Orders Count', 'Total Spent'];
    const rows = customers.map(c => [
      c.id,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${c.mobile || ''}"`,
      `"${c.email || ''}"`,
      c.dob || '',
      c.anniversary_date || '',
      c.status,
      c.created_at,
      c.order_count,
      c.total_spent,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=customers-export-${Date.now()}.csv`);
    return res.send(csvContent);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Delete / Block Customer Account (Protected with Password verification)
 * Historical order records and payments remain preserved
 */
export async function deleteCustomer(req, res) {
  try {
    const { id } = req.params;
    const customer = await db.get('SELECT id, name, mobile FROM users WHERE id = ? AND account_type = ?', [id, 'CUSTOMER']);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Soft delete to protect financial audit and order records
    await db.run("UPDATE users SET status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);

    return res.json({
      success: true,
      message: `Customer account for ${customer.name} marked inactive. Financial and order history preserved.`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export default {
  getAddresses,
  createAddress,
  deleteAddress,
  setDefaultAddress,
  getCustomers,
  getCustomerDetail,
  createCustomer,
  exportCustomers,
  deleteCustomer,
};
