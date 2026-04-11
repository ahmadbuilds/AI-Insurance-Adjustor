"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { LoadingShield } from "@/components/LoadingShield";
import { adminService } from "../../services/admin.service";
import { adminClaimsService } from "../services/admin-claims.service";
import { ClaimStatusBadge } from "../components/ClaimStatusBadge";
import { UserInfoCard } from "./components/UserInfoCard";
import { AiVerdictCard } from "./components/AiVerdictCard";
import { ClaimImagesGrid } from "./components/ClaimImagesGrid";
import { StatusUpdatePanel } from "./components/StatusUpdatePanel";
import { ManualInterventionPanel } from "./components/ManualInterventionPanel";
import type { AdminClaimDetail, ClaimStatus } from "../types/admin-claims.types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// Reusable section header used for Description & Metadata
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-white/8">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/8 ring-1 ring-white/10">
        <span className="text-white/50">{icon}</span>
      </div>
      <h2 className="text-sm font-semibold text-white/80">{title}</h2>
    </div>
  );
}

export default function ClaimDetailPage() {
  const params  = useParams();
  const router  = useRouter();
  const claimId = params.id as string;

  const [authorized, setAuthorized] = useState(false);
  const [checking,   setChecking]   = useState(true);
  const [claim,      setClaim]      = useState<AdminClaimDetail | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const adminId = await adminService.checkIsAdmin();
      if (!adminId) { router.push("/dashboard"); return; }
      setAuthorized(true);
      setChecking(false);
      await loadClaim();
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  async function loadClaim() {
    setLoading(true);
    setError(null);
    try {
      const data = await adminClaimsService.fetchClaimDetail(claimId);
      setClaim(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load claim.");
    } finally {
      setLoading(false);
    }
  }

  function handleStatusUpdated(newStatus: ClaimStatus) {
    if (claim) setClaim({ ...claim, status: newStatus });
  }

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
        <div className="absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#3B82F6]/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-[#8B5CF6]/8 blur-3xl" />
      </div>

      <Navbar />

      <main className="relative mx-auto max-w-6xl px-6 py-12">

        {/* Back button */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/admin/manage-claims")}
            className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Claims
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-24 text-sm text-white/40">
            <LoadingShield className="h-8 w-8" />
            Loading claim…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/8 p-6 text-red-400 text-sm">
            {error}
          </div>
        ) : claim ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Page header */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-white/50 mb-4">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
                Admin · Claims Management · Detail
              </div>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight leading-tight mb-3 break-words">
                    {claim.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3">
                    <ClaimStatusBadge status={claim.status} size="md" pulse />
                    <span className="text-xs text-white/35">
                      Submitted {formatDate(claim.created_at)}
                    </span>
                    {claim.updated_at !== claim.created_at && (
                      <span className="text-xs text-white/25">
                        · Updated {formatDate(claim.updated_at)}
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

                {/* Description */}
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
                  <SectionHeader
                    title="Description"
                    icon={
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h12" />
                      </svg>
                    }
                  />
                  <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap">
                    {claim.description}
                  </p>
                </div>

                {/* AI Verdict */}
                <AiVerdictCard verdict={claim.ai_verdict} status={claim.status} />

                {/* Manual Intervention Panel — shown when an agent failed */}
                {claim.active_notification && (
                  <ManualInterventionPanel
                    notification={claim.active_notification}
                    claimId={claim.id}
                    images={claim.images}
                    onResolved={() => loadClaim()}
                  />
                )}

                {/* Images */}
                <ClaimImagesGrid images={claim.images} />
              </div>

              {/* Right: sidebar */}
              <div className="space-y-6">

                {/* Claimant */}
                {claim.user ? (
                  <UserInfoCard user={claim.user} />
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/30 italic">
                    User not found.
                  </div>
                )}

                {/* Status update */}
                <StatusUpdatePanel
                  claimId={claim.id}
                  currentStatus={claim.status}
                  onUpdated={handleStatusUpdated}
                />

                {/* Metadata */}
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
                  <SectionHeader
                    title="Metadata"
                    icon={
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                    }
                  />
                  <div className="space-y-0">
                    <div className="flex items-center justify-between py-2.5 border-b border-white/5">
                      <span className="text-xs font-medium text-white/45">Claim ID</span>
                      <code className="text-xs text-white/50 font-mono truncate max-w-[140px]">
                        {claim.id.slice(0, 12)}…
                      </code>
                    </div>
                    <div className="flex items-center justify-between py-2.5 border-b border-white/5">
                      <span className="text-xs font-medium text-white/45">Images</span>
                      <span className="text-xs text-white/65">{claim.images.length}</span>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-xs font-medium text-white/45">Word count</span>
                      <span className="text-xs text-white/65">
                        {claim.description.trim().split(/\s+/).length}
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