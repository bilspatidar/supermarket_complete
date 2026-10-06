import db from '../../database/connection.js';

export async function getBonusLedger(req, res) {
  try {
    const userId = req.user.id;
    const nowIso = new Date().toISOString();

    const transactions = await db.query(
      `SELECT * FROM customer_bonus_transactions 
       WHERE user_id = ? 
       ORDER BY id DESC`,
      [userId]
    );

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

    const availableBalance = Math.max(0, Number(credits?.total || 0) - Number(debits?.total || 0));

    // Fetch welcome bonus rules
    const settings = await db.query("SELECT key, value FROM store_settings WHERE key LIKE 'welcome_bonus_%'");
    const rules = {};
    settings.forEach(s => { rules[s.key] = s.value; });

    return res.json({
      success: true,
      data: {
        availableBalance,
        transactions,
        rules,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function adminAdjustBonus(req, res) {
  try {
    const { customerId, type, amount, reason } = req.body;
    if (!customerId || !amount || !['ADMIN_CREDIT', 'ADMIN_DEBIT'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid customer, amount, or adjustment type' });
    }

    const expiresAt = type === 'ADMIN_CREDIT'
      ? new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const result = await db.run(
      `INSERT INTO customer_bonus_transactions (
        user_id, type, amount, reference_type, reference_id, expires_at, status, description
      ) VALUES (?, ?, ?, 'ADMIN_ADJUSTMENT', ?, ?, 'ACTIVE', ?)`,
      [customerId, type, Math.abs(Number(amount)), `ADMIN-${req.user.id}`, expiresAt, reason || 'Manual Admin Adjustment']
    );

    // Audit log
    await db.run(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address, notes)
       VALUES (?, 'BONUS_ADJUSTMENT', 'USER', ?, ?, ?, ?)`,
      [req.user.id, String(customerId), JSON.stringify({ type, amount }), req.ip || '127.0.0.1', reason]
    );

    const created = await db.get('SELECT * FROM customer_bonus_transactions WHERE id = ?', [result.lastInsertRowid]);
    return res.json({ success: true, message: 'Bonus ledger adjusted', data: created });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export default {
  getBonusLedger,
  adminAdjustBonus,
};
