import React, { useEffect, useState } from 'react';
import { Layers, Plus, Edit2, Trash2, CheckCircle, XCircle, ArrowUpDown, Calendar, Link, Image as ImageIcon } from 'lucide-react';
import client from '../../api/client.js';
import ImageUploader from '../../components/common/ImageUploader.jsx';

export default function AdminHomeSlider() {
  const [sliders, setSliders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlider, setEditingSlider] = useState(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [image, setImage] = useState('');
  const [mobileImage, setMobileImage] = useState('');
  const [buttonText, setButtonText] = useState('Shop Now');
  const [buttonUrl, setButtonUrl] = useState('/shop');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [status, setStatus] = useState('ACTIVE');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSliders();
  }, []);

  async function loadSliders() {
    setLoading(true);
    try {
      const res = await client.get('/cms/sliders/admin');
      if (res.success && res.data) {
        setSliders(res.data);
      }
    } catch (err) {
      console.warn('Failed to load sliders:', err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreate() {
    setEditingSlider(null);
    setTitle('');
    setSubtitle('');
    setImage('');
    setMobileImage('');
    setButtonText('Shop Now');
    setButtonUrl('/shop');
    setStartDate('');
    setEndDate('');
    setSortOrder(String(sliders.length));
    setStatus('ACTIVE');
    setError('');
    setIsModalOpen(true);
  }

  function handleOpenEdit(s) {
    setEditingSlider(s);
    setTitle(s.title || '');
    setSubtitle(s.subtitle || '');
    setImage(s.image || '');
    setMobileImage(s.mobile_image || '');
    setButtonText(s.button_text || 'Shop Now');
    setButtonUrl(s.button_url || s.link_url || '/shop');
    setStartDate(s.start_date ? s.start_date.split('T')[0] : '');
    setEndDate(s.end_date ? s.end_date.split('T')[0] : '');
    setSortOrder(String(s.sort_order ?? 0));
    setStatus(s.status || 'ACTIVE');
    setError('');
    setIsModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !image) {
      setError('Title and Desktop Banner Image are required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        title: title.trim(),
        subtitle: subtitle ? subtitle.trim() : null,
        image,
        mobile_image: mobileImage || null,
        button_text: buttonText ? buttonText.trim() : 'Shop Now',
        button_url: buttonUrl || '/shop',
        start_date: startDate || null,
        end_date: endDate || null,
        sort_order: Number(sortOrder) || 0,
        status,
      };

      if (editingSlider) {
        await client.put(`/cms/sliders/${editingSlider.id}`, payload);
      } else {
        await client.post('/cms/sliders', payload);
      }

      setIsModalOpen(false);
      loadSliders();
    } catch (err) {
      setError(err.message || 'Failed to save slider banner');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id, sTitle) {
    if (!window.confirm(`Are you sure you want to delete slider "${sTitle}"?`)) return;
    try {
      await client.delete(`/cms/sliders/${id}`);
      loadSliders();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <span>Home Sliders Management</span>
          </h1>
          <p className="text-xs text-slate-500">
            Manage promotional hero banners, scheduled seasonal campaigns, and homepage carousel
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Slider</span>
        </button>
      </div>

      {/* Sliders List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading home slider banners...</div>
        ) : sliders.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-xs font-bold text-slate-500">No home slider banners configured yet.</p>
            <p className="text-[11px] text-slate-400">Add a banner to feature farm-fresh arrivals, seasonal offers, and store perks on the homepage.</p>
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5 w-16 text-center">Order</th>
                  <th className="p-3.5">Banner Preview</th>
                  <th className="p-3.5">Title &amp; Subtitle</th>
                  <th className="p-3.5">Call to Action</th>
                  <th className="p-3.5">Active Schedule</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sliders.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 text-center font-bold text-slate-600">
                      {s.sort_order ?? 0}
                    </td>

                    <td className="p-3.5">
                      <div className="w-24 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                        <img
                          src={s.image}
                          alt={s.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{s.title}</div>
                      {s.subtitle && (
                        <div className="text-[11px] text-slate-500 line-clamp-1">{s.subtitle}</div>
                      )}
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-slate-800">{s.button_text || 'Shop Now'}</div>
                      <div className="text-[10px] text-emerald-700 font-mono truncate max-w-[150px]">
                        {s.link_url || s.button_url || '/shop'}
                      </div>
                    </td>

                    <td className="p-3.5 text-[11px] text-slate-600">
                      {s.start_date || s.end_date ? (
                        <span>
                          {s.start_date ? new Date(s.start_date).toLocaleDateString() : 'Immediate'} →{' '}
                          {s.end_date ? new Date(s.end_date).toLocaleDateString() : 'Perpetual'}
                        </span>
                      ) : (
                        <span className="text-slate-400">Always active</span>
                      )}
                    </td>

                    <td className="p-3.5 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        s.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {s.status}
                      </span>
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                          title="Edit Banner"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id, s.title)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Delete Banner"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-black text-slate-900">
              {editingSlider ? 'Edit Home Slider Banner' : 'Create New Home Slider Banner'}
            </h3>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-bold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Banner Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Farm Fresh Apples & Seasonal Fruits"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Subtitle / Marketing Tagline</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. Handpicked organic apples delivered at wholesale prices"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Images */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ImageUploader
                  label="Desktop Banner Image (1200x500) *"
                  value={image}
                  onChange={(url) => setImage(url)}
                  presetName="banner-desktop"
                  helpText="Main desktop landscape banner"
                />

                <ImageUploader
                  label="Mobile Banner Image (Optional)"
                  value={mobileImage}
                  onChange={(url) => setMobileImage(url)}
                  presetName="banner-mobile"
                  helpText="Optimized portrait/square banner for smartphones"
                />
              </div>

              {/* Button Action */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Button Text</label>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    placeholder="e.g. Shop Now"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Button Target Link URL</label>
                  <input
                    type="text"
                    value={buttonUrl}
                    onChange={(e) => setButtonUrl(e.target.value)}
                    placeholder="e.g. /shop or /membership"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Schedule Dates & Order */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Start Date (Optional)</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Display Sort Order</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Banner Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold cursor-pointer"
                >
                  <option value="ACTIVE">ACTIVE (Visible on Homepage)</option>
                  <option value="INACTIVE">INACTIVE (Hidden)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-xl cursor-pointer font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
