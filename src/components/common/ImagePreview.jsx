import React, { useState } from 'react';
import { Image as ImageIcon, ZoomIn, X } from 'lucide-react';

/**
 * Common ImagePreview Component
 * Used for all images across catalog, admin, and store
 */
export default function ImagePreview({
  src,
  alt = 'Image',
  className = 'w-full h-full object-cover',
  fallbackText = 'No Image',
  showZoom = false,
  onZoom,
}) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  if (!src || error) {
    return (
      <div
        className={`bg-slate-100 flex flex-col items-center justify-center text-slate-400 p-2 text-center rounded-xl border border-slate-200/60 ${className}`}
      >
        <ImageIcon className="w-6 h-6 stroke-[1.5] text-slate-300 mb-1" />

        <span className="text-[10px] font-semibold text-slate-400 truncate max-w-full">
          {fallbackText}
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Thumbnail */}
      <div
        className="relative group overflow-hidden rounded-xl w-full h-full cursor-pointer"
        onClick={() => setIsPreviewOpen(true)}
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setError(true)}
          onLoad={() => setLoaded(true)}
          className={`${className} transition-transform duration-300 group-hover:scale-105 ${
            !loaded ? 'opacity-0' : 'opacity-100'
          }`}
        />

        {!loaded && !error && (
          <div className="absolute inset-0 bg-slate-100 animate-pulse rounded-xl" />
        )}

        {/* Zoom icon */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
          <div className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <ZoomIn className="w-4 h-4" />
          </div>
        </div>

        {/* Existing optional zoom button */}
        {showZoom && onZoom && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onZoom(src);
            }}
            className="absolute bottom-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
            title="Zoom image"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Full Image Preview */}
      {isPreviewOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setIsPreviewOpen(false)}
        >
          {/* Close */}
          <button
            type="button"
            onClick={() => setIsPreviewOpen(false)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-lg transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Full Image */}
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-w-[95vw] max-h-[90vh] w-auto h-auto object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </>
  );
}