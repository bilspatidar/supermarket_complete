
import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Crown,
} from 'lucide-react';
import client from '../../api/client.js';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'REJECTED', label: 'Rejected' },
];

const statusClasses = {
  REQUESTED: 'bg-amber-100 text-amber-800',
  ACTIVE: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-700',
};

export default function AdminMembershipList() {
  const [memberships, setMemberships] = useState([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const loadMemberships = useCallback(async () => {
    setLoading(true);

    try {
      const query = new URLSearchParams();

      if (status) query.set('status', status);

      const res = await client.get(
        `/adminmembership/list${query.toString() ? `?${query}` : ''}`
      );

      if (res.success) {
        setMemberships(res.data || []);
      } else {
        toast.error(res.message || 'Failed to load memberships.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load memberships.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    loadMemberships();
  }, [loadMemberships]);

  async function updateStatus(membership, newStatus) {
    const action = newStatus === 'ACTIVE' ? 'approve' : 'reject';

    if (
      !window.confirm(
        `Are you sure you want to ${action} this membership request?`
      )
    ) {
      return;
    }

    setUpdatingId(membership.id);

    try {
      // This endpoint must be implemented in the backend.
      const res = await client.put(
        `/adminmembership/${membership.id}/status`,
        { status: newStatus }
      );

      if (!res.success) {
        toast.error(res.message || 'Unable to update membership.');
        return;
      }

      toast.success(res.message || `Membership ${action}d successfully.`);
      await loadMemberships();
    } catch (err) {
      toast.error(err.message || 'Failed to update membership.');
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredMemberships = memberships.filter((item) => {
    const term = search.trim().toLowerCase();

    if (!term) return true;

    return [
      item.customer_name,
      item.customer_mobile,
      item.customer_email,
      item.plan_name,
      String(item.user_id),
      String(item.id),
    ].some((value) => String(value || '').toLowerCase().includes(term));
  });

  const requestedCount = memberships.filter(
    (item) => item.status?.toUpperCase() === 'REQUESTED'
  ).length;

  const formatDate = (value) => {
    if (!value) return '—';

    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleDateString('en-IN');
  };

  const formatAmount = (value) =>
    `₹${Number(value || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Crown className="text-amber-500" />
            Membership Requests
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Review customer requests and manage membership status.
          </p>
        </div>

        <button
          type="button"
          onClick={loadMemberships}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Total loaded</p>
          <p className="mt-1 text-2xl font-bold">{memberships.length}</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">Pending requests</p>
          <p className="mt-1 text-2xl font-bold text-amber-900">
            {requestedCount}
          </p>
        </div>

        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-800">Active memberships</p>
          <p className="mt-1 text-2xl font-bold text-green-900">
            {memberships.filter(
              (item) => item.status?.toUpperCase() === 'ACTIVE'
            ).length}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, mobile, email or plan..."
            className="w-full rounded-lg border py-2.5 pl-10 pr-3 outline-none focus:border-green-600"
          />
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border bg-white px-3 py-2.5 outline-none focus:border-green-600"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        {loading ? (
          <div className="p-10 text-center text-gray-500">
            Loading memberships...
          </div>
        ) : filteredMemberships.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            No membership records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Start / Expiry</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filteredMemberships.map((item) => {
                  const currentStatus = String(item.status || '').toUpperCase();
                  const isUpdating = updatingId === item.id;
                  const isRequested = currentStatus === 'REQUESTED';

                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-gray-900">
                          {item.customer_name || `User #${item.user_id}`}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {item.customer_mobile || '—'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.customer_email || ''}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-medium">
                          {item.plan_name || 'Membership'}
                        </div>
                        <div className="text-xs text-gray-500">
                          Request #{item.id}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        {formatAmount(item.plan_price)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        {item.duration_days} days
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        <div>{formatDate(item.start_date)}</div>
                        <div className="mt-1 text-xs text-gray-500">
                          Expires: {formatDate(item.end_date)}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            statusClasses[currentStatus] ||
                            'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {currentStatus === 'REQUESTED' ? (
                            <Clock size={13} />
                          ) : null}
                          {currentStatus || 'UNKNOWN'}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        {isRequested ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => updateStatus(item, 'ACTIVE')}
                              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              <CheckCircle size={14} />
                              {isUpdating ? 'Saving...' : 'Approve'}
                            </button>

                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => updateStatus(item, 'REJECTED')}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              <XCircle size={14} />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            No actions
                          </span>
                        )}
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
  );
}
