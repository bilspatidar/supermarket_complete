import React, { useEffect, useState } from 'react';
import { ShoppingCart, DollarSign, Package, AlertTriangle, TrendingUp, Users, ArrowUpRight, Award, Gift } from 'lucide-react';
import client from '../../api/client.js';

export default function AdminDashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const res = await client.get('/reports/dashboard');
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.warn('Dashboard error:', err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-xs">Loading analytics data...</div>;
  }

  if (!stats) {
    return <div className="py-20 text-center text-slate-400 text-xs">Failed to load analytics.</div>;
  }

  const { orders, inventory, topProducts, recentOrders, welcomeBonus, membership } = stats;

  return (
    <div className="space-y-6">
      
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Gross Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">₹{orders.revenue}</div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>Avg Order Value: <strong>₹{orders.avgOrderValue}</strong></span>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Orders</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{orders.total}</div>
          <div className="text-[11px] text-slate-500">
            <span className="text-emerald-700 font-bold">{orders.delivered} delivered</span> • {orders.pending} active
          </div>
        </div>

        {/* Inventory Stock Alerts */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Inventory Health</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              inventory.lowStock > 0 || inventory.outOfStock > 0
                ? 'bg-amber-50 text-amber-600'
                : 'bg-emerald-50 text-emerald-600'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{inventory.total} Products</div>
          <div className="text-[11px] text-slate-500">
            <span className="text-amber-700 font-bold">{inventory.lowStock} low stock</span> • {inventory.outOfStock} empty
          </div>
        </div>

        {/* Promotional Welcome Credit */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Welcome Bonus</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-900">₹{welcomeBonus.outstanding}</div>
          <div className="text-[11px] text-slate-500">
            Issued ₹{welcomeBonus.issued} • Redeemed ₹{welcomeBonus.redeemed}
          </div>
        </div>

      </div>

      {/* Two Column Section: Best Selling & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Best Selling Products (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Best Selling Products</span>
            </h3>
            <span className="text-[10px] text-slate-400 uppercase font-bold">By units</span>
          </div>

          <div className="space-y-3 text-xs">
            {topProducts.length === 0 ? (
              <p className="text-slate-400 py-6 text-center">No sales recorded yet.</p>
            ) : (
              topProducts.map((p, idx) => (
                <div key={p.product_id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-black text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <div className="font-bold text-slate-900 truncate">{p.product_name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{p.product_code}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-900">{p.units_sold} sold</span>
                    <span className="text-[11px] text-emerald-700 block font-semibold">₹{p.total_sales}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Orders (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-indigo-600" />
              <span>Recent 10 Orders</span>
            </h3>
            <button
              onClick={() => onNavigate('admin-orders')}
              className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
            >
              View All Orders
            </button>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 text-[11px]">
                  <th className="pb-2">Order #</th>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Source</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map(ord => (
                  <tr key={ord.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 font-mono font-bold text-slate-900">
                      #{ord.order_number}
                    </td>
                    <td className="py-2.5">
                      <div className="font-bold text-slate-800">{ord.customer_name}</div>
                      <div className="text-[10px] text-slate-400">{ord.customer_mobile}</div>
                    </td>
                    <td className="py-2.5 font-semibold text-slate-600">
                      {ord.source}
                    </td>
                    <td className="py-2.5">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        ord.order_status === 'DELIVERED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ord.order_status === 'CANCELLED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {ord.order_status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-black text-slate-900">
                      ₹{ord.grand_total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
