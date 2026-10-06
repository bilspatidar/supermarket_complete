import db from '../../database/connection.js';
import whatsAppService from '../integrations/whatsapp/WhatsAppService.js';

export async function getPlans(req, res) {
  try {
    const plans = await db.query("SELECT * FROM membership_plans WHERE status = 'ACTIVE' ORDER BY price ASC");
    const parsed = plans.map(p => ({
      ...p,
      benefits: p.benefits_json ? JSON.parse(p.benefits_json) : [],
    }));
    return res.json({ success: true, data: parsed });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getMyMembership(req, res) {
  try {
    const nowIso = new Date().toISOString();
    const membership = await db.get(
      `SELECT cm.*, mp.name as plan_name, mp.discount_percent, mp.free_delivery, mp.benefits_json
       FROM customer_memberships cm
       JOIN membership_plans mp ON cm.plan_id = mp.id
       WHERE cm.user_id = ? AND cm.status = 'ACTIVE' AND cm.end_date >= ?
       ORDER BY cm.id DESC LIMIT 1`,
      [req.user.id, nowIso]
    );

    return res.json({
      success: true,
      data: membership ? {
        ...membership,
        benefits: membership.benefits_json ? JSON.parse(membership.benefits_json) : [],
      } : null,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function subscribePlan(req, res) {
  try {
    const { planId } = req.body;
    const plan = await db.get("SELECT * FROM membership_plans WHERE id = ? AND status = 'ACTIVE'", [planId]);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Membership plan not found' });
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + plan.duration_days * 24 * 60 * 60 * 1000);

    const result = await db.run(
      `INSERT INTO customer_memberships (user_id, plan_id, start_date, end_date, status)
       VALUES (?, ?, ?, ?, 'ACTIVE')`,
      [req.user.id, plan.id, startDate.toISOString(), endDate.toISOString()]
    );

    // Send WhatsApp notification
    const user = await db.get('SELECT name, mobile FROM users WHERE id = ?', [req.user.id]);
    if (user) {
      whatsAppService.send({
        recipient: user.mobile,
        templateKey: 'membership.activated',
        variables: {
          customer_name: user.name,
          membership_name: plan.name,
          expiry_date: endDate.toLocaleDateString(),
        },
        userId: user.id,
      });
    }

    const created = await db.get('SELECT * FROM customer_memberships WHERE id = ?', [result.lastInsertRowid]);
    return res.status(201).json({
      success: true,
      message: `Subscribed to ${plan.name} successfully!`,
      data: created,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function createPlan(req, res) {
  try {
    const { name, description, price, duration_days = 30, discount_percent = 5, free_delivery = 1, benefits = [] } = req.body;
    const result = await db.run(
      `INSERT INTO membership_plans (name, description, price, duration_days, discount_percent, free_delivery, benefits_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description, price, duration_days, discount_percent, free_delivery ? 1 : 0, JSON.stringify(benefits)]
    );
    const created = await db.get('SELECT * FROM membership_plans WHERE id = ?', [result.lastInsertRowid]);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export default {
  getPlans,
  getMyMembership,
  subscribePlan,
  createPlan,
};
