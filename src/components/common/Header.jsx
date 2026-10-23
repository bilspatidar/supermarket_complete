import React, { useState } from 'react';
import {
  ShoppingCart,
  User,
  MapPin,
  Search,
  Mic,
  MicOff,
  LogOut,
  ShieldAlert,
  Store,
  ChevronDown,
  Crown,
  Grid,
  ShoppingBag,
  Home,
  Percent,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useDelivery } from '../../context/DeliveryContext.jsx';
import voiceSearch from '../../services/voiceSearch.js';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { getGeneralImageUrl } from '../../utils/image.js';

export default function Header({ onNavigate, currentRoute }) {
  const { user, isStaff, isAdmin, logout } = useAuth();
  const { count, subtotal, setIsDrawerOpen } = useCart();
  const { selectedArea, selectedSubArea, setIsZoneModalOpen } = useDelivery();
  const { storeSettings } = useStoreSettings();

  const [searchTerm, setSearchTerm] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState('');
  const [userDropdown, setUserDropdown] = useState(false);

  function handleSearchSubmit(e) {
    if (e) e.preventDefault();
    const term = searchTerm.trim();
    if (term) onNavigate('shop', { search: term });
  }

  function startVoiceRecognition() {
    if (isListening) {
      voiceSearch.stopListening();
      setIsListening(false);
      return;
    }

    setVoiceNotice('Listening... Speak product name now');
    setIsListening(true);

    voiceSearch.startListening({
      onStart: () => setIsListening(true),
      onResult: (transcript, isFinal) => {
        setSearchTerm(transcript);
        if (isFinal) {
          setIsListening(false);
          setVoiceNotice(`Recognized: "${transcript}"`);
          setTimeout(() => {
            setVoiceNotice('');
            onNavigate('shop', { search: transcript });
          }, 600);
        }
      },
      onError: (err) => {
        setIsListening(false);
        setVoiceNotice(`Voice Error: ${err}`);
        setTimeout(() => setVoiceNotice(''), 3000);
      },
      onEnd: () => setIsListening(false),
    });
  }

  const accountControl = (
    <div className="relative shrink-0">
      {user ? (
        <>
          <button
            type="button"
            onClick={() => setUserDropdown((open) => !open)}
            aria-expanded={userDropdown}
            aria-label="Account menu"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1.5 transition-colors hover:bg-slate-100 sm:px-3 sm:py-2"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
              {user.name?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
            </div>
            <span className="hidden max-w-[100px] truncate text-xs font-semibold text-slate-800 sm:block">
              {user.name?.split(' ')[0]}
            </span>
            <ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
          </button>

          {userDropdown && (
            <div
              className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] box-border rounded-xl border border-slate-100 bg-white py-1.5 text-xs shadow-xl"
              style={{ zIndex: 100 }}
              onClick={() => setUserDropdown(false)}
            >
              <div className="border-b border-slate-100 px-4 py-2">
                <p className="truncate font-bold text-slate-900">{user.name}</p>
                <p className="font-mono text-[11px] text-slate-500">{user.mobile}</p>
                <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  {user.account_type === 'INTERNAL' ? 'Staff Account' : 'Customer Account'}
                </span>
              </div>

              {user.account_type === 'CUSTOMER' && (
                <button
                  type="button"
                  onClick={() => onNavigate('account')}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <User className="h-3.5 w-3.5" /> My Profile &amp; Orders
                </button>
              )}

              {isStaff && (
                <button
                  type="button"
                  onClick={() => onNavigate('admin-dashboard')}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left font-bold text-indigo-700 hover:bg-indigo-50"
                >
                  <ShieldAlert className="h-3.5 w-3.5" /> Admin Console
                </button>
              )}

              <button
                type="button"
                onClick={logout}
                className="mt-1 flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2 text-left font-medium text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="h-3.5 w-3.5" /> Logout
              </button>
            </div>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={() => onNavigate('login')}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-2.5 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-slate-800 sm:px-3.5"
        >
          <User className="h-3.5 w-3.5" />
          <span>Sign In</span>
        </button>
      )}
    </div>
  );

  return (
    <header className="app-header sticky top-0 z-40 border-b border-emerald-100 bg-white shadow-xs">
      {/* Compact store information banner */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 bg-emerald-900 px-3 py-1.5 text-xs font-medium text-emerald-50 sm:px-4 sm:py-2">
        <span className="min-w-0 truncate">⚡ {storeSettings?.store_name || 'Swastik Supermarket'}</span>
        <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-emerald-100 sm:gap-x-3 sm:text-[11px]">
          <span>
            Daily Hours: {storeSettings?.store_opening_time || '08:00'} – {storeSettings?.store_closing_time || '22:00'}
          </span>
          <span className="text-emerald-500">|</span>
          <button
            type="button"
            onClick={() => onNavigate('cms', { slug: 'contact' })}
            className="cursor-pointer text-emerald-200 underline hover:text-white"
          >
            Contact &amp; Store Location
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-3 py-2 sm:px-6 sm:py-3 lg:px-8">
        {/* Mobile: account and brand share one compact row */}
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 md:flex-nowrap md:gap-4 lg:gap-6">
          <div className="order-1 flex min-w-0 w-full items-center justify-between gap-2 md:order-none md:w-auto md:justify-start md:gap-3">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="group flex min-w-0 max-w-[calc(100%-3.5rem)] flex-1 items-center gap-2 text-left focus:outline-hidden sm:gap-2.5 md:flex-none md:max-w-none"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-emerald-600 shadow-md transition-transform group-hover:scale-105 sm:h-12 sm:w-12 lg:h-15 lg:w-15">
                {storeSettings?.store_logo ? (
                  <img
                    src={getGeneralImageUrl(storeSettings.store_logo)}
                    alt={storeSettings?.store_name || 'Store Logo'}
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <Store className="h-6 w-6" />
                )}
              </div>
              <div className="min-w-0">
                <span className="block max-w-[185px] truncate text-sm font-extrabold leading-tight tracking-tight text-slate-900 sm:max-w-none sm:text-lg lg:text-xl">
                  {storeSettings?.store_name || 'Swastik Supermarket'}
                </span>
                <span className="block truncate text-[8px] font-semibold uppercase tracking-wider text-slate-500 sm:text-[10px]">
                  {storeSettings?.store_tagline || ''}
                </span>
              </div>
            </button>

            {/* Account is last on the mobile brand row */}
            <div className="shrink-0 md:hidden">{accountControl}</div>
          </div>

          {/* Desktop delivery selector only */}
          <button
            type="button"
            onClick={() => setIsZoneModalOpen(true)}
            className="hidden shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-left transition-colors hover:border-emerald-200 hover:bg-emerald-50 md:flex"
          >
            <MapPin className="h-4 w-4 shrink-0 text-emerald-600" />
            <div className="text-xs">
              <div className="text-[10px] font-medium text-slate-400">Deliver to</div>
              <div className="max-w-[120px] truncate font-bold text-slate-800">
                {selectedSubArea ? `${selectedSubArea.name}, ${selectedArea?.name || ''}` : 'Select Area'}
              </div>
            </div>
            <ChevronDown className="ml-1 h-3.5 w-3.5 text-slate-400" />
          </button>

          {/* Search row on mobile; flexible search on desktop */}
          <div className="relative order-3 w-full min-w-0 flex-none md:order-none md:flex-1 md:max-w-lg">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search oil, atta, spices..."
                aria-label="Search products"
                className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-12 text-base text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 hover:bg-white focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 sm:py-3 sm:text-sm"
              />
              <button
                type="button"
                onClick={startVoiceRecognition}
                title="Voice Search"
                aria-label={isListening ? 'Stop voice search' : 'Start voice search'}
                className={`absolute right-1.5 rounded-lg p-1.5 transition-colors ${
                  isListening
                    ? 'animate-pulse bg-rose-500 text-white'
                    : 'text-slate-500 hover:bg-slate-200 hover:text-emerald-600'
                }`}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            </form>

            {voiceNotice && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-xl">
                <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
                <span>{voiceNotice}</span>
              </div>
            )}
          </div>

          {/* Desktop actions only; mobile account is beside the logo and cart is in footer */}
          <div className="order-2 hidden min-w-0 shrink-0 items-center gap-2 md:order-none md:flex md:flex-nowrap lg:gap-3">
            {isStaff && (
              <button
                type="button"
                onClick={() => onNavigate(isAdmin ? 'admin-dashboard' : 'admin-pos')}
                className="flex max-w-full items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>{isAdmin ? 'Admin Console' : 'POS Cashier'}</span>
              </button>
            )}
            {accountControl}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="relative flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-md transition-transform hover:bg-emerald-700 active:scale-95"
            >
              <ShoppingCart className="h-4 w-4" />
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[10px] font-normal text-emerald-100">{count} items</span>
                <span className="text-xs font-extrabold">₹{subtotal}</span>
              </div>
              {count > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-xs">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Desktop navigation remains unchanged in functionality */}
        <nav className="mt-2 hidden items-center justify-between border-t border-slate-100 pt-2.5 text-xs font-bold text-slate-700 md:flex">
          <div className="flex items-center gap-1 lg:gap-2">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${currentRoute === 'home' ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50 hover:text-emerald-600'}`}
            >
              <Home className="h-3.5 w-3.5" /><span>Home</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('shop')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${currentRoute === 'shop' ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50 hover:text-emerald-600'}`}
            >
              <ShoppingBag className="h-3.5 w-3.5" /><span>Shop</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('shop')}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors hover:bg-slate-50 hover:text-emerald-600"
            >
              <Grid className="h-3.5 w-3.5" /><span>Categories</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('shop', { filter: 'offers' })}
              className="flex items-center gap-1.5 rounded-lg bg-rose-50/70 px-3 py-1.5 text-rose-700 transition-colors hover:bg-rose-100"
            >
              <Percent className="h-3.5 w-3.5" /><span>Offers &amp; Deals</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('membership')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${currentRoute === 'membership' ? 'bg-amber-100 text-amber-900' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'}`}
            >
              <Crown className="h-3.5 w-3.5 text-amber-600" /><span>Membership</span>
            </button>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-500">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-1 hover:text-emerald-600"
            >
              <ShoppingCart className="h-3.5 w-3.5" /><span>Cart ({count})</span>
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => (user ? onNavigate('account') : onNavigate('login'))}
              className="flex items-center gap-1 hover:text-emerald-600"
            >
              <User className="h-3.5 w-3.5" /><span>Account</span>
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
