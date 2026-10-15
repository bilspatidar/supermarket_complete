
import db from '../../database/connection.js';
import whatsAppService from '../integrations/whatsapp/WhatsAppService.js';
import { toMySQLDateTime } from '../../src/utils/dateTime.js';


export async function getAdminPlans(req, res) {
  try {
    const plans = await db.query(`
      SELECT *
      FROM membership_plans
      ORDER BY price ASC
    `);

    const parsed = plans.map((p) => ({
      ...p,
      benefits: p.benefits_json
        ? JSON.parse(p.benefits_json)
        : [],
    }));

    return res.json({
      success: true,
      data: parsed,
    });
  } catch (err) {
    console.error('getAdminPlans error:', err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

// GET ACTIVE MEMBERSHIP PLANS
export async function getPlans(req, res) {
  try {
    const plans = await db.query(`
      SELECT *
      FROM membership_plans
      WHERE status = 'ACTIVE'
      ORDER BY price ASC
    `);

    const parsed = plans.map((p) => ({
      ...p,
      benefits: p.benefits_json
        ? JSON.parse(p.benefits_json)
        : [],
    }));

    return res.json({
      success: true,
      data: parsed,
    });
  } catch (err) {
    console.error('getPlans error:', err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

// GET CURRENT CUSTOMER MEMBERSHIP
export async function getMyMembership(req, res) {
  try {
    const nowIso = toMySQLDateTime();

    const membership = await db.get(
      `
        SELECT
          cm.*,
          mp.name AS plan_name,
          mp.discount_percent,
          mp.free_delivery,
          mp.benefits_json
        FROM customer_memberships cm
        JOIN membership_plans mp ON cm.plan_id = mp.id
        WHERE cm.user_id = ?
          AND cm.status = 'ACTIVE'
          AND cm.end_date >= ?
        ORDER BY cm.id DESC
        LIMIT 1
      `,
      [req.user.id, nowIso]
    );

    return res.json({
      success: true,
      data: membership
        ? {
            ...membership,
            benefits: membership.benefits_json
              ? JSON.parse(membership.benefits_json)
              : [],
          }
        : null,
    });
  } catch (err) {
    console.error('getMyMembership error:', err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

// SUBSCRIBE TO MEMBERSHIP PLAN
export async function subscribePlan(req, res) {
  try {
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'Membership plan ID is required',
      });
    }

    // Only active plans can be purchased.
    const plan = await db.get(
      `
        SELECT *
        FROM membership_plans
        WHERE id = ?
          AND status = 'ACTIVE'
      `,
      [planId]
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Membership plan not found or inactive',
      });
    }

    const startDate = new Date();

    const endDate = new Date(
      startDate.getTime() +
        Number(plan.duration_days) * 24 * 60 * 60 * 1000
    );

    const result = await db.run(
      `
        INSERT INTO customer_memberships (
          user_id,
          plan_id,
          start_date,
          end_date,
          status
        )
        VALUES (?, ?, ?, ?, 'ACTIVE')
      `,
      [
        req.user.id,
        plan.id,
        startDate.toISOString(),
        endDate.toISOString(),
      ]
    );

    // Send WhatsApp notification
    try {
      const user = await db.get(
        'SELECT name, mobile FROM users WHERE id = ?',
        [req.user.id]
      );

      if (user) {
        // Preserve the existing notification behavior.
        Promise.resolve(
          whatsAppService.send({
            recipient: user.mobile,
            templateKey: 'membership.activated',
            variables: {
              customer_name: user.name,
              membership_name: plan.name,
              expiry_date: endDate.toLocaleDateString(),
            },
            userId: user.id,
          })
        ).catch((err) => {
          console.error('Membership WhatsApp notification failed:', err);
        });
      }
    } catch (notificationError) {
      console.error(
        'Failed to prepare membership notification:',
        notificationError
      );
    }

    const created = await db.get(
      'SELECT * FROM customer_memberships WHERE id = ?',
      [result.lastInsertRowid]
    );

    return res.status(201).json({
      success: true,
      message: `Subscribed to ${plan.name} successfully!`,
      data: created,
    });
  } catch (err) {
    console.error('subscribePlan error:', err);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}

// CREATE MEMBERSHIP PLAN
export async function createPlan(req, res) {
  try {
    const {
      name,
      description = '',
      price,
      duration_days = 30,
      discount_percent = 5,
      free_delivery = 1,
      benefits = [],
      status = 'ACTIVE',
    } = req.body;

    const validationError = validatePlan({
      name,
      price,
      duration_days,
      discount_percent,
      status,
      benefits,
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const result = await db.run(
      `
        INSERT INTO membership_plans (
          name,
          description,
          price,
          duration_days,
          discount_percent,
          free_delivery,
          benefits_json,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        name.trim(),
        description,
        Number(price),
        Number(duration_days),
        Number(discount_percent),
        isEnabled(free_delivery) ? 1 : 0,
        JSON.stringify(benefits),
        status,
      ]
    );

    const created = await db.get(
      'SELECT * FROM membership_plans WHERE id = ?',
      [result.lastInsertRowid]
    );

    return res.status(201).json({
      success: true,
      message: 'Membership plan created successfully',
      data: {
        ...created,
        benefits: created.benefits_json
          ? JSON.parse(created.benefits_json)
          : [],
      },
    });
  } catch (err) {
    console.error('createPlan error:', err);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}

// UPDATE MEMBERSHIP PLAN
export async function updatePlan(req, res) {
  try {
    const { id } = req.params;

    const {
      name,
      description = '',
      price,
      duration_days,
      discount_percent,
      free_delivery,
      benefits = [],
      status,
    } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Membership plan ID is required',
      });
    }

    const validationError = validatePlan({
      name,
      price,
      duration_days,
      discount_percent,
      status,
      benefits,
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const existing = await db.get(
      'SELECT * FROM membership_plans WHERE id = ?',
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Membership plan not found',
      });
    }

    await db.run(
      `
        UPDATE membership_plans
        SET
          name = ?,
          description = ?,
          price = ?,
          duration_days = ?,
          discount_percent = ?,
          free_delivery = ?,
          benefits_json = ?,
          status = ?
        WHERE id = ?
      `,
      [
        name.trim(),
        description,
        Number(price),
        Number(duration_days),
        Number(discount_percent),
        isEnabled(free_delivery) ? 1 : 0,
        JSON.stringify(benefits),
        status,
        id,
      ]
    );

    const updated = await db.get(
      'SELECT * FROM membership_plans WHERE id = ?',
      [id]
    );

    return res.json({
      success: true,
      message: 'Membership plan updated successfully',
      data: {
        ...updated,
        benefits: updated.benefits_json
          ? JSON.parse(updated.benefits_json)
          : [],
      },
    });
  } catch (err) {
    console.error('updatePlan error:', err);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}

// HELPERS
function isEnabled(value) {
  return value === true || value === 1 || value === '1';
}

function validatePlan({
  name,
  price,
  duration_days,
  discount_percent,
  status,
  benefits,
}) {
  if (typeof name !== 'string' || !name.trim()) {
    return 'Membership plan name is required';
  }

  if (
    price === undefined ||
    price === null ||
    price === '' ||
    !Number.isFinite(Number(price)) ||
    Number(price) < 0
  ) {
    return 'Enter a valid membership price';
  }

  if (
    duration_days === undefined ||
    duration_days === null ||
    duration_days === '' ||
    !Number.isInteger(Number(duration_days)) ||
    Number(duration_days) < 1
  ) {
    return 'Duration must be a whole number of at least 1 day';
  }

  if (
    discount_percent === undefined ||
    discount_percent === null ||
    discount_percent === '' ||
    !Number.isFinite(Number(discount_percent)) ||
    Number(discount_percent) < 0 ||
    Number(discount_percent) > 100
  ) {
    return 'Discount must be between 0 and 100';
  }

  if (!['ACTIVE', 'INACTIVE'].includes(status)) {
    return 'Status must be ACTIVE or INACTIVE';
  }

  if (!Array.isArray(benefits)) {
    return 'Benefits must be an array';
  }

  return null;
}

export default {
  getAdminPlans,
  getPlans,
  getMyMembership,
  subscribePlan,
  createPlan,
  updatePlan,
};
