
import React from 'react';
import {
  Home,
  ShoppingBag,
  Search,
  ShoppingCart,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';

export default function MobileBottomNav({ onNavigate, currentRoute }) {
  const { count, setIsDrawerOpen } = useCart();
  const { user, validateSession } = useAuth();

  async function handleAccountClick() {
    try {
      const valid = await validateSession();
      onNavigate(valid ? 'account' : 'login');
    } catch (err) {
      console.error('Unable to validate account session:', err);
      alert(
        'Unable to verify your account. Please check your internet connection and try again.'
      );
    }
  }

  if (currentRoute?.startsWith('admin-')) {
    return null;
  }

  const activeClass = 'text-emerald-600 font-bold';
  const inactiveClass = 'text-slate-500';

  const buttonClass =
    'flex flex-1 min-w-0 h-full flex-col items-center justify-center ' +
    'gap-0.5 rounded-lg px-0.5 py-1 transition-colors ' +
    'active:bg-slate-100 focus-visible:outline-none ' +
    'focus-visible:ring-2 focus-visible:ring-emerald-500';

  const iconClass = 'w-5 h-5 shrink-0';

  const labelClass =
    'block max-w-full truncate text-[10px] leading-tight';

  return (
    <nav
      aria-label="Mobile navigation"
      className="
        fixed inset-x-0 bottom-0 z-50 md:hidden
        flex items-stretch justify-between
        box-border w-full
        border-t border-slate-200/80
        bg-white/95 backdrop-blur-md shadow-lg
      "
      style={{
        left: 'env(safe-area-inset-left, 0px)',
        right: 'env(safe-area-inset-right, 0px)',
        width: 'auto',
        paddingLeft: '4px',
        paddingRight: '4px',
        paddingTop: '6px',
        paddingBottom: 'calc(6px + env(safe-area-inset-bottom, 0px))',
        boxSizing: 'border-box',
      }}
    >
      <button
        type="button"
        aria-label="Home"
        aria-current={currentRoute === 'home' ? 'page' : undefined}
        onClick={() => onNavigate('home')}
        className={`${buttonClass} ${
          currentRoute === 'home' ? activeClass : inactiveClass
        }`}
      >
        <Home className={iconClass} />
        <span className={labelClass}>Home</span>
      </button>

      <button
        type="button"
        aria-label="Shop"
        aria-current={currentRoute === 'shop' ? 'page' : undefined}
        onClick={() => onNavigate('shop')}
        className={`${buttonClass} ${
          currentRoute === 'shop' ? activeClass : inactiveClass
        }`}
      >
        <ShoppingBag className={iconClass} />
        <span className={labelClass}>Shop</span>
      </button>

      <button
        type="button"
        aria-label="Search products"
        onClick={() => {
          onNavigate('shop');

          window.setTimeout(() => {
            const input = document.querySelector(
              'input[type="text"]:not([disabled])'
            );
            input?.focus();
          }, 200);
        }}
        className={`${buttonClass} ${inactiveClass}`}
      >
        <Search className={iconClass} />
        <span className={labelClass}>Search</span>
      </button>

      <button
        type="button"
        aria-label={`Cart${count > 0 ? `, ${count} items` : ''}`}
        onClick={() => setIsDrawerOpen(true)}
        className={`${buttonClass} ${inactiveClass} relative`}
      >
        <span className="relative inline-flex shrink-0">
          <ShoppingCart className={iconClass} />
          {count > 0 && (
            <span
              className="
                absolute -right-2 -top-1.5
                flex h-4 min-w-4 items-center justify-center
                rounded-full bg-emerald-600 px-1
                text-[10px] font-bold leading-none text-white
              "
            >
              {count > 99 ? '99+' : count}
            </span>
          )}
        </span>
        <span className={labelClass}>Cart</span>
      </button>

      <button
        type="button"
        aria-label={user ? 'Account' : 'Sign In'}
        aria-current={
          currentRoute === 'account' || currentRoute === 'login'
            ? 'page'
            : undefined
        }
        onClick={handleAccountClick}
        className={`${buttonClass} ${
          currentRoute === 'account' || currentRoute === 'login'
            ? activeClass
            : inactiveClass
        }`}
      >
        <User className={iconClass} />
        <span className={labelClass}>
          {user ? 'Account' : 'Sign In'}
        </span>
      </button>
    </nav>
  );
}
