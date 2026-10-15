import crypto from 'crypto';
import razorpayService from '../integrations/razorpay/RazorpayService.js';
import orderService from '../services/orderService.js';
import whatsAppService from '../integrations/whatsapp/WhatsAppService.js';
import db from '../../database/connection.js';

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';
const CURRENCY = 'INR';



function isDuplicateDatabaseError(error) {
  return error?.code === 'ER_DUP_ENTRY' || error?.errno === 1062;
}

async function claimWebhookEvent(eventId, eventType, rawBody) {
  const payloadHash = crypto
    .createHash('sha256')
    .update(rawBody)
    .digest('hex');

  try {
    await db.run(
      `INSERT INTO razorpay_webhook_events
        (event_id, event_type, payload_sha256, processing_status)
       VALUES (?, ?, ?, 'PROCESSING')`,
      [eventId, eventType, payloadHash]
    );

    return { claimed: true };
  } catch (error) {
    if (!isDuplicateDatabaseError(error)) {
      throw error;
    }
  }

  const existing = await db.get(
    `SELECT event_type, payload_sha256, processing_status
       FROM razorpay_webhook_events
      WHERE event_id = ?
      LIMIT 1`,
    [eventId]
  );

  if (!existing) {
    throw new Error('Unable to retrieve existing webhook event');
  }

  if (
    existing.event_type !== eventType ||
    existing.payload_sha256 !== payloadHash
  ) {
    throw new Error('Webhook event ID was reused with different content');
  }

  if (existing.processing_status === 'PROCESSED') {
    return { claimed: false, alreadyProcessed: true };
  }

  if (existing.processing_status === 'PROCESSING') {
    return { claimed: false, alreadyProcessing: true };
  }

  await db.run(
    `UPDATE razorpay_webhook_events
        SET processing_status = 'PROCESSING',
            attempts = attempts + 1,
            last_error = NULL
      WHERE event_id = ?
        AND processing_status = 'FAILED'`,
    [eventId]
  );

  return { claimed: true };
}

async function markWebhookEventProcessed(eventId) {
  await db.run(
    `UPDATE razorpay_webhook_events
        SET processing_status = 'PROCESSED',
            processed_at = CURRENT_TIMESTAMP,
            last_error = NULL
      WHERE event_id = ?`,
    [eventId]
  );
}

async function markWebhookEventFailed(eventId, error) {
  if (!eventId) return;

  await db.run(
    `UPDATE razorpay_webhook_events
        SET processing_status = 'FAILED',
            last_error = ?
      WHERE event_id = ?
        AND processing_status = 'PROCESSING'`,
    [String(error?.message || error).slice(0, 4000), eventId]
  );
}

/**
 * Get the authenticated customer's ID.
 *
 * Keep this aligned with the user object created by your auth middleware.
 */
function getAuthenticatedUserId(req) {
  return Number(req.user?.id ?? req.user?.userId ?? req.user?.user_id);
}

/**
 * Compare payment amount in paise with the server-calculated checkout total.
 */
function amountMatches(amountInPaise, totalInRupees) {
  const expectedPaise = Math.round(Number(totalInRupees) * 100);

  return (
    Number.isSafeInteger(Number(amountInPaise)) &&
    Number(amountInPaise) === expectedPaise
  );
}

/**
 * Fetch payment details directly from Razorpay.
 *
 * A valid checkout signature alone is not sufficient to establish that
 * a payment has actually been captured.
 */
async function fetchRazorpayPayment(paymentId) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (
    !keyId ||
    !keySecret ||
    keyId.includes('sample_') ||
    keySecret.includes('sample_')
  ) {
    throw new Error('Razorpay API credentials are not configured');
  }

  const response = await fetch(
    `${RAZORPAY_API_BASE}/payments/${encodeURIComponent(paymentId)}`,
    {
      method: 'GET',
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error?.description || 'Unable to verify payment with Razorpay'
    );
  }

  return data;
}

/**
 * Load a checkout session associated with a Razorpay order.
 */
async function getCheckoutSession(razorpayOrderId) {
  return db.get(
    `SELECT *
       FROM checkout_sessions
      WHERE razorpay_order_id = ?
      LIMIT 1`,
    [razorpayOrderId]
  );
}

