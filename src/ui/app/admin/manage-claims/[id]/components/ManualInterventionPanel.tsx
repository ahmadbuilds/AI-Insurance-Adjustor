"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, Car, Eye, Tag, Loader2, ShieldAlert, FileText, ChevronRight, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { adminClaimsService } from "../../services/admin-claims.service";
import { createClient } from "@/lib/supabase/client";
import type { AdminNotification, ClaimImage } from "../../types/admin-claims.types";

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

const VEHICLE_PARTS = [
  "No Damage",
  "Front Bumper",
  "Rear Bumper",
  "Hood",
  "Trunk",
  "Left Fender",
  "Right Fender",
  "Left Quarter Panel",
  "Right Quarter Panel",
  "Left Front Door",
  "Right Front Door",
  "Left Rear Door",
  "Right Rear Door",
  "Windshield",
  "Rear Window",
  "Roof",
  "Wheels/Tires",
  "Other"
];

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

     
      for (const [imageId, isVehicle] of Object.entries(results)) {
        await supabase
          .from("claim_images")
          .update({ is_vehical: isVehicle })
          .eq("id", imageId);
      }

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
       
        await supabase
          .from("claims")
          .update({
            status: "pending",
            ai_verdict: "Classification completed manually by admin.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", claimId);
      }

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


