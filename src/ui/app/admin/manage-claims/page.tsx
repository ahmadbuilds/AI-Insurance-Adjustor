"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import { LoadingShield } from "@/components/LoadingShield";
import { adminClaimsService } from "./services/admin-claims.service";
import { adminService } from "../services/admin.service";
import { ClaimFilters } from "./components/ClaimFilters";
import { ClaimStatusBadge } from "./components/ClaimStatusBadge";
import type { AdminClaim, ClaimFilterState } from "./types/admin-claims.types";
import Link from "next/link";


function ClaimCard({ claim, index }: { claim: AdminClaim; index: number }) {
  const wordCount = claim.description.trim().split(/\s+/).length;
  const submittedAt = new Date(claim.created_at).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  const initial = claim.user?.username.charAt(0).toUpperCase() ?? "?";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: index * 0.045, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/admin/manage-claims/${claim.id}`}
        className="group block rounded-2xl border border-white/8 bg-gradient-to-br from-white/[0.04] to-transparent p-5 hover:border-white/20 hover:from-white/[0.07] transition-all duration-200"
      >
        <div className="flex items-start gap-4">

          {/* User avatar */}
          <div className="shrink-0 mt-0.5">
            {claim.user?.profile_image_url ? (
              <img
                src={claim.user.profile_image_url}
                alt={claim.user.username}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-white/10 group-hover:ring-white/20 transition-all"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6]/40 to-[#8B5CF6]/40 text-sm font-bold text-white ring-2 ring-white/10 group-hover:ring-white/20 transition-all">
                {initial}
              </div>
            )}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <h3 className="text-sm font-semibold text-white group-hover:text-white/90 transition-colors truncate">
                {claim.title}
              </h3>
              <ClaimStatusBadge status={claim.has_technical_failure ? "technical_failure" : claim.status} pulse />
            </div>

            {/* User info row */}
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-xs text-white/50 font-medium">
                {claim.user?.username ?? "Unknown user"}
              </span>
              <span className="text-white/20 text-xs">·</span>
              <span className="text-xs text-white/30">{claim.user?.email}</span>
            </div>

            {/* AI verdict snippet */}
            {claim.ai_verdict ? (
              <p className="text-xs text-white/40 leading-relaxed line-clamp-2">
                <span className="text-white/25 font-medium uppercase tracking-wide text-[10px] mr-1.5">AI:</span>
                {claim.ai_verdict}
              </p>
            ) : (
              <p className="text-xs text-white/20 italic">No AI verdict recorded yet</p>
            )}
          </div>

          {/* Right meta */}
          <div className="shrink-0 flex flex-col items-end gap-2.5 ml-2">
            <span className="text-xs text-white/30 whitespace-nowrap">{submittedAt}</span>
            <span className="text-xs text-white/20 tabular-nums">{wordCount} words</span>
            {/* Arrow */}
            <svg
              className="h-4 w-4 text-white/15 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all duration-200 mt-auto"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function StatCard({
  label, value, color, bg, icon, onClick, active,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
  icon: React.ReactNode;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200 group ${
        active
          ? `${bg} border-transparent ring-1 scale-[1.02]`
          : "border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
      }`}
    >
      <div className={`absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity ${bg}`} />
      <div className="relative flex items-start justify-between gap-2">
        <div>
          <p className={`text-3xl font-bold tabular-nums tracking-tight ${color}`}>{value}</p>
          <p className={`text-xs mt-1 font-medium ${active ? color : "text-white/40"}`}>{label}</p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg} ring-1 ${active ? "ring-white/20" : "ring-white/8"}`}>
          <span className={color}>{icon}</span>
        </div>
      </div>
    </button>
  );
}


export default function ManageClaimsPage() {
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [checking,   setChecking]   = useState(true);
  const [claims,     setClaims]     = useState<AdminClaim[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  const [filters, setFilters] = useState<ClaimFilterState>({ query: "", status: "all" });

  useEffect(() => {
    async function init() {
      const adminId = await adminService.checkIsAdmin();
      if (!adminId) { router.push("/dashboard"); return; }
      setAuthorized(true);
      setChecking(false);
      await loadClaims();
    }
    init();
  }, [router]);

  async function loadClaims() {
    setLoading(true);
    setError(null);
    try {
      const data = await adminClaimsService.fetchAllClaims();
      setClaims(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load claims.");
    } finally {
      setLoading(false);
    }
  }

  const filteredClaims = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return claims.filter((c) => {
      const matchesStatus =
        filters.status === "all"
          ? true
          : filters.status === "technical_failure"
          ? c.has_technical_failure
          : c.status === filters.status && !c.has_technical_failure;

      const matchesQuery =
        !q ||
        c.title.toLowerCase().includes(q) ||
        (c.user?.username.toLowerCase().includes(q) ?? false) ||
        (c.user?.email.toLowerCase().includes(q) ?? false) ||
        (c.ai_verdict?.toLowerCase().includes(q) ?? false);
      return matchesStatus && matchesQuery;
    });
  }, [claims, filters]);

  if (checking || !authorized) {
    return (
      <div className="relative min-h-screen bg-[#030712]">
        <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <Navbar />
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <LoadingShield className="h-12 w-12" />
        </div>
      </div>
    );
  }

  const counts = {
    all:               claims.length,
    technical_failure: claims.filter((c) => c.has_technical_failure).length,
    approved:          claims.filter((c) => c.status === "approved" && !c.has_technical_failure).length,
    under_review:      claims.filter((c) => c.status === "under_review" && !c.has_technical_failure).length,
    pending:           claims.filter((c) => c.status === "pending" && !c.has_technical_failure).length,
    rejected:          claims.filter((c) => c.status === "rejected" && !c.has_technical_failure).length,
  };

  const statCards = [
    {
      label: "Approved",
      value: counts.approved,
      status: "approved" as const,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Under Review",
      value: counts.under_review,
      status: "under_review" as const,
      color: "text-[#3B82F6]",
      bg: "bg-[#3B82F6]/10",
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    {
      label: "Pending",
      value: counts.pending,
      status: "pending" as const,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Rejected",
      value: counts.rejected,
      status: "rejected" as const,
      color: "text-red-400",
      bg: "bg-red-500/10",
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Tech Failure",
      value: counts.technical_failure,
      status: "technical_failure" as const,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="relative min-h-screen bg-[#030712] overflow-hidden">
      <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:60px_60px]" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#3B82F6]/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-[#8B5CF6]/8 blur-3xl" />
      </div>

      <Navbar />

      <main className="relative mx-auto max-w-5xl px-6 py-12">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-white/50 mb-5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse" />
            Admin · Claims Management
          </div>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-semibold text-white tracking-tight">Manage Claims</h1>
              <p className="mt-2 text-sm text-white/40 leading-relaxed max-w-xl">
                Review submitted claims, inspect AI verdicts, update statuses, and take action.
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/8 bg-white/[0.03] text-xs text-white/40">
              <svg className="h-3.5 w-3.5 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-semibold text-white/60">{counts.all}</span> total claims
            </div>
          </div>
        </motion.div>

        {/* Stat cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8"
        >
          {statCards.map((s) => (
            <StatCard
              key={s.status}
              label={s.label}
              value={s.value}
              color={s.color}
              bg={s.bg}
              icon={s.icon}
              active={filters.status === s.status}
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  status: f.status === s.status ? "all" : s.status,
                }))
              }
            />
          ))}
        </motion.div>

        {/* Search + filter row */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.14 }}
          className="mb-5"
        >
          <ClaimFilters
            filters={filters}
            totalCount={claims.length}
            filteredCount={filteredClaims.length}
            onChange={setFilters}
          />
        </motion.div>

        {/* Claims list */}
        <div>
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-24 text-sm text-white/40">
              <LoadingShield className="h-6 w-6" />
              Loading claims…
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/8 p-5 text-sm text-red-400">
              <svg className="h-4 w-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          ) : filteredClaims.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-5 py-24 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/8 bg-white/[0.02]">
                <svg className="h-7 w-7 text-white/15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-base font-medium text-white/50">No claims found</p>
                <p className="text-sm text-white/25 mt-1">
                  {filters.query || filters.status !== "all"
                    ? "Try clearing your search or selecting a different status."
                    : "No claims have been submitted yet."}
                </p>
              </div>
              {(filters.query || filters.status !== "all") && (
                <button
                  onClick={() => setFilters({ query: "", status: "all" })}
                  className="text-xs text-[#3B82F6] hover:text-[#3B82F6]/70 transition-colors"
                >
                  Clear filters
                </button>
              )}
            </motion.div>
          ) : (
            <div className="space-y-2.5">
              <AnimatePresence mode="popLayout">
                {filteredClaims.map((claim, i) => (
                  <ClaimCard key={claim.id} claim={claim} index={i} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030712] to-transparent" />
    </div>
  );
}