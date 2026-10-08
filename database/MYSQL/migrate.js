import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DB_CLIENT, query, run, executeMultiple } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function cleanSql(sql) {
  return sql
    .split('\n')
    .map((line) => (line.trim().startsWith('--') ? '' : line))
    .join('\n');
}

async function tableExists(tableName) {
  if (DB_CLIENT === 'mysql') {
    const rows = await query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
      [tableName]
    );
    return rows.length > 0;
  }

  const rows = await query(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    [tableName]
  );
  return rows.length > 0;
}

async function columnExists(tableName, columnName) {
  if (DB_CLIENT === 'mysql') {
    const rows = await query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1`,
      [tableName, columnName]
    );
    return rows.length > 0;
  }

  const rows = await query(`PRAGMA table_info(${tableName})`);
  return rows.some((c) => c.name === columnName);
}

async function indexExists(tableName, indexName) {
  if (DB_CLIENT === 'mysql') {
    const rows = await query(
      `SELECT 1 FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? LIMIT 1`,
      [tableName, indexName]
    );
    return rows.length > 0;
  }

  const rows = await query(`PRAGMA index_list(${tableName})`);
  return rows.some((i) => i.name === indexName);
}

async function ensureColumn(table, column, definition) {
  if (!(await columnExists(table, column))) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`[Migration] Added ${table}.${column}`);
  }
}

async function ensureIndex(table, indexName, columns) {
  if (!(await indexExists(table, indexName))) {
    await run(`CREATE INDEX ${indexName} ON ${table}(${columns})`);
    console.log(`[Migration] Added index ${indexName}`);
  }
}

async function ensureDataAndPages() {
  // Account type
  await ensureColumn('users', 'account_type', "TEXT DEFAULT 'CUSTOMER'");

  // Keep account_type synchronized with internal roles.
  await run(`
    UPDATE users SET account_type = 'INTERNAL'
    WHERE id IN (
      SELECT ur.user_id
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE r.name IN ('SUPER_ADMIN', 'ADMIN', 'STORE_MANAGER', 'CASHIER_POS', 'DELIVERY_STAFF')
    )
  `);

  await run(`UPDATE users SET account_type = 'CUSTOMER' WHERE account_type IS NULL OR account_type = ''`);

  await ensureColumn('orders', 'delivery_staff_id', 'INT UNSIGNED');
  await ensureColumn('order_status_history', 'changed_by_role', 'VARCHAR(100)');
  await ensureColumn('payments', 'collected_by', 'INT UNSIGNED');
  await ensureColumn('payments', 'collected_at', 'DATETIME');
  await ensureColumn('payments', 'settled_by', 'INT UNSIGNED');
  await ensureColumn('payments', 'settled_at', 'DATETIME');
  await ensureColumn('payments', 'settlement_note', 'TEXT');
  await ensureColumn('payments', 'settlement_ref', 'VARCHAR(191)');
  await ensureColumn('roles', 'status', "VARCHAR(30) DEFAULT 'ACTIVE'");

  // Notification recipient setting
  const existingRecipients = await query(
    `SELECT \`key\` FROM store_settings WHERE \`key\` = ?`,
    ['order_notification_recipients']
  );

  if (!existingRecipients.length) {
    const value = JSON.stringify([
      { mobile: '919876543210', name: 'Store Admin', active: true },
    ]);

    await run(
      DB_CLIENT === 'mysql'
        ? `INSERT INTO store_settings (\`key\`, value, type, group_name)
           VALUES (?, ?, 'json', 'notifications')`
        : `INSERT OR IGNORE INTO store_settings (key, value, type, group_name)
           VALUES (?, ?, 'json', 'notifications')`,
      ['order_notification_recipients', value]
    );
  }

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
      description: 'Information regarding your delivery zones, order slots, and charges',
      content: 'FreshMart currently serves across major zones in Jabalpur with multiple delivery time slots daily.\n\nDelivery Timings:\n• Morning Slot: 08:00 AM - 11:00 AM\n• Afternoon Slot: 12:00 PM - 03:00 PM\n• Evening Slot: 05:00 PM - 09:00 PM\n\nDelivery Charges:\n• Standard delivery fee: ₹40 per order.\n• Free Delivery on all orders above ₹499.\n• VIP Membership members enjoy unlimited free delivery on all eligible orders.\n\nOrder cutoff is 30 minutes prior to slot start.',
      meta_title: 'Delivery Policy & Areas | FreshMart Supermarket',
      meta_description: 'Read FreshMart delivery timings, charges, free delivery thresholds and area coverage.',
    },
    {
      slug: 'refund-cancellation',
      title: 'Refund & Cancellation Policy',
      description: 'Hassle-free returns and prompt refund processing',
      content: 'At FreshMart, customer satisfaction is our top priority. If you receive damaged, defective, or incorrect items, you can request an instant return at your doorstep or contact our support team.\n\nCancellation Policy:\n• Orders can be cancelled while in PENDING or CONFIRMED state from your Account dashboard.\n• Once an order is PACKED or OUT FOR DELIVERY, cancellation requires contacting store dispatch.\n\nRefund Processing:\n• Cash on Delivery refunds are credited instantly to your FreshMart Store Wallet or Welcome Bonus balance.\n• Online payments (UPI/Card/Net Banking) are refunded back to the original source account within 3-5 business days.',
      meta_title: 'Refund & Cancellation Policy | FreshMart Supermarket',
      meta_description: 'Easy doorstep returns and fast refunds policy for FreshMart Supermarket.',
    },
    {
      slug: 'terms',
      title: 'Terms & Conditions',
      description: 'Standard terms of service for purchasing through FreshMart',
      content: 'Please read these terms and conditions carefully before using our mobile website or ordering through FreshMart.\n\n1. Account Registration: Accurate name and 10-digit mobile number must be provided. Each account is limited to one individual.\n2. Pricing & Availability: All product prices are listed in Indian Rupees (INR) inclusive of applicable taxes.\n3. Product Weights: Natural produce weights may vary slightly (+/- 5%) due to natural moisture variations.\n4. Delivered Orders: Orders marked Delivered are sealed and cannot be modified retroactively.',
      meta_title: 'Terms & Conditions | FreshMart Supermarket',
      meta_description: 'Terms and conditions governing purchases and usage of FreshMart Supermarket.',
    },
    {
      slug: 'privacy-policy',
      title: 'Privacy Policy',
      description: 'How FreshMart collects, protects, and respects your privacy',
      content: 'FreshMart values your privacy. We collect only information essential to process and deliver your grocery orders:\n\n• Information Collected: Name, Mobile number, delivery address, optional date of birth and anniversary for promotional vouchers.\n• Payment Security: We do not store credit card or UPI credentials on our servers. All transactions are securely routed through RBI-compliant payment gateways.\n• Communication: We use WhatsApp and SMS notifications solely for order tracking and important service alerts. We never sell your personal data to third parties.',
      meta_title: 'Privacy Policy | FreshMart Supermarket',
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
    if (!existing.length) {
      await run(
        `INSERT INTO pages
          (title, slug, description, content, meta_title, meta_description, status)
         VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
        [p.title, p.slug, p.description, p.content, p.meta_title, p.meta_description]
      );
    }
  }
}

async function ensurePerformanceIndexes() {
  const indexes = [
    ['products', 'idx_products_category', 'category_id'],
    ['products', 'idx_products_brand', 'brand_id'],
    ['products', 'idx_products_code', 'product_code'],
    ['products', 'idx_products_status', 'status'],
    ['orders', 'idx_orders_user', 'user_id'],
    ['orders', 'idx_orders_number', 'order_number'],
    ['orders', 'idx_orders_status', 'order_status'],
    ['orders', 'idx_orders_source', 'source'],
    ['cart_items', 'idx_cart_items_cart', 'cart_id'],
    ['notifications', 'idx_notifications_recipient', 'recipient'],
    ['customer_bonus_transactions', 'idx_bonus_user', 'user_id'],
    ['inventory_transactions', 'idx_inventory_product', 'product_id'],
  ];

  for (const [table, name, columns] of indexes) {
    await ensureIndex(table, name, columns);
  }
}

export async function runMigrations() {
  console.log(`[Migration] Starting ${DB_CLIENT} database migration...`);

  const schemaFile = DB_CLIENT === 'mysql' ? 'schema.mysql.sql' : 'schema.sql';
  const schemaPath = path.resolve(__dirname, schemaFile);

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  const schemaSql = cleanSql(fs.readFileSync(schemaPath, 'utf8'));
  await executeMultiple(schemaSql);

  await ensureDataAndPages();
  await ensurePerformanceIndexes();

  console.log(`[Migration] ${DB_CLIENT} tables, columns, data and indexes are ready.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => {
      console.log('[Migration] Completed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migration] Failed:', err.message);
      console.error(err.stack);
      process.exit(1);
    });
}
