import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Layers,
  Users,
  MapPin,
  Award,
  Tag,
  BarChart3,
  Settings,
  ShieldCheck,
  FileText,
  LogOut,
  Store,
  CreditCard,
  Sliders,
  Globe,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AdminLayout({ activePage, onNavigate, children }) {
  const { user, roles, permissions, logout } = useAuth();

  const isSuperAdmin = roles.includes('SUPER_ADMIN');

  function hasPerm(perm) {
    if (isSuperAdmin) return true;
    return permissions.includes(perm);
  }

  const navItems = [
    { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'dashboard.view' },
    { id: 'admin-pos', label: 'In-House POS', icon: CreditCard, perm: 'orders.create' },
    { id: 'admin-orders', label: 'Orders', icon: ShoppingCart, perm: 'orders.view' },
    { id: 'admin-products', label: 'Products', icon: Package, perm: 'products.view' },
    { id: 'admin-inventory', label: 'Inventory Ledger', icon: Layers, perm: 'inventory.view' },
    { id: 'admin-customers', label: 'Customers', icon: Users, perm: 'customers.view' },
    { id: 'admin-delivery', label: 'Delivery Zones', icon: MapPin, perm: 'delivery.view' },
    { id: 'admin-membership', label: 'VIP Membership', icon: Award, perm: 'membership.view' },
    { id: 'admin-coupons', label: 'Coupons', icon: Tag, perm: 'coupons.view' },
    { id: 'admin-reports', label: 'Analytics Reports', icon: BarChart3, perm: 'reports.view' },
    { id: 'admin-sliders', label: 'Home Sliders', icon: Sliders, perm: 'settings.view' },
    { id: 'admin-pages', label: 'CMS Pages', icon: Globe, perm: 'settings.view' },
    { id: 'admin-staff', label: 'Staff & Roles', icon: ShieldCheck, perm: 'staff.view' },
    { id: 'admin-settings', label: 'Store Settings', icon: Settings, perm: 'settings.view' },
    { id: 'admin-audit', label: 'Audit & WA Logs', icon: FileText, perm: 'audit.view' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0">
        
        {/* Brand header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-white text-base tracking-tight block">
                Fresh<span className="text-emerald-500">Mart</span> Staff
              </span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                {roles[0] || 'Staff Member'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto text-xs font-semibold">
          {navItems.map((item) => {
            if (!hasPerm(item.perm)) return null;
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer text-left ${
                  isActive
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-2">
          <button
            onClick={() => onNavigate('home')}
            className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Customer Storefront</span>
          </button>

          <button
            onClick={logout}
            className="w-full py-2 px-3 rounded-lg text-rose-400 hover:bg-rose-950/30 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 capitalize">
              {navItems.find(n => n.id === activePage)?.label || 'Console'}
            </h2>
            <p className="text-[11px] text-slate-500">
              Logged in as <strong className="text-slate-800">{user?.name}</strong> ({user?.mobile})
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Server Online (SQLite / Express)</span>
            </span>
          </div>
        </header>

        {/* Content body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>

      </div>

    </div>
  );
}
