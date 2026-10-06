import React from 'react';
import { Store, Phone, Mail, MapPin, Clock, MessageSquare, ShieldCheck, Truck, Award } from 'lucide-react';

export default function Footer({ onNavigate }) {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-16 border-t border-slate-800">
      {/* Value Badges */}
      <div className="border-b border-slate-800/80 bg-slate-950/40 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Express Delivery</h4>
              <p className="text-xs text-slate-400">Scheduled slots in Jabalpur</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Farm Fresh Guarantee</h4>
              <p className="text-xs text-slate-400">Organic &amp; unpolished staples</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Secure Checkout</h4>
              <p className="text-xs text-slate-400">Cash on Delivery &amp; Razorpay</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">WhatsApp Updates</h4>
              <p className="text-xs text-slate-400">Real-time status on your phone</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black">
              <Store className="w-5 h-5" />
            </div>
            <span className="text-xl font-black text-white">Fresh<span className="text-emerald-500">Mart</span></span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your trusted neighborhood supermarket and unified in-house POS platform. Serving Jabalpur with daily essentials, farm fruits, pure dairy, and wholesome staples.
          </p>
          <div className="pt-2 text-xs flex items-center gap-2 text-emerald-400 font-semibold">
            <Clock className="w-4 h-4" />
            <span>Store Hours: 08:00 AM – 10:00 PM</span>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Quick Navigation</h4>
          <ul className="space-y-2 text-xs">
            <li><button onClick={() => onNavigate('home')} className="hover:text-emerald-400 transition-colors cursor-pointer">Storefront Home</button></li>
            <li><button onClick={() => onNavigate('shop')} className="hover:text-emerald-400 transition-colors cursor-pointer">All Categories &amp; Products</button></li>
            <li><button onClick={() => onNavigate('membership')} className="hover:text-emerald-400 transition-colors cursor-pointer">VIP Membership Plans</button></li>
            <li><button onClick={() => onNavigate('account')} className="hover:text-emerald-400 transition-colors cursor-pointer">My Account &amp; Order History</button></li>
            <li><button onClick={() => onNavigate('login')} className="hover:text-emerald-400 transition-colors cursor-pointer">Sign In / Register</button></li>
          </ul>
        </div>

        {/* Policies & CMS */}
        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Customer Care</h4>
          <ul className="space-y-2 text-xs">
            <li><button onClick={() => onNavigate('cms', { slug: 'about-us' })} className="hover:text-emerald-400 transition-colors cursor-pointer">About FreshMart</button></li>
            <li><button onClick={() => onNavigate('cms', { slug: 'delivery-policy' })} className="hover:text-emerald-400 transition-colors cursor-pointer">Delivery Areas &amp; Policy</button></li>
            <li><button onClick={() => onNavigate('cms', { slug: 'refund-policy' })} className="hover:text-emerald-400 transition-colors cursor-pointer">Refund &amp; Cancellation</button></li>
            <li><button onClick={() => onNavigate('cms', { slug: 'terms-and-conditions' })} className="hover:text-emerald-400 transition-colors cursor-pointer">Terms &amp; Conditions</button></li>
          </ul>
        </div>

        {/* Contact info */}
        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Store Location</h4>
          <div className="space-y-3 text-xs text-slate-400">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Plot 42, Commercial Zone, Scheme 54, Jabalpur, Madhya Pradesh 482002</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>+91 98765 43210</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>support@freshmart.local</span>
            </div>
            <div className="pt-2">
              <a
                href="https://wa.me/919876543210"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <p>© 2026 FreshMart Supermarket Platform. Pure React + Node.js + SQLite/MySQL Architecture.</p>
      </div>
    </footer>
  );
}
