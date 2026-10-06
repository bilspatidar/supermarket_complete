import React from 'react';
import { CheckCircle, MessageSquare, ArrowRight, ShoppingBag } from 'lucide-react';

export default function OrderSuccessPage({ orderNumber, onNavigate }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
      
      <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
        <CheckCircle className="w-10 h-10 stroke-[2.5]" />
      </div>

      <div className="space-y-2">
        <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Order Confirmed
        </span>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Thank You for Your Order!
        </h1>
        <p className="text-sm text-slate-600">
          Your order reference is <strong className="text-slate-900 font-mono text-base">#{orderNumber}</strong>.
        </p>
      </div>

      {/* WhatsApp Delivery Alert Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 max-w-md mx-auto text-left flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
          <MessageSquare className="w-4 h-4" />
        </div>
        <div className="text-xs text-emerald-950 space-y-1">
          <h4 className="font-bold">WhatsApp Notifications Sent</h4>
          <p className="text-[11px] text-emerald-800 leading-relaxed">
            We have dispatched your order receipt to your WhatsApp number. You will receive real-time notifications as our staff packs and dispatches your order.
          </p>
        </div>
      </div>

      <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => onNavigate('account')}
          className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
        >
          View My Orders &amp; Tracking
        </button>
        <button
          onClick={() => onNavigate('shop')}
          className="px-6 py-3 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Continue Shopping</span>
        </button>
      </div>

    </div>
  );
}
