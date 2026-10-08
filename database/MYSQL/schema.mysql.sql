-- Supermarket E-Commerce & In-House POS Schema
-- MySQL 8.x production schema generated from the project SQLite schema

-- Supermarket E-Commerce & In-House POS Schema

-- Designed for SQLite (development) and MySQL (production)



CREATE TABLE IF NOT EXISTS users (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

  uuid VARCHAR(36) NOT NULL UNIQUE,

  mobile VARCHAR(20) NOT NULL UNIQUE,

password_hash TEXT NOT NULL,

name TEXT NOT NULL,

email TEXT,

account_type TEXT DEFAULT 'CUSTOMER', -- 'CUSTOMER' or 'INTERNAL'

dob TEXT,

anniversary_date TEXT,

profile_image TEXT,

status TEXT DEFAULT 'ACTIVE',

  mobile_verified INT DEFAULT 1,

  dob_locked INT DEFAULT 0,

  anniversary_locked INT DEFAULT 0,

last_login_at DATETIME,

created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

updated_at DATETIME DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS roles (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

  name VARCHAR(100) NOT NULL UNIQUE,

description TEXT,

  is_system INT DEFAULT 1,

created_at DATETIME DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS permissions (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

  name VARCHAR(100) NOT NULL UNIQUE,

group_name TEXT NOT NULL,

description TEXT

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS role_permissions (

  role_id INT UNSIGNED NOT NULL,

  permission_id INT UNSIGNED NOT NULL,

PRIMARY KEY (role_id, permission_id),

FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,

FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS user_roles (

  user_id INT UNSIGNED NOT NULL,

  role_id INT UNSIGNED NOT NULL,

PRIMARY KEY (user_id, role_id),

FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS store_settings (

  `key` VARCHAR(100) NOT NULL PRIMARY KEY,

value TEXT NOT NULL,

type TEXT DEFAULT 'string',

group_name TEXT DEFAULT 'general',

updated_at DATETIME DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS categories (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

name TEXT NOT NULL,

  slug VARCHAR(191) NOT NULL UNIQUE,

description TEXT,

image TEXT,

status TEXT DEFAULT 'ACTIVE',

  sort_order INT DEFAULT 0,

created_at DATETIME DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS brands (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

name TEXT NOT NULL,

  slug VARCHAR(191) NOT NULL UNIQUE,

description TEXT,

logo TEXT,

status TEXT DEFAULT 'ACTIVE',

created_at DATETIME DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS products (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

  product_code VARCHAR(191) NOT NULL UNIQUE,

name TEXT NOT NULL,

  slug VARCHAR(191) NOT NULL UNIQUE,

  category_id INT UNSIGNED NOT NULL,

  brand_id INT UNSIGNED,

  original_price DECIMAL(12,2) NOT NULL,

  selling_price DECIMAL(12,2) NOT NULL,

  tax_percent DECIMAL(12,2) DEFAULT 5.0,

unit TEXT DEFAULT '1 kg',

  stock INT DEFAULT 0,

  minimum_stock INT DEFAULT 5,

description TEXT,

image TEXT,

image2 TEXT,

status TEXT DEFAULT 'ACTIVE',

  featured INT DEFAULT 0,

  sort_order INT DEFAULT 0,

created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

FOREIGN KEY (category_id) REFERENCES categories(id),

FOREIGN KEY (brand_id) REFERENCES brands(id)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS inventory_transactions (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

  product_id INT UNSIGNED NOT NULL,

type TEXT NOT NULL, -- PURCHASE, ADJUSTMENT, ORDER, CANCEL, RETURN

  quantity INT NOT NULL,

  previous_stock INT NOT NULL,

  new_stock INT NOT NULL,

reference_type TEXT,

reference_id TEXT,

  user_id INT UNSIGNED,

note TEXT,

created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS delivery_areas (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

name TEXT NOT NULL,

status TEXT DEFAULT 'ACTIVE',

  delivery_charge DECIMAL(12,2) DEFAULT 40.0,

  free_delivery_minimum DECIMAL(12,2) DEFAULT 499.0,

  minimum_order DECIMAL(12,2) DEFAULT 199.0,

start_time TEXT DEFAULT '09:00',

end_time TEXT DEFAULT '21:00',

  sort_order INT DEFAULT 0,

created_at DATETIME DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS delivery_sub_areas (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

  area_id INT UNSIGNED NOT NULL,

name TEXT NOT NULL,

status TEXT DEFAULT 'ACTIVE',

  delivery_charge DECIMAL(12,2), -- NULL means inherits parent area

  free_delivery_minimum DECIMAL(12,2),

  minimum_order DECIMAL(12,2),

start_time TEXT,

end_time TEXT,

  sort_order INT DEFAULT 0,

created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

FOREIGN KEY (area_id) REFERENCES delivery_areas(id) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS delivery_slots (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

name TEXT NOT NULL,

start_time TEXT NOT NULL,

end_time TEXT NOT NULL,

status TEXT DEFAULT 'ACTIVE',

  sort_order INT DEFAULT 0

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS customer_addresses (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

  user_id INT UNSIGNED NOT NULL,

  area_id INT UNSIGNED NOT NULL,

  sub_area_id INT UNSIGNED NOT NULL,

address_line TEXT NOT NULL,

landmark TEXT,

pincode TEXT NOT NULL,

  latitude DOUBLE,

  longitude DOUBLE,

address_type TEXT DEFAULT 'HOME', -- HOME, WORK, OTHER

  is_default INT DEFAULT 0,

created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

FOREIGN KEY (area_id) REFERENCES delivery_areas(id),

FOREIGN KEY (sub_area_id) REFERENCES delivery_sub_areas(id)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS carts (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

  user_id INT UNSIGNED,

guest_token TEXT,

created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

updated_at DATETIME DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS cart_items (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

  cart_id INT UNSIGNED NOT NULL,

  product_id INT UNSIGNED NOT NULL,

  quantity INT NOT NULL DEFAULT 1,

created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

UNIQUE(cart_id, product_id),

FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,

FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS membership_plans (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

name TEXT NOT NULL,

description TEXT,

  price DECIMAL(12,2) NOT NULL,

  duration_days INT NOT NULL DEFAULT 30,

  discount_percent DECIMAL(12,2) DEFAULT 5.0,

  free_delivery INT DEFAULT 1,

benefits_json TEXT,

status TEXT DEFAULT 'ACTIVE',

created_at DATETIME DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS customer_memberships (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

  user_id INT UNSIGNED NOT NULL,

  plan_id INT UNSIGNED NOT NULL,

start_date DATETIME NOT NULL,

end_date DATETIME NOT NULL,

status TEXT DEFAULT 'ACTIVE',

created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

FOREIGN KEY (plan_id) REFERENCES membership_plans(id)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS coupons (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

  code VARCHAR(100) NOT NULL UNIQUE,

description TEXT,

discount_type TEXT NOT NULL DEFAULT 'PERCENTAGE', -- FIXED, PERCENTAGE

  discount_value DECIMAL(12,2) NOT NULL,

  max_discount DECIMAL(12,2),

  min_order_amount DECIMAL(12,2) DEFAULT 0,

start_date DATETIME,

end_date DATETIME,

  total_usage_limit INT,

  per_user_limit INT DEFAULT 1,

applicable_categories TEXT,

applicable_brands TEXT,

applicable_products TEXT,

  requires_membership INT DEFAULT 0,

  first_order_only INT DEFAULT 0,

status TEXT DEFAULT 'ACTIVE',

created_at DATETIME DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS coupon_usages (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

  coupon_id INT UNSIGNED NOT NULL,

  user_id INT UNSIGNED NOT NULL,

  order_id INT UNSIGNED,

  discount_amount DECIMAL(12,2) NOT NULL,

created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,

FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS customer_bonus_transactions (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

  user_id INT UNSIGNED NOT NULL,

type TEXT NOT NULL, -- WELCOME_BONUS, REDEMPTION, REVERSAL, ADMIN_CREDIT, ADMIN_DEBIT, EXPIRY

  amount DECIMAL(12,2) NOT NULL,

reference_type TEXT,

reference_id TEXT,

expires_at DATETIME,

status TEXT DEFAULT 'ACTIVE',

description TEXT,

created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS orders (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

  order_number VARCHAR(191) NOT NULL UNIQUE,

  user_id INT UNSIGNED NOT NULL,

source TEXT DEFAULT 'ONLINE', -- ONLINE, IN_HOUSE, ADMIN

  area_id INT UNSIGNED,

  sub_area_id INT UNSIGNED,

  delivery_slot_id INT UNSIGNED,

delivery_address TEXT,

landmark TEXT,

pincode TEXT,

  subtotal DECIMAL(12,2) NOT NULL,

  membership_discount DECIMAL(12,2) DEFAULT 0.0,

  coupon_discount DECIMAL(12,2) DEFAULT 0.0,

  bonus_discount DECIMAL(12,2) DEFAULT 0.0,

  delivery_charge DECIMAL(12,2) DEFAULT 0.0,

  tax DECIMAL(12,2) DEFAULT 0.0,

  grand_total DECIMAL(12,2) NOT NULL,

payment_method TEXT DEFAULT 'COD', -- COD, RAZORPAY, CASH

payment_status TEXT DEFAULT 'PENDING', -- PENDING, AUTHORIZED, PAID, FAILED, REFUNDED, CANCELLED

order_status TEXT DEFAULT 'PENDING', -- PENDING, CONFIRMED, PROCESSING, READY, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, RETURNED

notification_phone TEXT,

notes TEXT,

  created_by INT,

created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

delivered_at DATETIME,

locked_at DATETIME,

FOREIGN KEY (user_id) REFERENCES users(id),

FOREIGN KEY (area_id) REFERENCES delivery_areas(id),

FOREIGN KEY (sub_area_id) REFERENCES delivery_sub_areas(id),

FOREIGN KEY (delivery_slot_id) REFERENCES delivery_slots(id)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS order_items (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

  order_id INT UNSIGNED NOT NULL,

  product_id INT UNSIGNED NOT NULL,

product_code TEXT NOT NULL,

product_name TEXT NOT NULL,

  quantity INT NOT NULL,

unit TEXT,

  original_price DECIMAL(12,2) NOT NULL,

  selling_price DECIMAL(12,2) NOT NULL,

  applied_price DECIMAL(12,2) NOT NULL,

  discount DECIMAL(12,2) DEFAULT 0.0,

  tax DECIMAL(12,2) DEFAULT 0.0,

  total DECIMAL(12,2) NOT NULL,

created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,

FOREIGN KEY (product_id) REFERENCES products(id)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS order_status_history (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

  order_id INT UNSIGNED NOT NULL,

previous_status TEXT,

old_status TEXT,

new_status TEXT NOT NULL,

  changed_by INT,

changed_by_role TEXT,

notes TEXT,

note TEXT,

created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS payments (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

  order_id INT UNSIGNED NOT NULL,

transaction_ref TEXT,

payment_method TEXT NOT NULL,

  amount DECIMAL(12,2) NOT NULL,

currency TEXT DEFAULT 'INR',

status TEXT DEFAULT 'PENDING',

gateway_response TEXT,

created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS payment_webhook_events (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

  event_id VARCHAR(191) NOT NULL UNIQUE,

event_type TEXT NOT NULL,

payload TEXT NOT NULL,

signature TEXT,

processing_status TEXT DEFAULT 'PROCESSED',

processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,

error_message TEXT,

created_at DATETIME DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS home_sliders (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

title TEXT NOT NULL,

subtitle TEXT,

image TEXT NOT NULL,

mobile_image TEXT,

button_text TEXT,

link_url TEXT,

start_date DATETIME,

end_date DATETIME,

  sort_order INT DEFAULT 0,

status TEXT DEFAULT 'ACTIVE',

created_at DATETIME DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS pages (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

title TEXT NOT NULL,

  slug VARCHAR(191) NOT NULL UNIQUE,

description TEXT,

content TEXT NOT NULL,

image TEXT,

meta_title TEXT,

meta_description TEXT,

status TEXT DEFAULT 'ACTIVE',

created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

updated_at DATETIME DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS notifications (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

  user_id INT UNSIGNED,

  order_id INT UNSIGNED,

channel TEXT DEFAULT 'WHATSAPP',

recipient TEXT NOT NULL,

template_key TEXT NOT NULL,

provider_msg_id TEXT,

message_body TEXT NOT NULL,

status TEXT DEFAULT 'SENT', -- QUEUED, SENT, FAILED, DELIVERED

error TEXT,

sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,

created_at DATETIME DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS audit_logs (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

  user_id INT UNSIGNED,

action TEXT NOT NULL,

entity_type TEXT NOT NULL,

entity_id TEXT,

old_values TEXT,

new_values TEXT,

ip_address TEXT,

notes TEXT,

created_at DATETIME DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS login_history (

  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

  user_id INT UNSIGNED NOT NULL,

ip_address TEXT,

user_agent TEXT,

status TEXT DEFAULT 'SUCCESS',

created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
