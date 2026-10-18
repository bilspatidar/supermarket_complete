
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


export async function getAdminMemberships(req, res) {
  try {
    const { userId, status } = req.query;

    let sql = `
      SELECT
        cm.*,
        u.name AS customer_name,
        u.mobile AS customer_mobile,
        u.email AS customer_email,
        mp.name AS plan_name,
        mp.price AS plan_price,
        mp.discount_percent,
        mp.free_delivery,
        mp.benefits_json
      FROM customer_memberships cm
      INNER JOIN users u ON cm.user_id = u.id
      INNER JOIN membership_plans mp ON cm.plan_id = mp.id
      WHERE 1 = 1
    `;

    const params = [];

    if (userId) {
      sql += ` AND cm.user_id = ?`;
      params.push(userId);
    }

    if (status) {
      const allowedStatuses = [
        'REQUESTED',
        'ACTIVE',
        'REJECTED',
        'EXPIRED',
      ];

      const normalizedStatus = String(status).toUpperCase();

      if (!allowedStatuses.includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid membership status',
        });
      }

      sql += ` AND UPPER(cm.status) = ?`;
      params.push(normalizedStatus);
    }

    sql += `
      ORDER BY
        CASE
          WHEN UPPER(cm.status) = 'REQUESTED' THEN 0
          WHEN UPPER(cm.status) = 'ACTIVE' THEN 1
          WHEN UPPER(cm.status) = 'REJECTED' THEN 2
          ELSE 3
        END ASC,
        cm.id DESC
    `;

    // Use your MySQL wrapper's method for fetching multiple rows.
    const memberships = await db.query(sql, params);
    return res.json({
      success: true,
      data: memberships.map((membership) => {
        let benefits = [];

        if (membership.benefits_json) {
          try {
            benefits = JSON.parse(membership.benefits_json);
          } catch {
            benefits = [];
          }
        }

        return {
          ...membership,
          benefits,
        };
      }),
    });
  } catch (err) {
    console.error('getAdminMemberships error:', err);

    return res.status(500).json({
      success: false,
      message: 'Failed to load membership records',
    });
  }
}


