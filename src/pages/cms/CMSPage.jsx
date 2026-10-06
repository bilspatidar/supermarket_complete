import React, { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Clock } from 'lucide-react';
import client from '../../api/client.js';

export default function CMSPage({ slug, onNavigate }) {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPage();
  }, [slug]);

  async function loadPage() {
    setLoading(true);
    try {
      const res = await client.get(`/cms/pages/${slug}`);
      if (res.success && res.data) {
        setPage(res.data);
      }
    } catch (err) {
      console.warn('Failed to load CMS page:', err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="py-24 text-center text-slate-400 text-xs">Loading page content...</div>;
  }

  if (!page) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-3">
        <h2 className="text-xl font-bold text-slate-900">Page Not Found</h2>
        <button
          onClick={() => onNavigate('home')}
          className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
        >
          Return to Storefront
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <button
        onClick={() => onNavigate('home')}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Storefront</span>
      </button>

      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4 space-y-2">
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {page.title}
          </h1>
          {page.description && (
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              {page.description}
            </p>
          )}
          <div className="text-[11px] text-slate-400 pt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Updated: {new Date(page.updated_at || page.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line space-y-4">
          {page.content}
        </div>
      </div>
    </div>
  );
}
