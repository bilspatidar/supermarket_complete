import React, { useEffect, useState } from 'react';
import { Award, CheckCircle, ShieldCheck, Zap, ArrowRight } from 'lucide-react';
import client from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function MembershipPage({ onNavigate }) {
  const { isAuthenticated, refreshMe } = useAuth();
  const [plans, setPlans] = useState([]);
  const [myMembership, setMyMembership] = useState(null);
  const [subscribing, setSubscribing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    setLoading(true);
    try {
      const [plansRes, myRes] = await Promise.all([
        client.get('/membership/plans'),
        client.get('/membership/my-status').catch(() => ({ success: false })),
      ]);

      if (plansRes.success) setPlans(plansRes.data || []);
      if (myRes.success) setMyMembership(myRes.data || null);
    } catch (err) {
      console.warn('Failed to load membership plans:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe(planId) {
    if (!isAuthenticated) {
      alert('Please sign in or register to activate your VIP membership.');
      onNavigate('login');
      return;
    }

    setSubscribing(true);
    try {
      const res = await client.post('/membership/subscribe', { planId });
      if (res.success) {
        alert(res.message);
        loadPlans();
        refreshMe();
      }
    } catch (err) {
      alert(`Subscription failed: ${err.message}`);
    } finally {
      setSubscribing(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      
      {/* Hero Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black uppercase tracking-wider">
          <Award className="w-4 h-4 text-amber-600" />
          <span>FreshMart VIP Club</span>
        </span>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
          Shop Smarter with VIP Membership
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Enjoy unlimited free delivery across Jabalpur, guaranteed flat member discounts on every single order, and priority morning dispatch slots.
        </p>
      </div>

      {/* Active Membership Notice */}
      {myMembership && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 flex items-center justify-between gap-4 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0" />
            <div className="text-xs">
              <h4 className="text-sm font-bold text-emerald-950">
                You are currently subscribed to {myMembership.plan_name}!
              </h4>
              <p className="text-emerald-800">
                Active until {new Date(myMembership.end_date).toLocaleDateString()} with {myMembership.discount_percent}% instant discount &amp; free delivery.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('shop')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer"
          >
            Shop Now
          </button>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {plans.map((plan) => {
          const isGold = plan.name.toLowerCase().includes('gold') || plan.price > 150;
          return (
            <div
              key={plan.id}
              className={`rounded-3xl p-8 border transition-all duration-200 flex flex-col justify-between ${
                isGold
                  ? 'bg-gradient-to-b from-amber-500/10 via-white to-white border-amber-400 shadow-xl ring-2 ring-amber-400/50'
                  : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
              }`}
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-900">{plan.name}</h3>
                  {isGold && (
                    <span className="bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                      Most Popular
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900">₹{plan.price}</span>
                  <span className="text-xs text-slate-500 font-semibold">/ {plan.duration_days} days</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {plan.description}
                </p>

                {/* Benefits List */}
                <ul className="space-y-3 text-xs text-slate-700 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-2.5 font-bold text-emerald-800">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{plan.discount_percent}% Instant Discount on all groceries</span>
                  </li>
                  {plan.free_delivery ? (
                    <li className="flex items-center gap-2.5 font-bold text-emerald-800">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Zero Delivery Charge</span>
                    </li>
                  ) : null}
                  {(plan.benefits || []).map((b, i) => (
                    <li key={i} className="flex items-center gap-2.5">
                      <CheckCircle className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8">
                <button
                  type="button"
                  disabled={subscribing}
                  onClick={() => handleSubscribe(plan.id)}
                  className={`w-full py-3.5 px-6 rounded-2xl font-black text-xs sm:text-sm shadow-md transition-transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer ${
                    isGold
                      ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <span>{subscribing ? 'Activating...' : `Activate ${plan.name}`}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