/**
 * Finalize a successfully captured payment.
 *
 * REQUIRED SERVICE CONTRACT:
 *
 * orderService.finalizePaidCheckout({
 *   checkoutKey,
 *   razorpayOrderId,
 *   razorpayPaymentId,
 *   razorpaySignature
 * })
 *
 * The service must atomically and idempotently:
 * - Verify the checkout session is eligible for finalization.
 * - Confirm the session belongs to the expected Razorpay order.
 * - Create the permanent order and order items from the saved snapshot.
 * - Deduct stock and record inventory transactions once.
 * - Apply coupons and bonus redemptions once.
 * - Insert/update the payment record.
 * - Mark checkout_sessions as PAID/COMPLETED and save order_id.
 *
 * Do not implement finalization as independent, unprotected SQL updates.
 */
async function finalizeCheckoutPayment({
  session,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) {
  if (!session?.checkout_key) {
    throw new Error('Checkout session not found');
  }

  if (session.razorpay_order_id !== razorpayOrderId) {
    throw new Error('Razorpay order does not match the checkout session');
  }

  if (session.razorpay_payment_id &&
      session.razorpay_payment_id !== razorpayPaymentId) {
    throw new Error('A different payment is already associated with this checkout');
  }

  if (session.payment_status === 'PAID' && session.order_id) {
    const existingOrder = await db.get(
      'SELECT id, order_number, payment_status, order_status FROM orders WHERE id = ?',
      [session.order_id]
    );

    if (!existingOrder) {
      throw new Error('Checkout is marked paid but its order is missing');
    }

    return {
      order: existingOrder,
      alreadyFinalized: true,
    };
  }

  if (
    session.checkout_status !== 'PENDING_PAYMENT' &&
    session.checkout_status !== 'PROCESSING'
  ) {
    throw new Error('Checkout session is not eligible for payment finalization');
  }

  if (typeof orderService.finalizePaidCheckout !== 'function') {
    throw new Error(
      'Missing orderService.finalizePaidCheckout(). Implement the atomic checkout finalization method before enabling live payments.'
    );
  }

  const result = await orderService.finalizePaidCheckout({
    checkoutKey: session.checkout_key,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });

  // Accept a service result containing either { order } or the order itself.
  const order = result?.order ?? result;

  if (!order?.id) {
    throw new Error('Order finalization did not return a valid order');
  }

  return {
    order,
    alreadyFinalized: Boolean(result?.alreadyFinalized),
  };
}

/**
 * Notify the customer after successful payment finalization.
 *
 * The order finalization service should also handle its existing order
 * notifications. This is specifically the payment-success notification.
 */
async function sendPaymentSuccessNotification(order, paymentId) {
  try {
    const customer = await db.get(
      'SELECT name, mobile FROM users WHERE id = ?',
      [order.user_id]
    );

    const recipient = order.notification_phone || customer?.mobile;

    if (!recipient) return;

    await whatsAppService.send({
      recipient,
      templateKey: 'payments.success',
      variables: {
        amount: order.grand_total,
        order_number: order.order_number,
        payment_method: 'Razorpay',
        transaction_ref: paymentId,
      },
      userId: order.user_id,
      orderId: order.id,
    });
  } catch (error) {
    // A WhatsApp failure must not turn a successful payment into a failed one.
    console.error(
      '[Razorpay] Payment succeeded but WhatsApp notification failed:',
      error.message
    );
  }
}

/**
 * Browser callback verification.
 *
 * Expects:
 * {
 *   checkoutKey,
 *   razorpay_order_id,
 *   razorpay_payment_id,
 *   razorpay_signature
 * }
 *
 * Do not accept orderId from the client as the authority for finalization.
 */
export async function verifyRazorpayPayment(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const {
      checkoutKey,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    } = req.body || {};

    if (
      !checkoutKey ||
      !razorpayOrderId ||
      !razorpayPaymentId ||
      !razorpaySignature
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification details',
      });
    }

    const session = await db.get(
      `SELECT *
         FROM checkout_sessions
        WHERE checkout_key = ?
          AND user_id = ?
        LIMIT 1`,
      [checkoutKey, userId]
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Checkout session not found',
      });
    }

    if (session.razorpay_order_id !== razorpayOrderId) {
      return res.status(400).json({
        success: false,
        message: 'Razorpay order does not match this checkout',
      });
    }

    // A finalized checkout is safe to return on a repeated browser callback.
    if (session.payment_status === 'PAID' && session.order_id) {
      const existingOrder = await db.get(
        `SELECT id, order_number, payment_status, order_status
           FROM orders
          WHERE id = ?`,
        [session.order_id]
      );

      if (!existingOrder) {
        return res.status(409).json({
          success: false,
          message: 'The paid checkout has no associated order',
        });
      }

      return res.json({
        success: true,
        alreadyProcessed: true,
        message: 'Payment has already been processed',
        order: existingOrder,
      });
    }

    const signatureValid = razorpayService.verifyPaymentSignature({
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    });

    if (!signatureValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature',
      });
    }

    // Verify the payment directly against Razorpay.
    const payment = await fetchRazorpayPayment(razorpayPaymentId);

    if (payment.order_id !== razorpayOrderId) {
      return res.status(400).json({
        success: false,
        message: 'Payment belongs to a different Razorpay order',
      });
    }

    if (payment.status !== 'captured') {
      return res.status(409).json({
        success: false,
        message: 'Payment has not been captured yet',
        paymentStatus: payment.status,
      });
    }

    if (payment.currency !== CURRENCY) {
      return res.status(400).json({
        success: false,
        message: 'Unexpected payment currency',
      });
    }

    if (!amountMatches(payment.amount, session.grand_total)) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount does not match the checkout total',
      });
    }

    const { order, alreadyFinalized } = await finalizeCheckoutPayment({
      session,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!alreadyFinalized) {
      await sendPaymentSuccessNotification(order, razorpayPaymentId);
    }

    return res.json({
      success: true,
      alreadyProcessed: alreadyFinalized,
      message: 'Payment verified and order confirmed',
      order: {
        id: order.id,
        order_number: order.order_number,
        payment_status: order.payment_status,
        order_status: order.order_status,
      },
    });
  } catch (error) {
    console.error('[Razorpay Verify] Error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to verify payment',
    });
  }
}