function DamageDetectionForm({
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [damageData, setDamageData] = useState<Record<string, { part: string; description: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentImage = images[currentIndex];
  const isLastImage = currentIndex === images.length - 1;

  const handleNext = () => {
    if (currentIndex < images.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Format damage details
      const damageDetails = Object.entries(damageData)
        .filter(([_, data]) => data.part && data.part !== "No Damage")
        .map(([imgId, data]) => ({
          image_id: imgId,
          part: data.part,
          damage_type: "Manual",
          severity: "Unknown",
          description: data.description,
        }));

      const hasDamage = damageDetails.length > 0;

      // Save damage_detection_results manually
      await supabase.from("damage_detection_results").insert({
        claim_id: claimId,
        user_id: user?.id,
        images_analyzed: images.length,
        images_with_damage: damageDetails.length,
        claim_rejected: !hasDamage,
        damage_details: damageDetails,
        damage_summary: hasDamage ? "Damage manually recorded by admin." : "No damage recorded.",
        status: "completed",
      });

      await supabase
        .from("claims")
        .update({
          status: hasDamage ? "pending" : "rejected",
          ai_verdict: hasDamage 
            ? "Damage details manually classified by admin." 
            : "Rejected by admin: No damage detected.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", claimId);

      await adminClaimsService.resolveNotificationAndResume(
        notificationId,
        claimId,
        "damage_detection"
      );

      onResolved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentImage) return null;
  const currentData = damageData[currentImage.id] || { part: "", description: "" };

  return (
    <div className="space-y-5">
      <p className="text-sm text-white/60">
        The AI damage detection agent failed. Review the images one by one and record the damaged parts.
      </p>

      <div className="flex flex-col md:flex-row gap-5">
        {/* Left: Image Carousel */}
        <div className="flex-1 space-y-3">
          <div className="aspect-video w-full rounded-xl overflow-hidden border border-white/10 bg-black/40 relative">
            <img 
              src={adminClaimsService.getImagePublicUrl(currentImage.storage_path)} 
              alt={currentImage.file_name} 
              className="h-full w-full object-contain" 
            />
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded text-xs font-medium text-white border border-white/10">
              Image {currentIndex + 1} of {images.length}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <button 
              onClick={handlePrev} 
              disabled={currentIndex === 0}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium disabled:opacity-30 flex items-center gap-1"
            >
              <ChevronLeft className="h-3 w-3" /> Prev
            </button>
            <div className="flex gap-1.5">
              {images.map((img, idx) => (
                <div key={img.id} className={`h-1.5 rounded-full transition-all ${idx === currentIndex ? "w-4 bg-emerald-400" : "w-1.5 bg-white/20"}`} />
              ))}
            </div>
            <button 
              onClick={handleNext} 
              disabled={isLastImage}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium disabled:opacity-30 flex items-center gap-1"
            >
              Next <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Right: Input Form */}
        <div className="w-full md:w-72 space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">Vehicle Part</label>
            <select
              value={currentData.part}
              title="Select the damaged part of the vehicle shown in this image. If there is no visible damage, select 'No Damage'."
              onChange={(e) => setDamageData(prev => ({ ...prev, [currentImage.id]: { ...currentData, part: e.target.value } }))}
              className="w-full bg-white/[0.03] border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="" disabled>Select a part...</option>
              {VEHICLE_PARTS.map(part => (
                <option key={part} value={part} className="bg-gray-900">{part}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">Description</label>
            <textarea
              value={currentData.description}
              onChange={(e) => setDamageData(prev => ({ ...prev, [currentImage.id]: { ...currentData, description: e.target.value } }))}
              placeholder="e.g. Large dent and paint scratch..."
              className="w-full h-28 bg-white/[0.03] border border-white/10 rounded-lg p-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 resize-none"
              disabled={currentData.part === "No Damage"}
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-3 text-sm font-semibold text-white transition-colors"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
        {submitting ? "Saving..." : "Submit All Damages & Resume Workflow"}
      </button>
    </div>
  );
}


function RAGAgentForm({
  claimId,
  notificationId,
  onResolved,
}: {
  claimId: string;
  notificationId: string;
  onResolved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [liabilityResult, setLiabilityResult] = useState<any>(null);
  const [coverages, setCoverages] = useState<string[]>([]);
  const [loadingContext, setLoadingContext] = useState(true);

  const [selectedPolicy, setSelectedPolicy] = useState("");
  const [amount, setAmount] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        // Fetch liability result
        const { data: liab } = await supabase
          .from("liability_results")
          .select("*")
          .eq("claim_id", claimId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setLiabilityResult(liab);

        // Fetch dynamic coverages from backend
        const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const res = await fetch(`${FASTAPI_URL}/policy/coverages`, {
            headers: { Authorization: `Bearer ${session.access_token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.coverages) setCoverages(data.coverages);
          }
        }
      } catch (err) {
        console.error("Failed to load RAG context", err);
      } finally {
        setLoadingContext(false);
      }
    }
    loadData();
  }, [claimId]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (isRejecting) {
        if (!rejectionReason) throw new Error("Rejection reason is required.");
        
        // Use the existing resolve RAG endpoint to reject
        await adminClaimsService.resolveRAGDecision(claimId, "rejected", rejectionReason);
      } else {
        if (!selectedPolicy || !amount) throw new Error("Policy and amount are required.");
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount < 0) throw new Error("Invalid compensation amount.");

        await supabase.from("rag_results").insert({
          claim_id: claimId,
          user_id: user?.id,
          policy_covered: true,
          coverage_type: selectedPolicy,
          compensation_amount: parsedAmount,
          coverage_reasoning: "Manually approved by admin due to technical failure.",
          recommendation: "approve_payment",
          needs_admin_review: false,
          admin_action: "payment_approved",
          status: "completed",
        });

        await adminClaimsService.resolveRAGDecision(claimId, "payment_approved");
      }

      // Mark notification as resolved
      await supabase
        .from("admin_notifications")
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq("id", notificationId);

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
        The AI RAG policy assessment agent failed. Review the previous liability results and manually determine coverage and compensation.
      </p>

      {/* Context Panel */}
      {loadingContext ? (
        <div className="animate-pulse h-20 bg-white/5 rounded-xl" />
      ) : liabilityResult ? (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-white/50 mb-2">
            <FileText className="h-4 w-4" /> 
            <span className="font-semibold text-white/80">Previous Agent Context (Liability)</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-white/40 text-xs">Scenario Plausibility</p>
              <p className="text-white/90 capitalize">{liabilityResult.scenario_plausibility}</p>
            </div>
            <div>
              <p className="text-white/40 text-xs">Confidence</p>
              <p className="text-white/90">{liabilityResult.confidence_percentage}%</p>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-white/40 text-xs">Reasoning</p>
            <p className="text-white/80 text-xs leading-relaxed mt-1 line-clamp-3" title={liabilityResult.overall_reasoning}>
              {liabilityResult.overall_reasoning}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">Applicable Policy</label>
          <select
            value={selectedPolicy}
            title="Select the coverage type that applies to this claim based on the policy details and claim context."
            onChange={(e) => setSelectedPolicy(e.target.value)}
            disabled={isRejecting}
            className="w-full bg-white/[0.03] border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 disabled:opacity-50"
          >
            <option value="" disabled>Select coverage...</option>
            {coverages.length > 0 ? (
              coverages.map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)
            ) : (
              <>
                <option value="Collision Damage" className="bg-gray-900">Collision Damage</option>
                <option value="Comprehensive" className="bg-gray-900">Comprehensive</option>
                <option value="Third-Party Liability" className="bg-gray-900">Third-Party Liability</option>
              </>
            )}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">Compensation Amount ($)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isRejecting}
            placeholder="0.00"
            className="w-full bg-white/[0.03] border border-white/10 rounded-lg p-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 disabled:opacity-50"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 my-2">
        <input 
          type="checkbox" 
          id="rejectClaim" 
          checked={isRejecting} 
          onChange={(e) => setIsRejecting(e.target.checked)}
          className="rounded border-white/20 bg-white/5"
        />
        <label htmlFor="rejectClaim" className="text-sm font-medium text-red-400 cursor-pointer">
          Reject Claim Instead
        </label>
      </div>

      {isRejecting && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pt-2">
          <label className="block text-xs font-medium text-red-400/80 mb-1.5">Rejection Reason</label>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Explain why the policy does not cover this claim..."
            className="w-full h-24 bg-red-500/5 border border-red-500/20 rounded-lg p-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 resize-none"
          />
        </motion.div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting || (!isRejecting && (!selectedPolicy || !amount)) || (isRejecting && !rejectionReason)}
        className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
          isRejecting ? "bg-red-600 hover:bg-red-500" : "bg-emerald-600 hover:bg-emerald-500"
        }`}
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
        {submitting ? "Saving..." : isRejecting ? "Confirm Rejection" : "Approve Compensation"}
      </button>
    </div>
  );
}


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
  damage_detection: {
    icon: <AlertTriangle className="h-5 w-5" />,
    title: "Damage Detection — Manual Override",
  },
  rag_assessment: {
    icon: <ShieldAlert className="h-5 w-5" />,
    title: "Policy Assessment (RAG) — Manual Override",
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

      {notification.failed_task === "damage_detection" && (
        <DamageDetectionForm
          images={images}
          claimId={claimId}
          notificationId={notification.id}
          onResolved={onResolved}
        />
      )}

      {(notification.failed_task === "rag_assessment" || notification.failed_task === "rag") && (
        <RAGAgentForm
          claimId={claimId}
          notificationId={notification.id}
          onResolved={onResolved}
        />
      )}
    </div>
  );
}
