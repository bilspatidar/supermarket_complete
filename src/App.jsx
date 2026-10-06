import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { DeliveryProvider } from './context/DeliveryContext.jsx';

import Header from './components/common/Header.jsx';
import Footer from './components/common/Footer.jsx';
import CartDrawer from './components/store/CartDrawer.jsx';
import ZonePickerModal from './components/common/ZonePickerModal.jsx';

// Customer Pages
import HomePage from './pages/store/HomePage.jsx';
import ShopPage from './pages/store/ShopPage.jsx';
import ProductDetailPage from './pages/store/ProductDetailPage.jsx';
import CheckoutPage from './pages/store/CheckoutPage.jsx';
import OrderSuccessPage from './pages/store/OrderSuccessPage.jsx';
import MembershipPage from './pages/store/MembershipPage.jsx';
import AccountDashboard from './pages/account/AccountDashboard.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import CMSPage from './pages/cms/CMSPage.jsx';

// Admin Pages
import AdminLayout from './components/admin/AdminLayout.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import InHousePOS from './pages/admin/InHousePOS.jsx';
import AdminOrders from './pages/admin/AdminOrders.jsx';
import AdminProducts from './pages/admin/AdminProducts.jsx';
import AdminInventory from './pages/admin/AdminInventory.jsx';
import AdminCustomers from './pages/admin/AdminCustomers.jsx';
import AdminDelivery from './pages/admin/AdminDelivery.jsx';
import AdminMembership from './pages/admin/AdminMembership.jsx';
import AdminCoupons from './pages/admin/AdminCoupons.jsx';
import AdminReports from './pages/admin/AdminReports.jsx';
import AdminStaff from './pages/admin/AdminStaff.jsx';
import AdminSettings from './pages/admin/AdminSettings.jsx';
import AdminAudit from './pages/admin/AdminAudit.jsx';

function MainRouter() {
  const { user, isStaff, isAdmin } = useAuth();
  const [route, setRoute] = useState('home');
  const [routeParams, setRouteParams] = useState({});

  function navigate(newRoute, params = {}) {
    setRoute(newRoute);
    setRouteParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Check if route is an Admin/Staff sub-route
  const isAdminRoute = route.startsWith('admin-');

  if (isAdminRoute) {
    return (
      <AdminLayout activePage={route} onNavigate={navigate}>
        {route === 'admin-dashboard' && <AdminDashboard onNavigate={navigate} />}
        {route === 'admin-pos' && <InHousePOS onNavigate={navigate} />}
        {route === 'admin-orders' && <AdminOrders onNavigate={navigate} />}
        {route === 'admin-products' && <AdminProducts onNavigate={navigate} />}
        {route === 'admin-inventory' && <AdminInventory onNavigate={navigate} />}
        {route === 'admin-customers' && <AdminCustomers onNavigate={navigate} />}
        {route === 'admin-delivery' && <AdminDelivery onNavigate={navigate} />}
        {route === 'admin-membership' && <AdminMembership onNavigate={navigate} />}
        {route === 'admin-coupons' && <AdminCoupons onNavigate={navigate} />}
        {route === 'admin-reports' && <AdminReports onNavigate={navigate} />}
        {route === 'admin-staff' && <AdminStaff onNavigate={navigate} />}
        {route === 'admin-settings' && <AdminSettings onNavigate={navigate} />}
        {route === 'admin-audit' && <AdminAudit onNavigate={navigate} />}
      </AdminLayout>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Header onNavigate={navigate} currentRoute={route} />

      <main className="flex-1">
        {route === 'home' && <HomePage onNavigate={navigate} />}
        {route === 'shop' && (
          <ShopPage
            initialCategory={routeParams.category}
            initialSearch={routeParams.search}
            onNavigate={navigate}
          />
        )}
        {route === 'product' && (
          <ProductDetailPage productId={routeParams.id} onNavigate={navigate} />
        )}
        {route === 'checkout' && <CheckoutPage onNavigate={navigate} />}
        {route === 'order-success' && (
          <OrderSuccessPage orderNumber={routeParams.orderNumber} onNavigate={navigate} />
        )}
        {route === 'membership' && <MembershipPage onNavigate={navigate} />}
        {route === 'account' && <AccountDashboard onNavigate={navigate} />}
        {route === 'login' && <LoginPage onNavigate={navigate} />}
        {route === 'cms' && <CMSPage slug={routeParams.slug} onNavigate={navigate} />}
      </main>

      <Footer onNavigate={navigate} />

      {/* Global Modals & Drawers */}
      <CartDrawer onNavigate={navigate} />
      <ZonePickerModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <DeliveryProvider>
          <MainRouter />
        </DeliveryProvider>
      </CartProvider>
    </AuthProvider>
  );
}
