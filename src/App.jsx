import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { DeliveryProvider } from './context/DeliveryContext.jsx';
import { ShieldCheck, Lock, ArrowRight, User } from 'lucide-react';

import Header from './components/common/Header.jsx';
import Footer from './components/common/Footer.jsx';
import MobileBottomNav from './components/common/MobileBottomNav.jsx';
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
import AdminHomeSlider from './pages/admin/AdminHomeSlider.jsx';
import AdminPages from './pages/admin/AdminPages.jsx';


function routeFromLocation() {
  const { pathname, search } = window.location;
  const params = new URLSearchParams(search);

  // Admin
  if (pathname === '/admin' || pathname === '/admin/dashboard') {
    return {
      route: 'admin-dashboard',
      params: {},
    };
  }

  if (pathname.startsWith('/admin/')) {
    const adminPath = pathname.replace('/admin/', '');

    const adminRoutes = {
      pos: 'admin-pos',
      orders: 'admin-orders',
      products: 'admin-products',
      inventory: 'admin-inventory',
      customers: 'admin-customers',
      delivery: 'admin-delivery',
      membership: 'admin-membership',
      coupons: 'admin-coupons',
      reports: 'admin-reports',
      sliders: 'admin-sliders',
      pages: 'admin-pages',
      staff: 'admin-staff',
      settings: 'admin-settings',
      audit: 'admin-audit',
    };

    return {
      route: adminRoutes[adminPath] || 'admin-dashboard',
      params: {},
    };
  }

  // Public
  if (pathname === '/shop') {
    return {
      route: 'shop',
      params: {
        category: params.get('category') || undefined,
        search: params.get('search') || undefined,
      },
    };
  }

  if (pathname.startsWith('/product/')) {
    return {
      route: 'product',
      params: {
        id: pathname.split('/')[2],
      },
    };
  }

  if (pathname === '/account') {
    return {
      route: 'account',
      params: {},
    };
  }

  if (pathname === '/checkout') {
    return {
      route: 'checkout',
      params: {},
    };
  }

  if (pathname === '/login') {
    return {
      route: 'login',
      params: {},
    };
  }

  if (pathname === '/membership') {
    return {
      route: 'membership',
      params: {},
    };
  }

  if (pathname === '/contact') {
    return {
      route: 'contact',
      params: {},
    };
  }

  if (pathname === '/about') {
    return {
      route: 'about',
      params: {},
    };
  }

  if (pathname === '/delivery-policy') {
    return {
      route: 'delivery-policy',
      params: {},
    };
  }

  if (pathname === '/refund-cancellation') {
    return {
      route: 'refund-cancellation',
      params: {},
    };
  }

  if (pathname === '/terms') {
    return {
      route: 'terms',
      params: {},
    };
  }

  if (pathname === '/privacy-policy') {
    return {
      route: 'privacy-policy',
      params: {},
    };
  }

  if (pathname.startsWith('/cms/')) {
    return {
      route: 'cms',
      params: {
        slug: pathname.replace('/cms/', ''),
      },
    };
  }

  if (pathname === '/order-success') {
    return {
      route: 'order-success',
      params: {
        orderNumber: params.get('orderNumber') || '',
      },
    };
  }

  // Default
  return {
    route: 'home',
    params: {},
  };
}


function locationFromRoute(route, params = {}) {
  switch (route) {
    case 'home':
      return '/';

    case 'shop': {
      const query = new URLSearchParams();

      if (params.category) {
        query.set('category', params.category);
      }

      if (params.search) {
        query.set('search', params.search);
      }

      return `/shop${query.toString() ? `?${query.toString()}` : ''}`;
    }

    case 'product':
      return `/product/${encodeURIComponent(params.id)}`;

    case 'account':
      return '/account';

    case 'checkout':
      return '/checkout';

    case 'login':
      return '/login';

    case 'membership':
      return '/membership';

    case 'contact':
      return '/contact';

    case 'about':
      return '/about';

    case 'delivery-policy':
      return '/delivery-policy';

    case 'refund-cancellation':
      return '/refund-cancellation';

    case 'terms':
      return '/terms';

    case 'privacy-policy':
      return '/privacy-policy';

    case 'cms':
      return `/cms/${encodeURIComponent(params.slug || 'contact')}`;

    case 'order-success': {
      const query = new URLSearchParams();

      if (params.orderNumber) {
        query.set('orderNumber', params.orderNumber);
      }

      return `/order-success${query.toString() ? `?${query.toString()}` : ''}`;
    }

    case 'admin-dashboard':
      return '/admin';

    case 'admin-pos':
      return '/admin/pos';

    case 'admin-orders':
      return '/admin/orders';

    case 'admin-products':
      return '/admin/products';

    case 'admin-inventory':
      return '/admin/inventory';

    case 'admin-customers':
      return '/admin/customers';

    case 'admin-delivery':
      return '/admin/delivery';

    case 'admin-membership':
      return '/admin/membership';

    case 'admin-coupons':
      return '/admin/coupons';

    case 'admin-reports':
      return '/admin/reports';

    case 'admin-sliders':
      return '/admin/sliders';

    case 'admin-pages':
      return '/admin/pages';

    case 'admin-staff':
      return '/admin/staff';

    case 'admin-settings':
      return '/admin/settings';

    case 'admin-audit':
      return '/admin/audit';

    default:
      return '/';
  }
}

