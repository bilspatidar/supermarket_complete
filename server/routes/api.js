import express from 'express';
import multer from 'multer';
import {
  authenticate,
  optionalAuthenticate,
  requireCustomer,
  requireInternal,
  verifyCurrentPassword,
} from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/permissionMiddleware.js';

import authController from '../controllers/authController.js';
import productController from '../controllers/productController.js';
import categoryController from '../controllers/categoryController.js';
import cartController from '../controllers/cartController.js';
import deliveryController from '../controllers/deliveryController.js';
import customerController from '../controllers/customerController.js';
import orderController from '../controllers/orderController.js';
import inventoryController from '../controllers/inventoryController.js';
import membershipController from '../controllers/membershipController.js';
import couponController from '../controllers/couponController.js';
import bonusController from '../controllers/bonusController.js';
import paymentController from '../controllers/paymentController.js';
import settingsController from '../controllers/settingsController.js';
import reportController from '../controllers/reportController.js';
import cmsController from '../controllers/cmsController.js';
import staffController from '../controllers/staffController.js';
import roleController from '../controllers/roleController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// -------------------------------------------------------------
// 1. Authentication & Profile
// -------------------------------------------------------------
router.post('/auth/login', authController.login);
router.post('/auth/otp/request', authController.requestOtp);
router.post('/auth/otp/verify', authController.verifyOtp);
router.post('/auth/register', authController.register);
router.get('/auth/me', authenticate, authController.getMe);
router.put('/auth/profile', authenticate, requireCustomer, authController.updateProfile);
router.post(
  '/auth/admin/correct-personal-data',
  authenticate,
  requireInternal,
  requirePermission('customers.correct_personal_data'),
  authController.adminCorrectPersonalData
);

// -------------------------------------------------------------
// 2. Catalog (Products, Categories, Brands) & Universal Upload
// -------------------------------------------------------------
router.get('/products', productController.getProducts);
router.get('/products/:id', productController.getProductById);
router.post(
  '/products',
  authenticate,
  requireInternal,
  requirePermission('products.create'),
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
  ]),
  productController.createProduct
);
router.put(
  '/products/:id',
  authenticate,
  requireInternal,
  requirePermission('products.update'),
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
  ]),
  productController.updateProduct
);
router.delete(
  '/products/:id',
  authenticate,
  requireInternal,
  requirePermission('products.delete'),
  verifyCurrentPassword,
  productController.deleteProduct
);
router.post(
  '/products/bulk-import',
  authenticate,
  requireInternal,
  requirePermission('products.create'),
  productController.bulkImportProducts
);
router.post(
  '/products/upload-image',
  authenticate,
  upload.single('image'),
  productController.uploadImage
);
router.post(
  '/upload',
  authenticate,
  upload.single('image'),
  productController.uploadImage
);

// Categories
router.get('/categories', categoryController.getCategories);
router.post(
  '/categories',
  authenticate,
  requireInternal,
  requirePermission('products.create'),
  categoryController.createCategory
);
router.put(
  '/categories/:id',
  authenticate,
  requireInternal,
  requirePermission('products.update'),
  categoryController.updateCategory
);
router.put(
  '/categories/:id/status',
  authenticate,
  requireInternal,
  requirePermission('products.update'),
  categoryController.toggleCategoryStatus
);
router.delete(
  '/categories/:id',
  authenticate,
  requireInternal,
  requirePermission('products.delete'),
  verifyCurrentPassword,
  categoryController.deleteCategory
);

// Brands
router.get('/brands', categoryController.getBrands);
router.post(
  '/brands',
  authenticate,
  requireInternal,
  requirePermission('products.create'),
  categoryController.createBrand
);
router.put(
  '/brands/:id',
  authenticate,
  requireInternal,
  requirePermission('products.update'),
  categoryController.updateBrand
);
router.put(
  '/brands/:id/status',
  authenticate,
  requireInternal,
  requirePermission('products.update'),
  categoryController.toggleBrandStatus
);
router.delete(
  '/brands/:id',
  authenticate,
  requireInternal,
  requirePermission('products.delete'),
  verifyCurrentPassword,
  categoryController.deleteBrand
);

// -------------------------------------------------------------
// 3. Cart (Guest + Customer)
// -------------------------------------------------------------
router.get('/cart', optionalAuthenticate, cartController.getCart);
router.post('/cart/add', optionalAuthenticate, cartController.addToCart);
router.put('/cart/update', optionalAuthenticate, cartController.updateQuantity);
router.post('/cart/merge', authenticate, requireCustomer, cartController.mergeCart);

// -------------------------------------------------------------
// 4. Delivery Areas & Slots
// -------------------------------------------------------------
router.get('/delivery/zones', deliveryController.getDeliveryZones);
router.post('/delivery/validate', deliveryController.validateEligibility);
router.post(
  '/delivery/areas',
  authenticate,
  requireInternal,
  requirePermission('delivery.create'),
  deliveryController.createArea
);
router.post(
  '/delivery/sub-areas',
  authenticate,
  requireInternal,
  requirePermission('delivery.create'),
  deliveryController.createSubArea
);

