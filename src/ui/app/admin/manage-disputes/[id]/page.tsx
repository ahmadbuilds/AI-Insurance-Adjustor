"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { LoadingShield } from "@/components/LoadingShield";
import { adminService } from "../../services/admin.service";
import { adminDisputesService } from "../services/admin-disputes.service";
import { DisputeStatusBadge } from "../components/DisputeStatusBadge";
import type { AdminDispute, DisputeStatus } from "../types/admin-disputes.types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── User Info Card ────────────────────────────────────────────────────────────
function UserInfoCard({
  user,
}: {
  user: NonNullable<AdminDispute["user"]>;
}) {
  const initial = user.username.charAt(0).toUpperCase();
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
      <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-white/8">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#3B82F6]/15 ring-1 ring-[#3B82F6]/20">
          <svg
            className="h-3.5 w-3.5 text-[#3B82F6]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-white/80">Claimant</h2>
      </div>

      <div className="flex items-center gap-4 mb-5">
        {user.profile_image_url ? (
          <img
            src={user.profile_image_url}
            alt={user.username}
            className="h-14 w-14 rounded-full object-cover ring-2 ring-white/10 shrink-0"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] text-xl font-bold text-white ring-2 ring-white/10">
            {initial}
          </div>
        )}
        <div>
          <p className="text-base font-semibold text-white">{user.username}</p>
          <p className="text-sm text-white/45">{user.email}</p>
        </div>
      </div>

      <div className="space-y-0">
        <div className="flex items-center justify-between py-2.5 border-b border-white/5">
          <span className="text-xs font-medium text-white/45">Role</span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ${
              user.role === "admin"
                ? "bg-[#8B5CF6]/15 text-[#8B5CF6] ring-[#8B5CF6]/25"
                : "bg-[#3B82F6]/15 text-[#3B82F6] ring-[#3B82F6]/25"
            }`}
          >
            {user.role}
          </span>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <span className="text-xs font-medium text-white/45">User ID</span>
          <code className="text-xs text-white/40 font-mono truncate max-w-[140px]">
            {user.id.slice(0, 8)}…
          </code>
        </div>
      </div>
    </div>
  );
}

// ── Original Claim Card ───────────────────────────────────────────────────────
function OriginalClaimCard({
  claim,
}: {
  claim: NonNullable<AdminDispute["claim"]>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
      <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-white/8">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/15 ring-1 ring-red-500/20">
          <svg
            className="h-3.5 w-3.5 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-white/80">Original Claim</h2>
      </div>

      <p className="text-sm font-semibold text-white mb-3">{claim.title}</p>

      {claim.ai_verdict && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/8 p-3 mb-4">
          <p className="text-[10px] text-red-400 uppercase tracking-widest font-semibold mb-1.5">
            AI Rejection Reason
          </p>
          <p className="text-xs text-red-300 leading-relaxed">
            {claim.ai_verdict}
          </p>
        </div>
      )}

      <p className="text-xs text-white/50 leading-relaxed line-clamp-4">
        {claim.description}
      </p>
    </div>
  );
}

// ── Status Update Panel ───────────────────────────────────────────────────────
function StatusUpdatePanel({
  disputeId,
  claimId,
  currentStatus,
  userEmail,
  username,
  onUpdated,
}: {
  disputeId: string;
  claimId: string;
  currentStatus: DisputeStatus;
  userEmail: string;
  username: string;
  onUpdated: (newStatus: DisputeStatus, note: string) => void;
}) {
  const [loadingStatus, setLoadingStatus] = useState<DisputeStatus | null>(
    null
  );
  const [adminNote, setAdminNote] = useState("");
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  const isResolved = currentStatus !== "pending";

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(t);
  }, [feedback]);

  async function handle(nextStatus: DisputeStatus) {
    setLoadingStatus(nextStatus);
    setFeedback(null);
    try {
      await adminDisputesService.updateDisputeStatus(
        disputeId,
        {
          status: nextStatus,
          admin_note: adminNote.trim() || undefined,
        },
        claimId
      );

      // Fire-and-forget email notification
      fetch("/api/disputes/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disputeId,
          newStatus: nextStatus,
          adminNote: adminNote.trim() || null,
        }),
      }).catch((e) => console.error("Email notification failed:", e));

      setFeedback({
        ok: true,
        msg:
          nextStatus === "approved"
            ? "Dispute approved. The original claim has been reinstated."
            : "Dispute rejected. The original decision stands.",
      });
      onUpdated(nextStatus, adminNote.trim());
      setAdminNote("");
    } catch (err) {
      setFeedback({
        ok: false,
        msg: err instanceof Error ? err.message : "Update failed.",
      });
    } finally {
      setLoadingStatus(null);
    }
  }

  const isAnyLoading = loadingStatus !== null;

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
      <h2 className="mb-1 text-sm font-semibold text-white/80">
        Review Decision
      </h2>
      <p className="text-xs text-white/35 mb-5">
        Decision is saved immediately and the user is notified by email.
      </p>

      {/* Current status */}
      <div className="flex items-center gap-2.5 mb-5 pb-5 border-b border-white/8">
        <span className="text-xs text-white/40 font-medium">Current</span>
        <DisputeStatusBadge status={currentStatus} size="md" pulse />
      </div>

      {/* Admin note */}
      <div className="mb-5">
        <label className="block text-xs font-medium text-white/50 mb-2">
          Admin note{" "}
          <span className="text-white/25 font-normal">
            (optional — displayed to the user)
          </span>
        </label>
        <textarea
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          rows={3}
          disabled={isAnyLoading || isResolved}
          placeholder={
            isResolved
              ? "Decision already finalised."
              : "Add a note explaining your decision…"
          }
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-[#3B82F6]/50 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-colors resize-none disabled:opacity-40"
        />
      </div>

      {/* Resolved state */}
      {isResolved ? (
        <div
          className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm ${
            currentStatus === "approved"
              ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-300"
              : "border-red-500/20 bg-red-500/8 text-red-400"
          }`}
        >
          <svg
            className="h-4 w-4 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          This dispute has been{" "}
          <span className="font-semibold">{currentStatus}</span>. No further
          changes allowed.
        </div>
      ) : (
        /* Action buttons */
        <div className="flex flex-wrap gap-2">
          {(["approved", "rejected"] as DisputeStatus[]).map((s) => {
            const isThis = loadingStatus === s;
            const isOther = isAnyLoading && !isThis;
            const isApprove = s === "approved";
            return (
              <button
                key={s}
                onClick={() => handle(s)}
                disabled={isAnyLoading}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200
                  ${
                    isApprove
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40"
                      : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40"
                  }
                  ${isOther ? "opacity-35 cursor-not-allowed" : "cursor-pointer"}
                  ${isAnyLoading ? "cursor-not-allowed" : ""}
                `}
              >
                {isThis ? <LoadingShield className="h-4 w-4" /> : null}
                {isApprove ? "Approve Dispute" : "Reject Dispute"}
              </button>
            );
          })}
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div
          className={`mt-4 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm transition-all ${
            feedback.ok
              ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-300"
              : "border-red-500/20 bg-red-500/8 text-red-400"
          }`}
        >
          <svg
            className="h-4 w-4 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {feedback.ok ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            )}
          </svg>
          {feedback.msg}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DisputeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const disputeId = params.id as string;

  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [dispute, setDispute] = useState<AdminDispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const adminId = await adminService.checkIsAdmin();
      if (!adminId) {
        router.push("/dashboard");
        return;
      }
      setAuthorized(true);
      setChecking(false);
      try {
        const data = await adminDisputesService.fetchDisputeById(disputeId);
        if (!data) setError("Dispute not found.");
        else setDispute(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load dispute."
        );
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [disputeId, router]);

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

  return (
    <div className="relative min-h-screen bg-[#030712] overflow-hidden">
      <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:60px_60px]" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-red-500/8 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-[#8B5CF6]/8 blur-3xl" />
      </div>

      <Navbar />

      <main className="relative mx-auto max-w-6xl px-6 py-12">
        {/* Back */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/admin/manage-disputes")}
            className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Disputes
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-24 text-sm text-white/40">
            <LoadingShield className="h-8 w-8" />
            Loading dispute…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/8 p-6 text-red-400 text-sm">
            {error}
          </div>
        ) : dispute ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Page header */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-white/50 mb-4">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400" />
                Admin · Disputes · Detail
              </div>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight leading-tight mb-3 break-words">
                    Dispute: {dispute.claim?.title ?? "Unknown Claim"}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3">
                    <DisputeStatusBadge
                      status={dispute.status}
                      size="md"
                      pulse
                    />
                    <span className="text-xs text-white/35">
                      Filed {formatDate(dispute.created_at)}
                    </span>
                    {dispute.updated_at !== dispute.created_at && (
                      <span className="text-xs text-white/25">
                        · Updated {formatDate(dispute.updated_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: main content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Dispute Reason */}
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
                  <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-white/8">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/8 ring-1 ring-white/10">
                      <svg
                        className="h-3.5 w-3.5 text-white/50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 6h16M4 12h16M4 18h12"
                        />
                      </svg>
                    </div>
                    <h2 className="text-sm font-semibold text-white/80">
                      Dispute Reason
                    </h2>
                  </div>
                  {dispute.description ? (
                    <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap">
                      {dispute.description}
                    </p>
                  ) : (
                    <p className="text-sm text-white/35 italic">
                      No dispute reason provided.
                    </p>
                  )}
                </div>

                {/* Evidence document text */}
                {dispute.evidence && (
                  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
                    <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-white/8">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#3B82F6]/15 ring-1 ring-[#3B82F6]/20">
                        <svg
                          className="h-3.5 w-3.5 text-[#3B82F6]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <h2 className="text-sm font-semibold text-white/80">
                        Submitted Evidence Document
                      </h2>
                    </div>
                    <pre className="text-xs text-white/60 leading-relaxed whitespace-pre-wrap font-mono bg-white/[0.02] rounded-xl p-4 border border-white/8 overflow-auto max-h-72">
                      {dispute.evidence}
                    </pre>
                  </div>
                )}

                {/* Photo evidence */}
                {dispute.photo_url && (
                  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
                    <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-white/8">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#8B5CF6]/15 ring-1 ring-[#8B5CF6]/20">
                        <svg
                          className="h-3.5 w-3.5 text-[#8B5CF6]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <h2 className="text-sm font-semibold text-white/80">
                        Photo Evidence
                      </h2>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-white/8 bg-white/[0.02]">
                      <img
                        src={dispute.photo_url}
                        alt="Dispute photo evidence"
                        className="w-full max-h-96 object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Admin note card — shown after resolution */}
                {dispute.admin_note && (
                  <div
                    className={`rounded-2xl border p-6 ${
                      dispute.status === "approved"
                        ? "border-emerald-500/20 bg-emerald-500/8"
                        : "border-red-500/20 bg-red-500/8"
                    }`}
                  >
                    <p
                      className={`text-xs uppercase tracking-widest font-semibold mb-3 ${
                        dispute.status === "approved"
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      Admin Note
                    </p>
                    <p
                      className={`text-sm leading-relaxed ${
                        dispute.status === "approved"
                          ? "text-emerald-200"
                          : "text-red-200"
                      }`}
                    >
                      {dispute.admin_note}
                    </p>
                  </div>
                )}
              </div>

              {/* Right: sidebar */}
              <div className="space-y-6">
                {dispute.user && <UserInfoCard user={dispute.user} />}
                {dispute.claim && <OriginalClaimCard claim={dispute.claim} />}

                <StatusUpdatePanel
                  disputeId={dispute.id}
                  claimId={dispute.claim_id}
                  currentStatus={dispute.status}
                  userEmail={dispute.user?.email ?? ""}
                  username={dispute.user?.username ?? ""}
                  onUpdated={(newStatus, note) =>
                    setDispute((prev) =>
                      prev
                        ? {
                            ...prev,
                            status: newStatus,
                            admin_note: note || prev.admin_note,
                          }
                        : prev
                    )
                  }
                />

                {/* Metadata */}
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
                  <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-white/8">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/8 ring-1 ring-white/10">
                      <svg
                        className="h-3.5 w-3.5 text-white/50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                        />
                      </svg>
                    </div>
                    <h2 className="text-sm font-semibold text-white/80">
                      Metadata
                    </h2>
                  </div>
                  <div className="space-y-0">
                    <div className="flex items-center justify-between py-2.5 border-b border-white/5">
                      <span className="text-xs font-medium text-white/45">
                        Dispute ID
                      </span>
                      <code className="text-xs text-white/50 font-mono truncate max-w-[140px]">
                        {dispute.id.slice(0, 12)}…
                      </code>
                    </div>
                    <div className="flex items-center justify-between py-2.5 border-b border-white/5">
                      <span className="text-xs font-medium text-white/45">
                        Has Evidence
                      </span>
                      <span className="text-xs text-white/65">
                        {dispute.evidence ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-xs font-medium text-white/45">
                        Has Photo
                      </span>
                      <span className="text-xs text-white/65">
                        {dispute.photo_url ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </main>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030712] to-transparent" />
    </div>
  );
}
