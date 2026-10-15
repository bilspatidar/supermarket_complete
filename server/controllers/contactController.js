
import db from '../../database/connection.js';

const VALID_STATUSES = ['NEW', 'CONTACTED', 'RESOLVED', 'SPAM'];

function validateContactInput(body = {}) {
  const name =
    typeof body.name === 'string' ? body.name.trim() : '';

  const contactNumber =
    typeof body.contact_number === 'string'
      ? body.contact_number.trim()
      : '';

  const query =
    typeof body.query === 'string' ? body.query.trim() : '';

  const errors = {};

  if (!name) {
    errors.name = 'Name is required.';
  } else if (name.length < 2 || name.length > 100) {
    errors.name = 'Name must contain 2 to 100 characters.';
  } else if (!/^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*$/u.test(name)) {
    errors.name = 'Please enter a valid name.';
  }

  if (!contactNumber) {
    errors.contact_number = 'Contact number is required.';
  } else if (!/^[6-9]\d{9}$/.test(contactNumber)) {
    errors.contact_number =
      'Enter a valid 10-digit Indian mobile number.';
  }

  if (!query) {
    errors.query = 'Query is required.';
  } else if (query.length < 10 || query.length > 2000) {
    errors.query =
      'Query must contain between 10 and 2000 characters.';
  }

  return {
    errors,
    data: {
      name,
      contact_number: contactNumber,
      query,
    },
  };
}

/**
 * PUBLIC: Submit a contact enquiry.
 * POST /api/contact
 */
export async function createContactEnquiry(req, res) {
  try {
    const { errors, data } = validateContactInput(req.body);

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Please correct the submitted information.',
        errors,
      });
    }

    const result = await db.run(
      `INSERT INTO contact_enquiries (
        name,
        contact_number,
        \`query\`,
        status
      ) VALUES (?, ?, ?, 'NEW')`,
      [data.name, data.contact_number, data.query]
    );

    const enquiryId = result.lastInsertRowid;

    return res.status(201).json({
      success: true,
      message: 'Your query has been submitted successfully.',
      data: {
        id: enquiryId,
      },
    });
  } catch (error) {
    console.error('createContactEnquiry error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to submit your query right now. Please try again.',
    });
  }
}

/**
 * STAFF: List enquiries.
 * GET /api/contact
 *
 * Protect this route with your existing staff authentication middleware.
 */
export async function getContactEnquiries(req, res) {
  try {
    const status =
      typeof req.query.status === 'string'
        ? req.query.status.trim().toUpperCase()
        : '';

    const search =
      typeof req.query.search === 'string'
        ? req.query.search.trim().slice(0, 100)
        : '';

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
    );
    const offset = (page - 1) * limit;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid enquiry status.',
      });
    }

    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (search) {
      conditions.push(
        '(name LIKE ? OR contact_number LIKE ? OR `query` LIKE ?)'
      );

      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const whereSql = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const countResult = await db.get(
      `SELECT COUNT(*) AS total
       FROM contact_enquiries
       ${whereSql}`,
      params
    );

    const rows = await db.query(
      `SELECT
         id,
         name,
         contact_number,
         \`query\`,
         status,
         created_at,
         updated_at
       FROM contact_enquiries
       ${whereSql}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: Number(countResult?.total || 0),
        totalPages: Math.ceil(
          Number(countResult?.total || 0) / limit
        ),
      },
    });
  } catch (error) {
    console.error('getContactEnquiries error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to load contact enquiries.',
    });
  }
}

/**
 * STAFF: View one enquiry.
 * GET /api/contact/:id
 */
export async function getContactEnquiryById(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid enquiry ID.',
      });
    }

    const enquiry = await db.get(
      `SELECT
         id,
         name,
         contact_number,
         \`query\`,
         status,
         created_at,
         updated_at
       FROM contact_enquiries
       WHERE id = ?`,
      [id]
    );

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Contact enquiry not found.',
      });
    }

    return res.json({
      success: true,
      data: enquiry,
    });
  } catch (error) {
    console.error('getContactEnquiryById error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to load this enquiry.',
    });
  }
}

/**
 * STAFF: Update enquiry status.
 * PATCH /api/contact/:id/status
 */
export async function updateContactEnquiryStatus(req, res) {
  try {
    const id = Number(req.params.id);
    const status =
      typeof req.body?.status === 'string'
        ? req.body.status.trim().toUpperCase()
        : '';

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid enquiry ID.',
      });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${VALID_STATUSES.join(', ')}.`,
      });
    }

    const existing = await db.get(
      'SELECT id FROM contact_enquiries WHERE id = ?',
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Contact enquiry not found.',
      });
    }

    await db.run(
      `UPDATE contact_enquiries
       SET status = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, id]
    );

    const updated = await db.get(
      `SELECT
         id,
         name,
         contact_number,
         \`query\`,
         status,
         created_at,
         updated_at
       FROM contact_enquiries
       WHERE id = ?`,
      [id]
    );

    return res.json({
      success: true,
      message: 'Contact enquiry status updated successfully.',
      data: updated,
    });
  } catch (error) {
    console.error('updateContactEnquiryStatus error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to update enquiry status.',
    });
  }
}

/**
 * STAFF: Delete an enquiry.
 * DELETE /api/contact/:id
 */
export async function deleteContactEnquiry(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid enquiry ID.',
      });
    }

    const existing = await db.get(
      'SELECT id FROM contact_enquiries WHERE id = ?',
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Contact enquiry not found.',
      });
    }

    await db.run(
      'DELETE FROM contact_enquiries WHERE id = ?',
      [id]
    );

    return res.json({
      success: true,
      message: 'Contact enquiry deleted successfully.',
    });
  } catch (error) {
    console.error('deleteContactEnquiry error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to delete contact enquiry.',
    });
  }
}

export default {
  createContactEnquiry,
  getContactEnquiries,
  getContactEnquiryById,
  updateContactEnquiryStatus,
  deleteContactEnquiry,
};
