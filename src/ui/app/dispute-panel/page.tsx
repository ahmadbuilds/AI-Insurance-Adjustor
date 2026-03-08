"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitBranch,
  CheckCircle,
  Upload,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";

const DISPUTE_STEPS = ["Rejected", "Dispute Filed", "Under Review"] as const;
const STEP_COLORS = {
  Rejected: "text-red-400 bg-red-500/10 border-red-500/20",
  "Dispute Filed": "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  "Under Review": "text-blue-400 bg-blue-500/10 border-blue-500/20",
} as const;

const ATTACHMENT_TYPES = [
  { id: "evidence", label: "New Evidence", icon: Upload },
  { id: "brief", label: "Legal Brief", icon: FileText },
  { id: "photos", label: "Photos", icon: ImageIcon },
] as const;

type RejectedClaim = {
  id: string;
  title: string;
  status: string;
  created_at: string;
};

export default function DisputePanelPage() {
  const [stepIndex, setStepIndex] = useState(0); // Start at "Rejected"
  const [disputeReason, setDisputeReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [attachments, setAttachments] = useState<Record<string, File | null>>({
    evidence: null,
    brief: null,
    photos: null,
  });

  const [claims, setClaims] = useState<RejectedClaim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [claimsError, setClaimsError] = useState<string | null>(null);
  const [selectedClaimId, setSelectedClaimId] = useState<string>("");
  const [disputeExists, setDisputeExists] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentStep = DISPUTE_STEPS[stepIndex];
  const stepStyle = STEP_COLORS[currentStep];

  useEffect(() => {
    const fetchRejectedClaims = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("claims")
          .select("id, title, status, created_at")
          .eq("status", "rejected")
          .order("created_at", { ascending: false });

        if (error) {
          setClaimsError(error.message);
          setClaims([]);
          return;
        }

        setClaims(data ?? []);
        setClaimsError(null);
      } catch (err) {
        setClaimsError(
          err instanceof Error ? err.message : "Failed to load claims"
        );
        setClaims([]);
      } finally {
        setClaimsLoading(false);
      }
    };

    fetchRejectedClaims();
  }, []);

  useEffect(() => {
    const checkDispute = async () => {
      if (!selectedClaimId) {
        setDisputeExists(false);
        return;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setDisputeExists(false);
        return;
      }

      const { data, error } = await supabase
        .from("disputes")
        .select("id")
        .eq("claim_id", selectedClaimId)
        .eq("user_id", user.id)
        .limit(1);

      if (error) {
        console.error("Error checking dispute:", error);
        setDisputeExists(false);
        return;
      }

      setDisputeExists(!!data && data.length > 0);
    };

    checkDispute();
  }, [selectedClaimId]);

  useEffect(() => {
    if (selectedClaimId && !disputeExists && stepIndex === 0) {
      setStepIndex(1); // Move to "Dispute Filed" once a claim is selected and no dispute exists
    } else if ((!selectedClaimId || disputeExists) && stepIndex !== 2) {
      setStepIndex(0); // Reset to "Rejected" if no claim or dispute exists
    }
  }, [selectedClaimId, disputeExists, stepIndex]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedClaimId) {
      setSubmitError("Please select a rejected claim to dispute.");
      return;
    }

    if (disputeExists) {
      setSubmitError("A dispute has already been filed for this claim.");
      return;
    }

    if (!disputeReason.trim()) {
      setSubmitError("Please provide a reason for your dispute.");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("claim_id", selectedClaimId);
      formData.append("description", disputeReason);

      if (attachments.evidence) {
        formData.append("evidence", attachments.evidence);
      }
      if (attachments.brief) {
        formData.append("brief", attachments.brief);
      }
      if (attachments.photos) {
        formData.append("photos", attachments.photos);
      }

      const response = await fetch("/api/disputes", {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setSubmitError(
          (result && result.error) ||
            "Failed to submit dispute. Please try again."
        );
        return;
      }

      setSubmitted(true);
      setStepIndex(2); // Move to "Under Review"
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to submit dispute."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStepIndex(0);
    setDisputeReason("");
    setSubmitted(false);
    setSelectedClaimId("");
    setSubmitError(null);
    setAttachments({
      evidence: null,
      brief: null,
      photos: null,
    });
  };

  const handleAttachment = (id: string, file: File | null) => {
    setAttachments((prev) => ({ ...prev, [id]: file }));
  };

  return (
    <div className="relative min-h-screen bg-[#030712] overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-size-[60px_60px]" />

      {/* Radial glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#3B82F6]/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-[#8B5CF6]/8 blur-3xl" />
      </div>

      <Navbar />

      <main className="relative mx-auto max-w-5xl px-6 py-12 lg:py-16">
        {/* Header */}
        <div className="mb-10 lg:mb-12">
          <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight leading-tight">
            Challenge rejection with new evidence
          </h1>
          <p className="mt-4 text-white/40 text-base leading-relaxed max-w-2xl">
            File a dispute for a rejected claim. Add your reason and supporting documents — disputed claims are routed directly to human adjuster review.
          </p>
        </div>

        {/* Main panel */}
        <div className="relative w-full rounded-2xl border border-white/10 bg-linear-to-br from-white/6 to-white/2 overflow-hidden p-8 sm:p-10 lg:p-12 flex flex-col gap-8">
          {/* Claim info + status */}
          <div className="bg-white/5 rounded-xl p-5 sm:p-6 border border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
              <div className="flex-1">
                <div className="text-xs text-white/40 mb-1">
                  Select a rejected claim
                </div>
                <select
                  value={selectedClaimId}
                  onChange={(e) => setSelectedClaimId(e.target.value)}
                  disabled={claimsLoading}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#3B82F6]/50 focus:ring-1 focus:ring-[#3B82F6]/20 transition-colors"
                >
                  <option value="">
                    {claimsLoading
                      ? "Loading rejected claims..."
                      : claims.length === 0
                      ? "No rejected claims available"
                      : "Choose a claim to dispute"}
                  </option>
                  {claims.map((claim) => (
                    <option key={claim.id} value={claim.id}>
                      {claim.title} ({claim.id.slice(0, 8)}…)
                    </option>
                  ))}
                </select>
                {claimsError && (
                  <p className="mt-1 text-xs text-red-400">{claimsError}</p>
                )}
                {selectedClaimId && disputeExists && (
                  <p className="mt-1 text-xs text-yellow-400">A dispute has already been filed for this claim.</p>
                )}
              </div>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-base font-medium ${stepStyle}`}
              >
                {currentStep}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dispute form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="dispute-reason" className="sr-only">
                  Dispute reason
                </label>
                <textarea
                  id="dispute-reason"
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Add dispute reason..."
                  rows={5}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-base text-white placeholder:text-white/30 focus:outline-none focus:border-[#3B82F6]/50 focus:ring-1 focus:ring-[#3B82F6]/20 transition-colors resize-none"
                  disabled={submitted || !selectedClaimId}
                />
              </div>
              <button
                type="submit"
                disabled={submitted || submitting || !selectedClaimId || disputeExists}
                className="shrink-0 px-8 py-4 bg-[#3B82F6] hover:bg-[#3B82F6]/90 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl text-base font-medium text-white transition-colors"
              >
                {submitted ? "Submitted" : submitting ? "Submitting..." : "Submit"}
              </button>
            </div>

            {submitError && (
              <p className="text-sm text-red-400">{submitError}</p>
            )}

            {/* Escalation note */}
            <div className="flex items-center gap-3 text-base text-white/40">
              <GitBranch className="w-5 h-5 shrink-0" />
              Routed to Human Review Escalation
            </div>

            {/* Attachment slots */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {ATTACHMENT_TYPES.map(({ id, label, icon: Icon }) => (
                <label
                  key={id}
                  className="flex flex-col items-center justify-center gap-3 bg-white/5 border border-white/10 rounded-xl p-6 cursor-pointer hover:border-[#3B82F6]/30 hover:bg-white/[0.07] transition-colors"
                >
                  <input
                    type="file"
                    className="hidden"
                    accept={
                      id === "photos"
                        ? "image/*"
                        : ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    }
                    onChange={(e) => handleAttachment(id, e.target.files?.[0] ?? null)}
                    disabled={submitted || !selectedClaimId}
                  />
                  <Icon className="w-6 h-6 text-white/50" />
                  <span className="text-sm text-white/50 text-center">
                    {attachments[id] ? (
                      <span className="text-emerald-400 truncate max-w-full block px-1">
                        {attachments[id]!.name}
                      </span>
                    ) : (
                      <>+ {label}</>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </form>

          {/* Success state */}
          {submitted && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-5 py-4">
                <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                <span className="text-base text-emerald-300">
                  Dispute submitted. Your claim has been escalated for human review. You will be notified when there is an update.
                </span>
              </div>
              <button
                onClick={handleReset}
                className="self-start px-6 py-3 bg-[#3B82F6] hover:bg-[#3B82F6]/90 rounded-lg text-sm font-medium text-white transition-colors"
              >
                File Another Dispute
              </button>
            </div>
          )}
        </div>

        {/* Bullets */}
        <ul className="mt-10 space-y-3 text-base text-white/50">
          {[
            "One-click dispute on rejected claims",
            "Re-upload new photos, documents, or statements",
            "Bypasses auto-rejection logic",
            "Routed directly to Human Review Escalation",
          ].map((bullet, i) => (
            <li key={i} className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#3B82F6] shrink-0" />
              {bullet}
            </li>
          ))}
        </ul>
      </main>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-[#030712] to-transparent" />
    </div>
  );
}
