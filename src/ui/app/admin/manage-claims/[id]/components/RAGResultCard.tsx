"use client";

import { useState } from "react";
import { LoadingShield } from "@/components/LoadingShield";
import { adminClaimsService } from "../../services/admin-claims.service";
import type { ClaimStatus } from "../../types/admin-claims.types";

interface RAGResultCardProps {
  claimId: string;
  ragResult: any;
  status: ClaimStatus;
  onResolved: () => void;
}

export function RAGResultCard({ claimId, ragResult, status, onResolved }: RAGResultCardProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ragResult) return null;

  const isPendingDecision = ragResult.needs_admin_review && ragResult.admin_action === "pending";

  const handleAction = async (action: "payment_approved" | "rejected") => {
    try {
      setSubmitting(true);
      setError(null);
      await adminClaimsService.resolveRAGDecision(claimId, action);
      onResolved();
    } catch (err: any) {
      setError(err.message || "Failed to submit decision.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent p-6 mb-6">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
        <h2 className="text-lg font-medium text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          Policy Coverage Assessment
        </h2>
        {isPendingDecision && (
          <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded-full border border-yellow-500/20 animate-pulse">
            Action Required
          </span>
        )}
      </div>

      <div className="space-y-4 text-sm text-white/70">
        <div className="grid grid-cols-2 gap-4 bg-white/5 rounded-xl p-4">
          <div>
            <span className="block text-xs text-white/40 mb-1">Coverage Status</span>
            <span className={`font-semibold ${ragResult.policy_covered ? 'text-emerald-400' : 'text-red-400'}`}>
              {ragResult.policy_covered ? 'Covered' : 'Not Covered'}
            </span>
          </div>
          <div>
            <span className="block text-xs text-white/40 mb-1">Coverage Type</span>
            <span className="text-white/90">{ragResult.coverage_type || 'N/A'}</span>
          </div>
          <div>
            <span className="block text-xs text-white/40 mb-1">Approved Amount</span>
            <span className="text-xl font-bold text-white">${ragResult.compensation_amount?.toLocaleString()}</span>
          </div>
          <div>
            <span className="block text-xs text-white/40 mb-1">Recommendation</span>
            <span className="text-white/90 capitalize">{ragResult.recommendation.replace(/_/g, ' ')}</span>
          </div>
        </div>

        <div>
          <span className="block text-xs text-white/40 mb-1">Reasoning</span>
          <p className="leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5">
            {ragResult.coverage_reasoning}
          </p>
        </div>

        {ragResult.compensation_breakdown && ragResult.compensation_breakdown.length > 0 && (
          <div>
            <span className="block text-xs text-white/40 mb-2">Compensation Breakdown</span>
            <div className="space-y-2">
              {ragResult.compensation_breakdown.map((item: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-xs bg-black/20 p-2 rounded-lg border border-white/5">
                  <span className="text-white/80">{item.part || item.description}</span>
                  <span className="font-semibold text-emerald-400">${item.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isPendingDecision && (
          <div className="mt-6 pt-4 border-t border-white/10">
            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
            <p className="text-sm font-medium text-white mb-3">Make Payment Decision</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleAction("payment_approved")}
                disabled={submitting}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold py-2.5 rounded-xl transition-colors text-sm disabled:opacity-50"
              >
                {submitting ? "Processing..." : "Approve Payment"}
              </button>
              <button
                onClick={() => handleAction("rejected")}
                disabled={submitting}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-semibold py-2.5 rounded-xl border border-white/10 transition-colors text-sm disabled:opacity-50"
              >
                {submitting ? "Processing..." : "Reject Claim"}
              </button>
            </div>
          </div>
        )}

        {!isPendingDecision && ragResult.admin_action && (
          <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10 text-center">
            <span className="text-xs text-white/40">Admin Decision: </span>
            <span className={`text-sm font-medium ${
              ragResult.admin_action === 'payment_approved' ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {ragResult.admin_action === 'payment_approved' ? 'Payment Approved' : 'Rejected'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
