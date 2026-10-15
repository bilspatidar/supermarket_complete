
import React, { useCallback, useEffect, useState } from 'react';
import {
  Star,
  Search,
  RefreshCw,
  Trash2,
  Eye,
  X,
  LoaderCircle,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  MessageSquare,
  Check,
  XCircle,
  Package,
  UserRound,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import client from '../../api/client.js';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const STATUS_STYLES = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800',
};

function getPayload(response) {
  if (response?.success !== undefined) return response;
  return response?.data ?? response;
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StarRating({ rating = 0, size = 15 }) {
  const value = Number(rating) || 0;

  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={
            star <= value
              ? 'fill-amber-400 text-amber-400'
              : 'text-slate-300'
          }
        />
      ))}
      <span className="ml-1 text-xs font-bold text-slate-600">
        {value}/5
      </span>
    </div>
  );
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [selectedReview, setSelectedReview] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await client.get('/reviews/admin', {
        params: {
          status: statusFilter,
          search: appliedSearch,
          page,
          limit: 20,
        },
      });

      const result = getPayload(response);

      if (result?.success === false) {
        throw new Error(result.message || 'Failed to load reviews.');
      }

      const rows = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result)
          ? result
          : [];

      setReviews(rows);

      setPagination(
        result?.pagination || {
          page,
          limit: 20,
          total: rows.length,
          totalPages: rows.length ? 1 : 0,
        }
      );
    } catch (err) {
      console.error('Failed to load reviews:', err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to load reviews.'
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter, appliedSearch, page]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  function handleSearch(event) {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(search.trim());
  }

  async function handleStatusChange(review, nextStatus) {
    const currentStatus = String(review.status || 'PENDING').toUpperCase();

    if (nextStatus === currentStatus) return;

    if (!['APPROVED', 'REJECTED'].includes(nextStatus)) return;

    setUpdatingId(review.id);
    setError('');
    setNotice('');

    try {
      const response = await client.put(
        `/reviews/${review.id}/status`,
        { status: nextStatus }
      );

      const result = getPayload(response);

      if (result?.success === false) {
        throw new Error(result.message || 'Failed to update review status.');
      }

      setNotice(`Review #${review.id} updated to ${nextStatus}.`);

      setSelectedReview((previous) =>
        previous?.id === review.id
          ? { ...previous, status: nextStatus }
          : previous
      );

      await loadReviews();
    } catch (err) {
      console.error('Failed to update review status:', err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to update review status.'
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(review) {
    const confirmed = window.confirm(
      `Delete review #${review.id} from "${review.customer_name || 'Customer'}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(review.id);
    setError('');
    setNotice('');

    try {
      const response = await client.delete(`/reviews/${review.id}`);
      const result = getPayload(response);

      if (result?.success === false) {
        throw new Error(result.message || 'Failed to delete review.');
      }

      setNotice(`Review #${review.id} deleted successfully.`);

      if (selectedReview?.id === review.id) {
        setSelectedReview(null);
      }

      if (reviews.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadReviews();
      }
    } catch (err) {
      console.error('Failed to delete review:', err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to delete review.'
      );
    } finally {
      setDeletingId(null);
    }
  }

  const currentTotal = Number(pagination.total || 0);
  const currentPage = Number(pagination.page || page);
  const totalPages = Number(pagination.totalPages || 0);

  const approvedCount = reviews.filter(
    (item) => String(item.status).toUpperCase() === 'APPROVED'
  ).length;

  const pendingCount = reviews.filter(
    (item) => String(item.status || 'PENDING').toUpperCase() === 'PENDING'
  ).length;

  const averageRating = reviews.length
    ? (
        reviews.reduce(
          (total, item) => total + Number(item.rating || 0),
          0
        ) / reviews.length
      ).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-900">
            <MessageSquare className="h-5 w-5 text-emerald-600" />
            Reviews & Ratings
          </h1>

          <p className="mt-1 text-xs text-slate-500">
            Review customer feedback, approve ratings, and manage published reviews.
          </p>
        </div>

        <button
          type="button"
          onClick={loadReviews}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Matching Reviews"
          value={currentTotal}
          icon={<MessageSquare className="h-5 w-5" />}
          color="bg-slate-100 text-slate-700"
        />

        <SummaryCard
          label="Pending on This Page"
          value={pendingCount}
          icon={<Clock className="h-5 w-5" />}
          color="bg-amber-100 text-amber-700"
        />

        <SummaryCard
          label="Average Rating on This Page"
          value={averageRating}
          icon={<Star className="h-5 w-5" />}
          color="bg-emerald-100 text-emerald-700"
        />
      </div>

      {/* Messages */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{notice}</span>

          <button
            type="button"
            onClick={() => setNotice('')}
            className="ml-auto"
            aria-label="Dismiss message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search and filters */}
      <form
        onSubmit={handleSearch}
        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search customer, product, review or ID..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div className="relative sm:w-52">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500"
          >
            <option value="ALL">All statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
        >
          <Search className="h-4 w-4" />
          Search
        </button>
      </form>

      {/* Reviews table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-black text-slate-800">
            Customer Reviews
          </h2>

          <span className="text-xs text-slate-500">
            {currentTotal} result(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="whitespace-nowrap p-4">Customer</th>
                <th className="min-w-40 p-4">Review</th>
                <th className="whitespace-nowrap p-4">Rating</th>
                <th className="min-w-40 p-4">For</th>
                <th className="whitespace-nowrap p-4">Submitted</th>
                <th className="whitespace-nowrap p-4">Status</th>
                <th className="whitespace-nowrap p-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <LoaderCircle className="mx-auto mb-2 h-6 w-6 animate-spin" />
                    Loading reviews...
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    <p className="font-semibold">No reviews found.</p>
                    <p className="mt-1">
                      Try changing the search or status filter.
                    </p>
                  </td>
                </tr>
              ) : (
                reviews.map((review) => {
                  const status = String(
                    review.status || 'PENDING'
                  ).toUpperCase();

                  return (
                    <tr
                      key={review.id}
                      className="align-top transition hover:bg-slate-50"
                    >
                      <td className="p-4">
                        <div className="font-bold text-slate-900">
                          {review.customer_name || 'Customer'}
                        </div>
                        <div className="mt-1 text-[10px] text-slate-400">
                          Review #{review.id} · User #{review.user_id}
                        </div>
                      </td>

                      <td className="max-w-xs p-4">
                        <p className="font-bold text-slate-800">
                          {review.review_title || 'Customer review'}
                        </p>
                        <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words leading-relaxed text-slate-500">
                          {review.review_text}
                        </p>

                        <button
                          type="button"
                          onClick={() => setSelectedReview(review)}
                          className="mt-2 inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View details
                        </button>
                      </td>

                      <td className="whitespace-nowrap p-4">
                        <StarRating rating={review.rating} />
                      </td>

                      <td className="p-4">
                        {review.product_id ? (
                          <div className="flex items-start gap-2">
                            <Package className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                            <div>
                              <p className="font-bold text-slate-800">
                                {review.product_name || 'Product review'}
                              </p>
                              <p className="mt-1 text-[10px] text-slate-400">
                                Product ID: {review.product_id}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1.5 text-[10px] font-bold text-violet-700">
                            <MessageSquare className="h-3 w-3" />
                            Store review
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap p-4 text-slate-500">
                        {formatDate(review.created_at)}
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1.5 text-[10px] font-black uppercase ${
                            STATUS_STYLES[status] ||
                            'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="whitespace-nowrap p-4 text-right">
                        <div className="flex flex-col items-end gap-2">
                          {status !== 'APPROVED' && (
                            <button
                              type="button"
                              disabled={updatingId === review.id}
                              onClick={() =>
                                handleStatusChange(review, 'APPROVED')
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {updatingId === review.id ? (
                                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                              Approve
                            </button>
                          )}

                          {status !== 'REJECTED' && (
                            <button
                              type="button"
                              disabled={updatingId === review.id}
                              onClick={() =>
                                handleStatusChange(review, 'REJECTED')
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 px-3 py-2 font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDelete(review)}
                            disabled={deletingId === review.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId === review.id ? (
                              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Page {currentPage} of {totalPages} · {currentTotal} reviews
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review details modal */}
      {selectedReview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedReview(null);
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-xl space-y-5 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Review Details
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Review #{selectedReview.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <DetailRow
              label="Customer"
              value={selectedReview.customer_name || 'Customer'}
            />

            <DetailRow
              label="Customer ID"
              value={selectedReview.user_id}
            />

            <DetailRow
              label="Review Type"
              value={
                selectedReview.product_id
                  ? 'Product review'
                  : 'General store review'
              }
            />

            {selectedReview.product_id && (
              <DetailRow
                label="Product"
                value={`${selectedReview.product_name || 'Product'} (ID: ${selectedReview.product_id})`}
              />
            )}

            <DetailRow
              label="Submitted At"
              value={formatDate(selectedReview.created_at)}
            />

            <DetailRow
              label="Last Updated"
              value={formatDate(selectedReview.updated_at)}
            />

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                Rating
              </p>
              <StarRating rating={selectedReview.rating} size={20} />
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                Review Title
              </p>
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-800">
                {selectedReview.review_title || 'No title provided'}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                Review
              </p>
              <div className="whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                {selectedReview.review_text}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <span
                className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase ${
                  STATUS_STYLES[
                    String(selectedReview.status || 'PENDING').toUpperCase()
                  ] || 'bg-slate-100 text-slate-700'
                }`}
              >
                {selectedReview.status || 'PENDING'}
              </span>

              <div className="flex flex-wrap gap-2">
                {selectedReview.status !== 'APPROVED' && (
                  <button
                    type="button"
                    disabled={updatingId === selectedReview.id}
                    onClick={() =>
                      handleStatusChange(selectedReview, 'APPROVED')
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    Approve
                  </button>
                )}

                {selectedReview.status !== 'REJECTED' && (
                  <button
                    type="button"
                    disabled={updatingId === selectedReview.id}
                    onClick={() =>
                      handleStatusChange(selectedReview, 'REJECTED')
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-200 px-4 py-2.5 text-xs font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedReview(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, color }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}
      >
        {icon}
      </div>

      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span className="break-words text-sm font-bold text-slate-800 sm:text-right">
        {value || '—'}
      </span>
    </div>
  );
}
