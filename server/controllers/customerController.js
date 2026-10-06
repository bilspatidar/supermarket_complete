import db from '../../database/connection.js';

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
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       WHERE r.name = 'CUSTOMER' ${whereSql}`,
      args
    );

    const customers = await db.query(
      `SELECT u.id, u.uuid, u.name, u.mobile, u.email, u.dob, u.anniversary_date,
              u.dob_locked, u.anniversary_locked, u.status, u.created_at,
              COUNT(o.id) as order_count,
              COALESCE(SUM(CASE WHEN o.order_status != 'CANCELLED' THEN o.grand_total ELSE 0 END), 0) as total_spent
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       LEFT JOIN orders o ON u.id = o.user_id
       WHERE r.name = 'CUSTOMER' ${whereSql}
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
        },
      },
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
};
