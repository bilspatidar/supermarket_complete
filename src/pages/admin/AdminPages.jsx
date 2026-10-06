import React, { useEffect, useState } from 'react';
import { FileText, Plus, Edit2, Trash2, Globe, Eye, CheckCircle, ExternalLink } from 'lucide-react';
import client from '../../api/client.js';
import ImageUploader from '../../components/common/ImageUploader.jsx';

export default function AdminPages() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPages();
  }, []);

  async function loadPages() {
    setLoading(true);
    try {
      const res = await client.get('/cms/pages/admin');
      if (res.success && res.data) {
        setPages(res.data);
      }
    } catch (err) {
      console.warn('Failed to load pages:', err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreate() {
    setEditingPage(null);
    setTitle('');
    setSlug('');
    setDescription('');
    setContent('');
    setImage('');
    setMetaTitle('');
    setMetaDescription('');
    setStatus('ACTIVE');
    setError('');
    setIsModalOpen(true);
  }

  function handleOpenEdit(p) {
    setEditingPage(p);
    setTitle(p.title || '');
    setSlug(p.slug || '');
    setDescription(p.description || '');
    setContent(p.content || '');
    setImage(p.image || '');
    setMetaTitle(p.meta_title || '');
    setMetaDescription(p.meta_description || '');
    setStatus(p.status || 'ACTIVE');
    setError('');
    setIsModalOpen(true);
  }

  function handleTitleChange(val) {
    setTitle(val);
    if (!editingPage) {
      // Auto-generate slug from title
      const autoSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(autoSlug);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      setError('Title and Page Slug are required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim().toLowerCase(),
        description: description ? description.trim() : null,
        content: content ? content.trim() : '',
        image: image || null,
        meta_title: metaTitle ? metaTitle.trim() : null,
        meta_description: metaDescription ? metaDescription.trim() : null,
        status,
      };

      if (editingPage) {
        await client.put(`/cms/pages/${editingPage.id}`, payload);
      } else {
        await client.post('/cms/pages', payload);
      }

      setIsModalOpen(false);
      loadPages();
    } catch (err) {
      setError(err.message || 'Failed to save CMS page');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id, pTitle, pSlug) {
    if (['contact', 'about', 'terms', 'privacy-policy'].includes(pSlug)) {
      if (!window.confirm(`"${pTitle}" is a core store page. Are you sure you want to delete it?`)) return;
    } else {
      if (!window.confirm(`Are you sure you want to delete page "${pTitle}"?`)) return;
    }

    try {
      await client.delete(`/cms/pages/${id}`);
      loadPages();
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
            <FileText className="w-5 h-5 text-emerald-600" />
            <span>Dynamic CMS Pages</span>
          </h1>
          <p className="text-xs text-slate-500">
            Create and edit legal policies, about us, refund guidelines, terms, and custom store pages
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Page</span>
        </button>
      </div>

      {/* Pages List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading CMS pages...</div>
        ) : pages.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-xs font-bold text-slate-500">No CMS pages found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5">Page Title</th>
                  <th className="p-3.5">Slug URL</th>
                  <th className="p-3.5">Description</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pages.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{p.title}</div>
                      {p.meta_title && (
                        <div className="text-[10px] text-slate-400">SEO: {p.meta_title}</div>
                      )}
                    </td>

                    <td className="p-3.5 font-mono font-bold text-emerald-700">
                      /{p.slug}
                    </td>

                    <td className="p-3.5 text-slate-500 max-w-xs truncate">
                      {p.description || p.meta_description || '—'}
                    </td>

                    <td className="p-3.5 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        p.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {p.status}
                      </span>
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                          title="Edit Page"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id, p.title, p.slug)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Delete Page"
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
              {editingPage ? `Edit CMS Page: ${editingPage.title}` : 'Create New CMS Page'}
            </h3>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-bold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Page Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. Terms & Conditions"
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Slug URL (e.g. /terms) *</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g. terms"
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-emerald-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Brief Summary / Subtitle</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Official terms of supermarket service and consumer policies"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Page Content *</label>
                <textarea
                  rows={8}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter full page content here..."
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-sans leading-relaxed text-slate-800"
                />
              </div>

              <ImageUploader
                label="Header / Feature Image (Optional)"
                value={image}
                onChange={(url) => setImage(url)}
                presetName="page-header"
                helpText="Optional banner image displayed at top of page"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Meta Title (SEO)</label>
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="e.g. FreshMart Terms & Conditions"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Page Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE (Published)</option>
                    <option value="INACTIVE">INACTIVE (Draft / Hidden)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Meta Description (SEO)</label>
                <textarea
                  rows={2}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Brief summary for search engines"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
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
                  {saving ? 'Saving...' : 'Save Page'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
