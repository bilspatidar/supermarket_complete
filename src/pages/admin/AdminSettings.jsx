import React, { useEffect, useState } from 'react';
import { Settings, Save, CheckCircle, ShieldCheck } from 'lucide-react';
import client from '../../api/client.js';

export default function AdminSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await client.get('/settings/admin');
      if (res.success && res.data) {
        const map = {};
        res.data.forEach(item => {
          map[item.key] = item.value;
        });
        setSettings(map);
      }
    } catch (err) {
      console.warn('Settings load error:', err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(key, val) {
    setSettings(prev => ({ ...prev, [key]: val }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await client.put('/settings', { settings });
      if (res.success) {
        setMessage('Store settings updated successfully.');
      }
    } catch (err) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Store &amp; System Settings</h1>
          <p className="text-xs text-slate-500">Centralized database configuration. Zero hardcoded business parameters.</p>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl font-bold">
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        
        {/* General Store Details */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Store Profile &amp; Contact
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Store Name</label>
              <input
                type="text"
                value={settings.store_name || ''}
                onChange={(e) => handleChange('store_name', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Tagline</label>
              <input
                type="text"
                value={settings.store_tagline || ''}
                onChange={(e) => handleChange('store_tagline', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Store Helpline Mobile</label>
              <input
                type="text"
                value={settings.store_mobile || ''}
                onChange={(e) => handleChange('store_mobile', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Support Email</label>
              <input
                type="email"
                value={settings.store_email || ''}
                onChange={(e) => handleChange('store_email', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Store Physical Address</label>
              <input
                type="text"
                value={settings.store_address || ''}
                onChange={(e) => handleChange('store_address', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">GST Number</label>
              <input
                type="text"
                value={settings.store_gst || ''}
                onChange={(e) => handleChange('store_gst', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Currency Symbol</label>
              <input
                type="text"
                value={settings.currency_symbol || '₹'}
                onChange={(e) => handleChange('currency_symbol', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>
          </div>
        </div>

        {/* WhatsApp & Operations */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            WhatsApp &amp; Operational Hours
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Admin Alert WhatsApp Number</label>
              <input
                type="text"
                value={settings.admin_whatsapp_number || ''}
                onChange={(e) => handleChange('admin_whatsapp_number', e.target.value)}
                placeholder="e.g. 919876543210"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
              <p className="mt-1 text-[10px] text-slate-400">Receives new order and cancellation alerts.</p>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">WhatsApp Notifications Active</label>
              <select
                value={settings.whatsapp_enabled || 'true'}
                onChange={(e) => handleChange('whatsapp_enabled', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Store Daily Opening Time (HH:MM)</label>
              <input
                type="time"
                value={settings.store_opening_time || '08:00'}
                onChange={(e) => handleChange('store_opening_time', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Store Daily Closing Time (HH:MM)</label>
              <input
                type="time"
                value={settings.store_closing_time || '22:00'}
                onChange={(e) => handleChange('store_closing_time', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Welcome Bonus Rules (Section 32) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Welcome Bonus Promotional Rules
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Bonus Credit Amount (₹)</label>
              <input
                type="number"
                value={settings.welcome_bonus_amount || '100'}
                onChange={(e) => handleChange('welcome_bonus_amount', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Min Order to Redeem (₹)</label>
              <input
                type="number"
                value={settings.welcome_bonus_min_order || '499'}
                onChange={(e) => handleChange('welcome_bonus_min_order', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Validity (Days)</label>
              <input
                type="number"
                value={settings.welcome_bonus_validity_days || '30'}
                onChange={(e) => handleChange('welcome_bonus_validity_days', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Allow with Coupon</label>
              <select
                value={settings.welcome_bonus_allow_coupon || 'true'}
                onChange={(e) => handleChange('welcome_bonus_allow_coupon', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                <option value="true">Yes (Stackable)</option>
                <option value="false">No (Exclusive)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Allow with Membership</label>
              <select
                value={settings.welcome_bonus_allow_membership || 'true'}
                onChange={(e) => handleChange('welcome_bonus_allow_membership', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                <option value="true">Yes (Stackable)</option>
                <option value="false">No (Exclusive)</option>
              </select>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Updating Store Settings...' : 'Save Settings to Database'}</span>
        </button>

      </form>
    </div>
  );
}
