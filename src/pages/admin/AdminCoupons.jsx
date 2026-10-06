import React, { useEffect, useState } from 'react';
import { Tag, Plus, Trash2, CheckCircle, Percent, Gift } from 'lucide-react';
import client from '../../api/client.js';
import DeleteConfirmModal from '../../components/common/DeleteConfirmModal.jsx';

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Coupon Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState('PERCENTAGE');
  const [val, setVal] = useState('10');
  const [maxDisc, setMaxDisc] = useState('100');
  const [minOrder, setMinOrder] = useState('499');
  const [perUser, setPerUser] = useState('1');
  const [firstOrderOnly, setFirstOrderOnly] = useState(false);

  // Delete Confirm Modal
  const [deleteModalCoupon, setDeleteModalCoupon] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    loadCoupons();
  }, []);

  async function loadCoupons() {
    setLoading(true);
    try {
      const res = await client.get('/coupons');
      if (res.success) setCoupons(res.data || []);
    } catch (err) {
      console.warn('Failed to load coupons:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCoupon(e) {
    e.preventDefault();
    try {
      await client.post('/coupons', {
        code: code.trim().toUpperCase(),
        description: desc,
        discount_type: type,
        discount_value: Number(val),
        max_discount: maxDisc ? Number(maxDisc) : null,
        min_order_amount: Number(minOrder),
        per_user_limit: Number(perUser),
        first_order_only: firstOrderOnly ? 1 : 0,
      });
      setIsModalOpen(false);
      setCode('');
      setDesc('');
      loadCoupons();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeleteConfirm(password) {
    if (!deleteModalCoupon) return;
    setDeleteLoading(true);
    setDeleteError('');

    try {
      const res = await client.delete(`/coupons/${deleteModalCoupon.id}`, {
        headers: {
          'x-confirm-password': password,
        },
      });

      if (res.success) {
        setDeleteModalCoupon(null);
        loadCoupons();
      } else {
        throw new Error(res.message || 'Deletion failed');
      }
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete coupon. Verify password.');
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Promotional Coupons</h1>
          <p className="text-xs text-slate-500">Fixed or percentage discounts with single pricing validation</p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Coupon Code</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
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
                  <td colSpan={7} className="p-8 text-center text-slate-400">Loading coupons...</td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">No promotional coupons configured.</td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-mono font-black text-emerald-800 text-xs">
                      {c.code}
                    </td>

                    <td className="p-3.5 font-bold text-slate-900">
                      {c.discount_type === 'PERCENTAGE' ? `${c.discount_value}% (Max ₹${c.max_discount || 'None'})` : `Flat ₹${c.discount_value}`}
                    </td>

                    <td className="p-3.5 font-semibold text-slate-700">
                      ₹{c.min_order_amount}
                    </td>

                    <td className="p-3.5 font-semibold text-slate-700">
                      {c.per_user_limit} use(s)
                    </td>

                    <td className="p-3.5 text-slate-500 text-[11px]">
                      {c.first_order_only ? '1st Order Only' : 'All Customers'}
                    </td>

                    <td className="p-3.5">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {c.status}
                      </span>
                    </td>

                    <td className="p-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteModalCoupon(c);
                          setDeleteError('');
                        }}
                        className="p-1.5 hover:text-rose-600 text-slate-400 transition-colors cursor-pointer"
                        title="Delete Coupon (Password Protected)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-black text-slate-900">New Coupon Code</h3>
            <form onSubmit={handleCreateCoupon} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Coupon Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. MEGA50"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase font-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Discount Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Value</label>
                  <input
                    type="number"
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              {type === 'PERCENTAGE' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Max Discount Cap (₹)</label>
                  <input
                    type="number"
                    value={maxDisc}
                    onChange={(e) => setMaxDisc(e.target.value)}
                    placeholder="Leave blank for no limit"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Min Basket (₹)</label>
                  <input
                    type="number"
                    value={minOrder}
                    onChange={(e) => setMinOrder(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Per User Limit</label>
                  <input
                    type="number"
                    value={perUser}
                    onChange={(e) => setPerUser(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <input
                  type="text"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="e.g. 10% off for all grocery orders above ₹499"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={firstOrderOnly}
                    onChange={(e) => setFirstOrderOnly(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span>First-time order customers only</span>
                </label>
              </div>

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
                  Create Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sensitive Delete Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteModalCoupon)}
        title="Confirm Coupon Deactivation"
        itemName={deleteModalCoupon ? `Coupon Code: ${deleteModalCoupon.code}` : ''}
        message="This will deactivate this coupon code across the store and in-house POS."
        loading={deleteLoading}
        error={deleteError}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteModalCoupon(null)}
      />

    </div>
  );
}