export async function updateMembershipStatus(req, res) {
  try {
    const membershipId = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isSafeInteger(membershipId) || membershipId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid membership ID',
      });
    }

    const newStatus = String(status || '').toUpperCase();

    if (!['ACTIVE', 'REJECTED'].includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be ACTIVE or REJECTED',
      });
    }

    // Only pending membership requests can be approved or rejected.
    const membership = await db.query(
      `
        SELECT
          cm.id,
          cm.user_id,
          cm.plan_id,
          cm.status,
          mp.name AS plan_name,
          mp.duration_days
        FROM customer_memberships cm
        INNER JOIN membership_plans mp ON mp.id = cm.plan_id
        WHERE cm.id = ?
        LIMIT 1
      `,
      [membershipId]
    );

    if (!membership.length) {
      return res.status(404).json({
        success: false,
        message: 'Membership request not found',
      });
    }

    const request = membership[0];

    if (String(request.status).toUpperCase() !== 'REQUESTED') {
      return res.status(409).json({
        success: false,
        message: 'Only pending membership requests can be updated',
      });
    }

    let startDateSQL = null;
    let endDateSQL = null;

    if (newStatus === 'ACTIVE') {
      const startDate = new Date();
      const endDate = new Date(
        startDate.getTime() +
          Number(request.duration_days) * 24 * 60 * 60 * 1000
      );

      startDateSQL = toMySQLDateTime(startDate);
      endDateSQL = toMySQLDateTime(endDate);
    }

    // Conditional update prevents approving/rejecting the same request twice.
    const result = await db.query(
      `
        UPDATE customer_memberships
        SET
          status = ?,
          start_date = CASE
            WHEN ? = 'ACTIVE' THEN ?
            ELSE start_date
          END,
          end_date = CASE
            WHEN ? = 'ACTIVE' THEN ?
            ELSE end_date
          END
        WHERE id = ?
          AND UPPER(status) = 'REQUESTED'
      `,
      [
        newStatus,
        newStatus,
        startDateSQL,
        newStatus,
        endDateSQL,
        membershipId,
      ]
    );

    // Adapt this check if your db.query wrapper returns a different
    // structure for UPDATE statements.
    if (!result.affectedRows) {
      return res.status(409).json({
        success: false,
        message: 'This membership request has already been processed',
      });
    }

    // Notify the customer after approval.
    if (newStatus === 'ACTIVE') {
      try {
        const user = await db.query(
          'SELECT id, name, mobile FROM users WHERE id = ? LIMIT 1',
          [request.user_id]
        );

        if (user.length && user[0].mobile) {
          Promise.resolve(
            whatsAppService.send({
              recipient: user[0].mobile,
              templateKey: 'membership.activated',
              variables: {
                customer_name: user[0].name,
                membership_name: request.plan_name,
                expiry_date: new Date(endDateSQL.replace(' ', 'T'))
                  .toLocaleDateString('en-IN'),
              },
              userId: user[0].id,
            })
          ).catch((err) => {
            console.error(
              'Membership activation notification failed:',
              err
            );
          });
        }
      } catch (notificationError) {
        console.error(
          'Failed to prepare membership notification:',
          notificationError
        );
      }
    }

    return res.json({
      success: true,
      message:
        newStatus === 'ACTIVE'
          ? 'Membership approved and activated successfully'
          : 'Membership request rejected successfully',
    });
  } catch (err) {
    console.error('updateMembershipStatus error:', err);

    return res.status(500).json({
      success: false,
      message: 'Failed to update membership status',
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

    // Prevent duplicate membership applications.
const existingMembership = await db.get(
  `
    SELECT id, status
    FROM customer_memberships
    WHERE user_id = ?
      AND UPPER(status) IN ('REQUESTED', 'ACTIVE')
    LIMIT 1
  `,
  [req.user.id]
);

if (existingMembership) {
  return res.status(409).json({
    success: false,
    message:
      existingMembership.status.toUpperCase() === 'REQUESTED'
        ? 'You already have a pending membership request. Please wait for admin approval.'
        : 'You already have an active membership.',
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
        VALUES (?, ?, ?, ?, 'REQUESTED')
      `,
      [
        req.user.id,
        plan.id,
        toMySQLDateTime(startDate),
        toMySQLDateTime(endDate),
      ]
    );

    // Send WhatsApp notification
    // try {
    //   const user = await db.get(
    //     'SELECT name, mobile FROM users WHERE id = ?',
    //     [req.user.id]
    //   );

    //   if (user) {
    //     // Preserve the existing notification behavior.
    //     Promise.resolve(
    //       whatsAppService.send({
    //         recipient: user.mobile,
    //         templateKey: 'membership.activated',
    //         variables: {
    //           customer_name: user.name,
    //           membership_name: plan.name,
    //           expiry_date: endDate.toLocaleDateString(),
    //         },
    //         userId: user.id,
    //       })
    //     ).catch((err) => {
    //       console.error('Membership WhatsApp notification failed:', err);
    //     });
    //   }
    // } catch (notificationError) {
    //   console.error(
    //     'Failed to prepare membership notification:',
    //     notificationError
    //   );
    // }

    const created = await db.get(
      'SELECT * FROM customer_memberships WHERE id = ?',
      [result.lastInsertRowid]
    );

    return res.status(201).json({
      success: true,
      message: `Request to ${plan.name} successfully!`,
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

  if (!['ACTIVE', 'INACTIVE', 'REQUESTED'].includes(status)) {
    return 'Status must be ACTIVE or INACTIVE or REQUESTED';
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
  getAdminMemberships,
  updateMembershipStatus
};