/**
 * Razorpay webhook handler.
 *
 * server/app.js must mount express.raw() for this endpoint BEFORE
 * express.json(). Verify the exact raw request bytes.
 *
 * Configure the Razorpay webhook URL as:
 * POST /api/payments/razorpay/webhook
 */


/**
 * Create a temporary checkout session and Razorpay order.
 * The authenticated customer ID is always taken from the server session.
 */
export async function createRazorpayOrder(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (typeof orderService.createRazorpayCheckoutSession !== 'function') {
      console.error(
        '[Razorpay] createRazorpayCheckoutSession is missing from OrderService'
      );

      return res.status(500).json({
        success: false,
        message: 'Payment checkout is not configured correctly',
      });
    }

    const {
      items,
      couponCode = null,
      useBonus = false,
      areaId = null,
      subAreaId = null,
      deliverySlotId = null,
      deliveryAddress = '',
      landmark = '',
      pincode = '',
      notificationPhone = null,
      notes = '',
      source = 'ONLINE',
    } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty',
      });
    }

    if (String(source).toUpperCase() !== 'ONLINE') {
      return res.status(400).json({
        success: false,
        message: 'Razorpay is available only for online orders',
      });
    }

    const checkout = await orderService.createRazorpayCheckoutSession({
      userId,
      items,
      couponCode,
      useBonus,
      areaId,
      subAreaId,
      deliverySlotId,
      deliveryAddress,
      landmark,
      pincode,
      notificationPhone,
      notes,
      source: 'ONLINE',
    });

    return res.status(201).json({
      success: true,
      message: 'Razorpay checkout created',
      ...checkout,
    });
  } catch (error) {
    console.error('[Razorpay Create Order] Error:', error);

    return res.status(400).json({
      success: false,
      message: error.message || 'Unable to create checkout',
    });
  }
}

/**
 * Get the status of a checkout belonging to the authenticated customer.
 */
export async function getRazorpayCheckoutStatus(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);
    const { checkoutKey } = req.params;

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!checkoutKey) {
      return res.status(400).json({
        success: false,
        message: 'Checkout key is required',
      });
    }

    const session = await db.get(
      `SELECT
          checkout_key,
          payment_status,
          checkout_status,
          order_id,
          expires_at,
          paid_at,
          completed_at
       FROM checkout_sessions
       WHERE checkout_key = ?
         AND user_id = ?
       LIMIT 1`,
      [checkoutKey, userId]
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Checkout session not found',
      });
    }

    let order = null;

    if (session.order_id) {
      order = await db.get(
        `SELECT
            id,
            order_number,
            payment_status,
            order_status,
            grand_total
         FROM orders
         WHERE id = ?
           AND user_id = ?
         LIMIT 1`,
        [session.order_id, userId]
      );
    }

    return res.json({
      success: true,
      checkout: {
        checkoutKey: session.checkout_key,
        paymentStatus: session.payment_status,
        checkoutStatus: session.checkout_status,
        expiresAt: session.expires_at,
        paidAt: session.paid_at,
        completedAt: session.completed_at,
      },
      order,
    });
  } catch (error) {
    console.error('[Razorpay Checkout Status] Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve checkout status',
    });
  }
}


