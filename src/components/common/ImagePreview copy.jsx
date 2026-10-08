import React, { useState } from 'react';
import { Image as ImageIcon, ZoomIn } from 'lucide-react';

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

  if (!src || error) {
    return (
      <div className={`bg-slate-100 flex flex-col items-center justify-center text-slate-400 p-2 text-center rounded-xl border border-slate-200/60 ${className}`}>
        <ImageIcon className="w-6 h-6 stroke-[1.5] text-slate-300 mb-1" />
        <span className="text-[10px] font-semibold text-slate-400 truncate max-w-full">
          {fallbackText}
        </span>
      </div>
    );
  }

  return (
    <div className="relative group overflow-hidden rounded-xl">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setError(true)}
        onLoad={() => setLoaded(true)}
        className={`${className} transition-transform duration-300 group-hover:scale-105 ${!loaded ? 'opacity-0' : 'opacity-100'}`}
      />
      {!loaded && !error && (
        <div className="absolute inset-0 bg-slate-100 animate-pulse rounded-xl" />
      )}
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
  );
}
