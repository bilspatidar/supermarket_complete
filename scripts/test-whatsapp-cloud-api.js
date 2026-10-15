
import 'dotenv/config';

// ========================================
// WHATSAPP TEST CONFIGURATION
// ========================================

const API_URL =
  process.env.WHATSAPP_API_URL ||
  process.env.META_WHATSAPP_API_URL ||
  'https://graph.facebook.com/v19.0';

const PHONE_NUMBER_ID =
  process.env.WHATSAPP_PHONE_NUMBER_ID ||
  process.env.META_WHATSAPP_PHONE_NUMBER_ID;

const ACCESS_TOKEN =
  process.env.WHATSAPP_ACCESS_TOKEN ||
  process.env.META_WHATSAPP_ACCESS_TOKEN;

// Enter recipient number with country code
const RECIPIENT = '917000165361';

// Choose: 'template' or 'text'
const MESSAGE_TYPE = 'template';

// For template messages
const TEMPLATE_NAME = 'swastik_otp';
const TEMPLATE_LANGUAGE = 'en_US';

// IMPORTANT: Your previous Meta error said 2 body
// parameters are expected. Set both values here.
// Replace these with values matching the approved template.
const TEMPLATE_BODY_PARAMETERS = [
  '123456',
  'Login',
];

// For plain text messages (only works when permitted
// by WhatsApp messaging rules, such as the 24-hour window)
const TEXT_MESSAGE = 'Testing WhatsApp Cloud API';

// ========================================
// SEND MESSAGE
// ========================================

async function sendTestMessage() {
  if (!API_URL || !PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    throw new Error(
      'Missing WhatsApp credentials. Check your .env file.'
    );
  }

  if (!/^\d+$/.test(PHONE_NUMBER_ID)) {
    throw new Error(
      'Invalid Phone Number ID. It must contain digits only.'
    );
  }

  const endpoint =
    `${API_URL.replace(/\/+$/, '')}/${PHONE_NUMBER_ID}/messages`;

  let payload;

  if (MESSAGE_TYPE === 'text') {
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: RECIPIENT,
      type: 'text',
      text: {
        preview_url: false,
        body: TEXT_MESSAGE,
      },
    };
  } else {
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: RECIPIENT,
      type: 'template',
     template: {
  name: TEMPLATE_NAME,
  language: {
    code: TEMPLATE_LANGUAGE,
  },
  components: [
    {
      type: 'body',
      parameters: TEMPLATE_BODY_PARAMETERS.map((value) => ({
        type: 'text',
        text: value,
      })),
    },
    {
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [
        {
          type: 'text',
          text: '123456',
        },
      ],
    },
  ],
},
    };
  }

  console.log('\n=== WhatsApp API Test ===');
  console.log('API URL:', API_URL);
  console.log('Phone Number ID:', PHONE_NUMBER_ID);
  console.log('Recipient:', RECIPIENT);
  console.log('Message type:', MESSAGE_TYPE);
  console.log('Template:', MESSAGE_TYPE === 'template' ? TEMPLATE_NAME : 'N/A');
  console.log('Sending request to Meta...\n');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    let result;

    try {
      result = JSON.parse(responseText);
    } catch {
      result = { raw_response: responseText };
    }

    console.log('HTTP STATUS:', response.status);
    console.log('META RESPONSE:');
    console.log(JSON.stringify(result, null, 2));

    if (!response.ok || result.error) {
      console.error('\n❌ MESSAGE REQUEST FAILED');
      console.error('Error code:', result.error?.code);
      console.error('Error message:', result.error?.message);
      console.error('Error details:', result.error?.error_data?.details);
      return;
    }

    const messageId = result.messages?.[0]?.id;

    if (messageId) {
      console.log('\n✅ META ACCEPTED THE MESSAGE');
      console.log('Message ID:', messageId);
      console.log(
        'Note: Check delivery status to confirm it reached WhatsApp.'
      );
    } else {
      console.log('\n⚠️ No message ID returned. Check the response above.');
    }
  } catch (error) {
    console.error('\n❌ REQUEST ERROR');
    console.error(error.stack || error.message || error);
  }
}

sendTestMessage();
