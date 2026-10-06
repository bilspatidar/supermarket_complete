import db from '../../database/connection.js';

/**
 * Get all roles with their assigned permission IDs and user counts
 */
export async function getRoles(req, res) {
  try {
    const roles = await db.query(`
      SELECT r.*, COUNT(ur.user_id) as user_count
      FROM roles r
      LEFT JOIN user_roles ur ON r.id = ur.role_id
      GROUP BY r.id
      ORDER BY r.id ASC
    `);

    // Fetch assigned permission IDs for each role
    const rolePermissions = await db.query('SELECT role_id, permission_id FROM role_permissions');
    const permMap = {};
    for (const rp of rolePermissions) {
      if (!permMap[rp.role_id]) permMap[rp.role_id] = [];
      permMap[rp.role_id].push(rp.permission_id);
    }

    const data = roles.map(r => ({
      ...r,
      user_count: Number(r.user_count || 0),
      permission_ids: permMap[r.id] || [],
    }));

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Get all permissions grouped by module
 */
export async function getPermissions(req, res) {
  try {
    const permissions = await db.query('SELECT * FROM permissions ORDER BY group_name ASC, name ASC');
    
    // Group permissions by group_name
    const grouped = {};
    for (const p of permissions) {
      const grp = p.group_name || 'General';
      if (!grouped[grp]) grouped[grp] = [];
      grouped[grp].push(p);
    }

    return res.json({ success: true, data: { permissions, grouped } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Create a new custom role with assigned permissions
 */
export async function createRole(req, res) {
  try {
    const { name, description, permissionIds = [] } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Role name is required' });
    }

    const cleanName = name.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const existing = await db.get('SELECT id FROM roles WHERE name = ?', [cleanName]);
    if (existing) {
      return res.status(400).json({ success: false, message: `Role "${cleanName}" already exists` });
    }

    await db.transaction(async (tx) => {
      const result = await tx.run(
        `INSERT INTO roles (name, description, is_system, status) VALUES (?, ?, 0, 'ACTIVE')`,
        [cleanName, description ? description.trim() : null]
      );
      const roleId = result.lastInsertRowid;

      if (Array.isArray(permissionIds) && permissionIds.length > 0) {
        for (const pId of permissionIds) {
          await tx.run('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, pId]);
        }
      }
    });

    return res.status(201).json({ success: true, message: `Role ${cleanName} created successfully` });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/**
 * Update an existing role's name, description, status, and permissions
 */
export async function updateRole(req, res) {
  try {
    const { id } = req.params;
    const { name, description, permissionIds, status } = req.body;

    const role = await db.get('SELECT * FROM roles WHERE id = ?', [id]);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    // Protect SUPER_ADMIN from disabling or renaming
    if (role.name === 'SUPER_ADMIN') {
      if (status && status !== 'ACTIVE') {
        return res.status(400).json({ success: false, message: 'SUPER_ADMIN cannot be disabled' });
      }
    }

    await db.transaction(async (tx) => {
      let finalName = role.name;
      if (name && role.name !== 'SUPER_ADMIN' && role.name !== 'CUSTOMER') {
        finalName = name.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
      }

      const newStatus = status || role.status || 'ACTIVE';
      await tx.run(
        'UPDATE roles SET name = ?, description = ?, status = ? WHERE id = ?',
        [finalName, description !== undefined ? description : role.description, newStatus, id]
      );

      // Reassign permissions if provided
      if (Array.isArray(permissionIds) && role.name !== 'SUPER_ADMIN') {
        await tx.run('DELETE FROM role_permissions WHERE role_id = ?', [id]);
        for (const pId of permissionIds) {
          await tx.run('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [id, pId]);
        }
      }
    });

    return res.json({ success: true, message: 'Role updated successfully' });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/**
 * Toggle enable/disable status for a role
 */
export async function toggleRoleStatus(req, res) {
  try {
    const { id } = req.params;
    const role = await db.get('SELECT * FROM roles WHERE id = ?', [id]);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    if (role.name === 'SUPER_ADMIN' || role.name === 'CUSTOMER') {
      return res.status(400).json({ success: false, message: 'Core system roles cannot be disabled' });
    }

    const newStatus = role.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await db.run('UPDATE roles SET status = ? WHERE id = ?', [newStatus, id]);

    return res.json({ success: true, message: `Role status set to ${newStatus}`, status: newStatus });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/**
 * Delete a role where safe
 */
export async function deleteRole(req, res) {
  try {
    const { id } = req.params;
    const role = await db.get('SELECT * FROM roles WHERE id = ?', [id]);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    if (role.is_system === 1 || ['SUPER_ADMIN', 'CUSTOMER', 'STORE_MANAGER', 'DELIVERY_STAFF'].includes(role.name)) {
      return res.status(400).json({ success: false, message: `Cannot delete protected system role "${role.name}"` });
    }

    // Check if any users are assigned to this role
    const assignedCountRow = await db.get('SELECT COUNT(*) as count FROM user_roles WHERE role_id = ?', [id]);
    const assignedCount = Number(assignedCountRow?.count || 0);
    if (assignedCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete role "${role.name}" because it is currently assigned to ${assignedCount} user(s). Reassign them first.`,
      });
    }

    await db.transaction(async (tx) => {
      await tx.run('DELETE FROM role_permissions WHERE role_id = ?', [id]);
      await tx.run('DELETE FROM roles WHERE id = ?', [id]);
    });

    return res.json({ success: true, message: `Role "${role.name}" deleted successfully` });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export default {
  getRoles,
  getPermissions,
  createRole,
  updateRole,
  toggleRoleStatus,
  deleteRole,
};
