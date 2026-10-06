import React, { useEffect, useState } from 'react';
import { Users, Search, Edit3, Lock, ShieldAlert, CheckCircle, Calendar } from 'lucide-react';
import client from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AdminCustomers() {
  const { permissions, roles } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Correction Modal
  const [correctModalCust, setCorrectModalCust] = useState(null);
  const [newDob, setNewDob] = useState('');
  const [newAnniv, setNewAnniv] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canCorrectPersonalData = roles.includes('SUPER_ADMIN') || permissions.includes('customers.correct_personal_data');

  useEffect(() => {
    loadCustomers();
  }, [search]);

  async function loadCustomers() {
    setLoading(true);
    try {
      const res = await client.get(`/customers?limit=100${search ? `&search=${encodeURIComponent(search)}` : ''}`);
      if (res.success && res.data) {
        setCustomers(res.data.customers || []);
      }
    } catch (err) {
      console.warn('Failed to load customers:', err.message);
    } finally {
      setLoading(false);
    }
  }

  function openCorrectionModal(cust) {
    setCorrectModalCust(cust);
    setNewDob(cust.dob || '');
    setNewAnniv(cust.anniversary_date || '');
    setReason('Customer requested birth date correction via support');
  }

  async function handleCorrectionSubmit(e) {
    e.preventDefault();
    if (!correctModalCust || !reason) return;
    setSubmitting(true);
    try {
      const res = await client.post('/auth/admin/correct-personal-data', {
        customerId: correctModalCust.id,
        dob: newDob || null,
        anniversaryDate: newAnniv || null,
        reason,
      });

      if (res.success) {
        alert('Personal data updated and audit log created successfully.');
        setCorrectModalCust(null);
        loadCustomers();
      }
    } catch (err) {
      alert(`Correction failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Customer Directory</h1>
          <p className="text-xs text-slate-500">
            Registered shopper profiles, spending statistics, and sensitive data correction
          </p>
        </div>

        {canCorrectPersonalData && (
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-emerald-600" />
            <span>Authorized for Personal Data Corrections (Audit Logged)</span>
          </span>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer name, mobile, or email..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-hidden focus:border-emerald-500 font-medium"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Mobile</th>
                <th className="p-3.5">Date of Birth (DOB)</th>
                <th className="p-3.5">Anniversary</th>
                <th className="p-3.5">Orders Count</th>
                <th className="p-3.5">Total Spent</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">Loading customers...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">No customers found.</td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">
                      {c.name}
                      {c.email && <div className="text-[10px] text-slate-400 font-normal">{c.email}</div>}
                    </td>

                    <td className="p-3.5 font-mono font-semibold text-slate-700">
                      {c.mobile}
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800">{c.dob || 'Not set'}</span>
                        {c.dob_locked ? (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> Locked
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800">{c.anniversary_date || 'Not set'}</span>
                        {c.anniversary_locked ? (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> Locked
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="p-3.5 font-bold text-slate-700">
                      {c.order_count} orders
                    </td>

                    <td className="p-3.5 font-black text-slate-900">
                      ₹{c.total_spent}
                    </td>

                    <td className="p-3.5 text-right">
                      {canCorrectPersonalData && (
                        <button
                          type="button"
                          onClick={() => openCorrectionModal(c)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] cursor-pointer inline-flex items-center gap-1"
                          title="Correct locked personal data"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Correct DOB</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin DOB & Anniversary Correction Modal (Section 6) */}
      {correctModalCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <span>Admin Personal Data Correction</span>
              </h3>
              <button onClick={() => setCorrectModalCust(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                ✕
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
              <strong>Audit Policy:</strong> Every correction creates an immutable audit trail recording the admin user ID, previous values, new values, mandatory reason, and IP address.
            </div>

            <form onSubmit={handleCorrectionSubmit} className="space-y-3.5">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Customer</label>
                <div className="font-black text-slate-900 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  {correctModalCust.name} ({correctModalCust.mobile})
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Correct Date of Birth (YYYY-MM-DD)</label>
                <input
                  type="date"
                  value={newDob}
                  onChange={(e) => setNewDob(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Correct Anniversary (YYYY-MM-DD)</label>
                <input
                  type="date"
                  value={newAnniv}
                  onChange={(e) => setNewAnniv(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mandatory Correction Reason</label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  placeholder="Specify customer ticket / reason for audit trail..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Auditing & Saving...' : 'Confirm Correction & Log Audit'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
