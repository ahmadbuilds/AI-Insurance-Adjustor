import { ImageFile } from "../utils/claim-helpers";

export function ImageRow({ img, onRemove }: { img: ImageFile; onRemove: () => void }) {
  const sizeMB = (img.file.size / 1024 / 1024).toFixed(1);

  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5 border border-white/8 group">
      {/* Small thumbnail */}
      <div className="relative h-9 w-9 shrink-0 rounded-md overflow-hidden bg-[#3B82F6]/20 ring-1 ring-[#3B82F6]/30">
        <img src={img.url} alt={img.file.name} className="h-full w-full object-cover" />
      </div>

      {/* Name + size + progress bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-white/70 truncate pr-2">{img.file.name}</p>
          <span className="text-[10px] text-white/35 shrink-0">{sizeMB} MB</span>
        </div>
        {/* Static "uploaded" bar */}
        <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full w-full rounded-full bg-linear-to-r from-[#3B82F6] to-[#8B5CF6]" />
        </div>
      </div>

      {/* Check + remove */}
      <div className="flex items-center gap-1.5 shrink-0">
        <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <button
          onClick={onRemove}
          title="Remove image"
          className="flex h-5 w-5 items-center justify-center rounded text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
