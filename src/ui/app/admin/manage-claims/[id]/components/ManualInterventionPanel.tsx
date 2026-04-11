"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, Car, Eye, Tag, Loader2 } from "lucide-react";
import { adminClaimsService } from "../../services/admin-claims.service";
import { createClient } from "@/lib/supabase/client";
import type { AdminNotification, ClaimImage } from "../../types/admin-claims.types";

// ─── Shared Types ────────────────────────────────────────
interface ManualInterventionPanelProps {
  notification: AdminNotification;
  claimId: string;
  images: ClaimImage[];
  onResolved: () => void;
}

const VEHICLE_TYPES = [
  { code: "PC", label: "Passenger Car", desc: "Sedans, hatchbacks, coupes, SUVs, minivans" },
  { code: "MC", label: "Motorcycle / Scooter", desc: "Sport bikes, cruisers, mopeds, trikes" },
  { code: "CT", label: "Commercial Truck", desc: "Heavy goods, box trucks, flatbeds, semis" },
  { code: "EV", label: "Emergency Vehicle", desc: "Ambulances, fire trucks, police cruisers" },
  { code: "CV", label: "Commercial Vehicle", desc: "Taxis, rideshare, delivery vans" },
  { code: "SV", label: "Specialty Vehicle", desc: "Construction, agricultural, military" },
  { code: "OV", label: "Other Vehicle", desc: "Boats, ATVs, golf carts, other" },
] as const;

