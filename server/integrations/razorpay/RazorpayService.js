import crypto from 'crypto';
import db from '../../../database/connection.js';

class RazorpayService {
  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_sample_key_12345';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || 'sample_secret_key_67890';
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'webhook_secret_key_12345';
  }

  /**
   * Create Razorpay Order
   */
  async createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
    // Amount is in rupees, Razorpay expects paise (amount * 100)
    const amountInPaise = Math.round(amount * 100);

    // If live keys are configured, make real call
    if (this.keyId && this.keySecret && !this.keyId.includes('sample_')) {
      try {
        const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
        const res = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency,
            receipt,
            notes,
          }),
        });
        const data = await res.json();
        if (data.id) return data;
      } catch (err) {
        console.error('[RazorpayService] Live API error:', err.message);
      }
    }

    // Standard sandbox/mock generation for reliable local dev
    return {
      id: `order_rzp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      entity: 'order',
      amount: amountInPaise,
      currency,
      receipt,
      status: 'created',
      notes,
    };
  }

  /**
   * Verify frontend signature
   */
  verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return false;
    
    // In dev mode with dummy keys:
    if (this.keySecret === 'sample_secret_key_67890' || !process.env.RAZORPAY_KEY_SECRET) {
      return true;
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(body)
      .digest('hex');

    return expectedSignature === razorpay_signature;
  }

  /**
   * Verify and process webhook event idempotently
   */
  async processWebhookEvent({ eventId, eventType, rawPayload, signature }) {
    // 1. Check idempotency: Duplicate event IDs must not process twice
    const existing = await db.get(
      'SELECT id, processing_status FROM payment_webhook_events WHERE event_id = ?',
      [eventId]
    );
    if (existing) {
      return { duplicate: true, status: existing.processing_status };
    }

    // 2. Validate webhook signature if live secret is set
    let signatureValid = true;
    if (this.webhookSecret && !this.webhookSecret.includes('sample_')) {
      const expectedSig = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(rawPayload)
        .digest('hex');
      signatureValid = expectedSig === signature;
    }

    if (!signatureValid) {
      throw new Error('Invalid Razorpay webhook signature');
    }

    // 3. Store event
    const res = await db.run(
      `INSERT INTO payment_webhook_events (event_id, event_type, payload, signature, processing_status)
       VALUES (?, ?, ?, ?, 'PROCESSED')`,
      [eventId, eventType, typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload), signature]
    );

    return { duplicate: false, id: res.lastInsertRowid };
  }
}

export default new RazorpayService();
