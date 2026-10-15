
import crypto from 'crypto';

class RazorpayService {
  getCredentials() {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

    if (
      !keyId ||
      !keySecret ||
      keyId.includes('sample_') ||
      keySecret.includes('sample_')
    ) {
      throw new Error('Razorpay credentials are not configured correctly');
    }

    return { keyId, keySecret };
  }

  getWebhookSecret() {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();

    if (!secret || secret.includes('sample_')) {
      throw new Error(
        'Razorpay webhook secret is not configured correctly'
      );
    }

    return secret;
  }

  getKeyId() {
    return this.getCredentials().keyId;
  }

  /**
   * Create a real Razorpay order.
   * Amount is supplied in rupees and converted to paise.
   */
  async createOrder({
    amount,
    currency = 'INR',
    receipt,
    notes = {},
  }) {
    const { keyId, keySecret } = this.getCredentials();

    if (currency !== 'INR') {
      throw new Error('Only INR payments are supported');
    }

    const numericAmount = Number(amount);
    const amountInPaise = Math.round(numericAmount * 100);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0 ||
      !Number.isSafeInteger(amountInPaise)
    ) {
      throw new Error('Invalid Razorpay payment amount');
    }

    if (
      !receipt ||
      typeof receipt !== 'string' ||
      receipt.length > 40
    ) {
      throw new Error('A valid Razorpay receipt is required');
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency,
        receipt,
        notes,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.id) {
      console.error('[RazorpayService] Order creation failed:', {
        status: response.status,
        error: data?.error?.description || data?.error?.code,
      });

      throw new Error(
        data?.error?.description || 'Unable to create Razorpay order'
      );
    }

    if (
      Number(data.amount) !== amountInPaise ||
      data.currency !== currency
    ) {
      throw new Error(
        'Razorpay returned an unexpected order amount or currency'
      );
    }

    return data;
  }

  /**
   * Verify Razorpay Checkout's HMAC-SHA256 signature.
   */
  verifyPaymentSignature({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  }) {
    if (
      typeof razorpay_order_id !== 'string' ||
      typeof razorpay_payment_id !== 'string' ||
      typeof razorpay_signature !== 'string' ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !/^[a-f0-9]{64}$/i.test(razorpay_signature)
    ) {
      return false;
    }

    let keySecret;

    try {
      ({ keySecret } = this.getCredentials());
    } catch {
      return false;
    }

    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest();

    const received = Buffer.from(razorpay_signature, 'hex');

    return (
      received.length === expected.length &&
      crypto.timingSafeEqual(received, expected)
    );
  }

  /**
   * Verify the webhook using the exact original HTTP request bytes.
   */
  verifyWebhookSignature(rawBody, signature) {
    if (
      !Buffer.isBuffer(rawBody) ||
      typeof signature !== 'string' ||
      !/^[a-f0-9]{64}$/i.test(signature)
    ) {
      return false;
    }

    let secret;

    try {
      secret = this.getWebhookSecret();
    } catch {
      return false;
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest();

    const received = Buffer.from(signature, 'hex');

    return (
      received.length === expected.length &&
      crypto.timingSafeEqual(received, expected)
    );
  }
}

export default new RazorpayService();
