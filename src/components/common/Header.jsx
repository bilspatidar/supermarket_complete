import React, { useState } from 'react';
import { ShoppingCart, User, MapPin, Search, Mic, MicOff, LogOut, ShieldAlert, Store, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useDelivery } from '../../context/DeliveryContext.jsx';
import voiceSearch from '../../services/voiceSearch.js';

export default function Header({ onNavigate, currentRoute }) {
  const { user, isStaff, isAdmin, logout } = useAuth();
  const { count, subtotal, setIsDrawerOpen } = useCart();
  const { selectedArea, selectedSubArea, setIsZoneModalOpen } = useDelivery();

  const [searchTerm, setSearchTerm] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState('');
  const [userDropdown, setUserDropdown] = useState(false);

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

    setVoiceNotice('Listening... Speak now (e.g., "Flax seed" or "Amul milk")');
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
    <header className="sticky top-0 z-40 bg-white border-b border-emerald-100 shadow-xs">
      {/* Top micro banner */}
      <div className="bg-emerald-800 text-emerald-50 text-xs py-1.5 px-4 font-medium flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="bg-emerald-600 px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase">Express</span>
          <span>⚡ 100% Farm Fresh Produce &amp; Groceries Delivered in Jabalpur</span>
        </div>
        <div className="hidden md:flex items-center gap-4 text-emerald-100">
          <span>Daily Hours: 08:00 AM - 10:00 PM</span>
          <span className="text-emerald-400">|</span>
          <span>WhatsApp Hotline: +91 98765 43210</span>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-3 sm:gap-6">
          
          {/* Logo & Brand */}
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-hidden"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md group-hover:scale-105 transition-transform">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-1">
                Fresh<span className="text-emerald-600">Mart</span>
              </span>
              <span className="hidden sm:block text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
                Supermarket &amp; POS
              </span>
            </div>
          </button>

          {/* Delivery Zone Selector */}
          <button
            onClick={() => setIsZoneModalOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 transition-colors text-left cursor-pointer"
          >
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="text-xs">
              <div className="text-slate-400 font-medium">Deliver to</div>
              <div className="font-bold text-slate-800 truncate max-w-[130px]">
                {selectedSubArea ? `${selectedSubArea.name}, ${selectedArea?.name}` : 'Select Area'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {/* Search bar with Voice Search */}
          <div className="flex-1 max-w-xl relative">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search fruits, milk, atta, 20 20 flax seed..."
                className="w-full pl-10 pr-12 py-2 text-sm bg-slate-100 hover:bg-slate-50 focus:bg-white border border-transparent focus:border-emerald-500 rounded-xl transition-all outline-hidden text-slate-900 placeholder:text-slate-400 shadow-inner"
              />
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

            {/* Voice notice popup */}
            {voiceNotice && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-slate-900 text-white text-xs py-2 px-3 rounded-lg shadow-xl z-50 flex items-center gap-2 animate-fade-in">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>{voiceNotice}</span>
              </div>
            )}
          </div>

          {/* Actions: Account & Cart */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Store Navigation Link */}
            <button
              onClick={() => onNavigate('shop')}
              className={`hidden lg:block text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                currentRoute === 'shop' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-700 hover:text-emerald-600'
              }`}
            >
              All Products
            </button>

            {/* Membership Link */}
            <button
              onClick={() => onNavigate('membership')}
              className="hidden lg:flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <span>VIP Saver</span>
            </button>

            {/* Staff / Admin Quick Link */}
            {isStaff && (
              <button
                onClick={() => onNavigate(isAdmin ? 'admin-dashboard' : 'admin-pos')}
                className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
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
                    className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:block text-xs font-semibold text-slate-800 max-w-[100px] truncate">
                      {user.name.split(' ')[0]}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
                  </button>

                  {userDropdown && (
                    <div
                      className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 text-xs animate-scale-up"
                      onClick={() => setUserDropdown(false)}
                    >
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="font-bold text-slate-900 truncate">{user.name}</p>
                        <p className="text-slate-500 text-[11px] font-mono">{user.mobile}</p>
                      </div>

                      <button
                        onClick={() => onNavigate('account')}
                        className="w-full text-left px-4 py-2 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium flex items-center gap-2 cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5" /> My Profile &amp; Orders
                      </button>

                      {isStaff && (
                        <button
                          onClick={() => onNavigate('admin-dashboard')}
                          className="w-full text-left px-4 py-2 text-indigo-700 hover:bg-indigo-50 font-bold flex items-center gap-2 cursor-pointer"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" /> Admin / Staff Portal
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
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}
            </div>

            {/* Cart Trigger Button */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="relative flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-transform active:scale-95 cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <div className="hidden sm:flex flex-col text-left leading-none">
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

        {/* Mobile Delivery selector strip */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex md:hidden items-center justify-between text-xs">
          <button
            onClick={() => setIsZoneModalOpen(true)}
            className="flex items-center gap-1.5 text-slate-700 hover:text-emerald-700 font-semibold"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>Delivering to: <strong className="text-slate-900">{selectedSubArea ? selectedSubArea.name : 'Choose Location'}</strong></span>
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
