"use client";

import { useState, useEffect } from "react";
import { adminClaimsService } from "../../services/admin-claims.service";
import type { ClaimImage } from "../../types/admin-claims.types";

interface ClaimImagesGridProps {
  images: ClaimImage[];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function ImageCard({ image }: { image: ClaimImage }) {
  const [url, setUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (image.mime_type?.startsWith("image/")) {
      setUrl(adminClaimsService.getImagePublicUrl(image.storage_path));
    }
  }, [image]);

  return (
    <>
      <button
        onClick={() => url && setOpen(true)}
        className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] hover:border-white/20 transition-all duration-200"
      >
        
        <div className="relative aspect-video w-full overflow-hidden bg-white/[0.03]">
          {url ? (
            <img
              src={url}
              alt={image.file_name}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <svg className="h-8 w-8 text-white/15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          )}
          
          {url && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </div>
          )}
        </div>

        
        <div className="p-3">
          <p className="text-xs font-medium text-white/70 truncate">{image.file_name}</p>
          <p className="text-xs text-white/30 mt-0.5">{formatBytes(image.file_size)}</p>
        </div>
      </button>

      
      {open && url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={url}
              alt={image.file_name}
              className="w-full h-full object-contain rounded-xl"
            />
            <button
              onClick={() => setOpen(false)}
              className="absolute -top-4 -right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function ClaimImagesGrid({ images }: ClaimImagesGridProps) {
  if (images.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">Evidence Images</h2>
        <p className="text-sm text-white/30 italic">No images attached to this claim.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
          Evidence Images
        </h2>
        <span className="text-xs text-white/30">{images.length} file{images.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((img) => (
          <ImageCard key={img.id} image={img} />
        ))}
      </div>
    </div>
  );
}