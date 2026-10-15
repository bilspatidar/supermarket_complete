
import React, { useEffect, useMemo, useState } from 'react';
import {
  MessageSquare,
  Search,
  RefreshCw,
  Trash2,
  Phone,
  Eye,
  X,
  LoaderCircle,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
} from 'lucide-react';

import client from '../../api/client.js';

const STATUS_OPTIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'SPAM', label: 'Spam' },
];

const STATUS_STYLES = {
  NEW: 'bg-blue-100 text-blue-800',
  CONTACTED: 'bg-amber-100 text-amber-800',
  RESOLVED: 'bg-emerald-100 text-emerald-800',
  SPAM: 'bg-red-100 text-red-800',
};

function getPayload(response) {
  return response?.data ?? response;
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminContacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selectedContact, setSelectedContact] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    setLoading(true);
    setError('');

    try {
      const response = await client.get('/contacts');
      const result = getPayload(response);

      if (result?.success === false) {
        throw new Error(result.message || 'Failed to load enquiries.');
      }

      const rows = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result)
          ? result
          : [];

      setContacts(rows);
    } catch (err) {
      console.error('Failed to load contact enquiries:', err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to load contact enquiries.'
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredContacts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return contacts.filter((contact) => {
      const status = String(contact.status || 'NEW').toUpperCase();

      const matchesStatus =
        statusFilter === 'ALL' || status === statusFilter;

      const matchesSearch =
        !term ||
        [
          contact.name,
          contact.contact_number,
          contact.query,
          contact.id,
        ].some((value) =>
          String(value ?? '').toLowerCase().includes(term)
        );

      return matchesStatus && matchesSearch;
    });
  }, [contacts, search, statusFilter]);

  async function handleStatusChange(contact, nextStatus) {
    const currentStatus = String(contact.status || 'NEW').toUpperCase();

    if (nextStatus === currentStatus) return;
    if (!STATUS_OPTIONS.some((item) => item.value === nextStatus)) return;

    setUpdatingId(contact.id);
    setError('');
    setNotice('');

    try {
      const response = await client.put(
        `/contacts/${contact.id}/default`,
        { status: nextStatus }
      );

      const result = getPayload(response);

      if (result?.success === false) {
        throw new Error(result.message || 'Failed to update status.');
      }

      const updatedContact = result?.data;

      setContacts((previous) =>
        previous.map((item) =>
          item.id === contact.id
            ? {
                ...item,
                ...(updatedContact || {}),
                status: updatedContact?.status || nextStatus,
              }
            : item
        )
      );

      setSelectedContact((previous) =>
        previous?.id === contact.id
          ? {
              ...previous,
              ...(updatedContact || {}),
              status: updatedContact?.status || nextStatus,
            }
          : previous
      );

      setNotice(`Enquiry #${contact.id} updated to ${nextStatus}.`);
    } catch (err) {
      console.error('Failed to update enquiry status:', err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to update enquiry status.'
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(contact) {
    const confirmed = window.confirm(
      `Delete the enquiry from "${contact.name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(contact.id);
    setError('');
    setNotice('');

    try {
      const response = await client.delete(`/contacts/${contact.id}`);
      const result = getPayload(response);

      if (result?.success === false) {
        throw new Error(result.message || 'Failed to delete enquiry.');
      }

      setContacts((previous) =>
        previous.filter((item) => item.id !== contact.id)
      );

      setSelectedContact((previous) =>
        previous?.id === contact.id ? null : previous
      );

      setNotice(`Enquiry #${contact.id} deleted successfully.`);
    } catch (err) {
      console.error('Failed to delete enquiry:', err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to delete enquiry.'
      );
    } finally {
      setDeletingId(null);
    }
  }

  const newCount = contacts.filter(
    (item) => String(item.status || 'NEW').toUpperCase() === 'NEW'
  ).length;

  const contactedCount = contacts.filter(
    (item) => String(item.status).toUpperCase() === 'CONTACTED'
  ).length;

  const resolvedCount = contacts.filter(
    (item) => String(item.status).toUpperCase() === 'RESOLVED'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-900">
            <MessageSquare className="h-5 w-5 text-emerald-600" />
            Contact Enquiries
          </h1>

          <p className="mt-1 text-xs text-slate-500">
            View customer queries, update their status, and delete enquiries.
          </p>
        </div>

        <button
          type="button"
          onClick={loadContacts}
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
          label="Total Enquiries"
          value={contacts.length}
          icon={<MessageSquare className="h-5 w-5" />}
          color="bg-slate-100 text-slate-700"
        />

        <SummaryCard
          label="New Enquiries"
          value={newCount}
          icon={<Clock className="h-5 w-5" />}
          color="bg-blue-100 text-blue-700"
        />

        <SummaryCard
          label="Contacted / Resolved"
          value={contactedCount + resolvedCount}
          icon={<CheckCircle className="h-5 w-5" />}
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
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, mobile, query or ID..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div className="relative sm:w-52">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
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
      </div>

      {/* Enquiries table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-black text-slate-800">
            Customer Enquiries
          </h2>

          <span className="text-xs text-slate-500">
            {filteredContacts.length} result(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="whitespace-nowrap p-4">Customer</th>
                <th className="whitespace-nowrap p-4">Contact</th>
                <th className="min-w-64 p-4">Query</th>
                <th className="whitespace-nowrap p-4">Submitted</th>
                <th className="whitespace-nowrap p-4">Status</th>
                <th className="whitespace-nowrap p-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <LoaderCircle className="mx-auto mb-2 h-6 w-6 animate-spin" />
                    Loading enquiries...
                  </td>
                </tr>
              ) : filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    <p className="font-semibold">No enquiries found.</p>
                    <p className="mt-1">
                      Try changing the search or status filter.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => {
                  const status = String(
                    contact.status || 'NEW'
                  ).toUpperCase();

                  return (
                    <tr
                      key={contact.id}
                      className="align-top transition hover:bg-slate-50"
                    >
                      <td className="p-4">
                        <div className="font-bold text-slate-900">
                          {contact.name}
                        </div>
                        <div className="mt-1 text-[10px] text-slate-400">
                          ID: #{contact.id}
                        </div>
                      </td>

                      <td className="whitespace-nowrap p-4">
                        <a
                          href={`tel:${contact.contact_number}`}
                          className="inline-flex items-center gap-1.5 font-semibold text-slate-700 hover:text-emerald-700"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {contact.contact_number}
                        </a>
                      </td>

                      <td className="max-w-sm p-4">
                        <p className="whitespace-pre-wrap break-words leading-relaxed text-slate-600">
                          {contact.query}
                        </p>

                        <button
                          type="button"
                          onClick={() => setSelectedContact(contact)}
                          className="mt-2 inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View details
                        </button>
                      </td>

                      <td className="whitespace-nowrap p-4 text-slate-500">
                        {formatDate(contact.created_at)}
                      </td>

                      <td className="p-4">
                        <select
                          value={status}
                          disabled={updatingId === contact.id}
                          onChange={(event) =>
                            handleStatusChange(contact, event.target.value)
                          }
                          aria-label={`Update status for enquiry ${contact.id}`}
                          className={`max-w-36 rounded-lg border-0 px-2 py-2 text-[10px] font-black uppercase outline-none ring-1 ring-inset ring-black/5 disabled:opacity-50 ${
                            STATUS_STYLES[status] ||
                            'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {!STATUS_OPTIONS.some(
                            (item) => item.value === status
                          ) && <option value={status}>{status}</option>}

                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>

                        {updatingId === contact.id && (
                          <LoaderCircle className="mt-1 h-3.5 w-3.5 animate-spin text-slate-400" />
                        )}
                      </td>

                      <td className="whitespace-nowrap p-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(contact)}
                          disabled={deletingId === contact.id}
                          title="Delete enquiry"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === contact.id ? (
                            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Delete
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

      {/* Enquiry detail modal */}
      {selectedContact && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedContact(null);
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-xl space-y-5 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Enquiry Details
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Enquiry #{selectedContact.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedContact(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <DetailRow label="Customer Name" value={selectedContact.name} />

            <DetailRow
              label="Contact Number"
              value={selectedContact.contact_number}
            />

            <DetailRow
              label="Submitted At"
              value={formatDate(selectedContact.created_at)}
            />

            <DetailRow
              label="Last Updated"
              value={formatDate(selectedContact.updated_at)}
            />

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                Query
              </p>

              <div className="whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                {selectedContact.query}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <span
                className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase ${
                  STATUS_STYLES[
                    String(selectedContact.status || 'NEW').toUpperCase()
                  ] || 'bg-slate-100 text-slate-700'
                }`}
              >
                {selectedContact.status || 'NEW'}
              </span>

              <div className="flex gap-2">
                <a
                  href={`tel:${selectedContact.contact_number}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <Phone className="h-4 w-4" />
                  Call Customer
                </a>

                <button
                  type="button"
                  onClick={() => setSelectedContact(null)}
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
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
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
