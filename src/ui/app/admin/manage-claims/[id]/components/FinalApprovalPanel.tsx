"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Loader2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ClaimStatus } from "../../types/admin-claims.types";

export function FinalApprovalPanel({
  claimId,
  onUpdated,
}: {
  claimId: string;
  onUpdated: (status: ClaimStatus) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/claims/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to accept claim and send invoice.");
      }

      onUpdated("closed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("claims")
        .update({ status: "rejected", ai_verdict: "Claim rejected manually by admin after AI approval." })
        .eq("id", claimId);

      if (error) throw new Error(error.message);

      onUpdated("rejected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.08] to-emerald-500/[0.02] p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
          <CheckCircle className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-emerald-300">Final Admin Decision</h3>
          <p className="text-xs text-emerald-400/60 mt-0.5 leading-relaxed">
            This claim has been automatically approved by the AI. Review the results and perform the final confirmation. Accepting will close the claim and send the compensation invoice email to the user.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 pt-2">
        <button
          onClick={handleReject}
          disabled={submitting}
          className="flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
          Reject Claim
        </button>
        
        <button
          onClick={handleAccept}
          disabled={submitting}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Accept & Send Invoice
        </button>
      </div>
    </div>
  );
}
