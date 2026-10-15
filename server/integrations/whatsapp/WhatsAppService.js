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
 
async send({
  recipient,
  templateKey,
  variables = {},
  userId = null,
  orderId = null,
  deduplicateKey = null,
}) {
  let cleanPhone = '';

  try {
    if (!recipient) {
      throw new Error('WhatsApp recipient is required');
    }

    cleanPhone = String(recipient).replace(/\D/g, '');

    if (!cleanPhone) {
      throw new Error('Invalid WhatsApp recipient');
    }

    // Deduplication
    if (deduplicateKey) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const existing = await db.get(
        `SELECT id FROM notifications
         WHERE recipient = ?
           AND template_key = ?
           AND created_at >= ?`,
        [cleanPhone, templateKey, todayStart.toISOString()]
      );

      if (existing) {
        throw new Error('Duplicate WhatsApp notification already exists');
      }
    }

    // Template configuration
    const template = this.getTemplate(templateKey);

    if (!template || !template.enabled) {
      throw new Error(`WhatsApp template "${templateKey}" is missing or disabled`);
    }

    // Store name
    if (!variables.store_name) {
      const setting = await db.get(
        "SELECT value FROM store_settings WHERE setting_key = 'store_name'"
      );

      variables = {
        ...variables,
        store_name: setting?.value || 'Swastik Supermarket',
      };
    }

    const messageBody = this.renderBody(template.body, variables);

    // Meta configuration
    const apiUrl = process.env.WHATSAPP_API_URL;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!apiUrl || !token || !phoneId || token.includes('sample_')) {
      throw new Error('WhatsApp Cloud API credentials are missing or invalid');
    }

    // Use the configured API URL, for example:
    // https://graph.facebook.com/vXX.X
    const baseUrl = apiUrl.replace(/\/+$/, '');
    const endpoint = `${baseUrl}/${phoneId}/messages`;

    // Send approved Meta template for OTP authentication.
    // Other notification templates continue to use text messages here.
    let payload;

    
if (template.meta?.send_as_template) {
  const metaConfig = template.meta;

  const templateName = template.template_name;

  if (!templateName) {
    throw new Error(
      `Meta template_name missing for ${templateKey}`
    );
  }

  const resolveValue = (key) => {
    const value = variables[key] ?? metaConfig.defaults?.[key];

    if (value === undefined || value === null) {
      throw new Error(
        `Missing WhatsApp template variable "${key}" for ${templateKey}`
      );
    }

    return String(value);
  };

  const components = [];

  // Build BODY parameters dynamically from JSON
  const bodyParameterNames = metaConfig.body_parameters || [];

  if (bodyParameterNames.length > 0) {
    components.push({
      type: 'body',
      parameters: bodyParameterNames.map((key) => ({
        type: 'text',
        text: resolveValue(key),
      })),
    });
  }

  // Build button parameters dynamically from JSON
  for (const button of metaConfig.buttons || []) {
    components.push({
      type: 'button',
      sub_type: button.type,
      index: String(button.index),
      parameters: (button.parameters || []).map((key) => ({
        type: 'text',
        text: resolveValue(key),
      })),
    });
  }

  payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanPhone,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: template.language || 'en_US',
      },
      ...(components.length > 0 ? { components } : {}),
    },
  };
} else {
  // Preserve the existing behavior for other notifications
  payload = {
    messaging_product: 'whatsapp',
    to: cleanPhone,
    type: 'text',
    text: { body: messageBody },
  };
}


    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const resData = await resp.json().catch(() => ({}));

    console.log('[WhatsApp API] HTTP status:', resp.status); 
    console.log('[WhatsApp API] Response:', JSON.stringify(resData, null, 2));

    if (!resp.ok || !resData?.messages?.[0]?.id) {
  const providerError =
    resData?.error?.message ||
    JSON.stringify(resData?.error || resData) ||
    `HTTP ${resp.status}`;

  const err = new Error(
    `WhatsApp API error (${resp.status}): ${providerError}`
  );

  err.status = resp.status;
  err.providerError = resData?.error || resData;

  throw err;
}

    const providerMsgId = resData.messages[0].id;

    // Meta accepted the message. Delivery is not yet confirmed.
    await db.run(
      `INSERT INTO notifications
        (user_id, order_id, channel, recipient, template_key,
         provider_msg_id, message_body, status, error)
       VALUES (?, ?, 'WHATSAPP', ?, ?, ?, ?, 'SENT', NULL)`,
      [
        userId,
        orderId,
        cleanPhone,
        templateKey,
        providerMsgId,
        messageBody,
      ]
    );

    console.log(
      `[WhatsAppService] Meta accepted ${templateKey}; message ID: ${providerMsgId}`
    );

    return {
      success: true,
      messageId: providerMsgId,
      status: 'SENT',
    };
  } catch (err) {
    console.error(
      `[WhatsAppService] Failed to send ${templateKey}:`,
      err.message
    );

    throw err;
  }
}

}

export default new WhatsAppService();