// ─── Classification Form ─────────────────────────────────
// Admin marks each image as containing a vehicle or not
function ClassificationForm({
  images,
  claimId,
  notificationId,
  onResolved,
}: {
  images: ClaimImage[];
  claimId: string;
  notificationId: string;
  onResolved: () => void;
}) {
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with all false
  useEffect(() => {
    const init: Record<string, boolean> = {};
    images.forEach((img) => (init[img.id] = false));
    setResults(init);
  }, [images]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();

      // Update each image's is_vehical column
      for (const [imageId, isVehicle] of Object.entries(results)) {
        await supabase
          .from("claim_images")
          .update({ is_vehical: isVehicle })
          .eq("id", imageId);
      }

      // Check if ALL images are non-vehicle → reject, else pass
      const allFalse = Object.values(results).every((v) => !v);
      if (allFalse) {
        await supabase
          .from("claims")
          .update({
            status: "rejected",
            ai_verdict: "Rejected by admin: No images contain a vehicle.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", claimId);
      } else {
        // Update claim status back to pending so the workflow picks it up
        await supabase
          .from("claims")
          .update({
            status: "pending",
            ai_verdict: "Classification completed manually by admin.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", claimId);
      }

      // Resolve notification and resume
      await adminClaimsService.resolveNotificationAndResume(
        notificationId,
        claimId,
        "classification"
      );

      onResolved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-white/60">
        The AI classification agent failed. Please review each image and indicate whether it contains a vehicle.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {images.map((img) => {
          const url = adminClaimsService.getImagePublicUrl(img.storage_path);
          const isVehicle = results[img.id] ?? false;

          return (
            <div
              key={img.id}
              className={`relative rounded-xl border overflow-hidden transition-all duration-200 ${
                isVehicle
                  ? "border-emerald-500/50 ring-1 ring-emerald-500/20"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              <div className="aspect-video w-full overflow-hidden bg-white/[0.03]">
                <img src={url} alt={img.file_name} className="h-full w-full object-cover" />
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-xs text-white/50 truncate max-w-[60%]">{img.file_name}</span>
                <button
                  type="button"
                  onClick={() => setResults((prev) => ({ ...prev, [img.id]: !prev[img.id] }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isVehicle
                      ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                      : "bg-white/5 text-white/40 ring-1 ring-white/10 hover:bg-white/10"
                  }`}
                >
                  {isVehicle ? "✓ Vehicle" : "No Vehicle"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-3 text-sm font-semibold text-white transition-colors"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
        {submitting ? "Saving..." : "Submit Classification & Resume Workflow"}
      </button>
    </div>
  );
}

// ─── Same Vehicle Form ────────────────────────────────────
// Admin confirms whether all images show the same vehicle
function SameVehicleForm({
  images,
  claimId,
  notificationId,
  onResolved,
}: {
  images: ClaimImage[];
  claimId: string;
  notificationId: string;
  onResolved: () => void;
}) {
  const [isSame, setIsSame] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (isSame === null) return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();

      if (!isSame) {
        // Reject
        await supabase
          .from("claims")
          .update({
            status: "rejected",
            ai_verdict: "Rejected by admin: Images show different vehicles.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", claimId);
      } else {
        // Save same_vehicle_results manually
        await supabase.from("same_vehicle_results").insert({
          claim_id: claimId,
          vehicle_images_count: images.length,
          is_same_vehicle: true,
          claim_rejected: false,
          status: "completed",
        });

        await supabase
          .from("claims")
          .update({
            status: "pending",
            ai_verdict: "Same-vehicle check completed manually by admin.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", claimId);
      }

      await adminClaimsService.resolveNotificationAndResume(
        notificationId,
        claimId,
        "same_vehicle_detection"
      );

      onResolved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-white/60">
        The AI same-vehicle agent failed. Review the images below and confirm whether they all depict the <strong className="text-white">same vehicle</strong> (or parts of the same vehicle).
      </p>

      {/* Image strip for reference */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {images.map((img) => {
          const url = adminClaimsService.getImagePublicUrl(img.storage_path);
          return (
            <div key={img.id} className="shrink-0 w-40 rounded-lg overflow-hidden border border-white/10">
              <img src={url} alt={img.file_name} className="aspect-video w-full object-cover" />
              <p className="text-[10px] text-white/40 p-1.5 truncate">{img.file_name}</p>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setIsSame(true)}
          className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all ${
            isSame === true
              ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
              : "bg-white/5 text-white/40 ring-1 ring-white/10 hover:bg-white/10"
          }`}
        >
          ✓ Same Vehicle
        </button>
        <button
          type="button"
          onClick={() => setIsSame(false)}
          className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all ${
            isSame === false
              ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/30"
              : "bg-white/5 text-white/40 ring-1 ring-white/10 hover:bg-white/10"
          }`}
        >
          ✗ Different Vehicles
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting || isSame === null}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-3 text-sm font-semibold text-white transition-colors"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
        {submitting ? "Saving..." : "Submit & Resume Workflow"}
      </button>
    </div>
  );
}

// ─── Vehicle Type Form ────────────────────────────────────
// Admin selects the vehicle type from a dropdown
function VehicleTypeForm({
  images,
  claimId,
  notificationId,
  onResolved,
}: {
  images: ClaimImage[];
  claimId: string;
  notificationId: string;
  onResolved: () => void;
}) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedType) return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      await supabase.auth.getUser();

      // Save vehicle_type_results manually
      await supabase.from("vehicle_type_results").insert({
        claim_id: claimId,
        identified_type: selectedType,
        claim_rejected: false,
        status: "completed",
      });

      await supabase
        .from("claims")
        .update({
          status: "pending",
          ai_verdict: `Vehicle type classified manually by admin: ${selectedType}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", claimId);

      await adminClaimsService.resolveNotificationAndResume(
        notificationId,
        claimId,
        "vehicle_type_classification"
      );

      onResolved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-white/60">
        The AI vehicle-type classification agent failed. Review the images and select the correct vehicle type.
      </p>

      {/* Image strip */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {images.map((img) => {
          const url = adminClaimsService.getImagePublicUrl(img.storage_path);
          return (
            <div key={img.id} className="shrink-0 w-40 rounded-lg overflow-hidden border border-white/10">
              <img src={url} alt={img.file_name} className="aspect-video w-full object-cover" />
            </div>
          );
        })}
      </div>

      {/* Vehicle type grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {VEHICLE_TYPES.map((vt) => (
          <button
            key={vt.code}
            type="button"
            onClick={() => setSelectedType(vt.code)}
            className={`text-left rounded-xl p-3.5 transition-all ${
              selectedType === vt.code
                ? "bg-[#3B82F6]/15 ring-1 ring-[#3B82F6]/40 text-white"
                : "bg-white/[0.03] ring-1 ring-white/8 text-white/60 hover:bg-white/[0.06]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                selectedType === vt.code ? "bg-[#3B82F6]/30 text-[#3B82F6]" : "bg-white/10 text-white/40"
              }`}>
                {vt.code}
              </span>
              <span className="text-sm font-medium">{vt.label}</span>
            </div>
            <p className="text-[11px] text-white/30 mt-1 pl-9">{vt.desc}</p>
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting || !selectedType}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-3 text-sm font-semibold text-white transition-colors"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
        {submitting ? "Saving..." : `Classify as ${selectedType ?? "..."} & Resume Workflow`}
      </button>
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────
const TASK_CONFIG: Record<string, { icon: React.ReactNode; title: string }> = {
  classification: {
    icon: <Eye className="h-5 w-5" />,
    title: "Vehicle Detection — Manual Override",
  },
  same_vehicle: {
    icon: <Car className="h-5 w-5" />,
    title: "Same Vehicle Check — Manual Override",
  },
  same_vehicle_detection: {
    icon: <Car className="h-5 w-5" />,
    title: "Same Vehicle Check — Manual Override",
  },
  vehicle_type_classification: {
    icon: <Tag className="h-5 w-5" />,
    title: "Vehicle Type Classification — Manual Override",
  },
};

export function ManualInterventionPanel({
  notification,
  claimId,
  images,
  onResolved,
}: ManualInterventionPanelProps) {
  const config = TASK_CONFIG[notification.failed_task] ?? {
    icon: <AlertTriangle className="h-5 w-5" />,
    title: `Agent Failed: ${notification.failed_task}`,
  };

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.08] to-amber-500/[0.02] p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
          {config.icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-amber-300">{config.title}</h3>
          <p className="text-xs text-amber-400/60 mt-0.5">
            Agent exhausted all retries • {new Date(notification.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Error summary */}
      <div className="rounded-lg bg-black/30 border border-white/5 p-3">
        <p className="text-[11px] font-medium text-white/30 uppercase tracking-wider mb-1">Error Log</p>
        <p className="text-xs text-red-400/80 font-mono break-all">{notification.message}</p>
      </div>

      {/* Dynamic form based on failed_task */}
      {(notification.failed_task === "classification") && (
        <ClassificationForm
          images={images}
          claimId={claimId}
          notificationId={notification.id}
          onResolved={onResolved}
        />
      )}

      {(notification.failed_task === "same_vehicle" || notification.failed_task === "same_vehicle_detection") && (
        <SameVehicleForm
          images={images}
          claimId={claimId}
          notificationId={notification.id}
          onResolved={onResolved}
        />
      )}

      {notification.failed_task === "vehicle_type_classification" && (
        <VehicleTypeForm
          images={images}
          claimId={claimId}
          notificationId={notification.id}
          onResolved={onResolved}
        />
      )}
    </div>
  );
}