export async function handleRazorpayWebhook(req, res) {
  let eventId = null;
  let eventClaimed = false;

  try {
    const signature = req.headers['x-razorpay-signature'];

    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json({
        status: 'error',
        message: 'Raw webhook body is required',
      });
    }

    if (!signature) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing Razorpay webhook signature',
      });
    }

    const rawBody = req.body;

    // Always verify the signature before trusting or recording the event.
    if (
      typeof razorpayService.verifyWebhookSignature !== 'function' ||
      !razorpayService.verifyWebhookSignature(rawBody, signature)
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid webhook signature',
      });
    }

    let event;

    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid webhook JSON',
      });
    }

    if (!event?.event || typeof event.event !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid webhook event',
      });
    }

    // Razorpay supplies this unique ID to identify webhook deliveries.
    eventId = req.headers['x-razorpay-event-id'];

    if (typeof eventId !== 'string' || !eventId.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing Razorpay event ID',
      });
    }

    eventId = eventId.trim();

    // Claim the event only after signature and JSON validation.
    const claim = await claimWebhookEvent(
      eventId,
      event.event,
      rawBody
    );

    if (claim.alreadyProcessed) {
      return res.status(200).json({
        status: 'ok',
        alreadyProcessed: true,
      });
    }

    if (claim.alreadyProcessing) {
      // Do not acknowledge an event that another request may still be
      // processing. A non-2xx response allows a later retry.
      return res.status(503).json({
        status: 'retry',
        message: 'Webhook event is already being processed',
      });
    }

    if (!claim.claimed) {
      throw new Error('Unable to claim webhook event');
    }

    eventClaimed = true;

    // This integration finalizes captured payments only.
    // Other valid events are recorded as processed and acknowledged.
    if (event.event !== 'payment.captured') {
      await markWebhookEventProcessed(eventId);
      eventClaimed = false;

      return res.status(200).json({
        status: 'ignored',
        event: event.event,
      });
    }

    const payment = event.payload?.payment?.entity;

    if (!payment?.id || !payment?.order_id) {
      throw new Error('Captured payment details are missing');
    }

    if (payment.status !== 'captured') {
      await markWebhookEventProcessed(eventId);
      eventClaimed = false;

      return res.status(200).json({
        status: 'ignored',
        message: 'Payment is not captured',
      });
    }

    const session = await getCheckoutSession(payment.order_id);

    if (!session) {
      throw new Error(
        `Checkout session not found for Razorpay order ${payment.order_id}`
      );
    }

    if (payment.currency !== CURRENCY) {
      throw new Error(
        `Unexpected payment currency: ${payment.currency}`
      );
    }

    if (!amountMatches(payment.amount, session.grand_total)) {
      throw new Error(
        `Payment amount mismatch for checkout ${session.checkout_key}`
      );
    }

    // Confirm the captured payment directly with Razorpay.
    const verifiedPayment = await fetchRazorpayPayment(payment.id);

    if (
      verifiedPayment.status !== 'captured' ||
      verifiedPayment.order_id !== payment.order_id ||
      verifiedPayment.currency !== CURRENCY ||
      !amountMatches(verifiedPayment.amount, session.grand_total)
    ) {
      throw new Error('Razorpay payment reconciliation failed');
    }

    const { order, alreadyFinalized } = await finalizeCheckoutPayment({
      session,
      razorpayOrderId: payment.order_id,
      razorpayPaymentId: payment.id,
      razorpaySignature: null,
    });

    // Record completion only after payment reconciliation and order
    // finalization have succeeded.
    await markWebhookEventProcessed(eventId);
    eventClaimed = false;

    if (!alreadyFinalized) {
      await sendPaymentSuccessNotification(order, payment.id);
    }

    return res.status(200).json({
      status: 'ok',
      alreadyProcessed: alreadyFinalized,
    });
  } catch (error) {
    console.error('[Razorpay Webhook] Error:', error);

    // Mark a claimed event as failed so it can be retried.
    if (eventClaimed && eventId) {
      try {
        await markWebhookEventFailed(eventId, error);
      } catch (markError) {
        console.error(
          '[Razorpay Webhook] Failed to update event status:',
          markError
        );
      }
    }

    // Razorpay can retry transient processing failures.
    return res.status(500).json({
      status: 'error',
      message: 'Webhook reconciliation failed',
    });
  }
}



export default {
  createRazorpayOrder,
  verifyRazorpayPayment,
  getRazorpayCheckoutStatus,
  handleRazorpayWebhook,
};
