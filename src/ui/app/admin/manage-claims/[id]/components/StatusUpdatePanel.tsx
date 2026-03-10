"use client";

import { useState, useEffect } from "react";
import { LoadingShield } from "@/components/LoadingShield";
import { ClaimStatusBadge } from "../../components/ClaimStatusBadge";
import { adminClaimsService } from "../../services/admin-claims.service";
import type { ClaimStatus } from "../../types/admin-claims.types";

// ── All allowed transitions (including reversions) ────────────────────────────
// Every non-terminal state can be reverted; approved/rejected can go back to
// under_review so an admin can correct an accidental decision.
const ALLOWED_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  pending:      ["under_review", "rejected"],
  under_review: ["approved", "rejected", "pending"],
  approved:     ["under_review"],   // revert: accidental approval
  rejected:     ["under_review"],   // revert: accidental rejection
};

// Per-status button appearance
const BUTTON_CONFIG: Record<ClaimStatus, {
  label: string;
  isRevert?: boolean;
  activeClass: string;
  idleClass: string;
}> = {
  approved: {
    label: "Approve",
    activeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    idleClass:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40",
  },
  rejected: {
    label: "Reject",
    activeClass: "bg-red-500/20 text-red-300 border-red-500/40",
    idleClass:   "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40",
  },
  under_review: {
    label: "Move to Review",
    activeClass: "bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/40",
    idleClass:   "bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20 hover:bg-[#3B82F6]/20 hover:border-[#3B82F6]/40",
  },
  pending: {
    label: "Revert to Pending",
    isRevert: true,
    activeClass: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
    idleClass:   "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20 hover:border-yellow-500/40",
  },
};

// Feedback banners per resulting status
const FEEDBACK_CONFIG: Record<ClaimStatus, { text: string; cls: string; icon: "check" | "info" | "warn" }> = {
  approved:     { text: "Claim approved successfully.",          cls: "border-emerald-500/20 bg-emerald-500/8 text-emerald-300", icon: "check" },
  rejected:     { text: "Claim rejected.",                       cls: "border-red-500/20 bg-red-500/8 text-red-400",             icon: "warn"  },
  under_review: { text: "Claim moved to Under Review.",         cls: "border-[#3B82F6]/20 bg-[#3B82F6]/8 text-[#3B82F6]",      icon: "info"  },
  pending:      { text: "Claim reverted to Pending.",           cls: "border-yellow-500/20 bg-yellow-500/8 text-yellow-400",    icon: "info"  },
};

