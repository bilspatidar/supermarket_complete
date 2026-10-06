import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

/**
 * Common Lightbox Image Viewer Modal
 */
export default function ImageViewer({ src, title = 'Image Preview', isOpen, onClose }) {
  if (!isOpen || !src) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in cursor-zoom-out"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-3xl p-3 shadow-2xl border border-slate-800 flex flex-col cursor-default"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-3 py-2 text-white border-b border-slate-800 text-xs">
          <span className="font-bold text-slate-200 truncate max-w-md">{title}</span>
          <div className="flex items-center gap-2">
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Open full image in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image body */}
        <div className="p-2 flex items-center justify-center overflow-auto max-h-[80vh]">
          <img
            src={src}
            alt={title}
            className="max-h-[75vh] w-auto max-w-full rounded-2xl object-contain shadow-lg"
          />
        </div>
      </div>
    </div>
  );
}
