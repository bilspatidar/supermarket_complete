import React, { useEffect, useState } from 'react';
import { Award, Plus, CheckCircle, ShieldCheck } from 'lucide-react';
import client from '../../api/client.js';

export default function AdminMembership() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Plan modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('99');
  const [durationDays, setDurationDays] = useState('30');
  const [discountPercent, setDiscountPercent] = useState('5');
  const [freeDelivery, setFreeDelivery] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    setLoading(true);
    try {
      const res = await client.get('/membership/plans');
      if (res.success) setPlans(res.data || []);
    } catch (err) {
      console.warn('Failed to load plans:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePlan(e) {
    e.preventDefault();
    try {
      await client.post('/membership/plans', {
        name,
        description,
        price: Number(price),
        duration_days: Number(durationDays),
        discount_percent: Number(discountPercent),
        free_delivery: freeDelivery ? 1 : 0,
        benefits: [`${discountPercent}% instant discount`, freeDelivery ? 'Zero delivery fee' : 'Standard delivery'],
      });
      setIsModalOpen(false);
      setName('');
      setDescription('');
      loadPlans();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">VIP Membership Plans</h1>
          <p className="text-xs text-slate-500">Tiered customer plans, discounts, and delivery privileges</p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Membership Tier</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">{p.name}</h3>
              <span className="text-lg font-black text-emerald-700">₹{p.price}</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{p.description}</p>

            <div className="pt-2 border-t border-slate-100 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Duration:</span>
                <strong className="text-slate-900">{p.duration_days} days</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Store Discount:</span>
                <strong className="text-emerald-700">{p.discount_percent}% Flat</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Free Delivery:</span>
                <strong className="text-emerald-700">{p.free_delivery ? 'Enabled' : 'No'}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-black text-slate-900">New Membership Tier</h3>
            <form onSubmit={handleCreatePlan} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tier Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Platinum VIP"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Discount %</label>
                <input
                  type="number"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Plan perks summary..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={freeDelivery}
                  onChange={(e) => setFreeDelivery(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="font-bold text-slate-800">Grant Unlimited Free Delivery</span>
              </label>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold cursor-pointer"
                >
                  Save Tier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
