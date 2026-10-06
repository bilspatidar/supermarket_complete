import razorpayService from '../integrations/razorpay/RazorpayService.js';
import orderService from '../services/orderService.js';
import whatsAppService from '../integrations/whatsapp/WhatsAppService.js';
import db from '../../database/connection.js';

export async function verifyRazorpayPayment(req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    const isValid = razorpayService.verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    const order = await db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Update payment record
    await db.run(
      `UPDATE payments 
       SET status = 'PAID', transaction_ref = ?, updated_at = CURRENT_TIMESTAMP
       WHERE order_id = ?`,
      [razorpay_payment_id, orderId]
    );

    // Update order status
    await db.run(
      `UPDATE orders 
       SET payment_status = 'PAID', order_status = 'CONFIRMED', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [orderId]
    );

    // Send WhatsApp notification
    const customer = await db.get('SELECT name, mobile FROM users WHERE id = ?', [order.user_id]);
    const recipient = order.notification_phone || customer?.mobile;
    if (recipient) {
      whatsAppService.send({
        recipient,
        templateKey: 'payments.success',
        variables: {
          amount: order.grand_total,
          order_number: order.order_number,
          payment_method: 'Razorpay',
          transaction_ref: razorpay_payment_id,
        },
        userId: order.user_id,
        orderId,
      });
    }

    return res.json({
      success: true,
      message: 'Payment verified and order confirmed!',
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function handleRazorpayWebhook(req, res) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const event = req.body;

    if (!event || !event.event) {
      return res.status(400).json({ status: 'Invalid payload' });
    }

    const eventId = event.event_id || `EVT-${Date.now()}`;
    const result = await razorpayService.processWebhookEvent({
      eventId,
      eventType: event.event,
      rawPayload: JSON.stringify(event),
      signature,
    });

    if (result.duplicate) {
      return res.json({ status: 'already_processed' });
    }

    // Reconcile order if payment.captured
    if (event.event === 'payment.captured' && event.payload?.payment?.entity?.notes?.order_id) {
      const orderId = Number(event.payload.payment.entity.notes.order_id);
      await db.run("UPDATE orders SET payment_status = 'PAID', order_status = 'CONFIRMED' WHERE id = ?", [orderId]);
    }

    return res.json({ status: 'ok' });
  } catch (err) {
    console.error('[PaymentWebhook] Error:', err.message);
    return res.status(400).json({ status: 'error', message: err.message });
  }
}

export default {
  verifyRazorpayPayment,
  handleRazorpayWebhook,
};
