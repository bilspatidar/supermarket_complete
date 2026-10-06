import React, { useEffect, useState } from 'react';
import { ArrowLeft, Clock, MapPin, Phone, Mail, MessageSquare, Clock3, Store } from 'lucide-react';
import client from '../../api/client.js';

export default function CMSPage({ slug = 'contact', onNavigate }) {
  const [page, setPage] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPageAndSettings();
  }, [slug]);

  async function loadPageAndSettings() {
    setLoading(true);
    try {
      const [pageRes, settingsRes] = await Promise.all([
        client.get(`/cms/pages/${slug}`),
        client.get('/settings'),
      ]);

      if (pageRes.success && pageRes.data) {
        setPage(pageRes.data);
      }
      if (settingsRes.success && settingsRes.data) {
        setSettings(settingsRes.data);
      }
    } catch (err) {
      console.warn('Failed to load CMS content:', err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="py-24 text-center text-slate-400 text-xs">Loading page content...</div>;
  }

  const isContact = slug === 'contact';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <button
        onClick={() => onNavigate('home')}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Storefront</span>
      </button>

      {/* Main Container */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-xs space-y-8">
        
        {/* Header */}
        <div className="border-b border-slate-100 pb-4 space-y-2">
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {page ? page.title : isContact ? 'Contact Us & Store Location' : 'Information'}
          </h1>
          {page?.description && (
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              {page.description}
            </p>
          )}
        </div>

        {/* Dynamic Contact Page Layout (Loaded from backend settings) */}
        {isContact && settings && (
          <div className="space-y-8 animate-fade-in">
            {/* Contact Information Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Store Address */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-xs text-slate-900">Physical Store Address</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {settings.store_address || 'Plot 42, Commercial Zone, Jabalpur, MP, 482002'}
                </p>
              </div>

              {/* Phone Helpline */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-xs text-slate-900">Phone Support</h3>
                <p className="text-xs font-mono font-semibold text-slate-700">
                  {settings.store_mobile || '+91 98765 43210'}
                </p>
                <span className="text-[10px] text-slate-400 block">Customer Care Hotline</span>
              </div>

              {/* WhatsApp Hotline */}
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-xs text-emerald-950">WhatsApp Order Desk</h3>
                <p className="text-xs font-mono font-bold text-emerald-800">
                  +{settings.store_whatsapp || settings.admin_whatsapp_number || '919876543210'}
                </p>
                <a
                  href={`https://wa.me/${settings.store_whatsapp || settings.admin_whatsapp_number || '919876543210'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-[11px] font-bold text-emerald-700 hover:underline"
                >
                  Chat on WhatsApp &rarr;
                </a>
              </div>

              {/* Business Hours */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Clock3 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-xs text-slate-900">Operating Hours</h3>
                <p className="text-xs text-slate-600">
                  {settings.store_business_hours || 'Mon - Sun: 08:00 AM - 10:00 PM'}
                </p>
                <span className="text-[10px] text-emerald-700 font-semibold block">Same-Day Express Delivery</span>
              </div>

            </div>

            {/* Email Contact */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">Official Support Email</span>
                  <span className="text-slate-600">{settings.store_email || 'support@freshmart.local'}</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                GST: <strong>{settings.store_gst || '23AABCU9603R1ZV'}</strong>
              </div>
            </div>

            {/* Dynamic Google Maps Embed */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-emerald-600" />
                  <span>Google Map Location &amp; Supermarket Counter</span>
                </h3>
                {settings.store_latitude && settings.store_longitude && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    GPS: {settings.store_latitude}, {settings.store_longitude}
                  </span>
                )}
              </div>

              <div className="w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
                <iframe
                  title="Store Location"
                  src={
                    settings.store_google_map_embed ||
                    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d117363.38543781223!2d79.8821943890625!3d23.1754407!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3981ae1a0fb6ec7f%3A0x28972e666994cfb7!2sJabalpur%2C%20Madhya%20Pradesh!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin'
                  }
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        )}

        {/* Standard CMS Text Content */}
        {page?.content && !isContact && (
          <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line space-y-4">
            {page.content}
          </div>
        )}

      </div>
    </div>
  );
}
