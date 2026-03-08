"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import {
  // Shield replaced by favicon logo
  Upload,
  AlertTriangle,
  Activity,
  Zap,
  FileSearch,
  Brain,
  ClipboardList,
  Lock,
  ChevronRight,
  Menu,
  X,
  ArrowRight,
  CheckCircle,
  Eye,
  Database,
  Layers,
  GitBranch,
  Clock,
  Star,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image"; // for site logo

// ─── Types ────────────────────────────────────────────────────────────────────
interface Feature {
  id: string;
  icon: React.ReactNode;
  label: string;
  tag: string;
  headline: string;
  description: string;
  bullets: string[];
  mockup: React.ReactNode;
}

// ─── Feature mockup components ────────────────────────────────────────────────
function UploadMockup() {
  const [animationKey, setAnimationKey] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setAnimationKey(k => k + 1), 5000);
    return () => clearInterval(interval);
  }, []);
  return (
    // keyed container to re-mount every interval
    <div key={animationKey} className="relative w-full h-full bg-[#0a0e1a] rounded-xl border border-white/10 overflow-hidden p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-2 text-xs text-white/30 font-mono">claim-upload.tsx</span>
      </div>
      {/* Drop zone */}
      <div className="border-2 border-dashed border-[#3B82F6]/40 rounded-lg p-4 flex flex-col items-center gap-2 bg-[#3B82F6]/5">
        <Upload className="w-6 h-6 text-[#3B82F6]/60" />
        <span className="text-xs text-white/50">Drop accident photos here</span>
      </div>
      {/* Uploaded items */}
      {["accident_front.jpg", "damage_side.jpg", "police_report.pdf"].map((f, i) => (
        <div key={i} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
          <div className="w-8 h-8 rounded bg-[#3B82F6]/20 flex items-center justify-center">
            <FileSearch className="w-4 h-4 text-[#3B82F6]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-white/70 truncate">{f}</div>
            <div className="w-full h-1 bg-white/10 rounded mt-1 overflow-hidden">
              <motion.div
                key={animationKey}
                className="h-full bg-linear-to-r from-[#3B82F6] to-[#8B5CF6] rounded"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.5 + i * 0.4, delay: i * 0.3 }}
              />
            </div>
          </div>
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
        </div>
      ))}
      {/* Claim ID badge */}
      <div className="mt-auto flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
        <CheckCircle className="w-4 h-4 text-emerald-400" />
        <span className="text-xs text-emerald-300 font-mono">Claim ID: CLM-2024-0847 generated</span>
      </div>
    </div>
  );
}

