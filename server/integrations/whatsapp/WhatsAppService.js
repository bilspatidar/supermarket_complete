import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../../../database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WhatsAppService {
  constructor() {
    this.templates = null;
    this.loadTemplates();
  }

  loadTemplates() {
    try {
      const templatePath = path.resolve(__dirname, '../../../config/whatsapp-templates.json');
      const raw = fs.readFileSync(templatePath, 'utf8');
      this.templates = JSON.parse(raw);
    } catch (err) {
      console.error('[WhatsAppService] Failed to load whatsapp-templates.json:', err.message);
      this.templates = {};
    }
  }

  /**
   * Resolve template config by path e.g. 'orders.placed' or 'otp.login'
   */
  getTemplate(keyPath) {
    if (!this.templates) this.loadTemplates();
    const parts = keyPath.split('.');
    let cur = this.templates;
    for (const p of parts) {
      if (!cur || !cur[p]) return null;
      cur = cur[p];
    }
    return cur;
  }

  /**
   * Render template body by replacing {{variable_name}}
   */
  renderBody(body, variables = {}) {
    let rendered = body;
    for (const [key, val] of Object.entries(variables)) {
      const reg = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(reg, val !== null && val !== undefined ? String(val) : '');
    }
    return rendered;
  }

  /**
   * Send WhatsApp notification asynchronously
   */
  async send({ recipient, templateKey, variables = {}, userId = null, orderId = null, deduplicateKey = null }) {
    try {
      if (!recipient) {
        console.warn('[WhatsAppService] No recipient provided for template:', templateKey);
        return false;
      }

      // Check deduplication (e.g. for birthday/anniversary on same day)
      if (deduplicateKey) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const existing = await db.get(
          `SELECT id FROM notifications 
           WHERE recipient = ? AND template_key = ? AND created_at >= ?`,
          [recipient, templateKey, todayStart.toISOString()]
        );
        if (existing) {
          console.log(`[WhatsAppService] Skipping duplicate ${templateKey} for ${recipient}`);
          return false;
        }
      }

      const template = this.getTemplate(templateKey);
      if (!template || !template.enabled) {
        console.log(`[WhatsAppService] Template ${templateKey} not found or disabled.`);
        return false;
      }

      // Fill in default store_name if missing
      if (!variables.store_name) {
        const storeNameSetting = await db.get("SELECT value FROM store_settings WHERE key = 'store_name'");
        variables.store_name = storeNameSetting?.value || 'FreshMart Supermarket';
      }

      const messageBody = this.renderBody(template.body, variables);
      const cleanPhone = String(recipient).replace(/[^0-9]/g, '');

      // Check WhatsApp Cloud API configuration
      const apiUrl = process.env.WHATSAPP_API_URL;
      const token = process.env.WHATSAPP_ACCESS_TOKEN;
      const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

      let providerMsgId = `WA-MSG-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      let status = 'SENT';
      let errorMsg = null;

      if (token && phoneId && apiUrl && !token.includes('sample_')) {
        try {
          const resp = await fetch(`${apiUrl}/${phoneId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: cleanPhone,
              type: 'text',
              text: { body: messageBody },
            }),
          });
          const resData = await resp.json();
          if (resData?.messages?.[0]?.id) {
            providerMsgId = resData.messages[0].id;
          } else {
            errorMsg = JSON.stringify(resData?.error || 'Provider rejected');
            status = 'FAILED';
          }
        } catch (provErr) {
          status = 'FAILED';
          errorMsg = provErr.message;
        }
      }

      // Record in centralized notifications log
      await db.run(
        `INSERT INTO notifications (user_id, order_id, channel, recipient, template_key, provider_msg_id, message_body, status, error)
         VALUES (?, ?, 'WHATSAPP', ?, ?, ?, ?, ?, ?)`,
        [userId, orderId, cleanPhone, templateKey, providerMsgId, messageBody, status, errorMsg]
      );

      console.log(`[WhatsAppService] Sent ${templateKey} to ${cleanPhone} [Status: ${status}]`);
      return true;
    } catch (err) {
      console.error('[WhatsAppService] Send error:', err.message);
      return false;
    }
  }
}

export default new WhatsAppService();
