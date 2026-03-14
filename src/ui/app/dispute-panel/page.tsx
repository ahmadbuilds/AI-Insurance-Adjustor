"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitBranch,
  CheckCircle,
  Upload,
  Image as ImageIcon,
  ChevronDown,
  FileText,
  Clock,
  AlertCircle,
  XCircle,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import {
  disputeService,
  type RejectedClaim,
  type ClaimImage,
  type DisputeInfo,
} from "./services/dispute.service";
import { LoadingShield } from "@/components/LoadingShield";

function wordCount(text: string) {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ── Claim detail (images + description + AI verdict) ─────────────────────────
function ClaimDetail({ claim }: { claim: RejectedClaim }) {
  const [images, setImages] = useState<ClaimImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);

  useEffect(() => {
    (async () => {
      const fetchedImages = await disputeService.fetchClaimImages(claim.id);
      setImages(fetchedImages);
      setLoadingImages(false);
    })();
  }, [claim.id]);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden"
    >
      <div className="border-t border-white/15">
        <div className="px-10 pt-8 pb-10 space-y-10">
          {/* Description */}
          <div>
            <p className="text-xs uppercase tracking-widest text-white/55 font-semibold mb-3 tracking-[0.12em]">
              Description
            </p>
            <p className="text-lg text-white/85 leading-loose">
              {claim.description}
            </p>
          </div>

          {/* AI Verdict */}
          {claim.ai_verdict && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8">
              <p className="text-sm uppercase tracking-widest text-red-400 font-semibold mb-3 tracking-[0.12em]">
                AI Rejection Reason
              </p>
              <p className="text-lg text-red-200 leading-loose">
                {claim.ai_verdict}
              </p>
            </div>
          )}

          {/* Images */}
          <div>
            <p className="text-sm uppercase tracking-widest text-white/60 font-semibold mb-4 tracking-[0.12em]">
              Submitted Evidence
            </p>
            {loadingImages ? (
              <div className="flex items-center gap-2 text-xs text-white/55">
                <LoadingShield className="h-4 w-4" color="#ffffff" />
                Loading images…
              </div>
            ) : images.length === 0 ? (
              <p className="text-xs text-white/55">
                No images attached to this claim.
              </p>
            ) : (
              <div className="space-y-2">
                {images.map((img) => (
                  <ImageRow key={img.id} img={img} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Image row ─────────────────────────────────────────────────────────────────
function ImageRow({ img }: { img: ClaimImage }) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!img.mime_type?.startsWith("image/")) return;
    const supabase = createClient();
    const { data } = supabase.storage
      .from("claim_images")
      .getPublicUrl(img.storage_path);
    if (data?.publicUrl) setThumbUrl(data.publicUrl);
  }, [img]);

  return (
    <div className="flex items-center gap-5 rounded-2xl bg-white/8 px-6 py-5 border border-white/15">
      <div className="relative h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-[#3B82F6]/20 ring-1 ring-[#3B82F6]/30 flex items-center justify-center">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={img.file_name}
            className="h-full w-full object-cover"
          />
        ) : (
          <FileText className="w-7 h-7 text-[#3B82F6]/60" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-lg font-medium text-white/90 truncate pr-3">
            {img.file_name}
          </p>
          <span className="text-base text-white/55 shrink-0">
            {formatBytes(img.file_size)}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full w-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6]" />
        </div>
      </div>
      <CheckCircle className="h-6 w-6 text-emerald-400 shrink-0" />
    </div>
  );
}