function MainRouter() {
  const { user, isStaff, isAdmin, loading } = useAuth();

  const initialLocation = routeFromLocation();

  const [route, setRoute] = useState(initialLocation.route);
  const [routeParams, setRouteParams] = useState(initialLocation.params);

  function navigate(newRoute, params = {}, replace = false) {
    setRoute(newRoute);
    setRouteParams(params);

    const newPath = locationFromRoute(newRoute, params);

    if (replace) {
      window.history.replaceState(
        { route: newRoute, params },
        '',
        newPath
      );
    } else {
      window.history.pushState(
        { route: newRoute, params },
        '',
        newPath
      );
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  useEffect(() => {
    function handlePopState() {
      const location = routeFromLocation();

      setRoute(location.route);
      setRouteParams(location.params);

      window.scrollTo({
        top: 0,
        behavior: 'auto',
      });
    }

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Check if route is an Admin/Staff sub-route
  const isAdminRoute = route.startsWith('admin-');

  // --- INTERNAL PROTECTED ROUTE GUARD (Requirement 12, 13, 14) ---
  if (isAdminRoute) {
    if (!loading && (!user || user.account_type !== 'INTERNAL')) {
      return (
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
          <Header onNavigate={navigate} currentRoute={route} />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-200 text-center space-y-4 animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black text-slate-900">Restricted Administration Access</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                You must be logged in as an internal staff member or administrator to access the admin portal and store management tools.
              </p>
              <button
                type="button"
                onClick={() => navigate('login')}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
              >
                Sign In to Staff Account &rarr;
              </button>
            </div>
          </main>
          <Footer onNavigate={navigate} />
        </div>
      );
    }

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
        {route === 'admin-sliders' && <AdminHomeSlider onNavigate={navigate} />}
        {route === 'admin-pages' && <AdminPages onNavigate={navigate} />}
        {route === 'admin-staff' && <AdminStaff onNavigate={navigate} />}
        {route === 'admin-settings' && <AdminSettings onNavigate={navigate} />}
        {route === 'admin-audit' && <AdminAudit onNavigate={navigate} />}
      </AdminLayout>
    );
  }

  // --- CUSTOMER PROTECTED ROUTE GUARD (Requirement 11, 12, 13) ---
  const isCustomerProtectedRoute = route === 'account' || route === 'checkout';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans pb-16 md:pb-0">
      <Header onNavigate={navigate} currentRoute={route} />

      <main className="flex-1">
        {/* Public Routes */}
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
        {route === 'order-success' && (
          <OrderSuccessPage orderNumber={routeParams.orderNumber} onNavigate={navigate} />
        )}
        {route === 'membership' && <MembershipPage onNavigate={navigate} />}
        {route === 'login' && <LoginPage onNavigate={navigate} />}

        {/* Dynamic CMS Pages (Requirement 6, 7) */}
        {route === 'contact' && <CMSPage slug="contact" onNavigate={navigate} />}
        {route === 'about' && <CMSPage slug="about" onNavigate={navigate} />}
        {route === 'delivery-policy' && <CMSPage slug="delivery-policy" onNavigate={navigate} />}
        {route === 'refund-cancellation' && <CMSPage slug="refund-cancellation" onNavigate={navigate} />}
        {route === 'terms' && <CMSPage slug="terms" onNavigate={navigate} />}
        {route === 'privacy-policy' && <CMSPage slug="privacy-policy" onNavigate={navigate} />}
        {route === 'cms' && <CMSPage slug={routeParams.slug || 'contact'} onNavigate={navigate} />}

        {/* Customer Protected: Account & Checkout */}
        {route === 'account' && (
          !user ? (
            <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <User className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-black text-slate-900">Sign In Required</h2>
              <p className="text-xs text-slate-500">
                Please sign in with your customer account to view your past orders, delivery addresses, and welcome bonus rewards.
              </p>
              <button
                type="button"
                onClick={() => navigate('login')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
              >
                Sign In / Register &rarr;
              </button>
            </div>
          ) : (
            <AccountDashboard onNavigate={navigate} />
          )
        )}

        {route === 'checkout' && (
          !user ? (
            <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-black text-slate-900">Sign In to Complete Order</h2>
              <p className="text-xs text-slate-500">
                Please sign in to choose your Jabalpur delivery address, select payment method, and confirm your order.
              </p>
              <button
                type="button"
                onClick={() => navigate('login')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
              >
                Sign In to Checkout &rarr;
              </button>
            </div>
          ) : (
            <CheckoutPage onNavigate={navigate} />
          )
        )}
      </main>

      <Footer onNavigate={navigate} />

      {/* Mobile Fixed Bottom Navigation */}
      <MobileBottomNav onNavigate={navigate} currentRoute={route} />

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
