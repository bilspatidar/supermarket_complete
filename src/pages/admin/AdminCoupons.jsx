
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Tag,
  Plus,
  CheckCircle,
  Pencil,
  X,
  Save,
  LoaderCircle,
} from 'lucide-react';
import client from '../../api/client.js';

const initialForm = {
  code: '',
  description: '',
  discount_type: 'PERCENTAGE',
  discount_value: '10',
  max_discount: '100',
  min_order_amount: '499',
  per_user_limit: '1',
  first_order_only: false,
  status: 'ACTIVE',
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [form, setForm] = useState({ ...initialForm });

  useEffect(() => {
    loadCoupons();
  }, []);

  async function loadCoupons() {
    setLoading(true);

    try {
      const res = await client.get('/coupons');

      if (res.success) {
        setCoupons(res.data || []);
      }
    } catch (err) {
      console.warn('Failed to load coupons:', err.message);
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
    setEditingCoupon(null);
    setForm({ ...initialForm });
    setIsModalOpen(true);
  }

  function openEditModal(coupon) {
    setEditingCoupon(coupon);

    setForm({
      code: coupon.code || '',
      description: coupon.description || '',
      discount_type: coupon.discount_type || 'PERCENTAGE',
      discount_value: String(coupon.discount_value ?? '10'),
      max_discount:
        coupon.max_discount == null ? '' : String(coupon.max_discount),
      min_order_amount: String(coupon.min_order_amount ?? '0'),
      per_user_limit: String(coupon.per_user_limit ?? '1'),
      first_order_only:
        coupon.first_order_only === true ||
        coupon.first_order_only === 1 ||
        coupon.first_order_only === '1',
      status: String(coupon.status || 'ACTIVE').toUpperCase(),
    });

    setIsModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setIsModalOpen(false);
    setEditingCoupon(null);
    setForm({ ...initialForm });
  }

  async function handleSubmitCoupon(e) {
    e.preventDefault();

    const code = form.code.trim().toUpperCase();
    const discountValue = Number(form.discount_value);
    const minOrder = Number(form.min_order_amount);
    const perUserLimit = Number(form.per_user_limit);
    const maxDiscount =
      form.max_discount.trim() === ''
        ? null
        : Number(form.max_discount);

    if (!code) {
      toast.error('Please enter a coupon code.', {
  duration: 2000,
});
      return;
    }

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      toast.error('Discount value must be greater than zero.', {
  duration: 2000,
});
      return;
    }

    if (
      form.discount_type === 'PERCENTAGE' &&
      discountValue > 100
    ) {
      toast.error('Percentage discount cannot exceed 100%.', {
  duration: 2000,
});
      return;
    }

    if (
      maxDiscount !== null &&
      (!Number.isFinite(maxDiscount) || maxDiscount < 0)
    ) {
      toast.error('Please enter a valid maximum discount.', {
  duration: 2000,
});
      return;
    }

    if (!Number.isFinite(minOrder) || minOrder < 0) {
      toast.error('Minimum order amount cannot be negative.', {
  duration: 2000,
});
      return;
    }

    if (!Number.isInteger(perUserLimit) || perUserLimit < 1) {
      toast.error('Per-user limit must be at least 1.', {
  duration: 2000,
});
      return;
    }

    if (!['ACTIVE', 'INACTIVE'].includes(form.status)) {
      toast.error('Please select a valid coupon status.', {
  duration: 2000,
});
      return;
    }

    const payload = {
      code,
      description: form.description.trim(),
      discount_type: form.discount_type,
      discount_value: discountValue,
      max_discount:
        form.discount_type === 'PERCENTAGE' ? maxDiscount : null,
      min_order_amount: minOrder,
      per_user_limit: perUserLimit,
      first_order_only: form.first_order_only ? 1 : 0,
      status: form.status,
    };

    setSaving(true);

    try {
      const res = editingCoupon
        ? await client.put(`/coupons/${editingCoupon.id}`, payload)
        : await client.post('/coupons', payload);

      if (res?.success === false) {
        throw new Error(
          res.message ||
            `Failed to ${editingCoupon ? 'update' : 'create'} coupon.`
        );
      }

      toast.success(
        res?.message ||
          `Coupon ${editingCoupon ? 'updated' : 'created'} successfully.`, {
  duration: 2000,
}
      );

      setIsModalOpen(false);
      setEditingCoupon(null);
      setForm({ ...initialForm });

      await loadCoupons();
    } catch (err) {
      toast.error(`Failed to save coupon: ${err.message}`, {
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
            Promotional Coupons
          </h1>
          <p className="text-xs text-slate-500">
            Manage fixed or percentage discounts, usage limits, and status.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Coupon Code</span>
        </button>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Code</th>
                <th className="p-3.5">Discount</th>
                <th className="p-3.5">Min Basket</th>
                <th className="p-3.5">Per-User Limit</th>
                <th className="p-3.5">Conditions</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Loading coupons...
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No promotional coupons configured.
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => {
                  const isActive =
                    String(coupon.status || '').toUpperCase() === 'ACTIVE';

                  return (
                    <tr
                      key={coupon.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-3.5 font-mono font-black text-emerald-800">
                        {coupon.code}
                      </td>

                      <td className="p-3.5 font-bold text-slate-900">
                        {coupon.discount_type === 'PERCENTAGE'
                          ? `${coupon.discount_value}% (Max ₹${coupon.max_discount ?? 'None'})`
                          : `Flat ₹${coupon.discount_value}`}
                      </td>

                      <td className="p-3.5 font-semibold text-slate-700">
                        ₹{coupon.min_order_amount}
                      </td>

                      <td className="p-3.5 font-semibold text-slate-700">
                        {coupon.per_user_limit} use(s)
                      </td>

                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {coupon.first_order_only
                          ? '1st Order Only'
                          : 'All Customers'}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {coupon.status || 'UNKNOWN'}
                        </span>
                      </td>

                      {/* Edit only — delete action removed */}
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => openEditModal(coupon)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 font-bold text-slate-600 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                          title="Edit coupon"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {editingCoupon ? 'Edit Coupon' : 'New Coupon Code'}
                </h3>
                <p className="text-slate-500 mt-1">
                  Configure coupon rules and availability.
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

            <form onSubmit={handleSubmitCoupon} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Coupon Code
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) =>
                    updateField('code', e.target.value.toUpperCase())
                  }
                  placeholder="e.g. MEGA50"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase font-black"
                />

                {editingCoupon && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    Changing a coupon code may affect customers who already know it.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Discount Type
                  </label>
                  <select
                    value={form.discount_type}
                    onChange={(e) =>
                      updateField('discount_type', e.target.value)
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Value
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    max={form.discount_type === 'PERCENTAGE' ? 100 : undefined}
                    step="0.01"
                    value={form.discount_value}
                    onChange={(e) =>
                      updateField('discount_value', e.target.value)
                    }
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              {form.discount_type === 'PERCENTAGE' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Max Discount Cap (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.max_discount}
                    onChange={(e) =>
                      updateField('max_discount', e.target.value)
                    }
                    placeholder="Leave blank for no limit"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Min Basket (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.min_order_amount}
                    onChange={(e) =>
                      updateField('min_order_amount', e.target.value)
                    }
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Per User Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.per_user_limit}
                    onChange={(e) =>
                      updateField('per_user_limit', e.target.value)
                    }
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) =>
                    updateField('description', e.target.value)
                  }
                  placeholder="e.g. 10% off grocery orders above ₹499"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 pt-1">
                <input
                  type="checkbox"
                  checked={form.first_order_only}
                  onChange={(e) =>
                    updateField('first_order_only', e.target.checked)
                  }
                  className="w-4 h-4 rounded accent-emerald-600"
                />
                <span>First-time order customers only</span>
              </label>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Coupon Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => updateField('status', e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="ACTIVE">Active — available for use</option>
                  <option value="INACTIVE">Inactive — unavailable for use</option>
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
                  ) : editingCoupon ? (
                    <Save className="w-4 h-4" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}

                  {saving
                    ? 'Saving...'
                    : editingCoupon
                      ? 'Update Coupon'
                      : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
