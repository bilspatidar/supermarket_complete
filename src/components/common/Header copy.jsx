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
  Tag,
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

export default function Header({ onNavigate, currentRoute}) {
  const { user, isStaff, isAdmin, logout } = useAuth();
  const { count, subtotal, setIsDrawerOpen } = useCart();
  const { selectedArea, selectedSubArea, setIsZoneModalOpen } = useDelivery();

  const [searchTerm, setSearchTerm] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState('');
  const [userDropdown, setUserDropdown] = useState(false);
  const { storeSettings } = useStoreSettings();


  function handleSearchSubmit(e) {
    if (e) e.preventDefault();
    if (searchTerm.trim()) {
      onNavigate('shop', { search: searchTerm.trim() });
    }
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
      onStart: () => {
        setIsListening(true);
      },
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
      onEnd: () => {
        setIsListening(false);
      },
    });
  }

  return (
    <header className="app-header sticky top-0 z-40 bg-white border-b border-emerald-100 shadow-xs">
      {/* Top micro banner */}
      <div className="bg-emerald-900 text-emerald-50 text-xs py-2 px-3 sm:px-4 font-medium flex flex-wrap justify-between items-center gap-x-3 gap-y-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="whitespace-normal break-words">⚡ {storeSettings?.store_name || 'Swastik Supermarket'}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-emerald-100 text-[10px] sm:text-[11px]">
          <span>Daily Hours: {storeSettings?.store_opening_time || '08:00'} –{' '}
              {storeSettings?.store_closing_time || '22:00'}</span>
          <span className="text-emerald-500">|</span>
          <button
            onClick={() => onNavigate('cms', { slug: 'contact' })}
            className="text-emerald-200 hover:text-white underline cursor-pointer"
          >
            Contact &amp; Store Location
          </button>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="mx-auto w-full max-w-7xl px-3 py-3 sm:px-6 sm:py-3 lg:px-8">
<div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-3 md:flex-nowrap md:gap-4 lg:gap-6">          
          {/* Logo & Brand */}
          <button
            onClick={() => onNavigate('home')}
            className="order-1 flex w-full min-w-0 shrink-0 items-center gap-3 text-left group cursor-pointer focus:outline-hidden md:order-none md:w-auto sm:gap-2.5"
          >
            <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-emerald-600 shadow-md transition-transform group-hover:scale-105 sm:h-12 sm:w-12 lg:h-15 lg:w-15">
            {storeSettings?.store_logo ? (
              <img
                src={getGeneralImageUrl(storeSettings.store_logo)}
                alt={storeSettings?.store_name || 'Store Logo'}
                className="w-full h-full object-contain p-1"
              />
            ) : (
              <Store className="w-6 h-6" />
            )}
          </div>
            <div>
             <span className="block whitespace-normal break-words leading-tight text-base font-extrabold tracking-tight text-slate-900 sm:text-lg lg:text-xl">
              {storeSettings?.store_name || 'Swastik Supermarket'}
            </span>
              <span className="block text-[9px] sm:text-[10px] text-slate-500 font-semibold tracking-wider uppercase whitespace-normal">
                {storeSettings?.store_tagline || ''}
              </span>
            </div>
          </button>

          {/* Delivery Zone Selector */}
          <button
            onClick={() => setIsZoneModalOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 transition-colors text-left cursor-pointer shrink-0"
          >
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="text-xs">
              <div className="text-slate-400 font-medium text-[10px]">Deliver to</div>
              <div className="font-bold text-slate-800 truncate max-w-[120px]">
                {selectedSubArea ? `${selectedSubArea.name}, ${selectedArea?.name}` : 'Select Area'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {/* Search bar with Voice Search */}
         <div className="relative order-3 w-full min-w-0 flex-none md:order-none md:flex-1 md:max-w-lg">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search oil, atta, spices..."
                className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-12 text-sm text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 hover:bg-white focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 sm:text-sm"              />
              <button
                type="button"
                onClick={startVoiceRecognition}
                title="Voice Search"
                className={`absolute right-1.5 p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'text-slate-500 hover:text-emerald-600 hover:bg-slate-200'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </form>

            {voiceNotice && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-slate-900 text-white text-xs py-2 px-3 rounded-lg shadow-xl z-50 flex items-center gap-2 animate-fade-in">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>{voiceNotice}</span>
              </div>
            )}
          </div>

          {/* Actions: Staff Portal, Account & Cart */}
          <div className="order-2 flex w-full min-w-0 shrink-0 flex-wrap items-center justify-between gap-2 md:order-none md:w-auto md:flex-nowrap sm:gap-2 lg:gap-3">

            {/* Staff / Admin Quick Link */}
            {isStaff && (
              <button
                onClick={() => onNavigate(isAdmin ? 'admin-dashboard' : 'admin-pos')}
                className="flex max-w-full flex-wrap items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{isAdmin ? 'Admin Console' : 'POS Cashier'}</span>
              </button>
            )}

            {/* Account Profile / Login */}
            <div className="relative">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserDropdown(!userDropdown)}
                    className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="block text-xs font-semibold text-slate-800 max-w-[120px] whitespace-normal break-words">
                      {user.name.split(' ')[0]}
                    </span>
                    <ChevronDown className="w-3 h-3 shrink-0 text-slate-400" />
                  </button>

                  {userDropdown && (
                    <div
                      className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 text-xs animate-scale-up"
                      onClick={() => setUserDropdown(false)}
                    >
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="font-bold text-slate-900 truncate">{user.name}</p>
                        <p className="text-slate-500 text-[11px] font-mono">{user.mobile}</p>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
                          {user.account_type === 'INTERNAL' ? 'Staff Account' : 'Customer Account'}
                        </span>
                      </div>

                      {user.account_type === 'CUSTOMER' && (
                        <button
                          onClick={() => onNavigate('account')}
                          className="w-full text-left px-4 py-2 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium flex items-center gap-2 cursor-pointer"
                        >
                          <User className="w-3.5 h-3.5" /> My Profile &amp; Orders
                        </button>
                      )}

                      {isStaff && (
                        <button
                          onClick={() => onNavigate('admin-dashboard')}
                          className="w-full text-left px-4 py-2 text-indigo-700 hover:bg-indigo-50 font-bold flex items-center gap-2 cursor-pointer"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" /> Admin Console
                        </button>
                      )}

                      <button
                        onClick={logout}
                        className="w-full text-left px-4 py-2 text-rose-600 hover:bg-rose-50 font-medium flex items-center gap-2 cursor-pointer border-t border-slate-100 mt-1"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => onNavigate('login')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )}
            </div>

            {/* Cart Trigger Button */}
            <button
              onClick={() => setIsDrawerOpen(true)} 
              className="relative flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-2 py-2 text-xs font-bold text-white shadow-md transition-transform hover:bg-emerald-700 active:scale-95 cursor-pointer sm:gap-2 sm:px-3"            >
              <ShoppingCart className="w-4 h-4" />
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[10px] text-emerald-100 font-normal">{count} items</span>
                <span className="text-xs font-extrabold">₹{subtotal}</span>
              </div>
              {count > 0 && (
                <span className="sm:hidden absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black shadow-xs">
                  {count}
                </span>
              )}
            </button>

          </div>
        </div>

        {/* Desktop Top Navigation Bar (Home, Shop, Categories, Offers, Membership, Cart, Account, Search) */}
        <nav className="hidden md:flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 text-xs font-bold text-slate-700">
          <div className="flex items-center gap-1 lg:gap-2">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                currentRoute === 'home' ? 'text-emerald-700 bg-emerald-50' : 'hover:text-emerald-600 hover:bg-slate-50'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('shop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                currentRoute === 'shop' ? 'text-emerald-700 bg-emerald-50' : 'hover:text-emerald-600 hover:bg-slate-50'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Shop</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('shop')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer hover:text-emerald-600 hover:bg-slate-50"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Categories</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('shop', { filter: 'offers' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-700 bg-rose-50/70 hover:bg-rose-100 transition-colors cursor-pointer"
            >
              <Percent className="w-3.5 h-3.5" />
              <span>Offers &amp; Deals</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('membership')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                currentRoute === 'membership'
                  ? 'text-amber-900 bg-amber-100'
                  : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-600" />
              <span>Membership</span>
            </button>
          </div>

          <div className="flex items-center gap-4 text-slate-500 font-semibold text-[11px]">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="hover:text-emerald-600 flex items-center gap-1 cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Cart ({count})</span>
            </button>
            <span>•</span>
            <button
              onClick={() => {
                if (user) onNavigate('account');
                else onNavigate('login');
              }}
              className="hover:text-emerald-600 flex items-center gap-1 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Account</span>
            </button>
          </div>
        </nav>

        {/* Mobile Delivery selector strip */}
          <div className="mt-2 flex min-w-0 items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs md:hidden">       
             <button
            onClick={() => setIsZoneModalOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-left font-semibold text-slate-700 hover:text-emerald-700"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span className="min-w-0 truncate">
            Delivering to:{' '}
            <strong className="text-slate-900">
              {selectedSubArea ? selectedSubArea.name : 'Choose Location'}
            </strong>
          </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          <button
            onClick={() => onNavigate('membership')}
            className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded text-[11px]"
          >
            ⭐ VIP Plans
          </button>
        </div>
      </div>
    </header>
  );
}
