import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../../database/connection.js';

export async function getStaffList(req, res) {
  try {
    const staff = await db.query(
      `SELECT u.id, u.uuid, u.name, u.mobile, u.email, u.status, u.created_at,
              GROUP_CONCAT(r.name) as roles
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       WHERE r.name != 'CUSTOMER'
       GROUP BY u.id
       ORDER BY u.id ASC`
    );

    const roles = await db.query('SELECT * FROM roles WHERE name != "CUSTOMER"');
    const permissions = await db.query('SELECT * FROM permissions ORDER BY group_name ASC');

    return res.json({
      success: true,
      data: {
        staff,
        roles,
        permissions,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createStaff(req, res) {
  try {
    const { name, mobile, password, email, roleId } = req.body;
    if (!name || !mobile || !password || !roleId) {
      return res.status(400).json({ success: false, message: 'Name, Mobile, Password, and Role are required' });
    }

    const cleanMobile = String(mobile).replace(/[^0-9]/g, '');
    const existing = await db.get('SELECT id FROM users WHERE mobile = ?', [cleanMobile]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Mobile already registered' });
    }

    const hash = await bcrypt.hash(password, 10);
    const userRes = await db.run(
      `INSERT INTO users (uuid, mobile, password_hash, name, email, account_type, status, mobile_verified)
       VALUES (?, ?, ?, ?, ?, 'INTERNAL', 'ACTIVE', 1)`,
      [crypto.randomUUID(), cleanMobile, hash, name, email || null]
    );

    const userId = userRes.lastInsertRowid;
    await db.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleId]);

    // Audit log
    await db.run(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address, notes)
       VALUES (?, 'STAFF_CREATE', 'USER', ?, ?, ?, ?)`,
      [req.user.id, String(userId), JSON.stringify({ name, mobile, roleId }), req.ip || '127.0.0.1', 'Created staff account']
    );

    return res.status(201).json({ success: true, message: 'Staff member created successfully' });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function updateStaffRole(req, res) {
  try {
    const { id } = req.params;
    const { roleId } = req.body;

    await db.run('DELETE FROM user_roles WHERE user_id = ?', [id]);
    await db.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [id, roleId]);

    return res.json({ success: true, message: 'Staff role updated successfully' });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export default {
  getStaffList,
  createStaff,
  updateStaffRole,
};
