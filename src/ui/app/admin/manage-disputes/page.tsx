"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { LoadingShield } from "@/components/LoadingShield";
import { adminDisputesService } from "./services/admin-disputes.service";
import { adminService } from "../services/admin.service";
import { DisputeStatusBadge } from "./components/DisputeStatusBadge";
import type { AdminDispute, DisputeFilterState } from "./types/admin-disputes.types";
import {
  ALL_DISPUTE_STATUSES,
  DISPUTE_STATUS_CONFIG,
  type DisputeStatus,
} from "./types/admin-disputes.types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Dispute Card ─────────────────────────────────────────────────────────────
function DisputeCard({
  dispute,
  index,
}: {
  dispute: AdminDispute;
  index: number;
}) {
  const initial = dispute.user?.username.charAt(0).toUpperCase() ?? "?";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.38,
        delay: index * 0.045,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <Link
        href={`/admin/manage-disputes/${dispute.id}`}
        className="group block rounded-2xl border border-white/8 bg-gradient-to-br from-white/[0.04] to-transparent p-5 hover:border-white/20 hover:from-white/[0.07] transition-all duration-200"
      >
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="shrink-0 mt-0.5">
            {dispute.user?.profile_image_url ? (
              <img
                src={dispute.user.profile_image_url}
                alt={dispute.user.username}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-white/10 group-hover:ring-white/20 transition-all"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-500/40 to-[#8B5CF6]/40 text-sm font-bold text-white ring-2 ring-white/10 group-hover:ring-white/20 transition-all">
                {initial}
              </div>
            )}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Title + status */}
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <h3 className="text-sm font-semibold text-white group-hover:text-white/90 transition-colors truncate">
                {dispute.claim?.title ?? "Unknown Claim"}
              </h3>
              <DisputeStatusBadge status={dispute.status} pulse />
            </div>

            {/* User info */}
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-xs text-white/50 font-medium">
                {dispute.user?.username ?? "Unknown user"}
              </span>
              <span className="text-white/20 text-xs">·</span>
              <span className="text-xs text-white/30">{dispute.user?.email}</span>
            </div>

            {/* Dispute reason snippet */}
            {dispute.description ? (
              <p className="text-xs text-white/40 leading-relaxed line-clamp-2">
                <span className="text-white/25 font-medium uppercase tracking-wide text-[10px] mr-1.5">
                  Reason:
                </span>
                {dispute.description}
              </p>
            ) : (
              <p className="text-xs text-white/20 italic">
                No dispute reason provided
              </p>
            )}
          </div>

          {/* Right meta */}
          <div className="shrink-0 flex flex-col items-end gap-2.5 ml-2">
            <span className="text-xs text-white/30 whitespace-nowrap">
              {formatDate(dispute.created_at)}
            </span>
            <div className="flex flex-col items-end gap-1">
              {dispute.evidence && (
                <span className="text-[10px] text-white/25 bg-white/5 rounded-full px-2 py-0.5 border border-white/8">
                  Has evidence
                </span>
              )}
              {dispute.photo_url && (
                <span className="text-[10px] text-white/25 bg-white/5 rounded-full px-2 py-0.5 border border-white/8">
                  Has photo
                </span>
              )}
            </div>
            <svg
              className="h-4 w-4 text-white/15 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all duration-200 mt-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  color,
  bg,
  icon,
  onClick,
  active,
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
      className={`relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200 group w-full ${
        active
          ? `${bg} border-transparent ring-1 scale-[1.02]`
          : "border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
      }`}
    >
      <div
        className={`absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity ${bg}`}
      />
      <div className="relative flex items-start justify-between gap-2">
        <div>
          <p
            className={`text-3xl font-bold tabular-nums tracking-tight ${color}`}
          >
            {value}
          </p>
          <p
            className={`text-xs mt-1 font-medium ${
              active ? color : "text-white/40"
            }`}
          >
            {label}
          </p>
        </div>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg} ring-1 ${
            active ? "ring-white/20" : "ring-white/8"
          }`}
        >
          <span className={color}>{icon}</span>
        </div>
      </div>
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ManageDisputesPage() {
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DisputeFilterState>({
    query: "",
    status: "all",
  });

  useEffect(() => {
    async function init() {
      const adminId = await adminService.checkIsAdmin();
      if (!adminId) {
        router.push("/dashboard");
        return;
      }
      setAuthorized(true);
      setChecking(false);
      setLoading(true);
      try {
        const data = await adminDisputesService.fetchAllDisputes();
        setDisputes(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load disputes."
        );
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  const filteredDisputes = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return disputes.filter((d) => {
      const matchesStatus =
        filters.status === "all" || d.status === filters.status;
      const matchesQuery =
        !q ||
        (d.claim?.title.toLowerCase().includes(q) ?? false) ||
        (d.user?.username.toLowerCase().includes(q) ?? false) ||
        (d.user?.email.toLowerCase().includes(q) ?? false) ||
        (d.description?.toLowerCase().includes(q) ?? false);
      return matchesStatus && matchesQuery;
    });
  }, [disputes, filters]);

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
    all: disputes.length,
    pending: disputes.filter((d) => d.status === "pending").length,
    approved: disputes.filter((d) => d.status === "approved").length,
    rejected: disputes.filter((d) => d.status === "rejected").length,
  };

  const statCards = [
    {
      label: "Pending Review",
      value: counts.pending,
      status: "pending" as const,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: "Approved",
      value: counts.approved,
      status: "approved" as const,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
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
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="relative min-h-screen bg-[#030712] overflow-hidden">
      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:60px_60px]" />
      {/* Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-red-500/8 blur-3xl" />
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
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            Admin · Dispute Management
          </div>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-semibold text-white tracking-tight">
                Manage Disputes
              </h1>
              <p className="mt-2 text-sm text-white/40 leading-relaxed max-w-xl">
                Review disputes filed by users against rejected claims. Approve
                to reinstate the claim or reject to finalise the decision.
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/8 bg-white/[0.03] text-xs text-white/40">
              <svg
                className="h-3.5 w-3.5 text-white/25"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
              <span className="font-semibold text-white/60">{counts.all}</span>{" "}
              total disputes
            </div>
          </div>
        </motion.div>

        {/* Stat cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-3 gap-3 mb-8"
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

        {/* Search + filter */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.14 }}
          className="mb-5 space-y-4"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={filters.query}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, query: e.target.value }))
                }
                placeholder="Search by claim title, user, or dispute reason…"
                className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-red-500/40 focus:outline-none focus:ring-2 focus:ring-red-500/15 transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/8 bg-white/[0.02] text-xs text-white/30 shrink-0">
              <span className="font-semibold text-white/60">
                {filteredDisputes.length}
              </span>
              <span>of {counts.all} disputes</span>
            </div>
          </div>

          {/* Status filters */}
          <div className="flex flex-wrap gap-2">
            {ALL_DISPUTE_STATUSES.map((s) => {
              const active = filters.status === s;
              const cfg =
                s !== "all"
                  ? DISPUTE_STATUS_CONFIG[s as DisputeStatus]
                  : null;
              return (
                <button
                  key={s}
                  onClick={() => setFilters((f) => ({ ...f, status: s }))}
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
        </motion.div>

        {/* Dispute list */}
        <div>
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-24 text-sm text-white/40">
              <LoadingShield className="h-6 w-6" />
              Loading disputes…
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/8 p-5 text-sm text-red-400">
              <svg
                className="h-4 w-4 mt-0.5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {error}
            </div>
          ) : filteredDisputes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-5 py-24 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/8 bg-white/[0.02]">
                <svg
                  className="h-7 w-7 text-white/15"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                  />
                </svg>
              </div>
              <div>
                <p className="text-base font-medium text-white/50">
                  No disputes found
                </p>
                <p className="text-sm text-white/25 mt-1">
                  {filters.query || filters.status !== "all"
                    ? "Try clearing your search or selecting a different status."
                    : "No disputes have been filed yet."}
                </p>
              </div>
              {(filters.query || filters.status !== "all") && (
                <button
                  onClick={() => setFilters({ query: "", status: "all" })}
                  className="text-xs text-red-400 hover:text-red-400/70 transition-colors"
                >
                  Clear filters
                </button>
              )}
            </motion.div>
          ) : (
            <div className="space-y-2.5">
              <AnimatePresence mode="popLayout">
                {filteredDisputes.map((d, i) => (
                  <DisputeCard key={d.id} dispute={d} index={i} />
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
