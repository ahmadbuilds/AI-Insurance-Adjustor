"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, Info, AlertTriangle, Eye, Car, Tag, Activity } from "lucide-react";
import { adminClaimsService } from "../../services/admin-claims.service";

export function AgentResultsReadonlyPanel({ claimId }: { claimId: string }) {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await adminClaimsService.fetchClaimAgentResults(claimId);
        setResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [claimId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-6 animate-pulse space-y-4">
        <div className="h-4 w-32 bg-red-500/10 rounded" />
        <div className="h-10 bg-white/5 rounded-xl" />
      </div>
    );
  }

  if (!results) return null;

  const { classification, sameVehicle, vehicleType, damageDetection, liability, rag } = results;

  return (
    <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/[0.08] to-red-500/[0.02] p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-red-300">Rejection Details</h3>
          <p className="text-xs text-red-400/60 mt-0.5">Read-only view of the AI Agent outputs leading to rejection.</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Classification */}
        {classification && (
          <div className="rounded-xl bg-black/20 border border-white/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-white/60 mb-2">
              <Eye className="h-4 w-4" /> <span className="text-xs font-semibold uppercase tracking-wider">Vehicle Detection</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-white/40 text-xs">Vehicles Detected</span>
                <span className="text-white/80">{classification.vehicles_detected} / {classification.images_processed}</span>
              </div>
              <div>
                <span className="block text-white/40 text-xs">Status</span>
                <span className={classification.claim_rejected ? "text-red-400" : "text-emerald-400"}>
                  {classification.claim_rejected ? "Rejected" : "Passed"}
                </span>
              </div>
            </div>
            {classification.error && (
              <p className="text-xs text-red-400/80 bg-red-500/10 p-2 rounded mt-2 font-mono">
                {classification.error}
              </p>
            )}
          </div>
        )}

        {/* Same Vehicle */}
        {sameVehicle && (
          <div className="rounded-xl bg-black/20 border border-white/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-white/60 mb-2">
              <Car className="h-4 w-4" /> <span className="text-xs font-semibold uppercase tracking-wider">Same Vehicle Check</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-white/40 text-xs">Is Same Vehicle?</span>
                <span className="text-white/80">{sameVehicle.is_same_vehicle ? "Yes" : "No"}</span>
              </div>
              <div>
                <span className="block text-white/40 text-xs">Status</span>
                <span className={sameVehicle.claim_rejected ? "text-red-400" : "text-emerald-400"}>
                  {sameVehicle.claim_rejected ? "Rejected" : "Passed"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Vehicle Type */}
        {vehicleType && (
          <div className="rounded-xl bg-black/20 border border-white/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-white/60 mb-2">
              <Tag className="h-4 w-4" /> <span className="text-xs font-semibold uppercase tracking-wider">Vehicle Type Check</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-white/40 text-xs">Identified Type</span>
                <span className="text-white/80">{vehicleType.identified_type || "N/A"}</span>
              </div>
              <div>
                <span className="block text-white/40 text-xs">Status</span>
                <span className={vehicleType.claim_rejected ? "text-red-400" : "text-emerald-400"}>
                  {vehicleType.claim_rejected ? "Rejected" : "Passed"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Damage Detection */}
        {damageDetection && (
          <div className="rounded-xl bg-black/20 border border-white/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-white/60 mb-2">
              <AlertTriangle className="h-4 w-4" /> <span className="text-xs font-semibold uppercase tracking-wider">Damage Detection</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-white/40 text-xs">Damaged Images</span>
                <span className="text-white/80">{damageDetection.images_with_damage} / {damageDetection.images_analyzed}</span>
              </div>
              <div>
                <span className="block text-white/40 text-xs">Status</span>
                <span className={damageDetection.claim_rejected ? "text-red-400" : "text-emerald-400"}>
                  {damageDetection.claim_rejected ? "Rejected" : "Passed"}
                </span>
              </div>
            </div>
            {damageDetection.damage_summary && (
              <p className="text-xs text-white/60 mt-2">
                {damageDetection.damage_summary}
              </p>
            )}
          </div>
        )}

        {/* Liability */}
        {liability && (
          <div className="rounded-xl bg-black/20 border border-white/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-white/60 mb-2">
              <Activity className="h-4 w-4" /> <span className="text-xs font-semibold uppercase tracking-wider">Liability Assessment</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-white/40 text-xs">Confidence</span>
                <span className="text-white/80">{liability.confidence_percentage}%</span>
              </div>
              <div>
                <span className="block text-white/40 text-xs">Recommendation</span>
                <span className="text-white/80 capitalize">{liability.recommendation?.replace(/_/g, " ")}</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-white/60">
              <span className="block text-white/40 mb-1">Reasoning</span>
              {liability.overall_reasoning}
            </div>
          </div>
        )}

        {/* RAG Results */}
        {rag && (
          <div className="rounded-xl bg-black/20 border border-white/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-white/60 mb-2">
              <Info className="h-4 w-4" /> <span className="text-xs font-semibold uppercase tracking-wider">Policy Assessment (RAG)</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-white/40 text-xs">Coverage Type</span>
                <span className="text-white/80">{rag.coverage_type || "None"}</span>
              </div>
              <div>
                <span className="block text-white/40 text-xs">Covered?</span>
                <span className={rag.policy_covered ? "text-emerald-400" : "text-red-400"}>
                  {rag.policy_covered ? "Yes" : "No"}
                </span>
              </div>
            </div>
            <div className="mt-2 text-xs text-white/60">
              <span className="block text-white/40 mb-1">Reasoning</span>
              {rag.coverage_reasoning}
            </div>
          </div>
        )}

        {!classification && !sameVehicle && !vehicleType && !damageDetection && !liability && !rag && (
          <p className="text-sm text-white/40 italic">No agent results found for this claim.</p>
        )}
      </div>
    </div>
  );
}
