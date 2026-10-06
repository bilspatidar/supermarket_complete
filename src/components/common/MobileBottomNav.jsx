import React from 'react';
import { Home, ShoppingBag, Search, ShoppingCart, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';

/**
 * Mobile Fixed Bottom Navigation Bar
 * Buttons: Home, Shop, Search, Cart, Account
 */
export default function MobileBottomNav({ onNavigate, currentRoute }) {
  const { user, isStaff, isAdmin } = useAuth();
  const { count, setIsDrawerOpen } = useCart();

  // If in admin console, hide store bottom nav
  if (currentRoute.startsWith('admin-')) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg px-2 py-1.5 flex items-center justify-around md:hidden">
      
      {/* 1. Home */}
      <button
        type="button"
        onClick={() => onNavigate('home')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-colors cursor-pointer ${
          currentRoute === 'home' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Home</span>
      </button>

      {/* 2. Shop */}
      <button
        type="button"
        onClick={() => onNavigate('shop')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-colors cursor-pointer ${
          currentRoute === 'shop' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <ShoppingBag className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Shop</span>
      </button>

      {/* 3. Search */}
      <button
        type="button"
        onClick={() => {
          onNavigate('shop');
          // Focus search input on shop page
          setTimeout(() => {
            const input = document.querySelector('input[type="text"]');
            input?.focus();
          }, 150);
        }}
        className="flex flex-col items-center justify-center p-1.5 rounded-xl transition-colors cursor-pointer text-slate-500 hover:text-slate-800"
      >
        <Search className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Search</span>
      </button>

      {/* 4. Cart with badge */}
      <button
        type="button"
        onClick={() => setIsDrawerOpen(true)}
        className="relative flex flex-col items-center justify-center p-1.5 rounded-xl transition-colors cursor-pointer text-slate-500 hover:text-slate-800"
      >
        <div className="relative">
          <ShoppingCart className="w-5 h-5" />
          {count > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-emerald-600 text-white font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-scale-up">
              {count}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5">Cart</span>
      </button>

      {/* 5. Account */}
      <button
        type="button"
        onClick={() => {
          if (user) {
            onNavigate('account');
          } else {
            onNavigate('login');
          }
        }}
        className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-colors cursor-pointer ${
          currentRoute === 'account' || currentRoute === 'login'
            ? 'text-emerald-600 font-bold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <User className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">{user ? 'Account' : 'Sign In'}</span>
      </button>

    </nav>
  );
}