// ── Decision Banner — shown when a filed dispute has been resolved ─────────────
function DisputeDecisionBanner({ info }: { info: DisputeInfo }) {
  const isApproved = info.status === "approved";
  const isRejected = info.status === "rejected";
  const isPending  = info.status === "pending";

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden"
    >
      <div className="border-t border-white/15">
        <div className="px-10 pt-8 pb-10 space-y-5">
          {/* Status banner */}
          {isPending && (
            <div className="flex items-start gap-4 rounded-2xl border border-yellow-500/25 bg-yellow-500/8 p-6">
              <Clock className="w-6 h-6 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-base font-semibold text-yellow-300">
                  Dispute Under Review
                </p>
                <p className="text-sm text-yellow-400/70 mt-1.5 leading-relaxed">
                  Your dispute was filed on {formatDate(info.created_at)}. An
                  adjuster will review it shortly and you will be notified by
                  email once a decision has been made.
                </p>
              </div>
            </div>
          )}

          {isApproved && (
            <div className="flex items-start gap-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-6">
              <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-base font-semibold text-emerald-300">
                  Dispute Approved — Claim Reinstated
                </p>
                <p className="text-sm text-emerald-400/70 mt-1.5 leading-relaxed">
                  Your dispute was upheld by our adjuster team. Your claim has
                  been approved and the decision communicated to you by email.
                </p>
              </div>
            </div>
          )}

          {isRejected && (
            <div className="flex items-start gap-4 rounded-2xl border border-red-500/25 bg-red-500/10 p-6">
              <XCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-base font-semibold text-red-300">
                  Dispute Rejected — Final Decision
                </p>
                <p className="text-sm text-red-400/70 mt-1.5 leading-relaxed">
                  After careful review, your dispute could not be upheld. The
                  original rejection stands. This claim cannot be disputed
                  again.
                </p>
              </div>
            </div>
          )}

          {/* Admin note (only when present and resolved) */}
          {(isApproved || isRejected) && info.admin_note && (
            <div
              className={`rounded-2xl border p-6 ${
                isApproved
                  ? "border-emerald-500/20 bg-emerald-500/6"
                  : "border-red-500/20 bg-red-500/6"
              }`}
            >
              <p
                className={`text-xs uppercase tracking-widest font-semibold mb-3 ${
                  isApproved ? "text-emerald-400" : "text-red-400"
                }`}
              >
                Note from Adjuster
              </p>
              <p
                className={`text-sm leading-relaxed ${
                  isApproved ? "text-emerald-200" : "text-red-200"
                }`}
              >
                {info.admin_note}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Dispute form ──────────────────────────────────────────────────────────────
function DisputeForm({
  claim,
  onSuccess,
  onCancel,
}: {
  claim: RejectedClaim;
  onSuccess: (claimId: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const [touchedReason, setTouchedReason] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const wc = wordCount(reason);
  const reasonError =
    touchedReason && wc < 50
      ? wc === 0
        ? "Dispute reason is required."
        : `At least 50 words required. (${wc}/50)`
      : null;
  const reasonValid = reason.trim() !== "" && wc >= 50;
  const formValid = reasonValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouchedReason(true);
    if (!formValid) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await disputeService.submitDispute(
        claim.id,
        reason,
        evidenceFile,
        photoFile
      );
      setSubmitted(true);
      onSuccess(claim.id);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to submit dispute."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-t border-white/8 mx-4 mb-4 pt-4"
      >
        <div className="flex items-start gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-7">
          <CheckCircle className="w-7 h-7 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-lg font-semibold text-emerald-300">
              Dispute submitted successfully
            </p>
            <p className="text-base text-emerald-400/70 mt-1">
              Your claim has been escalated for human adjuster review. You will
              be notified by email once a decision is made.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden"
    >
      <div className="border-t border-white/15">
        <form onSubmit={handleSubmit} className="space-y-7 px-10 pt-8 pb-10">
          {/* Reason textarea */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-base font-semibold text-white/90">
                Dispute Reason
              </label>
              <span
                className={`text-sm tabular-nums transition-colors ${
                  wc >= 50
                    ? "text-emerald-400"
                    : wc > 0
                    ? "text-white/60"
                    : "text-white/40"
                }`}
              >
                {wc >= 50 ? "✓ Minimum reached" : `${wc}/50 words minimum`}
              </span>
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onBlur={() => setTouchedReason(true)}
              placeholder="Describe why this rejection should be reconsidered. Include any new information, context, or evidence that supports your claim. Be as detailed as possible…"
              rows={10}
              className={`w-full rounded-2xl border bg-white/5 px-6 py-5 text-base text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 transition-all resize-none ${
                reasonError
                  ? "border-red-500/50 focus:border-red-500/60 focus:ring-red-500/20"
                  : touchedReason && reasonValid
                  ? "border-emerald-500/40 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                  : "border-white/10 focus:border-[#3B82F6]/50 focus:ring-[#3B82F6]/20"
              }`}
            />
            {reasonError && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {reasonError}
              </p>
            )}
          </div>

          {/* File uploads */}
          <div className="grid grid-cols-2 gap-3">
            {/* Evidence document */}
            <label className="group flex items-center gap-5 rounded-2xl border border-white/10 bg-white/5 px-7 py-6 cursor-pointer hover:border-[#3B82F6]/40 hover:bg-[#3B82F6]/5 transition-all">
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)}
              />
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#3B82F6]/15 ring-1 ring-[#3B82F6]/25 group-hover:bg-[#3B82F6]/25 transition-colors">
                <Upload className="w-6 h-6 text-[#3B82F6]" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold text-white/90 group-hover:text-white transition-colors">
                  Upload Evidence Document
                </p>
                {evidenceFile ? (
                  <p className="text-[10px] text-emerald-400 truncate mt-0.5">
                    {evidenceFile.name}
                  </p>
                ) : (
                  <p className="text-sm text-white/55 mt-1">PDF, DOC, DOCX</p>
                )}
              </div>
            </label>

            {/* Photo */}
            <label className="group flex items-center gap-5 rounded-2xl border border-white/10 bg-white/5 px-7 py-6 cursor-pointer hover:border-[#8B5CF6]/40 hover:bg-[#8B5CF6]/5 transition-all">
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              />
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#8B5CF6]/15 ring-1 ring-[#8B5CF6]/25 group-hover:bg-[#8B5CF6]/25 transition-colors">
                <ImageIcon className="w-6 h-6 text-[#8B5CF6]" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold text-white/90 group-hover:text-white transition-colors">
                  Photos
                </p>
                {photoFile ? (
                  <p className="text-[10px] text-emerald-400 truncate mt-0.5">
                    {photoFile.name}
                  </p>
                ) : (
                  <p className="text-sm text-white/55 mt-1">JPG, PNG, WebP</p>
                )}
              </div>
            </label>
          </div>

          {/* Escalation note */}
          <div className="flex items-center gap-2.5 text-sm text-white/65">
            <GitBranch className="w-3.5 h-3.5 shrink-0" />
            Disputed claims are routed directly to Human Review Escalation
          </div>

          {/* Submit error */}
          {submitError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/8 p-3 text-xs text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {submitError}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={submitting || !formValid}
              className={`flex-1 flex items-center justify-center gap-2 rounded-full py-4 text-base font-semibold transition-all ${
                formValid && !submitting
                  ? "bg-white text-black hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98]"
                  : "bg-white/20 text-white/40 cursor-not-allowed opacity-50"
              }`}
            >
              {submitting ? (
                <>
                  <LoadingShield className="h-4 w-4" color="#000000" />
                  Submitting…
                </>
              ) : (
                "Submit Dispute"
              )}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-8 py-4 rounded-full border border-white/10 text-base text-white/60 hover:text-white hover:border-white/25 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

// ── Claim Row ─────────────────────────────────────────────────────────────────
function ClaimRow({
  claim,
  mode,
  disputeInfo,
  onDisputeClick,
  onBodyClick,
  onDisputeSuccess,
  onDisputeCancel,
}: {
  claim: RejectedClaim;
  mode: "idle" | "detail" | "dispute" | "disputed";
  disputeInfo: DisputeInfo | null;
  onDisputeClick: () => void;
  onBodyClick: () => void;
  onDisputeSuccess: (id: string) => void;
  onDisputeCancel: () => void;
}) {
  const isCollapsed = mode === "idle";
  const disputeStatus = disputeInfo?.status ?? null;

  // Derive status badge style
  const statusBadge = (() => {
    if (!disputeInfo)
      return {
        label: "Rejected",
        cls: "border-red-500/25 bg-red-500/10 text-red-400",
      };
    if (disputeStatus === "approved")
      return {
        label: "Claim Approved",
        cls: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
      };
    if (disputeStatus === "rejected")
      return {
        label: "Dispute Rejected",
        cls: "border-orange-500/25 bg-orange-500/10 text-orange-400",
      };
    // pending disputed
    return {
      label: "Rejected",
      cls: "border-red-500/25 bg-red-500/10 text-red-400",
    };
  })();

  const dotColor =
    disputeStatus === "approved"
      ? "text-emerald-400"
      : disputeStatus === "rejected"
      ? "text-orange-400"
      : "text-red-400";

  return (
    <motion.div
      layout
      className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
        isCollapsed
          ? "border-white/15 bg-gradient-to-br from-white/[0.06] to-white/[0.02] opacity-90 hover:opacity-100 hover:border-white/25"
          : "border-white/20 bg-gradient-to-br from-white/8 to-white/[0.04]"
      }`}
    >
      {/* Row header — always visible */}
      <div className="flex items-center gap-4 px-5 py-5">
        {/* Icon */}
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${
            disputeStatus === "approved"
              ? "bg-emerald-500/15 ring-emerald-500/30"
              : disputeStatus === "rejected"
              ? "bg-orange-500/15 ring-orange-500/30"
              : "bg-red-500/15 ring-red-500/30"
          }`}
        >
          {disputeStatus === "approved" ? (
            <CheckCircle className={`h-4 w-4 ${dotColor}`} />
          ) : disputeStatus === "rejected" ? (
            <XCircle className={`h-4 w-4 ${dotColor}`} />
          ) : (
            <AlertCircle className={`h-4 w-4 ${dotColor}`} />
          )}
        </div>

        {/* Clickable body → detail */}
        <button onClick={onBodyClick} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <p className="text-base font-semibold text-white truncate">
              {claim.title}
            </p>
            <span
              className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusBadge.cls}`}
            >
              {statusBadge.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1 text-xs text-white/55">
              <Clock className="h-3 w-3" />
              {formatDate(claim.created_at)}
            </span>
            {mode === "detail" && (
              <span className="text-xs text-[#3B82F6]">
                Click again to collapse
              </span>
            )}
          </div>
        </button>

        {/* Right: dispute button or status chip */}
        {mode === "disputed" ? (
          <span
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
              disputeStatus === "approved"
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                : disputeStatus === "rejected"
                ? "border-orange-500/25 bg-orange-500/10 text-orange-400"
                : "border-yellow-500/25 bg-yellow-500/10 text-yellow-400"
            }`}
          >
            {disputeStatus === "approved" ? (
              <>
                <CheckCircle className="h-3 w-3" /> Approved
              </>
            ) : disputeStatus === "rejected" ? (
              <>
                <XCircle className="h-3 w-3" /> Rejected
              </>
            ) : (
              <>
                <Clock className="h-3 w-3" /> Under Review
              </>
            )}
          </span>
        ) : mode === "dispute" ? (
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-[#3B82F6]/25 bg-[#3B82F6]/10 px-3 py-1.5 text-xs font-medium text-[#3B82F6]">
            Filing…
          </span>
        ) : (
          // idle — show dispute button only if not already rejected dispute
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDisputeClick();
            }}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-[#3B82F6]/40 bg-[#3B82F6]/15 px-3 py-1.5 text-xs font-medium text-[#3B82F6] hover:bg-[#3B82F6]/25 hover:border-[#3B82F6]/60 transition-all"
          >
            Dispute
          </button>
        )}

        {/* Expand chevron */}
        {(mode === "detail" || mode === "idle" || mode === "disputed") && (
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-white/50 transition-transform duration-300 ${
              mode === "detail" || (mode === "disputed" && disputeInfo)
                ? "rotate-180"
                : ""
            }`}
          />
        )}
      </div>

      {/* Expandable sections */}
      <AnimatePresence initial={false}>
        {mode === "detail" && <ClaimDetail key="detail" claim={claim} />}
        {mode === "dispute" && (
          <DisputeForm
            key="dispute"
            claim={claim}
            onSuccess={onDisputeSuccess}
            onCancel={onDisputeCancel}
          />
        )}
        {mode === "disputed" && disputeInfo && (
          <DisputeDecisionBanner key="decision" info={disputeInfo} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DisputePanelPage() {
  const [claims, setClaims] = useState<RejectedClaim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [claimsError, setClaimsError] = useState<string | null>(null);
  const [claimModes, setClaimModes] = useState<
    Record<string, "idle" | "detail" | "dispute" | "disputed">
  >({});
  const [disputeInfoMap, setDisputeInfoMap] = useState<
    Record<string, DisputeInfo>
  >({});

  useEffect(() => {
    (async () => {
      try {
        const {
          claims: fetchedClaims,
          modes,
          disputeInfoMap: dim,
        } = await disputeService.fetchRejectedClaimsAndModes();
        setClaims(fetchedClaims);
        setClaimModes(modes);
        setDisputeInfoMap(dim);
      } catch (err) {
        setClaimsError(
          err instanceof Error ? err.message : "Failed to load claims"
        );
      } finally {
        setClaimsLoading(false);
      }
    })();
  }, []);

  function setMode(
    claimId: string,
    mode: "idle" | "detail" | "dispute" | "disputed"
  ) {
    setClaimModes((prev) => {
      // Collapse all others (except already-disputed ones stay disputed)
      const next: Record<string, "idle" | "detail" | "dispute" | "disputed"> =
        {};
      Object.entries(prev).forEach(([id, m]) => {
        next[id] = m === "disputed" ? "disputed" : "idle";
      });
      next[claimId] = mode;
      return next;
    });
  }

  function handleBodyClick(claim: RejectedClaim) {
    const current = claimModes[claim.id] ?? "idle";
    if (current === "detail") {
      // Collapse: if disputed return to "disputed", else idle
      const isDisputed = !!disputeInfoMap[claim.id];
      setMode(claim.id, isDisputed ? "disputed" : "idle");
    } else if (current === "idle" || current === "dispute") {
      setMode(claim.id, "detail");
    } else if (current === "disputed") {
      // Toggle decision banner → when disputed, "detail" shows the claim
      // We reuse "detail" mode so user can see the full claim AND banner together
      setMode(claim.id, "detail");
    }
  }

  function handleDisputeClick(claim: RejectedClaim) {
    setMode(claim.id, "dispute");
  }

  function handleDisputeSuccess(claimId: string) {
    setClaimModes((prev) => ({ ...prev, [claimId]: "disputed" }));
    setDisputeInfoMap((prev) => ({
      ...prev,
      [claimId]: {
        claim_id: claimId,
        status: "pending",
        admin_note: null,
        created_at: new Date().toISOString(),
      },
    }));
  }

  function handleDisputeCancel(claimId: string) {
    const isDisputed = !!disputeInfoMap[claimId];
    setMode(claimId, isDisputed ? "disputed" : "idle");
  }

  return (
    <div className="relative min-h-screen bg-[#030712] overflow-hidden">
      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:60px_60px]" />
      {/* Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#3B82F6]/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-[#8B5CF6]/8 blur-3xl" />
      </div>

      <Navbar />

      <main className="relative mx-auto max-w-6xl px-8 py-14">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/8 text-xs text-white/70 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
            Dispute Centre
          </div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">
            Challenge a rejection
          </h1>
          <p className="mt-2 text-sm text-white/60 leading-relaxed max-w-xl">
            Select a rejected claim to file a dispute or view its details.
            Disputed claims are escalated directly to human adjuster review.
          </p>
        </div>

        {/* Claims list */}
        <div className="space-y-3">
          {claimsLoading ? (
            <div className="flex items-center gap-3 py-12 justify-center text-sm text-white/40">
              <LoadingShield className="h-6 w-6" />
              Loading rejected claims…
            </div>
          ) : claimsError ? (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/8 p-4 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {claimsError}
            </div>
          ) : claims.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                <CheckCircle className="h-6 w-6 text-white/20" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/60">
                  No rejected claims
                </p>
                <p className="text-xs text-white/30 mt-1">
                  You have no rejected claims that can be disputed.
                </p>
              </div>
            </div>
          ) : (
            claims.map((claim) => {
              const mode = claimModes[claim.id] ?? "idle";
              const info = disputeInfoMap[claim.id] ?? null;
              // A claim with a rejected dispute cannot be disputed again
              const canDispute = !info || info.status === "pending";

              return (
                <ClaimRow
                  key={claim.id}
                  claim={claim}
                  mode={mode}
                  disputeInfo={info}
                  onBodyClick={() => handleBodyClick(claim)}
                  onDisputeClick={() => {
                    if (canDispute) handleDisputeClick(claim);
                  }}
                  onDisputeSuccess={handleDisputeSuccess}
                  onDisputeCancel={() => handleDisputeCancel(claim.id)}
                />
              );
            })
          )}
        </div>

        {/* Info bullets */}
        {!claimsLoading && claims.length > 0 && (
          <ul className="mt-10 space-y-2.5">
            {[
              "Click a claim's body to view full details and submitted evidence",
              "Click Dispute to file a counter-claim with new supporting documents",
              "Bypasses auto-rejection — routed directly to human adjuster review",
            ].map((bullet, i) => (
              <li
                key={i}
                className="flex items-center gap-2.5 text-sm text-white/60"
              >
                <CheckCircle className="w-3.5 h-3.5 text-[#3B82F6] shrink-0" />
                {bullet}
              </li>
            ))}
          </ul>
        )}
      </main>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030712] to-transparent" />
    </div>
  );
}
