import React, { useState, useRef } from 'react';
import { Upload, X, Eye, CheckCircle, AlertCircle, RefreshCw, Link as LinkIcon } from 'lucide-react';
import client from '../../api/client.js';
import ImagePreview from './ImagePreview.jsx';
import ImageViewer from './ImageViewer.jsx';

/**
 * Single Central Image Uploader Component
 * Used for Products, Categories, Brands, Sliders, CMS Pages, Store Logo, Offers
 * Supports custom naming like SP000123.webp and SP000123_2.webp
 */
export default function ImageUploader({
  label = 'Upload Image',
  value = '',
  onChange,
  productCode = '',
  suffix = '', // e.g. '_2' for secondary image
  helpText = 'Supports WebP, JPG, PNG up to 5MB',
  className = '',
  presetName = '',
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [directUrl, setDirectUrl] = useState('');
  const fileInputRef = useRef(null);

  // Compute targeted filename if product code is provided (e.g. SP000123.webp)
  const targetCustomFilename = productCode ? `${productCode}${suffix}` : (presetName || null);

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);
      if (targetCustomFilename) {
        formData.append('customFilename', targetCustomFilename);
      }

      const res = await client.upload('/upload', formData);
      if (res.success && res.url) {
        onChange(res.url);
      } else {
        throw new Error(res.message || 'Upload failed');
      }
    } catch (err) {
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function handleDirectUrlSubmit(e) {
    e.preventDefault();
    if (directUrl.trim()) {
      onChange(directUrl.trim());
      setDirectUrl('');
      setShowUrlInput(false);
    }
  }

  return (
    <div className={`space-y-2 text-xs ${className}`}>
      <div className="flex items-center justify-between">
        <label className="font-bold text-slate-700 block">{label}</label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
        >
          <LinkIcon className="w-3 h-3" />
          <span>{showUrlInput ? 'Upload File' : 'Paste URL'}</span>
        </button>
      </div>

      {/* Direct URL Input Toggle */}
      {showUrlInput && (
        <form onSubmit={handleDirectUrlSubmit} className="flex gap-2">
          <input
            type="url"
            value={directUrl}
            onChange={(e) => setDirectUrl(e.target.value)}
            placeholder="https://example.com/image.webp"
            className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 text-xs"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-emerald-600 text-white font-bold rounded-xl cursor-pointer hover:bg-emerald-700"
          >
            Apply
          </button>
        </form>
      )}

      {/* Main Upload / Preview Box */}
      <div className="border-2 border-dashed border-slate-200 hover:border-emerald-400 transition-colors rounded-2xl p-3 bg-slate-50/50">
        {value ? (
          <div className="flex items-center gap-3">
            {/* Thumbnail Preview */}
            <div className="w-16 h-16 shrink-0 relative rounded-xl overflow-hidden border border-slate-200 bg-white">
              <ImagePreview
                src={value}
                alt={label}
                className="w-full h-full object-cover"
                fallbackText="Preview"
              />
            </div>

            {/* Info & Actions */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="text-[11px] font-mono text-slate-600 truncate" title={value}>
                {value}
              </div>
              {targetCustomFilename && (
                <div className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded inline-block">
                  Mapped Code: {targetCustomFilename}.webp
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setViewerOpen(true)}
                  className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3 h-3" />
                  <span>View</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${uploading ? 'animate-spin' : ''}`} />
                  <span>Replace</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center py-4 cursor-pointer text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Upload className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-slate-800">
              {uploading ? 'Uploading image...' : 'Click or Drag to Upload'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {targetCustomFilename ? `Target file: ${targetCustomFilename}.webp` : helpText}
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 font-medium flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Lightbox Viewer */}
      <ImageViewer
        src={value}
        title={label}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}
