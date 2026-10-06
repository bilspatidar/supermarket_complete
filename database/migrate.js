import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { executeMultiple } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  console.log('[Migration] Starting database migration...');
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Strip single-line comments and execute
  const cleanSql = schemaSql
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('--')) return '';
      return line;
    })
    .join('\n');

  await executeMultiple(cleanSql);

  // Check and add account_type to users if not present
  try {
    const { query, run } = await import('./connection.js');
    const cols = await query('PRAGMA table_info(users)');
    const hasAccountType = cols.some(c => c.name === 'account_type');
    if (!hasAccountType) {
      await run("ALTER TABLE users ADD COLUMN account_type TEXT DEFAULT 'CUSTOMER'");
      console.log('[Migration] Added account_type column to users table.');
    }
    // Sync account_type based on user_roles
    await run(`
      UPDATE users SET account_type = 'INTERNAL'
      WHERE id IN (
        SELECT ur.user_id FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE r.name IN ('SUPER_ADMIN', 'ADMIN', 'STORE_MANAGER', 'CASHIER_POS', 'DELIVERY_STAFF')
      )
    `);
    await run(`
      UPDATE users SET account_type = 'CUSTOMER'
      WHERE account_type IS NULL OR account_type = ''
    `);

    // 1. Orders: delivery_staff_id
    const orderCols = await query('PRAGMA table_info(orders)');
    if (!orderCols.some(c => c.name === 'delivery_staff_id')) {
      await run('ALTER TABLE orders ADD COLUMN delivery_staff_id INTEGER');
      console.log('[Migration] Added delivery_staff_id to orders table.');
    }

    // 2. Order Status History: changed_by_role
    const oshCols = await query('PRAGMA table_info(order_status_history)');
    if (!oshCols.some(c => c.name === 'changed_by_role')) {
      await run('ALTER TABLE order_status_history ADD COLUMN changed_by_role TEXT');
      console.log('[Migration] Added changed_by_role to order_status_history table.');
    }

    // 3. Payments: COD collection & settlement columns
    const payCols = await query('PRAGMA table_info(payments)');
    if (!payCols.some(c => c.name === 'collected_by')) {
      await run('ALTER TABLE payments ADD COLUMN collected_by INTEGER');
      await run('ALTER TABLE payments ADD COLUMN collected_at DATETIME');
      await run('ALTER TABLE payments ADD COLUMN settled_by INTEGER');
      await run('ALTER TABLE payments ADD COLUMN settled_at DATETIME');
      await run('ALTER TABLE payments ADD COLUMN settlement_note TEXT');
      await run('ALTER TABLE payments ADD COLUMN settlement_ref TEXT');
      console.log('[Migration] Added COD collection and settlement columns to payments table.');
    }

    // 4. Roles: status
    const roleCols = await query('PRAGMA table_info(roles)');
    if (!roleCols.some(c => c.name === 'status')) {
      await run("ALTER TABLE roles ADD COLUMN status TEXT DEFAULT 'ACTIVE'");
      console.log('[Migration] Added status column to roles table.');
    }

    // 5. Store Settings: order_notification_recipients
    const existingRecipients = await query("SELECT key FROM store_settings WHERE key = 'order_notification_recipients'");
    if (existingRecipients.length === 0) {
      await run(
        `INSERT OR IGNORE INTO store_settings (key, value, type, group_name)
         VALUES ('order_notification_recipients', ?, 'json', 'notifications')`,
        [JSON.stringify([
          { mobile: '919876543210', name: 'Store Admin', active: true }
        ])]
      );
    }

    // 6. Ensure standard CMS pages exist
    const initialPages = [
      {
        slug: 'about',
        title: 'About FreshMart',
        description: 'Quality Groceries & Farm Fresh Produce Delivered Daily',
        content: 'Welcome to FreshMart Supermarket, your neighborhood source for pure, farm-direct groceries in Jabalpur.\n\nFounded with a commitment to freshness, hygiene, and unbeatable value, we bring you fresh fruits, green vegetables, farm-dairy products, organic pulses, cold-pressed oils, and household staples directly from verified farmers and leading brands.\n\nOur modern local micro-fulfillment centers ensure superfast delivery right to your doorstep within your preferred delivery slot.',
        meta_title: 'About Us | FreshMart Supermarket',
        meta_description: 'Learn about FreshMart Supermarket - fresh groceries, farm produce and express delivery in Jabalpur.',
      },
      {
        slug: 'delivery-policy',
        title: 'Delivery Areas & Policy',
        description: 'Information regarding our delivery zones, order slots, and charges',
        content: 'FreshMart currently serves across major zones in Jabalpur with multiple delivery time slots daily.\n\nDelivery Timings:\n• Morning Slot: 08:00 AM - 11:00 AM\n• Afternoon Slot: 12:00 PM - 03:00 PM\n• Evening Slot: 05:00 PM - 09:00 PM\n\nDelivery Charges:\n• Standard delivery fee: ₹40 per order.\n• Free Delivery on all orders above ₹499.\n• VIP Membership members enjoy unlimited free delivery on all eligible orders.\n\nOrder cutoff is 30 minutes prior to slot start.',
        meta_title: 'Delivery Policy & Areas | FreshMart',
        meta_description: 'Read FreshMart delivery timings, charges, free delivery thresholds and area coverage.',
      },
      {
        slug: 'refund-cancellation',
        title: 'Refund & Cancellation Policy',
        description: 'Hassle-free returns and prompt refund processing',
        content: 'At FreshMart, customer satisfaction is our top priority. If you receive damaged, defective, or incorrect items, you can request an instant return at your doorstep or contact our support team.\n\nCancellation Policy:\n• Orders can be cancelled while in PENDING or CONFIRMED state from your Account dashboard.\n• Once an order is PACKED or OUT FOR DELIVERY, cancellation requires contacting store dispatch.\n\nRefund Processing:\n• Cash on Delivery refunds are credited instantly to your FreshMart Store Wallet or Welcome Bonus balance.\n• Online payments (UPI/Card/Net Banking) are refunded back to the original source account within 3-5 business days.',
        meta_title: 'Refund & Cancellation Policy | FreshMart',
        meta_description: 'Easy doorstep returns and fast refunds policy at FreshMart Supermarket.',
      },
      {
        slug: 'terms',
        title: 'Terms & Conditions',
        description: 'Standard terms of service for purchasing through FreshMart',
        content: 'Please read these terms and conditions carefully before using our mobile website or ordering through FreshMart.\n\n1. Account Registration: Accurate name and 10-digit mobile number must be provided. Each account is limited to one individual.\n2. Pricing & Availability: All product prices are listed in Indian Rupees (INR) inclusive of applicable taxes.\n3. Product Weights: Natural produce weights may vary slightly (+/- 5%) due to natural moisture variations.\n4. Delivered Orders: Orders marked Delivered are sealed and cannot be modified retroactively.',
        meta_title: 'Terms & Conditions | FreshMart',
        meta_description: 'Terms and conditions governing purchases and usage of FreshMart Supermarket.',
      },
      {
        slug: 'privacy-policy',
        title: 'Privacy Policy',
        description: 'How FreshMart collects, protects, and respects your personal data',
        content: 'FreshMart values your privacy. We collect only information essential to process and deliver your grocery orders:\n\n• Information Collected: Name, Mobile number, delivery address, optional date of birth and anniversary for promotional vouchers.\n• Payment Security: We do not store credit card or UPI credentials on our servers. All transactions are securely routed through RBI-compliant payment gateways.\n• Communication: We use WhatsApp and SMS notifications solely for order tracking and important service alerts. We never sell your personal data to third parties.',
        meta_title: 'Privacy Policy | FreshMart',
        meta_description: 'FreshMart Privacy Policy explaining data protection and customer security.',
      },
      {
        slug: 'contact',
        title: 'Contact Us & Store Location',
        description: 'Get in touch with our store team or visit our retail counter',
        content: 'Visit our retail supermarket counter or reach out to our customer support team for inquiries, bulk orders, and feedback.',
        meta_title: 'Contact Us | FreshMart Supermarket',
        meta_description: 'Contact FreshMart supermarket support team via phone, WhatsApp or store visit.',
      },
    ];

    for (const p of initialPages) {
      const existing = await query('SELECT id FROM pages WHERE slug = ?', [p.slug]);
      if (existing.length === 0) {
        await run(
          `INSERT INTO pages (title, slug, description, content, meta_title, meta_description, status)
           VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
          [p.title, p.slug, p.description, p.content, p.meta_title, p.meta_description]
        );
      }
    }
  } catch (colErr) {
    console.warn('[Migration] Note on column migration:', colErr.message);
  }

  console.log('[Migration] Database tables and indexes created successfully.');
}

// If invoked directly from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => {
      console.log('[Migration] Completed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migration] Failed:', err);
      process.exit(1);
    });
}
