
import db from '../../database/connection.js';
import orderService from '../services/orderService.js';

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const MIN_SESSION_AGE_MINUTES = 15;

let isRunning = false;

async function getRazorpayPayments(razorpayOrderId) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay API credentials are missing');
  }

  const response = await fetch(
    `${RAZORPAY_API_BASE}/orders/${encodeURIComponent(razorpayOrderId)}/payments`,
    {
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
      data.error?.description || 'Unable to fetch Razorpay order payments'
    );
  }

  return Array.isArray(data.items) ? data.items : [];
}

function amountMatches(payment, session) {
  const expectedPaise = Math.round(Number(session.grand_total) * 100);

  return (
    Number(payment.amount) === expectedPaise &&
    payment.currency === 'INR'
  );
}

async function reconcileOneSession(session) {
  try {
    // The order may already have been created by the frontend or webhook.
    const latestSession = await db.get(
      `SELECT *
         FROM checkout_sessions
        WHERE id = ?
        LIMIT 1`,
      [session.id]
    );

    if (
      !latestSession ||
      latestSession.order_id ||
      latestSession.payment_status === 'PAID' ||
      latestSession.checkout_status === 'COMPLETED'
    ) {
      return;
    }

    if (!latestSession.razorpay_order_id) {
      return;
    }

    const payments = await getRazorpayPayments(
      latestSession.razorpay_order_id
    );

    // Only captured payments are eligible for automatic finalization.
    const capturedPayments = payments.filter(
      (payment) =>
        payment.status === 'captured' &&
        payment.order_id === latestSession.razorpay_order_id &&
        amountMatches(payment, latestSession)
    );

    if (capturedPayments.length === 0) {
      console.log(
        `[Razorpay Reconciliation] No matching captured payment yet: ${latestSession.checkout_key}`
      );
      return;
    }

    // Multiple successful charges require manual review, not guesswork.
    if (capturedPayments.length > 1) {
      console.error(
        `[Razorpay Reconciliation] Multiple captured payments; manual review required. Checkout: ${latestSession.checkout_key}`,
        capturedPayments.map((p) => p.id)
      );
      return;
    }

    const payment = capturedPayments[0];

    // Existing transactional and idempotent order finalization.
    const result = await orderService.finalizePaidCheckout({
      checkoutKey: latestSession.checkout_key,
      razorpayOrderId: latestSession.razorpay_order_id,
      razorpayPaymentId: payment.id,
      razorpaySignature: null,
    });

    if (!result?.order) {
      throw new Error('Order finalization returned no order');
    }

    // Delete only temporary checkout items after successful finalization.
    // Keep checkout_sessions as an audit/idempotency record.
    await db.run(
      `DELETE FROM checkout_items
        WHERE checkout_id = ?`,
      [latestSession.id]
    );

    console.log(
      `[Razorpay Reconciliation] Checkout finalized: ${latestSession.checkout_key}; order ID: ${result.order.id}`
    );
  } catch (error) {
    // Keep the session for a future retry; never mark it paid here.
    console.error(
      `[Razorpay Reconciliation] Failed for checkout ${session.checkout_key}:`,
      error.message
    );
  }
}

export async function runRazorpayReconciliation() {
  if (isRunning) {
    console.log('[Razorpay Reconciliation] Previous run still active; skipping.');
    return;
  }

  isRunning = true;

  try {
    const sessions = await db.query(
      `SELECT cs.*
         FROM checkout_sessions cs
        WHERE cs.created_at <= DATE_SUB(
                CURRENT_TIMESTAMP,
                INTERVAL ${MIN_SESSION_AGE_MINUTES} MINUTE
              )
          AND cs.razorpay_order_id IS NOT NULL
          AND cs.order_id IS NULL
          AND cs.payment_status = 'PENDING'
          AND cs.checkout_status = 'PENDING_PAYMENT'
        ORDER BY cs.created_at ASC
        LIMIT 100`
    );

    console.log(
      `[Razorpay Reconciliation] Checking ${sessions.length} pending checkout(s).`
    );

    for (const session of sessions) {
      await reconcileOneSession(session);
    }
  } catch (error) {
    console.error(
      '[Razorpay Reconciliation] Job failed:',
      error.message
    );
  } finally {
    isRunning = false;
  }
}

export function startRazorpayReconciliationJob() {
  // Run once on startup, then every hour.
  void runRazorpayReconciliation();

  const timer = setInterval(() => {
    void runRazorpayReconciliation();
  }, CHECK_INTERVAL_MS);

  // Allow graceful process shutdown without the timer keeping Node alive.
  timer.unref?.();

  console.log(
    '[Razorpay Reconciliation] Scheduled to run every hour; sessions must be at least 15 minutes old.'
  );

  return timer;
}
