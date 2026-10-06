import express from 'express';
import multer from 'multer';
import { authenticate, optionalAuthenticate } from '../middlewares/authMiddleware.js';
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

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 1. Authentication
router.post('/auth/login', authController.login);
router.post('/auth/otp/request', authController.requestOtp);
router.post('/auth/otp/verify', authController.verifyOtp);
router.post('/auth/register', authController.register);
router.get('/auth/me', authenticate, authController.getMe);
router.put('/auth/profile', authenticate, authController.updateProfile);
router.post('/auth/admin/correct-personal-data', authenticate, requirePermission('customers.correct_personal_data'), authController.adminCorrectPersonalData);

// 2. Catalog (Products, Categories, Brands)
router.get('/products', productController.getProducts);
router.get('/products/:id', productController.getProductById);
router.post('/products', authenticate, requirePermission('products.create'), productController.createProduct);
router.put('/products/:id', authenticate, requirePermission('products.update'), productController.updateProduct);
router.delete('/products/:id', authenticate, requirePermission('products.delete'), productController.deleteProduct);
router.post('/products/upload-image', authenticate, upload.single('image'), productController.uploadImage);

router.get('/categories', categoryController.getCategories);
router.post('/categories', authenticate, requirePermission('products.create'), categoryController.createCategory);
router.put('/categories/:id', authenticate, requirePermission('products.update'), categoryController.updateCategory);

router.get('/brands', categoryController.getBrands);
router.post('/brands', authenticate, requirePermission('products.create'), categoryController.createBrand);

// 3. Cart
router.get('/cart', optionalAuthenticate, cartController.getCart);
router.post('/cart/add', optionalAuthenticate, cartController.addToCart);
router.put('/cart/update', optionalAuthenticate, cartController.updateQuantity);
router.post('/cart/merge', authenticate, cartController.mergeCart);

// 4. Delivery Areas & Slots
router.get('/delivery/zones', deliveryController.getDeliveryZones);
router.post('/delivery/validate', deliveryController.validateEligibility);
router.post('/delivery/areas', authenticate, requirePermission('delivery.create'), deliveryController.createArea);
router.post('/delivery/sub-areas', authenticate, requirePermission('delivery.create'), deliveryController.createSubArea);

// 5. Customer Addresses
router.get('/addresses', authenticate, customerController.getAddresses);
router.post('/addresses', authenticate, customerController.createAddress);
router.delete('/addresses/:id', authenticate, customerController.deleteAddress);
router.put('/addresses/:id/default', authenticate, customerController.setDefaultAddress);

// 6. Orders & Pricing Engine
router.post('/orders/calculate', optionalAuthenticate, orderController.calculateOrderPricing);
router.post('/orders', authenticate, orderController.createOrder);
router.get('/orders', authenticate, orderController.getOrders);
router.get('/orders/:id', authenticate, orderController.getOrderById);
router.put('/orders/:id/status', authenticate, requirePermission('orders.update'), orderController.updateOrderStatus);

// 7. Inventory
router.get('/inventory/transactions', authenticate, requirePermission('inventory.view'), inventoryController.getTransactions);
router.post('/inventory/adjust', authenticate, requirePermission('inventory.adjust'), inventoryController.adjustInventory);

// 8. Membership
router.get('/membership/plans', membershipController.getPlans);
router.get('/membership/my-status', authenticate, membershipController.getMyMembership);
router.post('/membership/subscribe', authenticate, membershipController.subscribePlan);
router.post('/membership/plans', authenticate, requirePermission('membership.create'), membershipController.createPlan);

// 9. Coupons
router.get('/coupons', optionalAuthenticate, couponController.getCoupons);
router.post('/coupons', authenticate, requirePermission('coupons.create'), couponController.createCoupon);
router.delete('/coupons/:id', authenticate, requirePermission('coupons.delete'), couponController.deleteCoupon);

// 10. Welcome Bonus & Ledger
router.get('/bonus/ledger', authenticate, bonusController.getBonusLedger);
router.post('/bonus/admin-adjust', authenticate, requirePermission('customers.update'), bonusController.adminAdjustBonus);

// 11. Payments
router.post('/payments/razorpay/verify', authenticate, paymentController.verifyRazorpayPayment);
router.post('/payments/razorpay/webhook', paymentController.handleRazorpayWebhook);

// 12. Settings
router.get('/settings', settingsController.getPublicSettings);
router.get('/settings/admin', authenticate, requirePermission('settings.view'), settingsController.getAllSettings);
router.put('/settings', authenticate, requirePermission('settings.update'), settingsController.updateSettings);

// 13. Reports, Audit, & Logs
router.get('/reports/dashboard', authenticate, requirePermission('dashboard.view'), reportController.getDashboardStats);
router.get('/reports/customers/:id', authenticate, requirePermission('customers.view'), reportController.getCustomerStats);
router.get('/audit/logs', authenticate, requirePermission('audit.view'), reportController.getAuditLogs);
router.get('/notifications/logs', authenticate, requirePermission('dashboard.view'), reportController.getNotificationLogs);

// 14. Customers
router.get('/customers', authenticate, requirePermission('customers.view'), customerController.getCustomers);

// 15. Staff
router.get('/staff', authenticate, requirePermission('staff.view'), staffController.getStaffList);
router.post('/staff', authenticate, requirePermission('staff.create'), staffController.createStaff);
router.put('/staff/:id/roles', authenticate, requirePermission('staff.update'), staffController.updateStaffRole);

// 16. CMS
router.get('/cms/sliders', cmsController.getSliders);
router.post('/cms/sliders', authenticate, requirePermission('settings.update'), cmsController.createSlider);
router.get('/cms/pages', cmsController.getPages);
router.get('/cms/pages/:slug', cmsController.getPageBySlug);
router.put('/cms/pages/:id', authenticate, requirePermission('settings.update'), cmsController.updatePage);

export default router;
