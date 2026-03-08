"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitBranch,
  CheckCircle,
  Upload,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import Navbar from "@/components/Navbar";

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

export default function DisputePanelPage() {
  const [stepIndex, setStepIndex] = useState(1); // Start at "Dispute Filed"
  const [disputeReason, setDisputeReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [attachments, setAttachments] = useState<Record<string, File | null>>({
    evidence: null,
    brief: null,
    photos: null,
  });

  const currentStep = DISPUTE_STEPS[stepIndex];
  const stepStyle = STEP_COLORS[currentStep];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setStepIndex(2); // Move to "Under Review"
  };

  const handleAttachment = (id: string, file: File | null) => {
    setAttachments((prev) => ({ ...prev, [id]: file }));
  };

  return (
    <div className="relative min-h-screen bg-[#030712] overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:60px_60px]" />

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
        <div className="relative w-full rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] overflow-hidden p-8 sm:p-10 lg:p-12 flex flex-col gap-8">
          {/* Claim info + status */}
          <div className="bg-white/5 rounded-xl p-5 sm:p-6 border border-white/10">
            <div className="text-sm text-white/50 mb-3">Claim #CLM-2024-0512</div>
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
                  disabled={submitted}
                />
              </div>
              <button
                type="submit"
                disabled={submitted}
                className="shrink-0 px-8 py-4 bg-[#3B82F6] hover:bg-[#3B82F6]/90 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl text-base font-medium text-white transition-colors"
              >
                {submitted ? "Submitted" : "Submit"}
              </button>
            </div>

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
                    accept={id === "photos" ? "image/*" : "*"}
                    onChange={(e) => handleAttachment(id, e.target.files?.[0] ?? null)}
                    disabled={submitted}
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
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-5 py-4">
              <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
              <span className="text-base text-emerald-300">
                Dispute submitted. Your claim has been escalated for human review. You will be notified when there is an update.
              </span>
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
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030712] to-transparent" />
    </div>
  );
}
