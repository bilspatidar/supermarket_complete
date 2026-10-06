import React, { useState } from 'react';
import { ShieldAlert, Lock, Trash2, X, AlertTriangle } from 'lucide-react';

/**
 * Reusable Sensitive Delete Password Confirmation Modal
 * Enforces backend password verification and RBAC delete permissions
 */
export default function DeleteConfirmModal({
  isOpen,
  title = 'Confirm Sensitive Deletion',
  itemName = '',
  message = 'This action will deactivate or remove this item from the active database.',
  onConfirm,
  onClose,
  loading = false,
  error = '',
}) {
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  if (!isOpen) return null;

  function handleSubmit(e) {
    e.preventDefault();
    setLocalError('');
    if (!password.trim()) {
      setLocalError('Please enter your current administrator/staff password to confirm.');
      return;
    }
    onConfirm(password.trim());
  }

  function handleClose() {
    setPassword('');
    setLocalError('');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-xs animate-scale-up">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 text-rose-600 font-black text-sm">
            <div className="p-2 bg-rose-50 rounded-xl text-rose-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span>{title}</span>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-3.5 space-y-1.5 text-rose-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs">Security Verification Required</p>
              <p className="text-[11px] text-rose-700 leading-relaxed mt-0.5">
                {message}
              </p>
            </div>
          </div>
          {itemName && (
            <div className="bg-white/80 p-2 rounded-lg font-mono font-bold text-slate-800 border border-rose-200/60 text-center">
              {itemName}
            </div>
          )}
        </div>

        {/* Error notification */}
        {(error || localError) && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold">
            {error || localError}
          </div>
        )}

        {/* Password input form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Enter Current Password to Confirm
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLocalError('');
                }}
                placeholder="Your staff/admin password"
                autoFocus
                required
                className="w-full p-2.5 pl-9 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-rose-500 text-slate-900 font-medium"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Backend verifies password and permission. No passwords are hardcoded.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>{loading ? 'Verifying...' : 'Confirm Delete'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
