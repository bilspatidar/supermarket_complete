import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../../database/connection.js';

const jwtSecret = process.env.JWT_ACCESS_SECRET || 'supermarket_jwt_access_secret_production_key_2026_xyz';

/**
 * Standard Authentication Middleware
 * Validates JWT session and loads active user, roles, permissions and account_type from DB
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, jwtSecret);

    // Verify user is still active in DB
    const user = await db.get(
      'SELECT id, uuid, mobile, name, email, status, account_type FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        message: 'Account inactive or session expired. Please re-login.',
      });
    }

    // Load active roles & permissions directly from DB
    const rolesRows = await db.query(
      `SELECT r.name FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = ?`,
      [user.id]
    );
    const roles = rolesRows.map(r => r.name);

    const permRows = await db.query(
      `SELECT DISTINCT p.name FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = ?`,
      [user.id]
    );
    const permissions = permRows.map(p => p.name);

    req.user = {
      id: user.id,
      uuid: user.uuid,
      mobile: user.mobile,
      name: user.name,
      email: user.email,
      account_type: user.account_type || 'CUSTOMER',
      roles,
      permissions,
    };

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session token.',
      error: err.message,
    });
  }
}

/**
 * Optional Authentication for guest/customer browsing
 */
export async function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, jwtSecret);
    const user = await db.get(
      'SELECT id, uuid, mobile, name, email, status, account_type FROM users WHERE id = ?',
      [decoded.id]
    );
    if (user && user.status === 'ACTIVE') {
      const rolesRows = await db.query(
        `SELECT r.name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?`,
        [user.id]
      );
      const permRows = await db.query(
        `SELECT DISTINCT p.name FROM permissions p JOIN role_permissions rp ON p.id = rp.permission_id JOIN user_roles ur ON rp.role_id = ur.role_id WHERE ur.user_id = ?`,
        [user.id]
      );

      req.user = {
        id: user.id,
        uuid: user.uuid,
        mobile: user.mobile,
        name: user.name,
        email: user.email,
        account_type: user.account_type || 'CUSTOMER',
        roles: rolesRows.map(r => r.name),
        permissions: permRows.map(p => p.name),
      };
    } else {
      req.user = null;
    }
  } catch (err) {
    req.user = null;
  }
  next();
}

/**
 * CUSTOMER Token Only Middleware
 * Internal staff/admin accounts receive 403 Forbidden
 */
export function requireCustomer(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please login as customer.',
    });
  }

  if (req.user.account_type !== 'CUSTOMER') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Internal staff/admin accounts cannot perform customer store operations or access customer accounts.',
    });
  }

  next();
}

/**
 * INTERNAL Staff / Admin Only Middleware
 * Customer accounts receive 403 Forbidden
 */
export function requireInternal(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please login with staff credentials.',
    });
  }

  if (req.user.account_type !== 'INTERNAL') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Customer accounts cannot access internal administrative endpoints.',
    });
  }

  next();
}

/**
 * Verify Current Password for sensitive delete operations
 * Prevents unauthorized deletion and accidental data destruction
 */
export async function verifyCurrentPassword(req, res, next) {
  try {
    const password = req.headers['x-confirm-password'] || req.body?.confirmPassword || req.query?.confirmPassword;
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Current password confirmation is required for sensitive delete operations.',
        requiresPassword: true,
      });
    }

    const user = await db.get('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const match = await bcrypt.compare(String(password), user.password_hash);
    if (!match) {
      return res.status(403).json({
        success: false,
        message: 'Invalid password. Deletion cancelled.',
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export default {
  authenticate,
  optionalAuthenticate,
  requireCustomer,
  requireInternal,
  verifyCurrentPassword,
};