function FeedbackIcon({ type }: { type: "check" | "info" | "warn" }) {
  if (type === "check") return (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  if (type === "warn") return (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

interface StatusUpdatePanelProps {
  claimId: string;
  currentStatus: ClaimStatus;
  onUpdated: (newStatus: ClaimStatus) => void;
}

export function StatusUpdatePanel({ claimId, currentStatus, onUpdated }: StatusUpdatePanelProps) {
  // Track which specific button is loading (null = none)
  const [loadingStatus, setLoadingStatus] = useState<ClaimStatus | null>(null);
  const [feedback, setFeedback] = useState<{ status: ClaimStatus; isError: boolean; msg?: string } | null>(null);
  const [verdict, setVerdict] = useState("");

  const transitions = ALLOWED_TRANSITIONS[currentStatus];

  // Auto-dismiss feedback after 5 s
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(t);
  }, [feedback]);

  async function handleUpdate(nextStatus: ClaimStatus) {
    setLoadingStatus(nextStatus);
    setFeedback(null);
    try {
      await adminClaimsService.updateClaimStatus(claimId, {
        status: nextStatus,
        ai_verdict: verdict.trim() || undefined,
      });
      setFeedback({ status: nextStatus, isError: false });
      onUpdated(nextStatus);
      setVerdict("");
    } catch (err) {
      setFeedback({
        status: nextStatus,
        isError: true,
        msg: err instanceof Error ? err.message : "Update failed.",
      });
    } finally {
      setLoadingStatus(null);
    }
  }

  const isAnyLoading = loadingStatus !== null;

  // Revert buttons are visually separated
  const mainTransitions   = transitions.filter((s) => !BUTTON_CONFIG[s].isRevert);
  const revertTransitions = transitions.filter((s) =>  BUTTON_CONFIG[s].isRevert);

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
      {/* Section header */}
      <h2 className="mb-1 text-sm font-semibold text-white/80">Update Status</h2>
      <p className="text-xs text-white/35 mb-5">Changes are saved immediately to the database.</p>

      {/* Current status pill */}
      <div className="flex items-center gap-2.5 mb-5 pb-5 border-b border-white/8">
        <span className="text-xs text-white/40 font-medium">Current</span>
        <ClaimStatusBadge status={currentStatus} size="md" pulse />
      </div>

      {/* Optional admin note */}
      <div className="mb-5">
        <label className="block text-xs font-medium text-white/50 mb-2">
          Admin note <span className="text-white/25 font-normal">(optional — overrides AI verdict)</span>
        </label>
        <textarea
          value={verdict}
          onChange={(e) => setVerdict(e.target.value)}
          rows={3}
          disabled={isAnyLoading}
          placeholder="Add a note or manual verdict override…"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-[#3B82F6]/50 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-colors resize-none disabled:opacity-40"
        />
      </div>

      {/* Primary action buttons */}
      {mainTransitions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {mainTransitions.map((nextStatus) => {
            const cfg = BUTTON_CONFIG[nextStatus];
            const isThis   = loadingStatus === nextStatus;
            const isOther  = isAnyLoading && !isThis;

            return (
              <button
                key={nextStatus}
                onClick={() => handleUpdate(nextStatus)}
                disabled={isAnyLoading}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200
                  ${isThis ? cfg.activeClass : cfg.idleClass}
                  ${isOther ? "opacity-35 cursor-not-allowed" : ""}
                  ${isAnyLoading ? "cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                {isThis ? (
                  <LoadingShield className="h-4 w-4" />
                ) : null}
                {cfg.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Revert buttons — visually separated with a label */}
      {revertTransitions.length > 0 && (
        <div className="pt-3 border-t border-white/5">
          <p className="text-[10px] text-white/20 uppercase tracking-wider font-medium mb-2">Revert decision</p>
          <div className="flex flex-wrap gap-2">
            {revertTransitions.map((nextStatus) => {
              const cfg = BUTTON_CONFIG[nextStatus];
              const isThis  = loadingStatus === nextStatus;
              const isOther = isAnyLoading && !isThis;

              return (
                <button
                  key={nextStatus}
                  onClick={() => handleUpdate(nextStatus)}
                  disabled={isAnyLoading}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-medium transition-all duration-200
                    ${isThis ? cfg.activeClass : cfg.idleClass}
                    ${isOther ? "opacity-35 cursor-not-allowed" : ""}
                    ${isAnyLoading ? "cursor-not-allowed" : "cursor-pointer"}
                  `}
                >
                  {isThis ? <LoadingShield className="h-3.5 w-3.5" /> : (
                    <svg className="h-3.5 w-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  )}
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* No transitions available */}
      {transitions.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-white/30 italic">
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          No further status changes available.
        </div>
      )}

      {/* Feedback banner — auto-dismisses after 5 s */}
      {feedback && !feedback.isError && (
        <div className={`mt-4 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm transition-all ${FEEDBACK_CONFIG[feedback.status].cls}`}>
          <FeedbackIcon type={FEEDBACK_CONFIG[feedback.status].icon} />
          {FEEDBACK_CONFIG[feedback.status].text}
        </div>
      )}
      {feedback?.isError && (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-400">
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {feedback.msg}
        </div>
      )}
    </div>
  );
}