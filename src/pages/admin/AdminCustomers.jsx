import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Users,
  Search,
  Edit3,
  Lock,
  ShieldAlert,
  CheckCircle,
  Calendar,
  Eye,
  Download,
  Trash2,
  X,
  CreditCard,
  Gift,
  Crown,
  MapPin,
  ShoppingBag,
  Clock,
  Printer,
} from 'lucide-react';
import client from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import DeleteConfirmModal from '../../components/common/DeleteConfirmModal.jsx';

export default function AdminCustomers() {
  const { permissions, roles } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  // Customer Detail Drawer / Modal
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // DOB & Anniversary Correction Modal
  const [correctModalCust, setCorrectModalCust] = useState(null);
  const [newDob, setNewDob] = useState('');
  const [newAnniv, setNewAnniv] = useState('');
  const [reason, setReason] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  // Sensitive Delete Confirmation Modal
  const [deleteModalCust, setDeleteModalCust] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');



  // Customer / deletion request tabs
  const [activeCustomerTab, setActiveCustomerTab] = useState('customers');

  // Account deletion requests
  const [deletionRequestsLoading, setDeletionRequestsLoading] = useState(false);
  const [deletionStatusFilter, setDeletionStatusFilter] = useState('ALL');
  const [deletionSearch, setDeletionSearch] = useState('');
  const [selectedDeletionRequest, setSelectedDeletionRequest] = useState(null);
  const [deletionAdminStatus, setDeletionAdminStatus] = useState('PENDING');
  const [deletionAdminNotes, setDeletionAdminNotes] = useState('');
  const [savingDeletionRequest, setSavingDeletionRequest] = useState(false);
  const [deletionRequests, setDeletionRequests] = useState([]); 
  const [deletionLoading, setDeletionLoading] = useState(false);



  const canCorrectPersonalData =
    roles.includes('SUPER_ADMIN') || permissions.includes('customers.correct_personal_data');
  const canDeleteCustomer =
    roles.includes('SUPER_ADMIN') || permissions.includes('customers.delete');

  useEffect(() => {
    loadCustomers();
  }, [search]);



const loadDeletionRequests = async () => {
  try {
    setDeletionLoading(true);

    const response = await client.get(
      '/auth/admin/account-deletion-requests'
    );

    if (!response?.success) {
      throw new Error(
        response?.message || 'Unable to load deletion requests.'
      );
    }
    const requests = Array.isArray(response.data)
      ? response.data
      : response.data && typeof response.data === 'object'
        ? [response.data]
        : [];

    setDeletionRequests(requests);
  } catch (error) {
    console.error('Failed to load deletion requests:', error);

    toast.error(
      error?.response?.data?.message ||
      error?.message ||
      'Unable to load deletion requests.'
    );

    setDeletionRequests([]);
  } finally {
    setDeletionLoading(false);
  }
};

  function openDeletionRequest(request) {
    setSelectedDeletionRequest(request);
    setDeletionAdminStatus(request.status);
    setDeletionAdminNotes(request.admin_notes || '');
  }

  async function handleUpdateDeletionRequest(e) {
    e.preventDefault();

    if (!selectedDeletionRequest || savingDeletionRequest) return;

    setSavingDeletionRequest(true);

    try {
      const res = await client.put(
        `/auth/admin/account-deletion-requests/${selectedDeletionRequest.id}`,
        {
          status: deletionAdminStatus,
          adminNotes: deletionAdminNotes,
        }
      );

      if (!res.success) {
        throw new Error(res.message || 'Unable to update the request.');
      }

      toast.success(
        res.message || 'Account deletion request updated successfully.'
      );

      setSelectedDeletionRequest(null);
      await loadDeletionRequests();
    } catch (err) {
      toast.error(
        err.message || 'Unable to update the account deletion request.'
      );
    } finally {
      setSavingDeletionRequest(false);
    }
  }


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

  async function openCustomerDetail(customerId) {
    setSelectedCustomerId(customerId);
    setDetailLoading(true);
    try {
      const res = await client.get(`/customers/${customerId}`);
      if (res.success && res.data) {
        setCustomerDetail(res.data);
      }
    } catch (err) {
      toast.error(`Failed to load customer profile: ${err.message}`, {
        duration: 2000,
      });
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleExportCustomers() {
    setExporting(true);
    try {
      const token = localStorage.getItem('freshmart_token');
      const response = await fetch(`/api/customers/export${search ? `?search=${encodeURIComponent(search)}` : ''}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Customer export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers-export-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      toast.error(`Export error: ${err.message}`, {
        duration: 2000,
      });
    } finally {
      setExporting(false);
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
    setSubmittingCorrection(true);
    try {
      const res = await client.post('/auth/admin/correct-personal-data', {
        customerId: correctModalCust.id,
        dob: newDob || null,
        anniversaryDate: newAnniv || null,
        reason,
      });

      if (res.success) {
        toast.success('Personal data updated and audit log recorded.', {
        duration: 2000,
      });
        setCorrectModalCust(null);
        loadCustomers();
        if (selectedCustomerId === correctModalCust.id) {
          openCustomerDetail(selectedCustomerId);
        }
      }
    } catch (err) {
      toast.error(`Correction failed: ${err.message}`, {
        duration: 2000,
      });
    } finally {
      setSubmittingCorrection(false);
    }
  }

  async function handleDeleteConfirm(password) {
    if (!deleteModalCust) return;
    setDeleteLoading(true);
    setDeleteError('');

    try {
      const res = await client.delete(`/customers/${deleteModalCust.id}`, {
        headers: {
          'x-confirm-password': password,
        },
      });

      if (res.success) {
        toast.success(res.message, {
        duration: 2000,
      });
        setDeleteModalCust(null);
        loadCustomers();
      } else {
        throw new Error(res.message || 'Deletion failed');
      }
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete customer account');
    } finally {
      setDeleteLoading(false);
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

        <div className="flex items-center gap-2">
          {canCorrectPersonalData && (
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
              <span>Audit Logging Active</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleExportCustomers}
            disabled={exporting}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'Exporting...' : 'Export Customers'}</span>
          </button>
        </div>
      </div>



      {/* Customer management tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveCustomerTab('customers')}
          className={`relative px-4 py-3 text-xs font-bold transition-colors ${
            activeCustomerTab === 'customers'
              ? 'text-emerald-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <Users className="h-4 w-4" />
            Customer Directory
          </span>

          {activeCustomerTab === 'customers' && (
            <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-emerald-600" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveCustomerTab('deletion');
            loadDeletionRequests();
          }}
          className={`relative px-4 py-3 text-xs font-bold transition-colors ${
            activeCustomerTab === 'deletion'
              ? 'text-rose-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Account Deletion Requests
          </span>

          {activeCustomerTab === 'deletion' && (
            <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-rose-600" />
          )}
        </button>
      </div>

      {activeCustomerTab === 'customers' && (
        <>

      {/* Search Input */}
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

      {/* Customers Table */}
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
                    <td className="p-3.5">
                      <button
                        type="button"
                        onClick={() => openCustomerDetail(c.id)}
                        className="font-bold text-slate-900 hover:text-emerald-700 text-left cursor-pointer"
                      >
                        {c.name}
                      </button>
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

                    <td className="p-3.5 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => openCustomerDetail(c.id)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] cursor-pointer inline-flex items-center gap-1"
                        title="Open customer detailed history"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>

                      {canCorrectPersonalData && (
                        <button
                          type="button"
                          onClick={() => openCorrectionModal(c)}
                          className="px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg font-bold text-[11px] cursor-pointer inline-flex items-center gap-1"
                          title="Correct locked personal data"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Correct</span>
                        </button>
                      )}

                      {canDeleteCustomer && (
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteModalCust(c);
                            setDeleteError('');
                          }}
                          className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-[11px] cursor-pointer inline-flex items-center gap-1"
                          title="Deactivate customer account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

        </>
      )}


      {activeCustomerTab === 'deletion' && (
        <div className="space-y-4">
          {/* Requests header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Account Deletion Requests
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Review requests and record your administrative decision.
              </p>
            </div>

            <button
              type="button"
              onClick={loadDeletionRequests}
              disabled={deletionRequestsLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Clock className="h-4 w-4" />
              {deletionRequestsLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {/* Search and status filter */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

              <input
                type="search"
                value={deletionSearch}
                onChange={(e) => setDeletionSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadDeletionRequests();
                }}
                placeholder="Search customer name or mobile..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-xs outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={deletionStatusFilter}
              onChange={(e) => {
                setDeletionStatusFilter(e.target.value);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold outline-none focus:border-emerald-500"
            >
              <option value="ALL">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="UNDER_REVIEW">Under review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="COMPLETED">Completed</option>
            </select>

            <button
              type="button"
              onClick={loadDeletionRequests}
              disabled={deletionRequestsLoading}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              Search
            </button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                label: 'Pending',
                status: 'PENDING',
                style: 'border-amber-200 bg-amber-50 text-amber-900',
              },
              {
                label: 'Under review',
                status: 'UNDER_REVIEW',
                style: 'border-blue-200 bg-blue-50 text-blue-900',
              },
              {
                label: 'Approved',
                status: 'APPROVED',
                style: 'border-violet-200 bg-violet-50 text-violet-900',
              },
              {
                label: 'Completed',
                status: 'COMPLETED',
                style: 'border-emerald-200 bg-emerald-50 text-emerald-900',
              },
            ].map((item) => (
              <div
                key={item.status}
                className={`rounded-2xl border p-4 ${item.style}`}
              >
                <p className="text-[11px] font-semibold opacity-80">
                  {item.label}
                </p>
                <p className="mt-1 text-2xl font-black">
                  {
                    deletionRequests.filter(
                      (request) => request.status === item.status
                    ).length
                  }
                </p>
              </div>
            ))}
          </div>

          {/* Requests list */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
            {deletionRequestsLoading ? (
              <div className="p-10 text-center text-xs text-slate-500">
                Loading deletion requests...
              </div>
            ) : deletionRequests.length === 0 ? (
              <div className="p-10 text-center">
                <Trash2 className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-700">
                  No deletion requests found
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Try a different filter or search term.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="p-3.5">Customer</th>
                      <th className="p-3.5">Reason</th>
                      <th className="p-3.5">Requested At</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {deletionRequests.map((request) => {
                      const statusStyles = {
                        PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
                        UNDER_REVIEW: 'bg-blue-50 text-blue-800 border-blue-200',
                        APPROVED: 'bg-violet-50 text-violet-800 border-violet-200',
                        REJECTED: 'bg-rose-50 text-rose-800 border-rose-200',
                        COMPLETED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                      };

                      return (
                        <tr key={request.id} className="hover:bg-slate-50">
                          <td className="p-3.5">
                            <p className="font-bold text-slate-900">
                              {request.name || 'Unknown customer'}
                            </p>
                            <p className="mt-1 font-mono text-[11px] text-slate-500">
                              {request.mobile}
                            </p>
                            <p className="mt-1 text-[10px] text-slate-400">
                              Request #{request.id}
                            </p>
                          </td>

                          <td className="max-w-xs p-3.5">
                            <p className="line-clamp-2 text-slate-600">
                              {request.reason || 'No reason provided'}
                            </p>
                          </td>

                          <td className="whitespace-nowrap p-3.5 text-slate-600">
                            {request.requested_at
                              ? new Date(
                                  request.requested_at
                                ).toLocaleString('en-IN')
                              : '—'}
                          </td>

                          <td className="p-3.5">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                                statusStyles[request.status] ||
                                'border-slate-200 bg-slate-50 text-slate-600'
                              }`}
                            >
                              {request.status?.replaceAll('_', ' ')}
                            </span>
                          </td>

                          <td className="p-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => openDeletionRequest(request)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-bold text-white hover:bg-slate-700"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Review
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}


      
      {/* Account deletion request review modal */}
      {selectedDeletionRequest && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingDeletionRequest) {
              setSelectedDeletionRequest(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="deletion-review-title"
            className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[88dvh] sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                  <Trash2 className="h-5 w-5" />
                </div>

                <div>
                  <h2
                    id="deletion-review-title"
                    className="text-base font-black text-slate-900"
                  >
                    Review Deletion Request
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Request #{selectedDeletionRequest.id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={savingDeletionRequest}
                onClick={() => setSelectedDeletionRequest(null)}
                aria-label="Close review modal"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleUpdateDeletionRequest}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Customer
                    </p>
                    <p className="mt-1 break-words text-sm font-bold text-slate-900">
                      {selectedDeletionRequest.name || 'Unknown customer'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Mobile
                    </p>
                    <p className="mt-1 break-words font-mono text-sm font-bold text-slate-900">
                      {selectedDeletionRequest.mobile || '—'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Customer's reason
                  </p>
                  <div className="whitespace-pre-wrap break-words rounded-xl border border-slate-200 p-4 text-sm leading-6 text-slate-700">
                    {selectedDeletionRequest.reason || 'No reason provided.'}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] text-slate-500">
                      Request submitted
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-800">
                      {selectedDeletionRequest.requested_at
                        ? new Date(
                            selectedDeletionRequest.requested_at
                          ).toLocaleString('en-IN')
                        : '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] text-slate-500">
                      Last reviewed
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-800">
                      {selectedDeletionRequest.reviewed_at
                        ? new Date(
                            selectedDeletionRequest.reviewed_at
                          ).toLocaleString('en-IN')
                        : 'Not reviewed yet'}
                    </p>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="deletion-admin-status"
                    className="mb-2 block text-xs font-bold text-slate-700"
                  >
                    Update request status
                  </label>

                  <select
                    id="deletion-admin-status"
                    value={deletionAdminStatus}
                    onChange={(e) => setDeletionAdminStatus(e.target.value)}
                    disabled={savingDeletionRequest}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-500 disabled:opacity-60"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="UNDER_REVIEW">Under review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="deletion-admin-notes"
                    className="mb-2 block text-xs font-bold text-slate-700"
                  >
                    Internal admin notes
                  </label>

                  <textarea
                    id="deletion-admin-notes"
                    value={deletionAdminNotes}
                    onChange={(e) => setDeletionAdminNotes(e.target.value)}
                    maxLength={5000}
                    rows={4}
                    disabled={savingDeletionRequest}
                    placeholder="Record the review decision or follow-up details..."
                    className="w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-500 disabled:opacity-60"
                  />

                  <p className="mt-1 text-right text-[10px] text-slate-400">
                    {deletionAdminNotes.length}/5000 characters
                  </p>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-5 text-amber-900">
                  <strong>Important:</strong> Updating the status does not
                  itself delete the account. Mark the request COMPLETED only
                  after the authorized deletion or anonymization process has
                  actually been completed.
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:p-5">
                <button
                  type="button"
                  disabled={savingDeletionRequest}
                  onClick={() => setSelectedDeletionRequest(null)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingDeletionRequest}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  {savingDeletionRequest ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Comprehensive Customer Detail Modal */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 text-xs max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black text-base flex items-center justify-center shadow-md">
                  {customerDetail?.customer?.name?.charAt(0) || 'C'}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {customerDetail?.customer?.name || 'Customer Profile'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Mobile: {customerDetail?.customer?.mobile} • Member since {new Date(customerDetail?.customer?.created_at || Date.now()).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomerId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-12 text-center text-slate-400">Loading comprehensive customer profile...</div>
            ) : customerDetail ? (
              <div className="space-y-5">
                
                {/* 1. Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Orders</span>
                    <strong className="text-base font-black text-slate-900">{customerDetail.stats?.totalOrders || 0}</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Spending</span>
                    <strong className="text-base font-black text-emerald-800">₹{customerDetail.stats?.totalSpent || 0}</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">First Order</span>
                    <span className="text-xs font-semibold text-slate-800 block truncate">
                      {customerDetail.stats?.firstOrderDate ? new Date(customerDetail.stats.firstOrderDate).toLocaleDateString() : 'None'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Last Order</span>
                    <span className="text-xs font-semibold text-slate-800 block truncate">
                      {customerDetail.stats?.lastOrderDate ? new Date(customerDetail.stats.lastOrderDate).toLocaleDateString() : 'None'}
                    </span>
                  </div>
                </div>

                {/* 2. Membership & Welcome Bonus Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Membership */}
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-amber-950">
                      <Crown className="w-4 h-4 text-amber-600" />
                      <span>Membership Subscription</span>
                    </div>
                    {customerDetail.membership ? (
                      <div className="text-xs space-y-1 text-amber-900">
                        <div className="font-bold">{customerDetail.membership.plan_name}</div>
                        <div>Discount: {customerDetail.membership.discount_percent}% off orders</div>
                        <div>Expires: {new Date(customerDetail.membership.end_date).toLocaleDateString()}</div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-amber-800">No active VIP membership plan.</p>
                    )}
                  </div>

                  {/* Welcome Bonus */}
                  <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-purple-950">
                      <Gift className="w-4 h-4 text-purple-600" />
                      <span>Welcome Bonus Account Ledger</span>
                    </div>
                    <div className="text-xs space-y-1 text-purple-900">
                      <div className="text-base font-black text-purple-950">
                        ₹{customerDetail.bonus?.available || 0} <span className="text-xs font-normal">available</span>
                      </div>
                      <p className="text-[11px] text-purple-800">
                        {customerDetail.bonus?.transactions?.length || 0} ledger transactions recorded
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Saved Addresses */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>Saved Delivery Addresses ({customerDetail.addresses?.length || 0})</span>
                  </h4>
                  {customerDetail.addresses?.length === 0 ? (
                    <p className="text-slate-400 italic">No saved delivery addresses yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {customerDetail.addresses.map((a) => (
                        <div key={a.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-0.5">
                          <div className="flex justify-between font-bold text-slate-900">
                            <span>{a.address_type}</span>
                            {a.is_default ? <span className="text-emerald-700 text-[10px]">Default</span> : null}
                          </div>
                          <div className="text-slate-600">{a.address_line}</div>
                          <div className="text-slate-400 text-[10px]">{a.sub_area_name}, {a.area_name} ({a.pincode})</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. All Orders & Bills / Invoices */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-emerald-600" />
                    <span>Order History &amp; Invoices ({customerDetail.orders?.length || 0})</span>
                  </h4>
                  {customerDetail.orders?.length === 0 ? (
                    <p className="text-slate-400 italic">Customer has not placed any orders yet.</p>
                  ) : (
                    <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {customerDetail.orders.map((o) => (
                        <div key={o.id} className="p-3 bg-slate-50/50 flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold text-slate-900">#{o.order_number}</span>
                            <span className="text-slate-400 ml-2 text-[10px]">
                              {new Date(o.created_at).toLocaleDateString()} via {o.source}
                            </span>
                            <div className="text-[11px] text-slate-600 mt-0.5">
                              Status: <strong className="uppercase">{o.order_status}</strong> • Payment: <strong>{o.payment_method} ({o.payment_status})</strong>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-slate-950">₹{o.grand_total}</div>
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                              Invoice Available
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5. Payment Ledger History */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    <span>Payment History ({customerDetail.payments?.length || 0})</span>
                  </h4>
                  {customerDetail.payments?.length === 0 ? (
                    <p className="text-slate-400 italic">No payments recorded.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                      {customerDetail.payments.map((p) => (
                        <div key={p.id} className="p-2.5 bg-slate-50/50 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-900">{p.payment_method}</span>
                            <span className="text-slate-400 text-[10px] ml-2">Order #{p.order_number}</span>
                            <div className="text-[10px] text-slate-500 font-mono">{p.payment_reference || p.transaction_ref || 'In-House'}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-slate-900">₹{p.amount}</span>
                            <span className="block text-[10px] text-emerald-700 font-bold">{p.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            ) : null}

          </div>
        </div>
      )}

      {/* Admin DOB & Anniversary Correction Modal */}
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

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-[11px] space-y-1">
              <p className="font-bold">Audit Policy Notice</p>
              <p>
                Customer DOB and Anniversary are locked to protect birthday promotions. Any correction made by admin is logged with timestamp, user ID, IP address, and justification.
              </p>
            </div>

            <form onSubmit={handleCorrectionSubmit} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Customer</label>
                <input
                  type="text"
                  disabled
                  value={`${correctModalCust.name} (${correctModalCust.mobile})`}
                  className="w-full p-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Corrected Date of Birth</label>
                <input
                  type="date"
                  value={newDob}
                  onChange={(e) => setNewDob(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Corrected Anniversary</label>
                <input
                  type="date"
                  value={newAnniv}
                  onChange={(e) => setNewAnniv(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mandatory Correction Reason *</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this data is being altered (e.g. Verified customer government ID via WhatsApp support)..."
                  required
                  rows={2}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCorrectModalCust(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCorrection}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {submittingCorrection ? 'Logging & Updating...' : 'Save & Log Audit Trail'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sensitive Customer Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteModalCust)}
        title="Confirm Customer Account Deactivation"
        itemName={deleteModalCust ? `${deleteModalCust.name} (${deleteModalCust.mobile})` : ''}
        message="This will mark the customer account as inactive. Historical orders, bills, payments, and accounting records will NOT be deleted to preserve financial audit trails."
        loading={deleteLoading}
        error={deleteError}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteModalCust(null)}
      />

    </div>
  );
}