function DisputeMockup() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 3), 2000);
    return () => clearInterval(t);
  }, []);
  const steps = ["Rejected", "Dispute Filed", "Under Review"];
  const colors = ["text-red-400", "text-yellow-400", "text-blue-400"];
  const bgColors = ["bg-red-500/10 border-red-500/20", "bg-yellow-500/10 border-yellow-500/20", "bg-blue-500/10 border-blue-500/20"];
  return (
    <div className="relative w-full h-full bg-[#0a0e1a] rounded-xl border border-white/10 overflow-hidden p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-2 text-xs text-white/30 font-mono">dispute-panel.tsx</span>
      </div>
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <div className="text-xs text-white/50 mb-1">Claim #CLM-2024-0512</div>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${bgColors[step]} ${colors[step]}`}
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-white/50">
          Add dispute reason...
        </div>
        <button className="px-4 py-2 bg-[#3B82F6] rounded-lg text-xs text-white font-medium">
          Submit
        </button>
      </div>
      <div className="flex items-center gap-2 text-xs text-white/40">
        <GitBranch className="w-3 h-3" />
        Routed to Human Review Escalation
      </div>
      <div className="mt-auto grid grid-cols-3 gap-2">
        {["New Evidence", "Legal Brief", "Photos"].map((label, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-2 text-center text-xs text-white/50">
            + {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusTrackingMockup() {
  const stages = [
    { label: "Evidence Analysis", done: true },
    { label: "Fault Determination", done: true },
    { label: "Policy Verification", active: true },
    { label: "Final Decision", done: false },
  ];
  return (
    <div className="relative w-full h-full bg-[#0a0e1a] rounded-xl border border-white/10 overflow-hidden p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-2 text-xs text-white/30 font-mono">claim-tracker.tsx</span>
      </div>
      <div className="text-sm text-white/70 font-medium">Claim Progress</div>
      <div className="flex flex-col gap-0">
        {stages.map((s, i) => (
          <div key={i} className="flex gap-3 items-start">
            <div className="flex flex-col items-center">
              <motion.div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  s.done
                    ? "bg-emerald-500 border-emerald-500"
                    : (s as { active?: boolean }).active
                    ? "border-[#3B82F6] bg-[#3B82F6]/20"
                    : "border-white/20 bg-white/5"
                }`}
                animate={(s as { active?: boolean }).active ? { scale: [1, 1.2, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                {s.done && <CheckCircle className="w-3 h-3 text-white" />}
                {(s as { active?: boolean }).active && (
                  <motion.div
                    className="w-2 h-2 rounded-full bg-[#3B82F6]"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  />
                )}
              </motion.div>
              {i < stages.length - 1 && (
                <div className={`w-0.5 h-8 mt-1 ${s.done ? "bg-emerald-500/50" : "bg-white/10"}`} />
              )}
            </div>
            <div className="pb-6">
              <div className={`text-xs font-medium ${s.done ? "text-white/80" : (s as { active?: boolean }).active ? "text-[#3B82F6]" : "text-white/30"}`}>
                {s.label}
              </div>
              {(s as { active?: boolean }).active && (
                <div className="text-xs text-white/40 mt-0.5">In progress • Updated 2s ago</div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 bg-[#3B82F6]/10 border border-[#3B82F6]/20 rounded-lg px-3 py-2">
        <Activity className="w-4 h-4 text-[#3B82F6]" />
        <span className="text-xs text-[#3B82F6]">Live updates active</span>
      </div>
    </div>
  );
}

function PayoutMockup() {
  return (
    <div className="relative w-full h-full bg-[#0a0e1a] rounded-xl border border-white/10 overflow-hidden p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-2 text-xs text-white/30 font-mono">payout-engine.tsx</span>
      </div>
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-300">Claim Approved</span>
        </div>
        <div className="text-2xl font-bold text-white">$14,850.00</div>
        <div className="text-xs text-white/40 mt-1">Settlement amount calculated</div>
      </div>
      <div className="space-y-2">
        {[
          { label: "Payment API Called", status: "done" },
          { label: "Bank Verification", status: "done" },
          { label: "Transfer Initiated", status: "active" },
          { label: "Funds Deposited", status: "pending" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full shrink-0 ${
              item.status === "done" ? "bg-emerald-400" :
              item.status === "active" ? "bg-[#3B82F6] animate-pulse" :
              "bg-white/20"
            }`} />
            <span className={`text-xs ${item.status === "pending" ? "text-white/30" : "text-white/60"}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-auto text-xs text-white/30 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Expected in 1–3 business hours
      </div>
    </div>
  );
}

function PolicyCheckMockup() {
  return (
    <div className="relative w-full h-full bg-[#0a0e1a] rounded-xl border border-white/10 overflow-hidden p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-2 text-xs text-white/30 font-mono">policy-checker.tsx</span>
      </div>
      <div className="bg-white/5 rounded-lg p-3 font-mono text-xs text-white/60 space-y-1">
        <div><span className="text-purple-400">policy</span>.coverage = <span className="text-emerald-400">&quot;comprehensive&quot;</span></div>
        <div><span className="text-purple-400">liability</span>.score = <span className="text-yellow-400">87</span></div>
        <div><span className="text-purple-400">limit</span> = <span className="text-yellow-400">$25,000</span></div>
        <div><span className="text-purple-400">damage</span> = <span className="text-yellow-400">$14,850</span></div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50">Coverage Match</span>
          <CheckCircle className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50">Within Limit</span>
          <CheckCircle className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50">Exclusions Check</span>
          <CheckCircle className="w-4 h-4 text-emerald-400" />
        </div>
      </div>
      <div className="mt-auto bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-xs text-emerald-300 font-medium">
        → Auto-Approved: All criteria met
      </div>
    </div>
  );
}

function AIMockup() {
  const [animationKey, setAnimationKey] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setAnimationKey(k => k + 1), 5000);
    return () => clearInterval(interval);
  }, []);
  return (
    // keyed container to force full remount each cycle
    <div key={animationKey} className="relative w-full h-full bg-[#0a0e1a] rounded-xl border border-white/10 overflow-hidden p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-2 text-xs text-white/30 font-mono">ai-liability.json</span>
      </div>
      <div className="bg-white/5 rounded-lg p-3 font-mono text-xs space-y-0.5">
        <div className="text-white/30">{"{"}</div>
        <div className="pl-4"><span className="text-purple-400">&quot;fault&quot;</span>: <span className="text-emerald-400">&quot;Rear-end collision, Driver B&quot;</span>,</div>
        <div className="pl-4"><span className="text-purple-400">&quot;confidence&quot;</span>: <span className="text-yellow-400">94</span>,</div>
        <div className="pl-4"><span className="text-purple-400">&quot;liability_percentage&quot;</span>: <span className="text-yellow-400">85</span>,</div>
        <div className="pl-4"><span className="text-purple-400">&quot;reason_code&quot;</span>: <span className="text-emerald-400">&quot;RC-041&quot;</span></div>
        <div className="text-white/30">{"}"}</div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/50">Confidence Score</span>
          <span className="text-emerald-400 font-mono font-bold">94%</span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            key={animationKey}
            className="h-full bg-linear-to-r from-emerald-500 to-emerald-400 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "94%" }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </div>
        <div className="text-xs text-white/30">≥ 70% threshold: Auto-processing enabled</div>
      </div>
    </div>
  );
}

function IntakeMockup() {
  return (
    <div className="relative w-full h-full bg-[#0a0e1a] rounded-xl border border-white/10 overflow-hidden p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-2 text-xs text-white/30 font-mono">ai-intake.json</span>
      </div>
      <div className="text-xs text-white/40 italic bg-white/5 rounded p-2">
        &quot;I was hit from behind on Route 9 at 3:45 PM on March 2nd near the grocery store...&quot;
      </div>
      <div className="flex items-center gap-2">
        <div className="h-0.5 flex-1 bg-white/10" />
        <Brain className="w-4 h-4 text-purple-400" />
        <div className="h-0.5 flex-1 bg-white/10" />
      </div>
      <div className="bg-white/5 rounded-lg p-3 font-mono text-xs space-y-0.5">
        <div className="text-white/30">{"{"}</div>
        <div className="pl-4"><span className="text-purple-400">&quot;date&quot;</span>: <span className="text-emerald-400">&quot;2024-03-02&quot;</span>,</div>
        <div className="pl-4"><span className="text-purple-400">&quot;time&quot;</span>: <span className="text-emerald-400">&quot;15:45&quot;</span>,</div>
        <div className="pl-4"><span className="text-purple-400">&quot;location&quot;</span>: <span className="text-emerald-400">&quot;Route 9, near grocery&quot;</span>,</div>
        <div className="pl-4"><span className="text-purple-400">&quot;damage_tags&quot;</span>: <span className="text-yellow-400">[&quot;rear bumper&quot;, &quot;trunk&quot;]</span></div>
        <div className="text-white/30">{"}"}</div>
      </div>
    </div>
  );
}

function ReviewMockup() {
  return (
    <div className="relative w-full h-full bg-[#0a0e1a] rounded-xl border border-white/10 overflow-hidden p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-2 text-xs text-white/30 font-mono">review-dashboard.tsx</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/70 font-medium">Review Queue</span>
        <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full border border-yellow-500/30">3 pending</span>
      </div>
      {[
        { id: "CLM-0731", conf: 62, flag: "Low confidence" },
        { id: "CLM-0688", conf: 55, flag: "Ambiguous fault" },
      ].map((item, i) => (
        <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/70 font-mono">{item.id}</span>
            <span className="text-xs text-yellow-400">{item.flag}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full bg-yellow-500 rounded-full ${item.conf === 62 ? "w-[62%]" : "w-[55%]"}`} />
            </div>
            <span className="text-xs text-white/50 font-mono">{item.conf}%</span>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 py-1 text-xs rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">Approve</button>
            <button className="flex-1 py-1 text-xs rounded bg-red-500/20 text-red-400 border border-red-500/20">Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AuditMockup() {
  return (
    <div className="relative w-full h-full bg-[#0a0e1a] rounded-xl border border-white/10 overflow-hidden p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-2 text-xs text-white/30 font-mono">audit-log.tsx</span>
      </div>
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-purple-400" />
        <span className="text-sm text-white/70 font-medium">Immutable Audit Trail</span>
      </div>
      <div className="space-y-2 flex-1 overflow-hidden">
        {[
          { event: "AI Decision", detail: "Liability: 85%", conf: "94%", time: "09:42:11", color: "blue" },
          { event: "Human Override", detail: "Adjuster approved", conf: "—", time: "10:15:33", color: "purple" },
          { event: "Payout Triggered", detail: "$14,850 disbursed", conf: "—", time: "10:16:01", color: "emerald" },
        ].map((entry, i) => (
          <div key={i} className="flex gap-3 items-start">
            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
              entry.color === "blue" ? "bg-blue-400" :
              entry.color === "purple" ? "bg-purple-400" : "bg-emerald-400"
            }`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70">{entry.event}</span>
                <span className="text-xs text-white/30 font-mono">{entry.time}</span>
              </div>
              <div className="text-xs text-white/40">{entry.detail}{entry.conf !== "—" && ` · conf: ${entry.conf}`}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
        <Database className="w-4 h-4 text-purple-400" />
        <span className="text-xs text-purple-300">Tamper-proof · Regulatory compliant</span>
      </div>
    </div>
  );
}

// ─── Feature definitions ──────────────────────────────────────────────────────
const FEATURES: Feature[] = [
  {
    id: "evidence-upload",
    icon: <Upload className="w-5 h-5" />,
    label: "Evidence Upload",
    tag: "Claimant",
    headline: "Submit evidence in seconds, not days",
    description: "Upload accident photos and written descriptions through an asynchronous pipeline. The platform instantly generates a unique Claim ID and triggers automated downstream workflows — no paperwork, no waiting.",
    bullets: [
      "Multi-image + text upload in a single submission",
      "Asynchronous processing with real-time progress",
      "Auto-generated Claim ID for tracking",
      "Immediate workflow event dispatched on upload",
    ],
    mockup: <UploadMockup />,
  },
  {
    id: "claim-dispute",
    icon: <AlertTriangle className="w-5 h-5" />,
    label: "Claim Dispute",
    tag: "Claimant",
    headline: "Challenge rejections with new evidence",
    description: "When a claim is rejected, claimants can instantly file a dispute with supplemental materials. Disputed claims bypass automated rejection and are escalated directly to human adjuster review.",
    bullets: [
      "One-click dispute button on rejected claims",
      "Re-upload new photos, documents, or statements",
      "Bypasses auto-rejection logic",
      "Routed directly to Human Review Escalation",
    ],
    mockup: <DisputeMockup />,
  },
  {
    id: "status-tracking",
    icon: <Activity className="w-5 h-5" />,
    label: "Live Status",
    tag: "Claimant",
    headline: "Know exactly where your claim stands",
    description: "A live, stage-based progress indicator shows the current state of every claim in real time — from initial evidence analysis through final decision — updating within two seconds of any backend change.",
    bullets: [
      "Four visual stages: Evidence Analysis → Final Decision",
      "UI refreshes within 2 seconds of state changes",
      "Session-persistent — claim state survives logout",
      "Push-based updates, no polling required",
    ],
    mockup: <StatusTrackingMockup />,
  },
  {
    id: "auto-payout",
    icon: <Zap className="w-5 h-5" />,
    label: "Auto Payouts",
    tag: "Claimant",
    headline: "Approved claims pay out automatically",
    description: "Claim approval instantly calls the payment service API, triggering a direct transfer to the claimant. Every transaction — success or failure — is logged and surfaced on the claimant dashboard.",
    bullets: [
      "Approval event triggers payment API call",
      "Payout status (success / failure) stored in logs",
      "Claimant-visible payment status in real time",
      "No manual disbursement steps required",
    ],
    mockup: <PayoutMockup />,
  },
  {
    id: "policy-check",
    icon: <FileSearch className="w-5 h-5" />,
    label: "Policy Cross-Check",
    tag: "Adjuster",
    headline: "Automated liability-to-policy verification",
    description: "The system cross-references AI-determined liability findings against the claimant's active policy limits in real time. Covered claims auto-approve; uncovered claims auto-reject — eliminating manual lookups entirely.",
    bullets: [
      "Live query against the policy database",
      "Coverage match → Automatic approval",
      "Coverage gap → Automatic rejection with reason",
      "Full audit record of every policy decision",
    ],
    mockup: <PolicyCheckMockup />,
  },
  {
    id: "ai-liability",
    icon: <Brain className="w-5 h-5" />,
    label: "AI Liability",
    tag: "Adjuster",
    headline: "Structured AI liability scoring at scale",
    description: "The AI engine analyses uploaded evidence and outputs a structured liability assessment with a fault determination, confidence score, liability percentage, and reason code. Claims with confidence below 70% are automatically escalated.",
    bullets: [
      "Structured JSON output: fault, confidence, %, reason",
      "Confidence ≥ 70% → auto-processed",
      "Confidence < 70% → routed to human review",
      "Explainable AI reasoning attached to each decision",
    ],
    mockup: <AIMockup />,
  },
  {
    id: "ai-intake",
    icon: <Layers className="w-5 h-5" />,
    label: "AI Intake",
    tag: "Adjuster",
    headline: "Turn unstructured reports into structured data",
    description: "The AI intake engine transforms freeform claimant descriptions and uploaded photos into clean, structured JSON — extracting incident date, time, location, involved parties, and tagging vehicle damage regions automatically.",
    bullets: [
      "Free-text narrative → structured JSON extraction",
      "Extracts: date, time, location, involved parties",
      "Computer vision damage tagging on uploaded images",
      "Output feeds directly into liability assessment",
    ],
    mockup: <IntakeMockup />,
  },
  {
    id: "manual-review",
    icon: <ClipboardList className="w-5 h-5" />,
    label: "Manual Review",
    tag: "Adjuster",
    headline: "Human oversight where it matters most",
    description: "When AI confidence falls below threshold, claims surface automatically in the adjuster review queue. Adjusters can inspect AI-extracted data, read the AI's reasoning, and override decisions with a full audit trail.",
    bullets: [
      "Claims auto-queued when confidence < 70%",
      "Full AI data + explanation visible to adjuster",
      "One-click approve / reject with override logging",
      "Override decisions stored immutably",
    ],
    mockup: <ReviewMockup />,
  },
  {
    id: "audit-logs",
    icon: <Lock className="w-5 h-5" />,
    label: "Audit Logs",
    tag: "Compliance",
    headline: "Immutable records for every decision",
    description: "Every AI inference, human override, payout event, and state transition is written to an append-only, tamper-proof audit log. Confidence scores, timestamps, and agent IDs are captured, satisfying regulatory audit requirements.",
    bullets: [
      "Append-only log: all state changes recorded",
      "AI confidence scores stored with each decision",
      "Human overrides logged with adjuster ID + timestamp",
      "Regulatory-ready export at any time",
    ],
    mockup: <AuditMockup />,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function useMouseParallax() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      setPos({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);
  return pos;
}

// ─── Reveal wrapper ───────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const links = [
    { label: "Home", href: "/" },
    { label: "Features", href: "#features" },
    { label: "Testimonials", href: "#testimonials" },
    { label: "Contact Us", href: "#contact" },
  ];

  return (
    <motion.header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-[#030712]/80 backdrop-blur-xl border-b border-white/5" : "bg-transparent"
      }`}
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <div className="w-8 h-8 rounded-lg overflow-hidden">
            <Image src="/favicon.png" alt="Logo" width={32} height={32} className="object-cover" />
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">Immaculate Aegis</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => {
            const isHash = l.href.startsWith("#");
            const isHome = l.href === "/";
            if (isHash) {
              return (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.querySelector(l.href);
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                >
                  {l.label}
                </a>
              );
            }
            if (isHome) {
              return (
                <button
                  key={l.label}
                  onClick={(e) => {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                >
                  {l.label}
                </button>
              );
            }
            return (
              <Link
                key={l.label}
                href={l.href}
                className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="px-4 py-2 text-sm bg-white text-black rounded-full font-medium hover:bg-white/90 transition-colors">
            Sign in
          </Link>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-white/60 hover:text-white" onClick={() => setMobileOpen((v) => !v)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#030712]/95 backdrop-blur-xl border-b border-white/5"
          >
            <div className="px-6 py-4 flex flex-col gap-2">
              {links.map((l) => {
                const isHash = l.href.startsWith("#");
                return isHash ? (
                  <a
                    key={l.label}
                    href={l.href}
                    onClick={(e) => {
                      e.preventDefault();
                      const el = document.querySelector(l.href);
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                      setMobileOpen(false);
                    }}
                    className="py-2 text-sm text-white/60 hover:text-white text-left transition-colors"
                  >
                    {l.label}
                  </a>
                ) : (
                  <Link
                    key={l.label}
                    href={l.href}
                    className="py-2 text-sm text-white/60 hover:text-white text-left transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    {l.label}
                  </Link>
                );
              })}
              <div className="flex gap-3 mt-2">
                <Link href="/login" className="flex-1 py-2 text-sm bg-white text-black rounded-lg font-medium text-center" onClick={() => setMobileOpen(false)}>Sign in</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

// ─── Feature sidebar + section ─────────────────────────────────────────────────
function FeatureSidebarSection() {
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // give the top-level wrapper an id so the navbar anchor can jump here


  // Intersection Observer for active section
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    sectionRefs.current.forEach((el, i) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveIdx(i); },
        { threshold: 0.4 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const scrollToFeature = useCallback((i: number) => {
    sectionRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const tagColors: Record<string, string> = {
    Claimant: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    Adjuster: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    Compliance: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  };

  return (
    <div id="features" className="relative max-w-7xl mx-auto px-6">
      <div className="flex gap-8 lg:gap-12">
        {/* Sticky sidebar */}
        <div className="hidden lg:block w-52 xl:w-60 shrink-0">
          <div className="sticky top-28 pt-4">
            <div className="text-xs text-white/30 uppercase tracking-widest font-medium mb-4 px-2">
              Features
            </div>
            <nav className="space-y-0.5">
              {FEATURES.map((f, i) => (
                <button
                  key={f.id}
                  onClick={() => scrollToFeature(i)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 group ${
                    activeIdx === i
                      ? "bg-white/8 text-white"
                      : "text-white/40 hover:text-white/70 hover:bg-white/4"
                  }`}
                >
                  {/* Active indicator line */}
                  <div className={`w-0.5 h-4 rounded-full shrink-0 transition-all duration-300 ${
                    activeIdx === i ? "bg-[#3B82F6]" : "bg-transparent"
                  }`} />
                  <span className={`shrink-0 transition-colors ${activeIdx === i ? "text-[#3B82F6]" : "text-white/30 group-hover:text-white/60"}`}>
                    {f.icon}
                  </span>
                  <span className="text-sm font-medium truncate">{f.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Feature sections */}
        <div ref={containerRef} className="flex-1 min-w-0 space-y-0">
          {FEATURES.map((f, i) => {
            const isEven = i % 2 === 0;
            return (
              <div
                key={f.id}
                ref={(el) => { sectionRefs.current[i] = el; }}
                className="py-20 lg:py-28"
              >
                <div className={`flex flex-col ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"} gap-10 lg:gap-16 items-center`}>
                  {/* Text side */}
                  <Reveal className="flex-1 min-w-0" delay={0.05}>
                    <div className="space-y-5">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${tagColors[f.tag]}`}>
                          {f.tag}
                        </span>
                      </div>
                      <h3 className="text-2xl lg:text-3xl font-semibold text-white leading-tight tracking-tight">
                        {f.headline}
                      </h3>
                      <p className="text-white/50 leading-relaxed text-sm lg:text-base">
                        {f.description}
                      </p>
                      <ul className="space-y-2.5">
                        {f.bullets.map((b, bi) => (
                          <li key={bi} className="flex items-start gap-2.5 text-sm text-white/60">
                            <CheckCircle className="w-4 h-4 text-[#3B82F6] mt-0.5 shrink-0" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Reveal>

                  {/* Mockup side */}
                  <Reveal className="flex-1 min-w-0 w-full" delay={0.15}>
                    <div className="relative w-full aspect-4/3 max-w-lg mx-auto">
                      {/* Glow */}
                      <div className="absolute inset-0 -m-4 rounded-2xl opacity-30 blur-2xl bg-linear-to-br from-[#3B82F6]/40 via-[#8B5CF6]/20 to-transparent" />
                      {f.mockup}
                    </div>
                  </Reveal>
                </div>

                {/* Divider */}
                {i < FEATURES.length - 1 && (
                  <div className="mt-20 lg:mt-28 h-px bg-linear-to-r from-transparent via-white/8 to-transparent" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────
function StatsBar() {
  const stats = [
    { value: "94%", label: "AI accuracy rate" },
    { value: "<2s", label: "Status update latency" },
    { value: "100%", label: "Decision auditability" },
    { value: "0", label: "Manual disbursements" },
  ];
  return (
    <div className="border-y border-white/5 bg-white/2">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div className="text-center">
                <div className="text-3xl font-bold text-white tracking-tight">{s.value}</div>
                <div className="text-sm text-white/40 mt-1">{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: "01", icon: <Upload className="w-5 h-5" />, title: "Claimant Submits", desc: "Photos and incident description uploaded asynchronously." },
    { n: "02", icon: <Brain className="w-5 h-5" />, title: "AI Analyses", desc: "Intake engine extracts structured data; liability engine scores fault." },
    { n: "03", icon: <Eye className="w-5 h-5" />, title: "Policy Verified", desc: "Coverage cross-checked automatically against the policy database." },
    { n: "04", icon: <Zap className="w-5 h-5" />, title: "Decision & Payout", desc: "Auto-approval triggers instant payment. Low-confidence claims go to human review." },
  ];
  return (
    <div className="max-w-7xl mx-auto px-6 py-24">
      <Reveal>
        <div className="text-center mb-16">
          <div className="text-xs text-white/30 uppercase tracking-widest font-medium mb-3">Workflow</div>
          <h2 className="text-3xl lg:text-4xl font-semibold text-white tracking-tight">How a claim flows through the platform</h2>
        </div>
      </Reveal>
      <div className="relative">
        {/* Connecting line */}
        <div className="hidden lg:block absolute top-10 left-[calc(12.5%-1px)] right-[calc(12.5%-1px)] h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {steps.map((s, i) => (
            <Reveal key={i} delay={i * 0.12}>
              <div className="flex flex-col items-center text-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#3B82F6]">
                    {s.icon}
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#0a0e1a] border border-white/10 flex items-center justify-center text-xs font-mono text-white/30">
                    {s.n}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white mb-1">{s.title}</div>
                  <div className="text-xs text-white/40 leading-relaxed">{s.desc}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Testimonials section ─────────────────────────────────────────────────────
function TestimonialsSection() {
  const testimonials = [
    {
      name: "Sarah Mitchell",
      role: "Claims Manager, InsureTech Co.",
      rating: 5,
      text: "Immaculate Aegis has transformed how we process claims. The AI accuracy is remarkable, and our customers receive decisions in hours instead of weeks. Highly recommended.",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    },
    {
      name: "James Rodriguez",
      role: "Director of Operations, Premier Insurance",
      rating: 5,
      text: "The platform's auditability features have simplified our compliance requirements significantly. Every decision is traceable and explainable. A game-changer for enterprise operations.",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    },
    {
      name: "Emily Chen",
      role: "CEO, FastClaim Solutions",
      rating: 5,
      text: "The ROI has been exceptional. We've reduced claims processing time by 75% while improving accuracy. Our customers are thrilled with the speed and transparency.",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
    },
  ];

  return (
    <div id="testimonials" className="max-w-7xl mx-auto px-6 py-24">
      <Reveal>
        <div className="text-center mb-16">
          <div className="text-xs text-white/30 uppercase tracking-widest font-medium mb-3">Testimonials</div>
          <h2 className="text-3xl lg:text-4xl font-semibold text-white tracking-tight">Loved by industry leaders</h2>
        </div>
      </Reveal>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {testimonials.map((t, i) => (
          <Reveal key={i} delay={i * 0.1}>
            <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-white/5 to-white/2 border border-white/10 p-8 flex flex-col h-full hover:border-white/20 transition-colors">
              {/* Ambient glow */}
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-[#3B82F6]/10 rounded-full blur-2xl" />
              
              <div className="relative z-10">
                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                {/* Testimonial text */}
                <p className="text-white/70 leading-relaxed mb-8 flex-1">&quot;{t.text}&quot;</p>

                {/* User info */}
                <div className="flex items-center gap-4">
                  <Image src={t.image} alt={t.name} width={56} height={56} className="w-14 h-14 rounded-full object-cover border border-white/10" />
                  <div>
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    <div className="text-xs text-white/40">{t.role}</div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

// ─── Contact section ──────────────────────────────────────────────────────────
function ContactSection() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });

  return (
    <div id="contact" className="max-w-7xl mx-auto px-6 py-24">
      <Reveal>
        <div className="text-center mb-16">
          <div className="text-xs text-white/30 uppercase tracking-widest font-medium mb-3">Get in touch</div>
          <h2 className="text-3xl lg:text-4xl font-semibold text-white tracking-tight mb-4">Contact us</h2>
          <p className="text-white/40 max-w-xl mx-auto text-sm leading-relaxed">
            Have questions? Our team is ready to help. Reach out through any channel that works best for you.
          </p>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
        {/* Contact info cards */}
        <Reveal delay={0.1}>
          <div className="bg-linear-to-br from-white/5 to-white/2 border border-white/10 rounded-2xl p-8 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6]">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-white">Address</h3>
              </div>
              <p className="text-white/60 text-base lg:text-lg leading-relaxed flex-1">
                FAST-NUCES, 852-B Milaad St<br />
                Block B Faisal Town, Lahore, 54770<br />
                Pakistan
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="bg-linear-to-br from-white/5 to-white/2 border border-white/10 rounded-2xl p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-lg bg-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6]">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">Contact</h3>
            </div>
            <div className="space-y-3 text-sm">
              <fieldset className="text-white/60 border-none p-0 m-0">
                <legend className="text-white/40 mb-2">Contacts</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <a href="mailto:l233023@lhr.nu.edu.pk" className="text-[#3B82F6] hover:text-[#3B82F6]/80 block">
                      l233023@lhr.nu.edu.pk
                    </a>
                    <span className="text-white/70 block">Syed Hadi Zaidi</span>
                  </div>
                  <div>
                    <a href="mailto:l233022@lhr.nu.edu.pk" className="text-[#3B82F6] hover:text-[#3B82F6]/80 block">
                      l233022@lhr.nu.edu.pk
                    </a>
                    <span className="text-white/70 block">Muhammad Mazan</span>
                  </div>
                  <div>
                    <a href="mailto:l233104@lhr.nu.edu.pk" className="text-[#3B82F6] hover:text-[#3B82F6]/80 block">
                      l233104@lhr.nu.edu.pk
                    </a>
                    <span className="text-white/70 block">Muhammad Ahmad</span>
                  </div>
                  <div>
                    <a href="mailto:l233080@lhr.nu.edu.pk" className="text-[#3B82F6] hover:text-[#3B82F6]/80 block">
                      l233080@lhr.nu.edu.pk
                    </a>
                    <span className="text-white/70 block">Abdullah Lafit</span>
                  </div>
                </div>
              </fieldset>
              <p className="text-white/60">
                <span className="text-white/40">Phone:</span><br />
                <a href="tel:+923193705678" className="text-[#3B82F6] hover:text-[#3B82F6]/80">
                  0319-3705678
                </a>
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.3}>
          <div className="bg-linear-to-br from-white/5 to-white/2 border border-white/10 rounded-2xl p-8 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6]">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-white">Hours</h3>
              </div>
              <p className="text-white/60 text-base lg:text-lg leading-relaxed flex-1">
                Monday – Friday<br />
                9:00 AM – 6:00 PM PT<br />
                <span className="text-white/40">Support 24/7</span>
              </p>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Contact form and map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <Reveal delay={0.1}>
          <div className="bg-linear-to-br from-white/5 to-white/2 border border-white/10 rounded-2xl p-8">
            <h3 className="text-lg font-semibold text-white mb-6">Send us a message</h3>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setFormData({ name: "", email: "", message: "" }); }}>
              <div>
                <label className="block text-sm text-white/60 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your name"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-[#3B82F6]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-[#3B82F6]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">Message</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Your message..."
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-[#3B82F6]/50 transition-colors resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-linear-to-r from-[#3B82F6] to-[#8B5CF6] text-white rounded-lg px-6 py-3 font-medium hover:shadow-lg hover:shadow-[#3B82F6]/20 transition-all"
              >
                Send message
              </button>
            </form>
          </div>
        </Reveal>

        {/* Map */}
        <Reveal delay={0.2}>
          <div className="bg-linear-to-br from-white/5 to-white/2 border border-white/10 rounded-2xl overflow-hidden h-full min-h-96">
            <iframe
              title="FAST NUCES Lahore map"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3382.0636835482545!2d74.3030141!3d31.4815212!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x391903f08ebc7e8b%3A0x47e934f4cd34790!2sFAST%20NUCES%20Lahore!5e0!3m2!1sen!2s!4v1709800000000"
              width="100%"
              height="100%"
              className="border-0 min-h-100"
              allowFullScreen={true}
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </Reveal>
      </div>
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  const cols = [
    { heading: "Platform", links: ["Overview", "AI Engine", "Integrations", "Security", "Changelog"] },
    { heading: "Solutions", links: ["Auto Insurance", "Property Claims", "Liability", "Enterprise"] },
    { heading: "Developers", links: ["Documentation", "API Reference", "SDKs", "Status"] },
    { heading: "Company", links: ["About", "Blog", "Careers", "Contact", "Legal"] },
  ];
  return (
    <footer className="border-t border-white/5 bg-[#030712]">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand column */}
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg overflow-hidden">
                <Image src="/favicon.png" alt="Logo" width={32} height={32} className="object-cover" />
              </div>
              <span className="text-white font-semibold text-sm">Immaculate Aegis</span>
            </div>
            <p className="text-xs text-white/30 leading-relaxed">
              AI-driven insurance claims processing built for the modern era.
            </p>
          </div>
          {cols.map((col) => (
            <div key={col.heading}>
              <div className="text-xs text-white/30 uppercase tracking-widest font-medium mb-4">{col.heading}</div>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l}>
                    <button className="text-sm text-white/40 hover:text-white/70 transition-colors">{l}</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between gap-4">
          <div className="text-xs text-white/20">© 2024 Immaculate Aegis. All rights reserved.</div>
          <div className="flex gap-6">
            {["Privacy", "Terms", "Cookies"].map((l) => (
              <button key={l} className="text-xs text-white/20 hover:text-white/50 transition-colors">{l}</button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const mouse = useMouseParallax();
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, 120]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#030712]">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-size-[60px_60px]" />

      {/* Radial glow — follows mouse */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 50% at ${50 + mouse.x * 5}% ${40 + mouse.y * 5}%, rgba(59,130,246,0.12) 0%, transparent 70%)`,
        }}
      />

      {/* Secondary glow */}
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#8B5CF6]/8 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        className="relative z-10 max-w-5xl mx-auto px-6 text-center"
        style={{ y: heroY, opacity: heroOpacity }}
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-white/50 mb-8"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Introducing AI Insurance Register — now in early access
          <ChevronRight className="w-3 h-3" />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-white tracking-tight leading-[1.07] mb-6"
        >
          Claims settled
          <br />
          <span className="text-transparent bg-clip-text bg-linear-to-r from-[#3B82F6] via-[#6366F1] to-[#8B5CF6]">
            by intelligence
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="text-lg text-white/40 max-w-2xl mx-auto leading-relaxed mb-10"
        >
          Immaculate Aegis is an AI-native insurance register — from evidence upload to automatic payout, every step is orchestrated, audited, and explainable.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.44, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link href="/login" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-black rounded-full font-medium text-sm hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98]">
            File a claim <ArrowRight className="w-4 h-4" />
          </Link>
          <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-white/10 text-white/70 rounded-full text-sm hover:bg-white/5 hover:text-white transition-all hover:border-white/20">
            See how it works <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-6 text-xs text-white/20"
        >
          {["SOC 2 Type II", "GDPR Compliant", "ISO 27001", "End-to-end encrypted"].map((b) => (
            <div key={b} className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-white/20" />
              {b}
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-[#030712] to-transparent pointer-events-none" />
    </section>
  );
}

// ─── Features intro banner ────────────────────────────────────────────────────
function FeaturesIntro() {
  return (
    <div className="max-w-7xl mx-auto px-6 pt-20 pb-12">
      <Reveal>
        <div className="text-center">
          <div className="text-xs text-white/30 uppercase tracking-widest font-medium mb-3">Platform capabilities</div>
          <h2 className="text-3xl lg:text-4xl font-semibold text-white tracking-tight mb-4">
            Everything a modern claims platform needs
          </h2>
          <p className="text-white/40 max-w-xl mx-auto text-sm leading-relaxed">
            Nine integrated capabilities — built for claimants, adjusters, and compliance teams — working together inside a single intelligent platform.
          </p>
        </div>
      </Reveal>
    </div>
  );
}

// ─── Root page ────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <div className="bg-[#030712] min-h-screen">
      <Navbar />
      <Hero />
      <StatsBar />
      <HowItWorks />
      <FeaturesIntro />
      <FeatureSidebarSection />
      <TestimonialsSection />
      <ContactSection />
      <Footer />
    </div>
  );
}

