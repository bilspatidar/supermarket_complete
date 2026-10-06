# SUPERMARKET E-COMMERCE + IN-HOUSE POS PLATFORM ARCHITECTURE & SPECIFICATION

## A. Final Architecture

```
/
├── config/
│   └── whatsapp-templates.json       # Centralized WhatsApp templates with variables
├── database/
│   ├── connection.js                 # Unified database client (SQLite dev / MySQL prod ready)
│   ├── schema.sql                    # Pure DDL schema with indexes and constraints
│   ├── migrate.js                    # Database migration runner
│   └── seed.js                       # Comprehensive realistic seeder
├── server/
│   ├── config/                       # App configuration and environment loading
│   ├── controllers/                  # Thin controllers handling HTTP requests/responses
│   │   ├── authController.js
│   │   ├── productController.js
│   │   ├── categoryController.js
│   │   ├── brandController.js
│   │   ├── cartController.js
│   │   ├── deliveryController.js
│   │   ├── orderController.js
│   │   ├── membershipController.js
│   │   ├── couponController.js
│   │   ├── bonusController.js
│   │   ├── paymentController.js
│   │   ├── cmsController.js
│   │   ├── reportController.js
│   │   ├── settingsController.js
│   │   └── staffController.js
│   ├── services/                     # Business logic and transaction management
│   │   ├── authService.js
│   │   ├── pricingService.js         # SINGLE PRICING ENGINE for Online + POS
│   │   ├── orderService.js           # Atomic order creation, status transitions & locks
│   │   ├── inventoryService.js       # Transactional stock deduction & ledger
│   │   ├── deliveryService.js        # Area -> Sub-Area -> Time window validation
│   │   ├── bonusService.js           # Idempotent welcome bonus & redemptions
│   │   ├── couponService.js          # Coupon validation, limits, & product rules
│   │   ├── membershipService.js      # Plan validation & active benefits
│   │   ├── paymentService.js         # COD + Razorpay order creation & signature verification
│   │   ├── reportService.js          # Real DB aggregations for Admin & POS
│   │   └── auditService.js           # Sensitive change logging (DOB, Admin edits)
│   ├── integrations/
│   │   ├── whatsapp/
│   │   │   └── WhatsAppService.js    # Asynchronous WhatsApp dispatcher with template rendering
│   │   ├── razorpay/
│   │   │   └── RazorpayService.js    # Gateway order generation and webhook verification
│   │   └── storage/
│   │   │   └── StorageService.js     # Local and Cloudflare R2 multi-driver storage
│   ├── jobs/
│   │   └── scheduledTasks.js         # Daily Birthday & Anniversary WhatsApp dispatcher
│   ├── middlewares/
│   │   ├── authMiddleware.js         # JWT verification & user status validation
│   │   ├── permissionMiddleware.js   # RBAC permission enforcement
│   │   └── errorMiddleware.js        # Centralized HTTP error handler
│   └── app.js                        # Express application & API route mounting
├── src/                              # Pure React.js (JavaScript ONLY, NO TypeScript)
│   ├── api/                          # Centralized Axios/fetch API clients
│   ├── context/                      # AuthContext, CartContext, DeliveryContext
│   ├── components/                   # Reusable UI (Navbar, Footer, Modals, Badges, Search)
│   │   ├── common/
│   │   ├── store/                    # ProductCard, CategoryNav, BannerSlider, CartDrawer
│   │   └── admin/                    # AdminSidebar, StatCard, OrderStatusBadge
│   ├── pages/
│   │   ├── store/                    # HomePage, ShopPage, ProductDetailPage, CartPage, CheckoutPage, OrderSuccessPage
│   │   ├── account/                  # ProfilePage, OrdersPage, AddressesPage, MembershipPage, BonusPage
│   │   ├── auth/                     # Unified LoginPage (Mobile + OTP/Password) for Customer, Staff & Admin
│   │   ├── admin/                    # Dashboard, Orders, InHousePOS, Products, Inventory, Customers, Delivery, Coupons, Reports, Settings, Audit
│   │   └── cms/                      # Dynamic CMS Pages (About, Terms, Privacy, Delivery, Refund)
│   ├── services/
│   │   └── voiceSearch.js            # Web Speech API & Capacitor Native Voice fallback
│   ├── App.jsx                       # Main application router and shell
│   └── main.jsx                      # Vite entry point
└── server.js                         # Unified server: Express API + Vite middleware (Port 3000)
```

