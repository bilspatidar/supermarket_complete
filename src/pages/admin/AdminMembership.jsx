
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Award,
  Plus,
  CheckCircle,
  ShieldCheck,
  Pencil,
  X,
  Save,
  LoaderCircle,
} from 'lucide-react';
import client from '../../api/client.js';

const initialForm = {
  name: '',
  description: '',
  price: '99',
  duration_days: '30',
  discount_percent: '5',
  free_delivery: true,
  status: 'ACTIVE',
};

export default function AdminMembership() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    setLoading(true);

    try {
      const res = await client.get('/adminmembership/plans');

      if (res.success) {
        setPlans(res.data || []);
      }
    } catch (err) {
      console.warn('Failed to load plans:', err.message);
    } finally {
      setLoading(false);
    }
  }

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function openCreateModal() {
    setEditingPlan(null);
    setForm({ ...initialForm });
    setIsModalOpen(true);
  }

  function openEditModal(plan) {
    setEditingPlan(plan);

    setForm({
      name: plan.name || '',
      description: plan.description || '',
      price: String(plan.price ?? '0'),
      duration_days: String(plan.duration_days ?? '30'),
      discount_percent: String(plan.discount_percent ?? '0'),
      free_delivery:
        plan.free_delivery === true ||
        plan.free_delivery === 1 ||
        plan.free_delivery === '1',
      status: String(plan.status || 'ACTIVE').toUpperCase(),
    });

    setIsModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setIsModalOpen(false);
    setEditingPlan(null);
    setForm({ ...initialForm });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const cleanName = form.name.trim();
    const priceValue = Number(form.price);
    const durationValue = Number(form.duration_days);
    const discountValue = Number(form.discount_percent);

    if (!cleanName) {
      toast.error('Please enter a membership plan name.', {
  duration: 2000,
});
      return;
    }

    if (!Number.isFinite(priceValue) || priceValue < 0) {
      toast.error('Enter a valid price.', {
  duration: 2000,
});
      return;
    }

    if (!Number.isInteger(durationValue) || durationValue < 1) {
      toast.error('Duration must be at least 1 day.', {
  duration: 2000,
});
      return;
    }

    if (
      !Number.isFinite(discountValue) ||
      discountValue < 0 ||
      discountValue > 100
    ) {
      toast.error('Discount must be between 0 and 100.', {
  duration: 2000,
});
      return;
    }

    const payload = {
      name: cleanName,
      description: form.description.trim(),
      price: priceValue,
      duration_days: durationValue,
      discount_percent: discountValue,
      free_delivery: form.free_delivery ? 1 : 0,
      benefits: [
        `${discountValue}% instant discount`,
        form.free_delivery ? 'Zero delivery fee' : 'Standard delivery',
      ],
      status: form.status,
    };

    setSaving(true);

    try {
      let res;

      if (editingPlan) {
        res = await client.put(
          `/membership/plans/${editingPlan.id}`,
          payload
        );
      } else {
        // Status is included for backends that support it on creation.
        res = await client.post('/membership/plans', payload);
      }

      if (res?.success === false) {
        throw new Error(
          res.message ||
            `Failed to ${editingPlan ? 'update' : 'create'} membership plan.`
        );
      }

      toast.success(
        res?.message ||
          `Membership plan ${editingPlan ? 'updated' : 'created'} successfully.`, {
  duration: 2000,
}
      );

      setIsModalOpen(false);
      setEditingPlan(null);
      setForm({ ...initialForm });

      await loadPlans();
    } catch (err) {
      toast.error(`Failed to save membership plan: ${err.message}`, {
  duration: 2000,
});
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            VIP Membership Plans
          </h1>
          <p className="text-xs text-slate-500">
            Manage membership tiers, discounts, status, and delivery privileges.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Membership Tier</span>
        </button>
      </div>

      {/* Plans */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500 text-sm">
          <LoaderCircle className="w-5 h-5 animate-spin" />
          Loading membership plans...
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <Award className="w-8 h-8 mx-auto text-slate-400 mb-3" />
          <p className="font-bold text-slate-800">No membership plans found</p>
          <p className="text-xs text-slate-500 mt-1">
            Create your first membership tier to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isActive =
              String(plan.status || 'ACTIVE').toUpperCase() === 'ACTIVE';

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl p-6 border shadow-sm space-y-4 ${
                  isActive ? 'border-slate-200' : 'border-slate-300 opacity-80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-slate-900 break-words">
                      {plan.name}
                    </h3>

                    <span
                      className={`inline-flex mt-2 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <span className="text-lg font-black text-emerald-700 shrink-0">
                    ₹{plan.price}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed min-h-8">
                  {plan.description || 'No description provided.'}
                </p>

                <div className="pt-2 border-t border-slate-100 text-xs space-y-3">
                  <div className="flex justify-between text-slate-600 gap-3">
                    <span>Duration:</span>
                    <strong className="text-slate-900">
                      {plan.duration_days} days
                    </strong>
                  </div>

                  <div className="flex justify-between text-slate-600 gap-3">
                    <span>Store Discount:</span>
                    <strong className="text-emerald-700">
                      {plan.discount_percent}% Flat
                    </strong>
                  </div>

                  <div className="flex justify-between text-slate-600 gap-3">
                    <span>Free Delivery:</span>
                    <strong
                      className={
                        plan.free_delivery
                          ? 'text-emerald-700'
                          : 'text-slate-500'
                      }
                    >
                      {plan.free_delivery ? 'Enabled' : 'No'}
                    </strong>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(plan)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit Membership Plan
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {editingPlan ? 'Edit Membership Tier' : 'New Membership Tier'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Configure pricing, benefits, and availability.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 disabled:opacity-50"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Tier Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g. Platinum VIP"
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.price}
                    onChange={(e) => updateField('price', e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={form.duration_days}
                    onChange={(e) => updateField('duration_days', e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Discount (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  value={form.discount_percent}
                  onChange={(e) =>
                    updateField('discount_percent', e.target.value)
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Plan perks summary..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 resize-y"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-slate-200 p-3">
                <input
                  type="checkbox"
                  checked={form.free_delivery}
                  onChange={(e) =>
                    updateField('free_delivery', e.target.checked)
                  }
                  className="w-4 h-4 accent-emerald-600"
                />
                <span>
                  <strong className="block text-slate-800">
                    Grant Unlimited Free Delivery
                  </strong>
                  <span className="text-slate-500">
                    Enable free delivery for members on this plan.
                  </span>
                </span>
              </label>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Plan Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => updateField('status', e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500"
                >
                  <option value="ACTIVE">Active — available for subscription</option>
                  <option value="INACTIVE">Inactive — unavailable for new subscriptions</option>
                </select>
              </div>

              <div className="pt-3 flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <LoaderCircle className="w-4 h-4 animate-spin" />
                  ) : editingPlan ? (
                    <Save className="w-4 h-4" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}

                  {saving
                    ? 'Saving...'
                    : editingPlan
                      ? 'Update Plan'
                      : 'Save Tier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