// -------------------------------------------------------------
// 5. Customer Addresses (Customer-Only)
// -------------------------------------------------------------
router.get('/addresses', authenticate, requireCustomer, customerController.getAddresses);
router.post('/addresses', authenticate, requireCustomer, customerController.createAddress);
router.delete('/addresses/:id', authenticate, requireCustomer, customerController.deleteAddress);
router.put('/addresses/:id/default', authenticate, requireCustomer, customerController.setDefaultAddress);

// -------------------------------------------------------------
// 6. Orders & Pricing Engine
// -------------------------------------------------------------
router.post('/orders/calculate', optionalAuthenticate, orderController.calculateOrderPricing);

// Customer-only Order APIs
router.get('/customer/orders', authenticate, requireCustomer, orderController.getCustomerOrders);
router.get('/customer/orders/:id', authenticate, requireCustomer, orderController.getCustomerOrderById);
router.post('/customer/orders', authenticate, requireCustomer, orderController.createCustomerOrder);

// Universal Order Creation (enforces source=ONLINE for customer, IN_HOUSE for staff)
router.post('/orders', authenticate, orderController.createOrder);

// Internal Admin/Staff-only Order APIs
router.get(
  '/orders',
  authenticate,
  requireInternal,
  requirePermission('orders.view'),
  orderController.getOrders
);
router.get(
  '/orders/export',
  authenticate,
  requireInternal,
  requirePermission('orders.view'),
  orderController.exportOrders
);
router.get(
  '/orders/:id',
  authenticate,
  requireInternal,
  requirePermission('orders.view'),
  orderController.getOrderById
);
router.put(
  '/orders/:id/status',
  authenticate,
  requireInternal,
  requirePermission('orders.update'),
  orderController.updateOrderStatus
);
router.put(
  '/orders/:id/settle-cod',
  authenticate,
  requireInternal,
  requirePermission('orders.update'),
  orderController.settleCodPayment
);

// -------------------------------------------------------------
// 7. Inventory
// -------------------------------------------------------------
router.get(
  '/inventory/transactions',
  authenticate,
  requireInternal,
  requirePermission('inventory.view'),
  inventoryController.getTransactions
);
router.post(
  '/inventory/adjust',
  authenticate,
  requireInternal,
  requirePermission('inventory.adjust'),
  inventoryController.adjustInventory
);

// -------------------------------------------------------------
// 8. Membership
// -------------------------------------------------------------
router.get('/membership/plans', membershipController.getPlans);
router.get('/membership/my-status', authenticate, requireCustomer, membershipController.getMyMembership);
router.post('/membership/subscribe', authenticate, requireCustomer, membershipController.subscribePlan);
router.post(
  '/membership/plans',
  authenticate,
  requireInternal,
  requirePermission('membership.create'),
  membershipController.createPlan
);

// -------------------------------------------------------------
// 9. Coupons
// -------------------------------------------------------------
router.get('/coupons', optionalAuthenticate, couponController.getCoupons);
router.post(
  '/coupons',
  authenticate,
  requireInternal,
  requirePermission('coupons.create'),
  couponController.createCoupon
);
router.delete(
  '/coupons/:id',
  authenticate,
  requireInternal,
  requirePermission('coupons.delete'),
  verifyCurrentPassword,
  couponController.deleteCoupon
);

// -------------------------------------------------------------
// 10. Welcome Bonus & Ledger
// -------------------------------------------------------------
router.get('/bonus/ledger', authenticate, requireCustomer, bonusController.getBonusLedger);
router.post(
  '/bonus/admin-adjust',
  authenticate,
  requireInternal,
  requirePermission('customers.update'),
  bonusController.adminAdjustBonus
);

// -------------------------------------------------------------
// 11. Payments
// -------------------------------------------------------------
router.post('/payments/razorpay/verify', authenticate, requireCustomer, paymentController.verifyRazorpayPayment);
router.post('/payments/razorpay/webhook', paymentController.handleRazorpayWebhook);

// -------------------------------------------------------------
// 12. Settings
// -------------------------------------------------------------
router.get('/settings', settingsController.getPublicSettings);
router.get(
  '/settings/admin',
  authenticate,
  requireInternal,
  requirePermission('settings.view'),
  settingsController.getAllSettings
);
router.put(
  '/settings',
  authenticate,
  requireInternal,
  requirePermission('settings.update'),
  settingsController.updateSettings
);

