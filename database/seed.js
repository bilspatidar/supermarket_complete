import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import db from './connection.js';
import { runMigrations } from './migrate.js';

export async function runSeeder() {
  await runMigrations();
  console.log('[Seeder] Starting data seeding...');

  // 1. Roles
  const roles = [
    { id: 1, name: 'SUPER_ADMIN', description: 'Full access to all system modules' },
    { id: 2, name: 'STORE_MANAGER', description: 'Store operations and catalog management' },
    { id: 3, name: 'CASHIER_POS', description: 'In-house POS order creation and billing' },
    { id: 4, name: 'DELIVERY_STAFF', description: 'Order delivery dispatch and updates' },
    { id: 5, name: 'CUSTOMER', description: 'Store shopper' },
  ];

  for (const r of roles) {
    const existing = await db.get('SELECT id FROM roles WHERE name = ?', [r.name]);
    if (!existing) {
      await db.run('INSERT INTO roles (name, description, is_system) VALUES (?, ?, 1)', [r.name, r.description]);
    }
  }

  // 2. Permissions
  const permissions = [
    { name: 'dashboard.view', group: 'Dashboard', desc: 'View analytics and dashboard' },
    { name: 'customers.view', group: 'Customers', desc: 'View customer list and profiles' },
    { name: 'customers.create', group: 'Customers', desc: 'Create customers' },
    { name: 'customers.update', group: 'Customers', desc: 'Update customer details' },
    { name: 'customers.delete', group: 'Customers', desc: 'Delete or block customers' },
    { name: 'customers.correct_personal_data', group: 'Customers', desc: 'Correct locked DOB and Anniversary' },
    { name: 'products.view', group: 'Products', desc: 'View products' },
    { name: 'products.create', group: 'Products', desc: 'Create products' },
    { name: 'products.update', group: 'Products', desc: 'Update products' },
    { name: 'products.delete', group: 'Products', desc: 'Delete products' },
    { name: 'inventory.view', group: 'Inventory', desc: 'View stock and transactions' },
    { name: 'inventory.create', group: 'Inventory', desc: 'Add new inventory batches' },
    { name: 'inventory.adjust', group: 'Inventory', desc: 'Manually adjust stock with reason' },
    { name: 'orders.view', group: 'Orders', desc: 'View all orders' },
    { name: 'orders.create', group: 'Orders', desc: 'Create orders / In-house POS' },
    { name: 'orders.update', group: 'Orders', desc: 'Update order status and details' },
    { name: 'orders.cancel', group: 'Orders', desc: 'Cancel order and trigger refunds' },
    { name: 'orders.refund', group: 'Orders', desc: 'Process refunds' },
    { name: 'payments.view', group: 'Payments', desc: 'View payment ledger' },
    { name: 'payments.refund', group: 'Payments', desc: 'Refund payments' },
    { name: 'coupons.view', group: 'Coupons', desc: 'View coupons' },
    { name: 'coupons.create', group: 'Coupons', desc: 'Create coupons' },
    { name: 'coupons.update', group: 'Coupons', desc: 'Update coupons' },
    { name: 'coupons.delete', group: 'Coupons', desc: 'Delete coupons' },
    { name: 'membership.view', group: 'Membership', desc: 'View membership plans & subscribers' },
    { name: 'membership.create', group: 'Membership', desc: 'Create membership plans' },
    { name: 'membership.update', group: 'Membership', desc: 'Update membership plans' },
    { name: 'membership.delete', group: 'Membership', desc: 'Delete membership plans' },
    { name: 'delivery.view', group: 'Delivery', desc: 'View delivery zones' },
    { name: 'delivery.create', group: 'Delivery', desc: 'Create areas and sub areas' },
    { name: 'delivery.update', group: 'Delivery', desc: 'Update areas and sub areas' },
    { name: 'delivery.delete', group: 'Delivery', desc: 'Delete areas and sub areas' },
    { name: 'reports.view', group: 'Reports', desc: 'View revenue and sales reports' },
    { name: 'settings.view', group: 'Settings', desc: 'View store settings' },
    { name: 'settings.update', group: 'Settings', desc: 'Update store settings' },
    { name: 'staff.view', group: 'Staff', desc: 'View staff members' },
    { name: 'staff.create', group: 'Staff', desc: 'Create staff accounts' },
    { name: 'staff.update', group: 'Staff', desc: 'Update staff permissions' },
    { name: 'staff.delete', group: 'Staff', desc: 'Delete staff accounts' },
    { name: 'roles.view', group: 'Roles', desc: 'View roles and permission assignments' },
    { name: 'roles.create', group: 'Roles', desc: 'Create custom internal roles' },
    { name: 'roles.update', group: 'Roles', desc: 'Modify role permissions and settings' },
    { name: 'roles.delete', group: 'Roles', desc: 'Delete unassigned roles' },
    { name: 'cms.view', group: 'CMS', desc: 'View home sliders and static pages' },
    { name: 'cms.create', group: 'CMS', desc: 'Create home sliders and static pages' },
    { name: 'cms.update', group: 'CMS', desc: 'Update home sliders and static pages' },
    { name: 'cms.delete', group: 'CMS', desc: 'Delete home sliders and static pages' },
    { name: 'audit.view', group: 'Audit', desc: 'View system audit logs' },
  ];

  for (const p of permissions) {
    const existing = await db.get('SELECT id FROM permissions WHERE name = ?', [p.name]);
    if (!existing) {
      await db.run('INSERT INTO permissions (name, group_name, description) VALUES (?, ?, ?)', [p.name, p.group, p.desc]);
    }
  }

  // Grant all permissions to SUPER_ADMIN (role_id 1)
  const allPerms = await db.query('SELECT id FROM permissions');
  const adminRole = await db.get('SELECT id FROM roles WHERE name = ?', ['SUPER_ADMIN']);
  if (adminRole) {
    for (const p of allPerms) {
      await db.run('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [adminRole.id, p.id]);
    }
  }

  // Grant POS permissions to CASHIER_POS
  const cashierRole = await db.get('SELECT id FROM roles WHERE name = ?', ['CASHIER_POS']);
  if (cashierRole) {
    const cashierPermNames = ['dashboard.view', 'products.view', 'inventory.view', 'orders.view', 'orders.create', 'customers.view', 'customers.create', 'coupons.view', 'membership.view'];
    for (const name of cashierPermNames) {
      const perm = await db.get('SELECT id FROM permissions WHERE name = ?', [name]);
      if (perm) {
        await db.run('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [cashierRole.id, perm.id]);
      }
    }
  }

  // 3. Store Settings
  const defaultSettings = [
    { key: 'store_name', value: 'FreshMart Supermarket', type: 'string', group: 'general' },
    { key: 'store_tagline', value: 'Fresh Groceries Delivered Fast & Fresh', type: 'string', group: 'general' },
    { key: 'store_mobile', value: '+91 98765 43210', type: 'string', group: 'general' },
    { key: 'store_email', value: 'support@freshmart.local', type: 'string', group: 'general' },
    { key: 'store_address', value: 'Plot 42, Commercial Zone, Jabalpur, MP, 482002', type: 'string', group: 'general' },
    { key: 'store_gst', value: '23AABCU9603R1ZV', type: 'string', group: 'general' },
    { key: 'currency_symbol', value: '₹', type: 'string', group: 'general' },
    { key: 'currency_code', value: 'INR', type: 'string', group: 'general' },
    { key: 'cod_enabled', value: 'true', type: 'boolean', group: 'payment' },
    { key: 'razorpay_enabled', value: 'true', type: 'boolean', group: 'payment' },
    { key: 'admin_whatsapp_number', value: '919876543210', type: 'string', group: 'whatsapp' },
    { key: 'whatsapp_enabled', value: 'true', type: 'boolean', group: 'whatsapp' },
    { key: 'store_opening_time', value: '08:00', type: 'string', group: 'operations' },
    { key: 'store_closing_time', value: '22:00', type: 'string', group: 'operations' },
    { key: 'membership_enabled', value: 'true', type: 'boolean', group: 'membership' },
    { key: 'welcome_bonus_enabled', value: 'true', type: 'boolean', group: 'welcome_bonus' },
    { key: 'welcome_bonus_amount', value: '100', type: 'number', group: 'welcome_bonus' },
    { key: 'welcome_bonus_validity_days', value: '30', type: 'number', group: 'welcome_bonus' },
    { key: 'welcome_bonus_min_order', value: '499', type: 'number', group: 'welcome_bonus' },
    { key: 'welcome_bonus_max_redemption', value: '100', type: 'number', group: 'welcome_bonus' },
    { key: 'welcome_bonus_allow_coupon', value: 'true', type: 'boolean', group: 'welcome_bonus' },
    { key: 'welcome_bonus_allow_membership', value: 'true', type: 'boolean', group: 'welcome_bonus' },
  ];

  for (const s of defaultSettings) {
    await db.run(
      'INSERT OR IGNORE INTO store_settings (key, value, type, group_name) VALUES (?, ?, ?, ?)',
      [s.key, s.value, s.type, s.group]
    );
  }

  // 4. Default Users
  const adminMobile = '9876543210';
  let adminUser = await db.get('SELECT id FROM users WHERE mobile = ?', [adminMobile]);
  if (!adminUser) {
    const hash = await bcrypt.hash('admin123', 10);
    const res = await db.run(
      `INSERT INTO users (uuid, mobile, password_hash, name, email, account_type, status, mobile_verified, dob_locked, anniversary_locked)
       VALUES (?, ?, ?, ?, ?, 'INTERNAL', 'ACTIVE', 1, 0, 0)`,
      [crypto.randomUUID(), adminMobile, hash, 'Super Admin', 'admin@freshmart.local']
    );
    const userId = res.lastInsertRowid;
    await db.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, adminRole.id]);
    console.log('[Seeder] Created Super Admin: 9876543210 / admin123');
  }

  const staffMobile = '9876543211';
  let staffUser = await db.get('SELECT id FROM users WHERE mobile = ?', [staffMobile]);
  if (!staffUser) {
    const hash = await bcrypt.hash('staff123', 10);
    const res = await db.run(
      `INSERT INTO users (uuid, mobile, password_hash, name, email, account_type, status, mobile_verified, dob_locked, anniversary_locked)
       VALUES (?, ?, ?, ?, ?, 'INTERNAL', 'ACTIVE', 1, 0, 0)`,
      [crypto.randomUUID(), staffMobile, hash, 'Ramesh Cashier', 'cashier@freshmart.local']
    );
    const userId = res.lastInsertRowid;
    await db.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, cashierRole.id]);
    console.log('[Seeder] Created Cashier POS: 9876543211 / staff123');
  }

  const customerMobile = '9876543212';
  let customerUser = await db.get('SELECT id FROM users WHERE mobile = ?', [customerMobile]);
  if (!customerUser) {
    const hash = await bcrypt.hash('customer123', 10);
    const custRole = await db.get('SELECT id FROM roles WHERE name = ?', ['CUSTOMER']);
    const res = await db.run(
      `INSERT INTO users (uuid, mobile, password_hash, name, email, account_type, dob, anniversary_date, status, mobile_verified, dob_locked, anniversary_locked)
       VALUES (?, ?, ?, ?, ?, 'CUSTOMER', '1990-09-14', '2018-12-25', 'ACTIVE', 1, 1, 1)`,
      [crypto.randomUUID(), customerMobile, hash, 'Bilash Patidar', 'bilspatidar@gmail.com']
    );
    const userId = res.lastInsertRowid;
    await db.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, custRole.id]);

    // Give welcome bonus to demo customer
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await db.run(
      `INSERT INTO customer_bonus_transactions (user_id, type, amount, reference_type, reference_id, expires_at, status, description)
       VALUES (?, 'WELCOME_BONUS', 100, 'REGISTRATION', 'WELCOME_100', ?, 'ACTIVE', 'Welcome registration promotional credit')`,
      [userId, expiresAt]
    );

    console.log('[Seeder] Created Demo Customer: 9876543212 / customer123 (with ₹100 Welcome Bonus, locked DOB & Anniversary)');
  }

  // 5. Delivery Areas & Sub Areas
  let jabalpurArea = await db.get('SELECT id FROM delivery_areas WHERE name = ?', ['Jabalpur']);
  if (!jabalpurArea) {
    const res = await db.run(
      `INSERT INTO delivery_areas (name, status, delivery_charge, free_delivery_minimum, minimum_order, start_time, end_time, sort_order)
       VALUES ('Jabalpur', 'ACTIVE', 40.0, 499.0, 199.0, '08:00', '22:00', 1)`
    );
    const areaId = res.lastInsertRowid;

    // Sub-areas
    const subAreas = [
      { name: 'Vijay Nagar', charge: 30.0, freeMin: 399.0 }, // Sub-area override
      { name: 'Wright Town', charge: null, freeMin: null },  // Inherits Jabalpur
      { name: 'Napier Town', charge: null, freeMin: null },  // Inherits Jabalpur
      { name: 'Adhartal', charge: 45.0, freeMin: 599.0 },    // Sub-area override
      { name: 'Gorakhpur', charge: null, freeMin: null },   // Inherits Jabalpur
    ];

    for (const sub of subAreas) {
      await db.run(
        `INSERT INTO delivery_sub_areas (area_id, name, status, delivery_charge, free_delivery_minimum, sort_order)
         VALUES (?, ?, 'ACTIVE', ?, ?, 0)`,
        [areaId, sub.name, sub.charge, sub.freeMin]
      );
    }
    console.log('[Seeder] Created Delivery Area: Jabalpur with 5 Sub-Areas (Vijay Nagar, Wright Town, etc.)');
  }

  // 6. Delivery Slots
  const defaultSlots = [
    { name: 'Morning Slot (09:00 AM - 11:00 AM)', start: '09:00', end: '11:00' },
    { name: 'Mid-Day Slot (11:00 AM - 01:00 PM)', start: '11:00', end: '13:00' },
    { name: 'Evening Slot (04:00 PM - 06:00 PM)', start: '16:00', end: '18:00' },
    { name: 'Night Slot (06:00 PM - 09:00 PM)', start: '18:00', end: '21:00' },
  ];
  for (const slot of defaultSlots) {
    const existing = await db.get('SELECT id FROM delivery_slots WHERE name = ?', [slot.name]);
    if (!existing) {
      await db.run(
        "INSERT INTO delivery_slots (name, start_time, end_time, status) VALUES (?, ?, ?, 'ACTIVE')",
        [slot.name, slot.start, slot.end]
      );
    }
  }

  // 7. Categories
  const categoriesData = [
    { name: 'Fresh Fruits & Vegetables', slug: 'fruits-vegetables', desc: 'Farm fresh organic fruits and daily vegetables', image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&q=80', sort: 1 },
    { name: 'Dairy & Bakery', slug: 'dairy-bakery', desc: 'Pure milk, butter, paneer, and artisan breads', image: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400&q=80', sort: 2 },
    { name: 'Staples, Atta & Dals', slug: 'staples-atta-dals', desc: 'Premium grains, whole wheat atta, organic pulses', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80', sort: 3 },
    { name: 'Snacks & Munchies', slug: 'snacks-munchies', desc: 'Crispy snacks, biscuits, namkeen, and chips', image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80', sort: 4 },
    { name: 'Beverages & Juices', slug: 'beverages-juices', desc: 'Fresh fruit juices, tea, coffee, cold drinks', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80', sort: 5 },
    { name: 'Personal & Home Care', slug: 'personal-home-care', desc: 'Soaps, shampoos, detergents and floor cleaners', image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&q=80', sort: 6 },
  ];

  for (const cat of categoriesData) {
    const existing = await db.get('SELECT id FROM categories WHERE slug = ?', [cat.slug]);
    if (!existing) {
      await db.run(
        "INSERT INTO categories (name, slug, description, image, status, sort_order) VALUES (?, ?, ?, ?, 'ACTIVE', ?)",
        [cat.name, cat.slug, cat.desc, cat.image, cat.sort]
      );
    }
  }

  // 8. Brands
  const brandsData = [
    { name: 'FreshFarm Organic', slug: 'freshfarm-organic', desc: 'Direct from certified local farmers' },
    { name: 'Amul', slug: 'amul', desc: 'The Taste of India' },
    { name: 'Aashirvaad', slug: 'aashirvaad', desc: 'Purity and quality flours' },
    { name: 'Tata Sampann', slug: 'tata-sampann', desc: 'Unpolished natural dals and spices' },
    { name: 'Britannia', slug: 'britannia', desc: 'Eat healthy, think better' },
    { name: 'Nestlé', slug: 'nestle', desc: 'Good food, Good life' },
    { name: 'Fortune', slug: 'fortune', desc: 'Pure cooking oils and foods' },
  ];

  for (const br of brandsData) {
    const existing = await db.get('SELECT id FROM brands WHERE slug = ?', [br.slug]);
    if (!existing) {
      await db.run(
        "INSERT INTO brands (name, slug, description, status) VALUES (?, ?, ?, 'ACTIVE')",
        [br.name, br.slug, br.desc]
      );
    }
  }

  // 9. Products & Inventory
  const catVeg = await db.get('SELECT id FROM categories WHERE slug = ?', ['fruits-vegetables']);
  const catDairy = await db.get('SELECT id FROM categories WHERE slug = ?', ['dairy-bakery']);
  const catStaples = await db.get('SELECT id FROM categories WHERE slug = ?', ['staples-atta-dals']);
  const catSnacks = await db.get('SELECT id FROM categories WHERE slug = ?', ['snacks-munchies']);
  const catBev = await db.get('SELECT id FROM categories WHERE slug = ?', ['beverages-juices']);

  const brFarm = await db.get('SELECT id FROM brands WHERE slug = ?', ['freshfarm-organic']);
  const brAmul = await db.get('SELECT id FROM brands WHERE slug = ?', ['amul']);
  const brAash = await db.get('SELECT id FROM brands WHERE slug = ?', ['aashirvaad']);
  const brTata = await db.get('SELECT id FROM brands WHERE slug = ?', ['tata-sampann']);
  const brBrit = await db.get('SELECT id FROM brands WHERE slug = ?', ['britannia']);
  const brNest = await db.get('SELECT id FROM brands WHERE slug = ?', ['nestle']);

  const productsData = [
    {
      code: 'SP000001',
      name: 'Fresh Farm Red Apples (Shimla Royal)',
      slug: 'fresh-farm-red-apples',
      catId: catVeg.id,
      brandId: brFarm.id,
      originalPrice: 180,
      sellingPrice: 149,
      unit: '1 kg',
      stock: 45,
      tax: 0,
      desc: 'Crisp, sweet, handpicked Himalayan apples packed with vitamins and minerals.',
      image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&q=80',
      image2: 'https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?w=500&q=80',
      featured: 1,
    },
    {
      code: 'SP000002',
      name: 'Organic Farm Spinach (Palak)',
      slug: 'organic-farm-spinach',
      catId: catVeg.id,
      brandId: brFarm.id,
      originalPrice: 40,
      sellingPrice: 28,
      unit: '250 g bunch',
      stock: 30,
      tax: 0,
      desc: 'Tender, washed and iron-rich green spinach leaves harvested daily.',
      image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=500&q=80',
      image2: '',
      featured: 0,
    },
    {
      code: 'SP000003',
      name: 'Amul Taaza Homogenised Toned Milk',
      slug: 'amul-taaza-toned-milk',
      catId: catDairy.id,
      brandId: brAmul.id,
      originalPrice: 74,
      sellingPrice: 70,
      unit: '1 Litre Tetra',
      stock: 60,
      tax: 0,
      desc: 'Pure nutritious cow and buffalo toned milk, UHT treated with zero preservatives.',
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&q=80',
      image2: '',
      featured: 1,
    },
    {
      code: 'SP000004',
      name: 'Amul Malai Fresh Paneer',
      slug: 'amul-malai-paneer',
      catId: catDairy.id,
      brandId: brAmul.id,
      originalPrice: 95,
      sellingPrice: 88,
      unit: '200 g block',
      stock: 25,
      tax: 0,
      desc: 'Soft and melt-in-the-mouth cottage cheese made from rich fresh milk.',
      image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&q=80',
      image2: '',
      featured: 1,
    },
    {
      code: 'SP000005',
      name: 'Aashirvaad Superior Sharbati Whole Wheat Atta',
      slug: 'aashirvaad-sharbati-atta',
      catId: catStaples.id,
      brandId: brAash.id,
      originalPrice: 310,
      sellingPrice: 279,
      unit: '5 kg bag',
      stock: 40,
      tax: 0,
      desc: '100% MP Sharbati whole wheat grains ground to make the softest rotis.',
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80',
      image2: '',
      featured: 1,
    },
    {
      code: 'SP000006',
      name: 'Tata Sampann Unpolished Toor Dal',
      slug: 'tata-sampann-toor-dal',
      catId: catStaples.id,
      brandId: brTata.id,
      originalPrice: 195,
      sellingPrice: 168,
      unit: '1 kg pouch',
      stock: 50,
      tax: 0,
      desc: 'Naturally protein rich, unpolished arhar toor dal without water or oil polish.',
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80',
      image2: '',
      featured: 0,
    },
    {
      code: 'SP000007',
      name: 'Britannia Good Day Butter Cookies Pack',
      slug: 'britannia-good-day-butter',
      catId: catSnacks.id,
      brandId: brBrit.id,
      originalPrice: 60,
      sellingPrice: 52,
      unit: '200 g pack',
      stock: 80,
      tax: 5,
      desc: 'Rich butter cookies with delightful crunchy smile textures.',
      image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&q=80',
      image2: '',
      featured: 1,
    },
    {
      code: 'SP000008',
      name: 'Nescafé Classic Instant Coffee Jar',
      slug: 'nescafe-classic-instant-coffee',
      catId: catBev.id,
      brandId: brNest.id,
      originalPrice: 220,
      sellingPrice: 195,
      unit: '100 g glass jar',
      stock: 35,
      tax: 5,
      desc: '100% pure Robusta coffee beans roasted to give a bold and invigorating aroma.',
      image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&q=80',
      image2: '',
      featured: 1,
    },
    {
      code: 'SP000009',
      name: 'Organic Golden Roasted Flax Seeds',
      slug: 'organic-roasted-flax-seeds',
      catId: catStaples.id,
      brandId: brFarm.id,
      originalPrice: 120,
      sellingPrice: 99,
      unit: '250 g pouch',
      stock: 20,
      tax: 5,
      desc: 'Crunchy 20 20 roasted flax seed rich in Omega-3 fatty acids and natural dietary fiber.',
      image: 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=500&q=80',
      image2: '',
      featured: 1,
    },
  ];

  for (const p of productsData) {
    const existing = await db.get('SELECT id FROM products WHERE product_code = ?', [p.code]);
    if (!existing) {
      const res = await db.run(
        `INSERT INTO products (product_code, name, slug, category_id, brand_id, original_price, selling_price, tax_percent, unit, stock, minimum_stock, description, image, image2, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 5, ?, ?, ?, 'ACTIVE', ?)`,
        [p.code, p.name, p.slug, p.catId, p.brandId, p.originalPrice, p.sellingPrice, p.tax, p.unit, p.stock, p.desc, p.image, p.image2, p.featured]
      );
      const prodId = res.lastInsertRowid;

      // Add inventory transaction
      await db.run(
        `INSERT INTO inventory_transactions (product_id, type, quantity, previous_stock, new_stock, reference_type, reference_id, user_id, note)
         VALUES (?, 'PURCHASE', ?, 0, ?, 'INITIAL_BATCH', 'BATCH_001', 1, 'Initial opening stock ledger entry')`,
        [prodId, p.stock, p.stock]
      );
    }
  }

  // 10. Membership Plans
  const plans = [
    {
      name: 'FreshMart Silver Saver',
      desc: 'Get 5% extra discount on all groceries + free delivery on orders above ₹299',
      price: 99,
      duration: 30,
      discount: 5.0,
      freeDelivery: 1,
      benefits: JSON.stringify(['5% instant discount across all categories', 'Free delivery on orders above ₹299', 'VIP customer WhatsApp support']),
    },
    {
      name: 'FreshMart Gold VIP',
      desc: 'Get 10% extra discount + zero delivery fee unconditionally on all orders',
      price: 249,
      duration: 90,
      discount: 10.0,
      freeDelivery: 1,
      benefits: JSON.stringify(['10% instant discount across store', 'Zero delivery fee on ANY order amount', 'Early access to flash sales', 'Priority dispatch']),
    },
  ];

  for (const pl of plans) {
    const existing = await db.get('SELECT id FROM membership_plans WHERE name = ?', [pl.name]);
    if (!existing) {
      await db.run(
        `INSERT INTO membership_plans (name, description, price, duration_days, discount_percent, free_delivery, benefits_json, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
        [pl.name, pl.desc, pl.price, pl.duration, pl.discount, pl.freeDelivery, pl.benefits]
      );
    }
  }

  // 11. Coupons
  const couponsData = [
    {
      code: 'WELCOME50',
      desc: 'Flat ₹50 OFF on your first grocery basket of ₹399+',
      type: 'FIXED',
      val: 50,
      maxDisc: 50,
      minOrder: 399,
      totalLimit: 500,
      perUser: 1,
      firstOrderOnly: 1,
    },
    {
      code: 'FRESH10',
      desc: '10% OFF up to ₹100 on orders above ₹599',
      type: 'PERCENTAGE',
      val: 10,
      maxDisc: 100,
      minOrder: 599,
      totalLimit: 1000,
      perUser: 3,
      firstOrderOnly: 0,
    },
    {
      code: 'SUPERVIP',
      desc: 'Special 15% discount for members',
      type: 'PERCENTAGE',
      val: 15,
      maxDisc: 150,
      minOrder: 699,
      totalLimit: 200,
      perUser: 2,
      firstOrderOnly: 0,
    },
  ];

  for (const c of couponsData) {
    const existing = await db.get('SELECT id FROM coupons WHERE code = ?', [c.code]);
    if (!existing) {
      await db.run(
        `INSERT INTO coupons (code, description, discount_type, discount_value, max_discount, min_order_amount, total_usage_limit, per_user_limit, first_order_only, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
        [c.code, c.desc, c.type, c.val, c.maxDisc, c.minOrder, c.totalLimit, c.perUser, c.firstOrderOnly]
      );
    }
  }

  // 12. Home Sliders
  const sliders = [
    {
      title: 'Farm Fresh Goodness Delivered',
      subtitle: 'Crisp apples, green veggies and unpolished pulses at everyday low prices',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80',
      btn: 'Shop Now',
      url: '/shop',
      sort: 1,
    },
    {
      title: 'Pure Dairy & Daily Staples',
      subtitle: 'Amul Milk, Malai Paneer & Aashirvaad Sharbati Atta delivered in minutes',
      image: 'https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?w=1200&q=80',
      btn: 'Explore Essentials',
      url: '/category/dairy-bakery',
      sort: 2,
    },
  ];

  for (const sl of sliders) {
    const existing = await db.get('SELECT id FROM home_sliders WHERE title = ?', [sl.title]);
    if (!existing) {
      await db.run(
        `INSERT INTO home_sliders (title, subtitle, image, button_text, link_url, sort_order, status)
         VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
        [sl.title, sl.subtitle, sl.image, sl.btn, sl.url, sl.sort]
      );
    }
  }

  // 13. Dynamic CMS Pages
  const pagesData = [
    {
      slug: 'about-us',
      title: 'About FreshMart',
      desc: 'Our mission to bring freshest farm produce to every home.',
      content: 'FreshMart is your neighborhood supermarket dedicated to providing top quality organic fruits, farm vegetables, pure dairy, and kitchen staples with zero compromise on quality and lightning fast delivery.',
    },
    {
      slug: 'delivery-policy',
      title: 'Delivery & Slot Information',
      desc: 'How our area and sub-area delivery works.',
      content: 'We operate in defined zones with scheduled slots. Orders placed within operational hours (08:00 AM - 10:00 PM) are delivered in your chosen time window. Free delivery applies automatically based on order value.',
    },
    {
      slug: 'refund-policy',
      title: 'Cancellation & Return Policy',
      desc: 'Transparent refunds and replacements.',
      content: 'Customers can cancel orders before dispatch. In case of damaged or missing items, inform us within 24 hours for instant refund or credit reversal. Welcome bonus credits are restored upon cancellation.',
    },
    {
      slug: 'terms-and-conditions',
      title: 'Terms & Conditions',
      desc: 'Platform terms of service.',
      content: 'By placing an order on FreshMart you agree to our fair usage and delivery terms. All commercial pricing, taxes, and promotional discounts are validated strictly by our backend pricing engine.',
    },
  ];

  for (const pg of pagesData) {
    const existing = await db.get('SELECT id FROM pages WHERE slug = ?', [pg.slug]);
    if (!existing) {
      await db.run(
        `INSERT INTO pages (title, slug, description, content, status) VALUES (?, ?, ?, ?, 'ACTIVE')`,
        [pg.title, pg.slug, pg.desc, pg.content]
      );
    }
  }

  // 14. Demo Address for Bilash Patidar
  const cust = await db.get('SELECT id FROM users WHERE mobile = ?', [customerMobile]);
  const subArea = await db.get('SELECT id, area_id FROM delivery_sub_areas WHERE name = ?', ['Vijay Nagar']);
  if (cust && subArea) {
    const addr = await db.get('SELECT id FROM customer_addresses WHERE user_id = ?', [cust.id]);
    if (!addr) {
      await db.run(
        `INSERT INTO customer_addresses (user_id, area_id, sub_area_id, address_line, landmark, pincode, address_type, is_default)
         VALUES (?, ?, ?, 'Flat 302, Green Residency, Scheme 54', 'Near Apollo Hospital', '482002', 'HOME', 1)`,
        [cust.id, subArea.area_id, subArea.id]
      );
    }
  }

  console.log('[Seeder] Database seeding completed successfully.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSeeder()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seeder] Error:', err);
      process.exit(1);
    });
}
