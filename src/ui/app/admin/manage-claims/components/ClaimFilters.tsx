"use client";

import { ALL_STATUSES, STATUS_CONFIG, type ClaimStatus, type ClaimFilterState } from "../types/admin-claims.types";

interface ClaimFiltersProps {
  filters: ClaimFilterState;
  totalCount: number;
  filteredCount: number;
  onChange: (next: ClaimFilterState) => void;
}

export function ClaimFilters({ filters, totalCount, filteredCount, onChange }: ClaimFiltersProps) {
  return (
    <div className="space-y-4">
      
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            placeholder="Search by title, user, or verdict…"
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-[#3B82F6]/50 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-colors"
          />
        </div>

        
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/8 bg-white/[0.02] text-xs text-white/30 shrink-0">
          <span className="font-semibold text-white/60">{filteredCount}</span>
          <span>of {totalCount} claims</span>
        </div>
      </div>

      
      <div className="flex flex-wrap gap-2">
        {ALL_STATUSES.map((s) => {
          const active = filters.status === s;
          const cfg = s !== "all" ? STATUS_CONFIG[s as ClaimStatus] : null;

          return (
            <button
              key={s}
              onClick={() => onChange({ ...filters, status: s })}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all capitalize ${
                active
                  ? s === "all"
                    ? "border-white/30 bg-white/10 text-white"
                    : `${cfg!.bgClass} ${cfg!.ringClass} ${cfg!.colorClass} border-transparent ring-1`
                  : "border-white/8 bg-transparent text-white/35 hover:text-white/60 hover:border-white/15"
              }`}
            >
              {s === "all" ? "All" : cfg!.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}