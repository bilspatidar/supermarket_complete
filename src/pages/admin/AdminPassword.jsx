
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import client from '../../api/client.js';

export default function AdminPassword() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setSuccess('');
  }

  function toggleVisibility(field) {
    setShowPasswords((previous) => ({
      ...previous,
      [field]: !previous[field],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSuccess('');

    const currentPassword = form.currentPassword;
    const newPassword = form.newPassword;
    const confirmPassword = form.confirmPassword;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields.');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }

    if (newPassword === currentPassword) {
      toast.error('New password must differ from the current password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await client.put('/auth/change-admin-password', {
        currentPassword,
        newPassword,
      });

      if (!response?.success) {
        throw new Error(
          response?.message || 'Unable to update password.'
        );
      }

      setForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      setSuccess('Your password has been updated successfully.');
      toast.success('Password updated successfully.');
    } catch (error) {
      console.error('[AdminPassword] Update failed:', error);

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to update password.'
      );
    } finally {
      setLoading(false);
    }
  }

  function renderPasswordField({
    label,
    name,
    field,
    placeholder,
    autoComplete,
  }) {
    return (
      <div>
        <label
          htmlFor={name}
          className="block text-sm font-semibold text-slate-700 mb-2"
        >
          {label}
        </label>

        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

          <input
            id={name}
            name={name}
            type={showPasswords[field] ? 'text' : 'password'}
            value={form[name]}
            onChange={handleChange}
            placeholder={placeholder}
            autoComplete={autoComplete}
            required
            disabled={loading}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-12 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-60"
          />

          <button
            type="button"
            onClick={() => toggleVisibility(field)}
            aria-label={
              showPasswords[field] ? 'Hide password' : 'Show password'
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            {showPasswords[field] ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
          <KeyRound className="h-6 w-6" />
        </div>

        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Change Password
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Update your administrator account password.
          </p>
        </div>
      </div>

      {/* Security information */}
      <div className="flex gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />

        <div>
          <h2 className="text-sm font-bold text-indigo-950">
            Keep your account secure
          </h2>
          <p className="mt-1 text-xs leading-5 text-indigo-800">
            Use a unique password with at least 8 characters. Never share
            your password or verification codes with anyone.
          </p>
        </div>
      </div>

      {/* Password form */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-7">
          <h2 className="font-bold text-slate-900">
            Password Settings
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Confirm your existing password before choosing a new one.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-7">
          {success && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {renderPasswordField({
            label: 'Current Password',
            name: 'currentPassword',
            field: 'current',
            placeholder: 'Enter current password',
            autoComplete: 'current-password',
          })}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {renderPasswordField({
              label: 'New Password',
              name: 'newPassword',
              field: 'new',
              placeholder: 'Enter new password',
              autoComplete: 'new-password',
            })}

            {renderPasswordField({
              label: 'Confirm New Password',
              name: 'confirmPassword',
              field: 'confirm',
              placeholder: 'Re-enter new password',
              autoComplete: 'new-password',
            })}
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            Your new password must contain at least 8 characters and must
            not be the same as your current password.
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-5">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Update Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
