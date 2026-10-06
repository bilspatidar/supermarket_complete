# FRESHMART SUPERMARKET PLATFORM
## Production Supermarket E-Commerce + In-House POS + Delivery Routing + Staff + Membership

A unified supermarket application built with **Pure React.js (JavaScript only)**, **Node.js + Express.js**, **SQLite** (Development) / **MySQL** (Production), and **Capacitor** for Android & iOS.

---

## 1. ARCHITECTURAL HIGHLIGHTS

- **One Centralized Business Engine**: Online customer checkout and in-store staff POS billing use the identical `PricingService` and `OrderService`.
- **Zero Mock / Fake Data**: All products, categories, stock, orders, and reports come directly from the relational database.
- **Hierarchical Delivery Routing**: `Area → Sub-Area → Address`. Sub-areas inherit city-level delivery fees and thresholds unless overridden.
- **Strict Server-Clock Operational Windows**: Orders can only be placed within configured start and end times (e.g. 08:00 AM – 10:00 PM).
- **Security-Protected DOB & Anniversary**: Customer birth date and anniversary date can be set once. Once locked, the normal profile UI cannot modify them. Admin corrections require `customers.correct_personal_data` permission and generate immutable audit logs.
- **Single Centralized WhatsApp Engine**: All authentication, order updates, birthday greetings, and payment alerts resolve variables dynamically from `config/whatsapp-templates.json`.
- **Delivered Order Lock**: Once an order reaches `DELIVERED`, it becomes permanently locked (`locked_at`), rejecting all commercial changes.
- **Mobile First via Capacitor**: Ready for Web, Android, and iOS builds.

---

## 2. PROJECT STRUCTURE

```text
├── config/
│   └── whatsapp-templates.json         # Centralized WhatsApp templates with variables
├── database/
│   ├── connection.js                   # Unified SQLite / MySQL database driver
│   ├── schema.sql                      # DDL schema definition & indexes
│   ├── migrate.js                      # Schema migration runner
│   └── seed.js                         # Production-grade realistic database seeder
├── server/
│   ├── controllers/                    # Thin controllers for HTTP endpoints
│   ├── services/
│   │   ├── pricingService.js           # The Single Pricing Engine
│   │   ├── orderService.js             # Atomic order placement & status transitions
│   │   ├── authService.js              # Unified mobile authentication & DOB locking
│   │   ├── cartService.js              # Guest & customer cart with merge logic
│   │   ├── reportService.js            # Real DB analytics
│   │   └── auditService.js             # Sensitive operation audit trail
│   ├── integrations/
│   │   ├── whatsapp/WhatsAppService.js # Asynchronous WhatsApp sender
│   │   ├── razorpay/RazorpayService.js # Gateway order & webhook verification
│   │   └── storage/StorageService.js   # Local & Cloudflare R2 multi-driver storage
│   ├── jobs/scheduledTasks.js          # Daily Birthday & Anniversary WhatsApp job
│   ├── middlewares/                    # JWT authentication & granular permissions
│   └── routes/api.js                   # Centralized API route declarations
├── src/                                # Pure React.js (JavaScript ONLY)
│   ├── api/client.js                   # Axios/fetch client with guest token & JWT
│   ├── context/                        # Auth, Cart, Delivery contexts
│   ├── components/                     # Header, Footer, Modals, ProductCard, Drawer
│   ├── pages/
│   │   ├── store/                      # Home, Catalog Shop, Product Detail, Checkout, Success
│   │   ├── account/                    # Customer Account & Locked DOB Profile
│   │   ├── auth/                       # Unified Sign In (Customer, Staff, Admin)
│   │   └── admin/                      # Dashboard, POS Billing, Orders, Inventory, Reports
│   ├── services/voiceSearch.js         # Web Speech API & Capacitor Native Voice
│   ├── App.jsx                         # Main client router
│   └── main.jsx                        # React entry point
└── server.js                           # Express API + Vite middleware (Port 3000)
```

---

## 3. GETTING STARTED

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation
```bash
# Clone the repository
git clone <repo-url>
cd <project-folder>

# Install dependencies
npm install

# Run database migrations & seed real supermarket catalog
npm run seed

# Start full-stack development server (Express + Vite on Port 3000)
npm run dev
```

Visit: `http://localhost:3000`

---

## 4. DEMO TEST ACCOUNTS

All accounts use real database records created by `database/seed.js`:

| Role | Mobile | Password | Capabilities |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `9876543210` | `admin123` | Full dashboard, settings, catalog, audit, DOB correction |
| **Cashier Staff (POS)** | `9876543211` | `staff123` | In-House POS register, in-store billing, order tracking |
| **Customer** | `9876543212` | `customer123` | Store shopping, ₹100 Welcome Bonus, locked DOB & Anniversary |

*(For WhatsApp OTP login, demo verification code is `123456` or actual generated OTP.)*

---

## 5. ENVIRONMENT CONFIGURATION

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Key variables:
- `DB_CLIENT=sqlite` (or `mysql` for production)
- `DATABASE_URL=file:database.sqlite`
- `JWT_ACCESS_SECRET=...`
- `RAZORPAY_KEY_ID=...`
- `RAZORPAY_KEY_SECRET=...`
- `WHATSAPP_ACCESS_TOKEN=...`
- `WHATSAPP_PHONE_NUMBER_ID=...`
- `STORAGE_DRIVER=local` (or `r2` for Cloudflare R2)

---

## 6. CAPACITOR MOBILE BUILDS (Android & iOS)

```bash
# Build React web application
npm run build

# Add Android and iOS platforms
npx cap add android
npx cap add ios

# Sync web assets
npx cap sync

# Open in Android Studio or Xcode
npx cap open android
npx cap open ios
```
