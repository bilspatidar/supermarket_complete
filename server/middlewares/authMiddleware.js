import jwt from 'jsonwebtoken';
import db from '../../database/connection.js';

const jwtSecret = process.env.JWT_ACCESS_SECRET || 'supermarket_jwt_access_secret_production_key_2026_xyz';

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
    const user = await db.get('SELECT id, uuid, mobile, name, status FROM users WHERE id = ?', [decoded.id]);
    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        message: 'Account inactive or session expired. Please re-login.',
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session token.',
      error: err.message,
    });
  }
}

export function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
  } catch (err) {
    req.user = null;
  }
  next();
}

export default {
  authenticate,
  optionalAuthenticate,
};
