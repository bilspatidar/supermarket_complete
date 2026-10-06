import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, ShoppingCart, Users, Gift, Award, AlertTriangle } from 'lucide-react';
import client from '../../api/client.js';

export default function AdminReports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    try {
      const res = await client.get('/reports/dashboard');
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.warn('Reports error:', err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-xs">Generating analytical reports...</div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">System Analytics &amp; Reports</h1>
        <p className="text-xs text-slate-500">Live operational data calculated directly from relational database tables</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Order Report */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3 text-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 font-bold text-slate-900">
            <ShoppingCart className="w-4 h-4 text-emerald-600" />
            <span>Orders &amp; Sales Summary</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between"><span>Total Orders:</span><strong>{data.orders.total}</strong></div>
            <div className="flex justify-between"><span>Delivered Orders:</span><strong className="text-emerald-700">{data.orders.delivered}</strong></div>
            <div className="flex justify-between"><span>Active / Processing:</span><strong className="text-amber-700">{data.orders.pending}</strong></div>
            <div className="flex justify-between"><span>Cancelled Orders:</span><strong className="text-rose-700">{data.orders.cancelled}</strong></div>
            <div className="flex justify-between pt-2 border-t border-slate-100 text-sm">
              <span className="font-bold">Total Sales:</span>
              <strong className="font-black text-slate-900">₹{data.orders.revenue}</strong>
            </div>
          </div>
        </div>

        {/* Payments Ledger Report */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3 text-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 font-bold text-slate-900">
            <DollarSign className="w-4 h-4 text-indigo-600" />
            <span>Payments by Channel</span>
          </div>
          <div className="space-y-2">
            {data.payments.length === 0 ? (
              <p className="text-slate-400 py-3">No payments processed yet.</p>
            ) : (
              data.payments.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-slate-50">
                  <div>
                    <span className="font-bold text-slate-900">{p.payment_method}</span>
                    <span className="text-[10px] text-slate-500 block">Status: {p.status} ({p.count} txns)</span>
                  </div>
                  <strong className="text-slate-900 font-mono">₹{p.total_amount}</strong>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Welcome Bonus Accounting */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3 text-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 font-bold text-slate-900">
            <Gift className="w-4 h-4 text-purple-600" />
            <span>Promotional Credit Ledger</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between"><span>Credits Issued:</span><strong className="text-purple-800">₹{data.welcomeBonus.issued}</strong></div>
            <div className="flex justify-between"><span>Credits Redeemed:</span><strong className="text-emerald-700">₹{data.welcomeBonus.redeemed}</strong></div>
            <div className="flex justify-between"><span>Reversed on Cancellation:</span><strong className="text-amber-700">₹{data.welcomeBonus.reversed}</strong></div>
            <div className="flex justify-between pt-2 border-t border-slate-100 text-sm">
              <span className="font-bold">Outstanding Liability:</span>
              <strong className="font-black text-purple-900">₹{data.welcomeBonus.outstanding}</strong>
            </div>
          </div>
        </div>

        {/* Customer Base Analytics */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3 text-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 font-bold text-slate-900">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Customer Base</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between"><span>Registered Shoppers:</span><strong>{data.customers.total}</strong></div>
            <div className="flex justify-between"><span>Repeat Buyers (&gt;1 Order):</span><strong className="text-emerald-700">{data.customers.repeat}</strong></div>
            <div className="flex justify-between"><span>Average Basket Size:</span><strong>₹{data.orders.avgOrderValue}</strong></div>
          </div>
        </div>

        {/* Membership & Coupons */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3 text-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 font-bold text-slate-900">
            <Award className="w-4 h-4 text-amber-600" />
            <span>Membership &amp; Coupons</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between"><span>Active VIP Subscribers:</span><strong className="text-amber-800">{data.membership.active}</strong></div>
            <div className="flex justify-between"><span>Total Subscriptions:</span><strong>{data.membership.total}</strong></div>
            <div className="flex justify-between"><span>Coupon Uses:</span><strong>{data.coupons.uses}</strong></div>
            <div className="flex justify-between"><span>Total Coupon Discounts:</span><strong className="text-emerald-700">₹{data.coupons.totalDiscount}</strong></div>
          </div>
        </div>

        {/* Inventory Risk Monitor */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3 text-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 font-bold text-slate-900">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Stock Health Monitor</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between"><span>Active Catalog SKUs:</span><strong>{data.inventory.total}</strong></div>
            <div className="flex justify-between"><span>Low Stock Warning:</span><strong className="text-amber-700">{data.inventory.lowStock} items</strong></div>
            <div className="flex justify-between"><span>Out of Stock (Zero Units):</span><strong className="text-rose-700">{data.inventory.outOfStock} items</strong></div>
          </div>
        </div>

      </div>

    </div>
  );
}
