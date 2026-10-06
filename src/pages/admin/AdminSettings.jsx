import React, { useEffect, useState } from 'react';
import { Settings, Save, CheckCircle, ShieldCheck, MapPin, Phone, Mail, Clock, Store } from 'lucide-react';
import client from '../../api/client.js';
import ImageUploader from '../../components/common/ImageUploader.jsx';

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
        setMessage('Store settings and contact configuration updated successfully.');
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
          <p className="text-xs text-slate-500">
            Store identity, logo, dynamic contact information, Google Maps, and business rules
          </p>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        
        {/* Store Logo & Branding */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-600" />
            <span>Store Logo &amp; Identity</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <ImageUploader
              label="Store Brand Logo"
              value={settings.store_logo || ''}
              onChange={(url) => handleChange('store_logo', url)}
              presetName="store-logo"
              helpText="Upload supermarket logo (PNG/WebP/SVG)"
            />

            <div className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Store Name *</label>
                <input
                  type="text"
                  value={settings.store_name || ''}
                  onChange={(e) => handleChange('store_name', e.target.value)}
                  placeholder="e.g. FreshMart Supermarket"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Store Tagline</label>
                <input
                  type="text"
                  value={settings.store_tagline || ''}
                  onChange={(e) => handleChange('store_tagline', e.target.value)}
                  placeholder="e.g. Farm Fresh Groceries Delivered In 30 Mins"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Contact & Google Maps Information */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>Dynamic Contact &amp; Google Map Location</span>
          </h3>
          <p className="text-[11px] text-slate-400">
            This information is loaded dynamically on the public store contact page and footer.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Store Full Address *</label>
              <input
                type="text"
                value={settings.store_address || ''}
                onChange={(e) => handleChange('store_address', e.target.value)}
                placeholder="Plot 42, Commercial Zone, Jabalpur, MP, 482002"
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Store Phone / Helpline *</label>
              <input
                type="text"
                value={settings.store_mobile || ''}
                onChange={(e) => handleChange('store_mobile', e.target.value)}
                placeholder="+91 98765 43210"
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">WhatsApp Hotline *</label>
              <input
                type="text"
                value={settings.store_whatsapp || settings.admin_whatsapp_number || ''}
                onChange={(e) => {
                  handleChange('store_whatsapp', e.target.value);
                  handleChange('admin_whatsapp_number', e.target.value);
                }}
                placeholder="919876543210"
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Support Email *</label>
              <input
                type="email"
                value={settings.store_email || ''}
                onChange={(e) => handleChange('store_email', e.target.value)}
                placeholder="support@freshmart.local"
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Business Hours *</label>
              <input
                type="text"
                value={settings.store_business_hours || 'Monday - Sunday: 08:00 AM - 10:00 PM'}
                onChange={(e) => handleChange('store_business_hours', e.target.value)}
                placeholder="Monday - Sunday: 08:00 AM - 10:00 PM"
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Latitude</label>
              <input
                type="text"
                value={settings.store_latitude || '23.1815'}
                onChange={(e) => handleChange('store_latitude', e.target.value)}
                placeholder="23.1815"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Longitude</label>
              <input
                type="text"
                value={settings.store_longitude || '79.9864'}
                onChange={(e) => handleChange('store_longitude', e.target.value)}
                placeholder="79.9864"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Google Maps Embed URL</label>
              <input
                type="text"
                value={settings.store_google_map_embed || 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d117363.38543781223!2d79.8821943890625!3d23.1754407!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3981ae1a0fb6ec7f%3A0x28972e666994cfb7!2sJabalpur%2C%20Madhya%20Pradesh!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin'}
                onChange={(e) => handleChange('store_google_map_embed', e.target.value)}
                placeholder="https://www.google.com/maps/embed?pb=..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px]"
              />
              <p className="mt-1 text-[10px] text-slate-400">
                Embed URL from Google Maps (Share &gt; Embed a map &gt; copy src attribute)
              </p>
            </div>
          </div>
        </div>

        {/* GST & Currency */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Financial &amp; Tax Configuration
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">GSTIN Number</label>
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

        {/* Welcome Bonus Rules */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Welcome Bonus Promotional Rules
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Welcome Bonus Enabled</label>
              <select
                value={settings.welcome_bonus_enabled || 'true'}
                onChange={(e) => handleChange('welcome_bonus_enabled', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Credit Amount (₹)</label>
              <input
                type="number"
                value={settings.welcome_bonus_amount || '100'}
                onChange={(e) => handleChange('welcome_bonus_amount', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Credit Validity (Days)</label>
              <input
                type="number"
                value={settings.welcome_bonus_validity_days || '30'}
                onChange={(e) => handleChange('welcome_bonus_validity_days', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Minimum Order for Redemption (₹)</label>
              <input
                type="number"
                value={settings.welcome_bonus_min_order || '499'}
                onChange={(e) => handleChange('welcome_bonus_min_order', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>

      </form>

    </div>
  );
}
