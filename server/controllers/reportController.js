import reportService from '../services/reportService.js';
import db from '../../database/connection.js';

export async function getDashboardStats(req, res) {
  try {
    const summary = await reportService.getDashboardSummary();
    return res.json({ success: true, data: summary });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getCustomerStats(req, res) {
  try {
    const { id } = req.params;
    const stats = await reportService.getCustomerStats(id);
    return res.json({ success: true, data: stats });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getAuditLogs(req, res) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const logs = await db.query(
      `SELECT al.*, u.name as user_name, u.mobile as user_mobile
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.id DESC
       LIMIT ? OFFSET ?`,
      [Number(limit), offset]
    );

    return res.json({ success: true, data: logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getNotificationLogs(req, res) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const logs = await db.query(
      `SELECT n.*, u.name as user_name, o.order_number 
       FROM notifications n
       LEFT JOIN users u ON n.user_id = u.id
       LEFT JOIN orders o ON n.order_id = o.id
       ORDER BY n.id DESC
       LIMIT ? OFFSET ?`,
      [Number(limit), offset]
    );

    return res.json({ success: true, data: logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export default {
  getDashboardStats,
  getCustomerStats,
  getAuditLogs,
  getNotificationLogs,
};