// -------------------------------------------------------------
// 13. Reports, Audit & Export
// -------------------------------------------------------------
router.get(
  '/reports/dashboard',
  authenticate,
  requireInternal,
  requirePermission('dashboard.view'),
  reportController.getDashboardStats
);
router.get(
  '/reports/detailed',
  authenticate,
  requireInternal,
  requirePermission('reports.view'),
  reportController.getDetailedReport
);
router.get(
  '/reports/export',
  authenticate,
  requireInternal,
  requirePermission('reports.view'),
  reportController.exportDetailedReport
);
router.get(
  '/reports/customers/:id',
  authenticate,
  requireInternal,
  requirePermission('customers.view'),
  reportController.getCustomerStats
);
router.get(
  '/audit/logs',
  authenticate,
  requireInternal,
  requirePermission('audit.view'),
  reportController.getAuditLogs
);
router.get(
  '/notifications/logs',
  authenticate,
  requireInternal,
  requirePermission('dashboard.view'),
  reportController.getNotificationLogs
);

// -------------------------------------------------------------
// 14. Customers (Admin view, detail, create, export, safe delete)
// -------------------------------------------------------------
router.get(
  '/customers',
  authenticate,
  requireInternal,
  requirePermission('customers.view'),
  customerController.getCustomers
);
router.get(
  '/customers/export',
  authenticate,
  requireInternal,
  requirePermission('customers.view'),
  customerController.exportCustomers
);
router.get(
  '/customers/:id',
  authenticate,
  requireInternal,
  requirePermission('customers.view'),
  customerController.getCustomerDetail
);
router.post(
  '/customers',
  authenticate,
  requireInternal,
  requirePermission('customers.create'),
  customerController.createCustomer
);
router.delete(
  '/customers/:id',
  authenticate,
  requireInternal,
  requirePermission('customers.delete'),
  verifyCurrentPassword,
  customerController.deleteCustomer
);

// -------------------------------------------------------------
// 15. Staff
// -------------------------------------------------------------
router.get(
  '/staff',
  authenticate,
  requireInternal,
  requirePermission('staff.view'),
  staffController.getStaffList
);
router.post(
  '/staff',
  authenticate,
  requireInternal,
  requirePermission('staff.create'),
  staffController.createStaff
);
router.put(
  '/staff/:id/roles',
  authenticate,
  requireInternal,
  requirePermission('staff.update'),
  staffController.updateStaffRole
);
router.get(
  '/staff/delivery-staff',
  authenticate,
  requireInternal,
  staffController.getDeliveryStaff
);

// -------------------------------------------------------------
// 16. CMS (Home Sliders & Dynamic Pages)
// -------------------------------------------------------------
router.get('/cms/sliders', cmsController.getSliders);
router.get(
  '/cms/sliders/admin',
  authenticate,
  requireInternal,
  requirePermission('settings.view'),
  cmsController.getAdminSliders
);
router.post(
  '/cms/sliders',
  authenticate,
  requireInternal,
  requirePermission('settings.update'),
  cmsController.createSlider
);
router.put(
  '/cms/sliders/:id',
  authenticate,
  requireInternal,
  requirePermission('settings.update'),
  cmsController.updateSlider
);
router.delete(
  '/cms/sliders/:id',
  authenticate,
  requireInternal,
  requirePermission('settings.update'),
  cmsController.deleteSlider
);

router.get('/cms/pages', cmsController.getPages);
router.get(
  '/cms/pages/admin',
  authenticate,
  requireInternal,
  requirePermission('settings.view'),
  cmsController.getAdminPages
);
router.get('/cms/pages/:slug', cmsController.getPageBySlug);
router.post(
  '/cms/pages',
  authenticate,
  requireInternal,
  requirePermission('settings.update'),
  cmsController.createPage
);
router.put(
  '/cms/pages/:id',
  authenticate,
  requireInternal,
  requirePermission('settings.update'),
  cmsController.updatePage
);
router.delete(
  '/cms/pages/:id',
  authenticate,
  requireInternal,
  requirePermission('settings.update'),
  cmsController.deletePage
);

// -------------------------------------------------------------
// 17. Roles & Permissions CRUD + Assignment
// -------------------------------------------------------------
router.get(
  '/roles',
  authenticate,
  requireInternal,
  requirePermission('roles.view'),
  roleController.getRoles
);
router.get(
  '/permissions',
  authenticate,
  requireInternal,
  requirePermission('roles.view'),
  roleController.getPermissions
);
router.post(
  '/roles',
  authenticate,
  requireInternal,
  requirePermission('roles.create'),
  roleController.createRole
);
router.put(
  '/roles/:id',
  authenticate,
  requireInternal,
  requirePermission('roles.update'),
  roleController.updateRole
);
router.put(
  '/roles/:id/status',
  authenticate,
  requireInternal,
  requirePermission('roles.update'),
  roleController.toggleRoleStatus
);
router.delete(
  '/roles/:id',
  authenticate,
  requireInternal,
  requirePermission('roles.delete'),
  verifyCurrentPassword,
  roleController.deleteRole
);

export default router;