## B. Final Database Schema

1. `users`
   - `id` INTEGER PRIMARY KEY AUTOINCREMENT
   - `uuid` TEXT UNIQUE NOT NULL
   - `mobile` TEXT UNIQUE NOT NULL
   - `password_hash` TEXT NOT NULL
   - `name` TEXT NOT NULL
   - `email` TEXT
   - `dob` TEXT (YYYY-MM-DD)
   - `anniversary_date` TEXT (YYYY-MM-DD)
   - `profile_image` TEXT
   - `status` TEXT DEFAULT 'ACTIVE' (ACTIVE, INACTIVE, BLOCKED)
   - `mobile_verified` INTEGER DEFAULT 1
   - `dob_locked` INTEGER DEFAULT 0
   - `anniversary_locked` INTEGER DEFAULT 0
   - `last_login_at` DATETIME
   - `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
   - `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP

2. `roles` & `permissions` & `role_permissions` & `user_roles`
   - Complete granular RBAC with system roles: `SUPER_ADMIN`, `STORE_MANAGER`, `CASHIER_POS`, `DELIVERY_STAFF`, `CUSTOMER`.

3. `store_settings`
   - Key-value configuration for store name, currency, GST, delivery hours, welcome bonus rules, admin WhatsApp number, etc.

4. `categories` & `brands` & `products`
   - `products` table has `product_code`, `slug`, `original_price`, `selling_price`, `tax_percent`, `unit`, `stock`, `minimum_stock`, `image`, `image2`.

5. `inventory_transactions`
   - Ledger tracking `product_id`, `type` (`PURCHASE`, `ADJUSTMENT`, `ORDER`, `CANCEL`, `RETURN`), `quantity`, `previous_stock`, `new_stock`, `reference_type`, `reference_id`, `user_id`, `note`.

6. `delivery_areas`, `delivery_sub_areas`, `delivery_slots`
   - Area: `delivery_charge`, `free_delivery_minimum`, `minimum_order`, `start_time`, `end_time`.
   - Sub-Area: optional overrides inheriting parent Area if NULL.

7. `customer_addresses`
   - Links customer to Area and Sub Area, address line, landmark, pincode, GPS coords.

8. `carts` & `cart_items`
   - Guest and customer carts. No hardcoded prices in cart items; pricing engine calculates on the fly.

9. `membership_plans` & `customer_memberships`
   - Tiered plans with discounts, free delivery eligibility, duration, and status.

10. `coupons` & `coupon_usages`
    - Discount type, values, usage limits, user limits, category/brand restrictions, first-order condition.

11. `customer_bonus_transactions`
    - Single unified promotional credit ledger: `WELCOME_BONUS`, `REDEMPTION`, `REVERSAL`, `ADMIN_CREDIT`, `ADMIN_DEBIT`, `EXPIRY`.

12. `orders` & `order_items` & `order_status_history`
    - Centralized table for both `ONLINE` and `IN_HOUSE` POS orders.
    - Locks upon `DELIVERED` status (`locked_at`).

13. `payments` & `payment_webhook_events`
    - COD & Razorpay transaction records and idempotent webhook processing.

14. `home_sliders`, `pages`, `notifications`, `audit_logs`
    - Dynamic content, communication logs, and sensitive operation audit trail.

## C. Table Minimization Review

- Total tables: Exactly 30 focused tables.
- No separate `customer_users`/`admin_users`: Avoids fragmented auth, unified under `users`.
- No separate `inhouse_orders`: Both POS and Web create records in `orders` with `source='IN_HOUSE'`.
- No separate wallet tables: `customer_bonus_transactions` ledger handles all promotional balances.
- No redundant temporary tables: Guest carts use the same `carts` table with `guest_token`.
