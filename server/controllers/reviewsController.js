
import db from '../../database/connection.js';

const VALID_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

function getUserId(req) {
  return req.user?.id ?? req.user?.user_id ?? req.user?.userId ?? null;
}



function sendError(res, error, fallback = 'Something went wrong.') {
  console.error('Reviews API error:', error);

  return res.status(500).json({
    success: false,
    message: fallback,
  });
}

/**
 * CUSTOMER: Submit a review.
 * POST /api/reviews
 *
 * product_id is optional.
 * user_id always comes from authenticated user.
 */
export async function createReview(req, res) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Please log in to submit a review.',
      });
    }

    const {
      product_id,
      rating,
      review_title,
      review_text,
    } = req.body || {};

    const numericRating = Number(rating);
    const title =
      typeof review_title === 'string' ? review_title.trim() : '';
    const text =
      typeof review_text === 'string' ? review_text.trim() : '';

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5.',
      });
    }

    if (text.length < 10 || text.length > 3000) {
      return res.status(400).json({
        success: false,
        message: 'Review must contain between 10 and 3000 characters.',
      });
    }

    if (title.length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Review title cannot exceed 150 characters.',
      });
    }

    let productId = null;

    if (
      product_id !== undefined &&
      product_id !== null &&
      product_id !== ''
    ) {
      productId = Number(product_id);

      if (!Number.isSafeInteger(productId) || productId < 1) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID.',
        });
      }

      const product = await db.get(
        'SELECT id FROM products WHERE id = ? LIMIT 1',
        [productId]
      );

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found.',
        });
      }
    }

    const result = await db.run(
      `INSERT INTO reviews (
        user_id,
        product_id,
        rating,
        review_title,
        review_text,
        status
      ) VALUES (?, ?, ?, ?, ?, 'PENDING')`,
      [
        userId,
        productId,
        numericRating,
        title || null,
        text,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully.',
      data: {
        id: result?.lastInsertRowid ?? result?.lastID ?? result?.insertId,
        user_id: userId,
        product_id: productId,
        rating: numericRating,
        review_title: title || null,
        review_text: text,
        status: 'PENDING',
      },
    });
  } catch (error) {
    return sendError(res, error, 'Unable to submit review.');
  }
}

/**
 * PUBLIC: List approved reviews.
 * GET /api/reviews
 * GET /api/reviews?product_id=123
 *
 * Highest rating first, then newest review.
 */

export async function getReviews(req, res) {
  try {
    const productIdParam = req.query.product_id;

    let sql = `
      SELECT
        r.id,
        r.user_id,
        r.product_id,
        r.rating,
        r.review_title,
        r.review_text,
        r.created_at,
        u.name AS customer_name
      FROM reviews r
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.status = 'APPROVED'
    `;

    const params = [];
    let filterSql = '';

    if (productIdParam !== undefined && productIdParam !== '') {
      const productId = Number(productIdParam);

      if (!Number.isSafeInteger(productId) || productId < 1) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID.',
        });
      }

      filterSql = ' AND r.product_id = ?';
      params.push(productId);
    }

    sql += filterSql;
    sql += ' ORDER BY r.rating DESC, r.created_at DESC, r.id DESC';

    const rows = await db.query(sql, params);

    const countResult = await db.get(
      `SELECT
         COUNT(*) AS total,
         COALESCE(AVG(r.rating), 0) AS average_rating
       FROM reviews r
       WHERE r.status = 'APPROVED'
       ${filterSql}`,
      params
    );

    return res.json({
      success: true,
      data: Array.isArray(rows) ? rows : [],
      summary: {
        total_reviews: Number(countResult?.total || 0),
        average_rating: Number(
          Number(countResult?.average_rating || 0).toFixed(2)
        ),
      },
    });
  } catch (error) {
    return sendError(res, error, 'Unable to load reviews.');
  }
}

/**
 * ADMIN: List reviews with optional status/search filters.
 * GET /api/reviews/admin
 */
export async function getAdminReviews(req, res) {
  try {
    const status = String(req.query.status || 'ALL')
      .trim()
      .toUpperCase();

    const search = String(req.query.search || '')
      .trim()
      .slice(0, 100);

    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
    );

    const offset = (page - 1) * limit;

    if (status !== 'ALL' && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review status.',
      });
    }

    const conditions = [];
    const params = [];

    if (status !== 'ALL') {
      conditions.push('r.status = ?');
      params.push(status);
    }

    if (search) {
      const term = `%${search}%`;

      conditions.push(`(
        CAST(r.id AS CHAR) LIKE ?
        OR r.review_title LIKE ?
        OR r.review_text LIKE ?
        OR u.name LIKE ?
        OR p.name LIKE ?
      )`);

      params.push(term, term, term, term, term);
    }

    const whereSql = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const countResult = await db.get(
      `SELECT COUNT(*) AS total
       FROM reviews r
       LEFT JOIN users u ON u.id = r.user_id
       LEFT JOIN products p ON p.id = r.product_id
       ${whereSql}`,
      params
    );

    const rows = await db.query(
      `SELECT
         r.id,
         r.user_id,
         r.product_id,
         r.rating,
         r.review_title,
         r.review_text,
         r.status,
         r.created_at,
         r.updated_at,
         u.name AS customer_name,
         p.name AS product_name
       FROM reviews r
       LEFT JOIN users u ON u.id = r.user_id
       LEFT JOIN products p ON p.id = r.product_id
       ${whereSql}
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const total = Number(countResult?.total || 0);

    return res.json({
      success: true,
      data: Array.isArray(rows) ? rows : [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('getAdminReviews MySQL error:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
    });

    return res.status(500).json({
      success: false,
      message: 'Unable to load reviews.',
    });
  }
}

/**
 * ADMIN: Approve or reject a review.
 * PUT /api/reviews/:id/status
 */
export async function updateReviewStatus(req, res) {
  try {
   

    const id = Number(req.params.id);
    const status = String(req.body?.status || '').toUpperCase();

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID.',
      });
    }

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be APPROVED or REJECTED.',
      });
    }

    const existing = await db.get(
      'SELECT id FROM reviews WHERE id = ? LIMIT 1',
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Review not found.',
      });
    }

    await db.run(
      `UPDATE reviews
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, id]
    );

    const updated = await db.get(
      `SELECT id, user_id, product_id, rating, review_title,
              review_text, status, created_at, updated_at
       FROM reviews
       WHERE id = ?`,
      [id]
    );

    return res.json({
      success: true,
      message: `Review ${status.toLowerCase()} successfully.`,
      data: updated,
    });
  } catch (error) {
    return sendError(res, error, 'Unable to update review status.');
  }
}

/**
 * ADMIN: Delete a review.
 * DELETE /api/reviews/:id
 */
export async function deleteReview(req, res) {
  try {


    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID.',
      });
    }

    const existing = await db.get(
      'SELECT id FROM reviews WHERE id = ? LIMIT 1',
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Review not found.',
      });
    }

    await db.run('DELETE FROM reviews WHERE id = ?', [id]);

    return res.json({
      success: true,
      message: 'Review deleted successfully.',
    });
  } catch (error) {
    return sendError(res, error, 'Unable to delete review.');
  }
}

export default {
  createReview,
  getReviews,
  getAdminReviews,
  updateReviewStatus,
  deleteReview,
};
