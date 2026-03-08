import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  AlertTriangle,
  Activity,
  Zap,
  FileSearch,
  Brain,
  ClipboardList,
  Lock,
  CheckCircle,
  GitBranch,
  Clock,
  Database,
  Layers,
} from "lucide-react";

export interface Feature {
  id: string;
  icon: React.ReactNode;
  label: string;
  tag: string;
  headline: string;
  description: string;
  bullets: string[];
  mockup: React.ReactNode;
}

export function UploadMockup() {
  const [animationKey, setAnimationKey] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setAnimationKey((k) => k + 1), 5000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div
      key={animationKey}
      className="relative w-full h-full bg-[#0a0e1a] rounded-xl border border-white/10 overflow-hidden p-6 flex flex-col gap-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-2 text-xs text-white/30 font-mono">
          claim-upload.tsx
        </span>
      </div>
      <div className="border-2 border-dashed border-[#3B82F6]/40 rounded-lg p-4 flex flex-col items-center gap-2 bg-[#3B82F6]/5">
        <Upload className="w-6 h-6 text-[#3B82F6]/60" />
        <span className="text-xs text-white/50">Drop accident photos here</span>
      </div>
      {["accident_front.jpg", "damage_side.jpg", "police_report.pdf"].map(
        (f, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2"
          >
            <div className="w-8 h-8 rounded bg-[#3B82F6]/20 flex items-center justify-center">
              <FileSearch className="w-4 h-4 text-[#3B82F6]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white/70 truncate">{f}</div>
              <div className="w-full h-1 bg-white/10 rounded mt-1 overflow-hidden">
                <motion.div
                  key={animationKey}
                  className="h-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] rounded"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.5 + i * 0.4, delay: i * 0.3 }}
                />
              </div>
            </div>
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>
        ),
      )}
      <div className="mt-auto flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
        <CheckCircle className="w-4 h-4 text-emerald-400" />
        <span className="text-xs text-emerald-300 font-mono">
          Claim ID: CLM-2024-0847 generated
        </span>
      </div>
    </div>
  );
}

export function DisputeMockup() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 3), 2000);
    return () => clearInterval(t);
  }, []);
  const steps = ["Rejected", "Dispute Filed", "Under Review"];
  const colors = ["text-red-400", "text-yellow-400", "text-blue-400"];
  const bgColors = [
    "bg-red-500/10 border-red-500/20",
    "bg-yellow-500/10 border-yellow-500/20",
    "bg-blue-500/10 border-blue-500/20",
  ];
  return (
    <div className="relative w-full h-full bg-[#0a0e1a] rounded-xl border border-white/10 overflow-hidden p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-2 text-xs text-white/30 font-mono">
          dispute-panel.tsx
        </span>
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
          <div
            key={i}
            className="bg-white/5 border border-white/10 rounded-lg p-2 text-center text-xs text-white/50"
          >
            + {label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatusTrackingMockup() {
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
        <span className="ml-2 text-xs text-white/30 font-mono">
          claim-tracker.tsx
        </span>
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
                animate={
                  (s as { active?: boolean }).active
                    ? { scale: [1, 1.2, 1] }
                    : {}
                }
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
                <div
                  className={`w-0.5 h-8 mt-1 ${s.done ? "bg-emerald-500/50" : "bg-white/10"}`}
                />
              )}
            </div>
            <div className="pb-6">
              <div
                className={`text-xs font-medium ${s.done ? "text-white/80" : (s as { active?: boolean }).active ? "text-[#3B82F6]" : "text-white/30"}`}
              >
                {s.label}
              </div>
              {(s as { active?: boolean }).active && (
                <div className="text-xs text-white/40 mt-0.5">
                  In progress • Updated 2s ago
                </div>
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

export function PayoutMockup() {
  return (
    <div className="relative w-full h-full bg-[#0a0e1a] rounded-xl border border-white/10 overflow-hidden p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-2 text-xs text-white/30 font-mono">
          payout-engine.tsx
        </span>
      </div>
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-300">
            Claim Approved
          </span>
        </div>
        <div className="text-2xl font-bold text-white">$14,850.00</div>
        <div className="text-xs text-white/40 mt-1">
          Settlement amount calculated
        </div>
      </div>
      <div className="space-y-2">
        {[
          { label: "Payment API Called", status: "done" },
          { label: "Bank Verification", status: "done" },
          { label: "Transfer Initiated", status: "active" },
          { label: "Funds Deposited", status: "pending" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${
                item.status === "done"
                  ? "bg-emerald-400"
                  : item.status === "active"
                    ? "bg-[#3B82F6] animate-pulse"
                    : "bg-white/20"
              }`}
            />
            <span
              className={`text-xs ${item.status === "pending" ? "text-white/30" : "text-white/60"}`}
            >
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

export function PolicyCheckMockup() {
  return (
    <div className="relative w-full h-full bg-[#0a0e1a] rounded-xl border border-white/10 overflow-hidden p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-2 text-xs text-white/30 font-mono">
          policy-checker.tsx
        </span>
      </div>
      <div className="bg-white/5 rounded-lg p-3 font-mono text-xs text-white/60 space-y-1">
        <div>
          <span className="text-purple-400">policy</span>.coverage ={" "}
          <span className="text-emerald-400">&quot;comprehensive&quot;</span>
        </div>
        <div>
          <span className="text-purple-400">liability</span>.score ={" "}
          <span className="text-yellow-400">87</span>
        </div>
        <div>
          <span className="text-purple-400">limit</span> ={" "}
          <span className="text-yellow-400">$25,000</span>
        </div>
        <div>
          <span className="text-purple-400">damage</span> ={" "}
          <span className="text-yellow-400">$14,850</span>
        </div>
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

export function AIMockup() {
  const [animationKey, setAnimationKey] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setAnimationKey((k) => k + 1), 5000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div
      key={animationKey}
      className="relative w-full h-full bg-[#0a0e1a] rounded-xl border border-white/10 overflow-hidden p-6 flex flex-col gap-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-2 text-xs text-white/30 font-mono">
          ai-liability.json
        </span>
      </div>
      <div className="bg-white/5 rounded-lg p-3 font-mono text-xs space-y-0.5">
        <div className="text-white/30">{"{"}</div>
        <div className="pl-4">
          <span className="text-purple-400">&quot;fault&quot;</span>:{" "}
          <span className="text-emerald-400">
            &quot;Rear-end collision, Driver B&quot;
          </span>
          ,
        </div>
        <div className="pl-4">
          <span className="text-purple-400">&quot;confidence&quot;</span>:{" "}
          <span className="text-yellow-400">94</span>,
        </div>
        <div className="pl-4">
          <span className="text-purple-400">
            &quot;liability_percentage&quot;
          </span>
          : <span className="text-yellow-400">85</span>,
        </div>
        <div className="pl-4">
          <span className="text-purple-400">&quot;reason_code&quot;</span>:{" "}
          <span className="text-emerald-400">&quot;RC-041&quot;</span>
        </div>
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
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "94%" }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </div>
        <div className="text-xs text-white/30">
          ≥ 70% threshold: Auto-processing enabled
        </div>
      </div>
    </div>
  );
}

export function IntakeMockup() {
  return (
    <div className="relative w-full h-full bg-[#0a0e1a] rounded-xl border border-white/10 overflow-hidden p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-2 text-xs text-white/30 font-mono">
          ai-intake.json
        </span>
      </div>
      <div className="text-xs text-white/40 italic bg-white/5 rounded p-2">
        &quot;I was hit from behind on Route 9 at 3:45 PM on March 2nd near the
        grocery store...&quot;
      </div>
      <div className="flex items-center gap-2">
        <div className="h-0.5 flex-1 bg-white/10" />
        <Brain className="w-4 h-4 text-purple-400" />
        <div className="h-0.5 flex-1 bg-white/10" />
      </div>
      <div className="bg-white/5 rounded-lg p-3 font-mono text-xs space-y-0.5">
        <div className="text-white/30">{"{"}</div>
        <div className="pl-4">
          <span className="text-purple-400">&quot;date&quot;</span>:{" "}
          <span className="text-emerald-400">&quot;2024-03-02&quot;</span>,
        </div>
        <div className="pl-4">
          <span className="text-purple-400">&quot;time&quot;</span>:{" "}
          <span className="text-emerald-400">&quot;15:45&quot;</span>,
        </div>
        <div className="pl-4">
          <span className="text-purple-400">&quot;location&quot;</span>:{" "}
          <span className="text-emerald-400">
            &quot;Route 9, near grocery&quot;
          </span>
          ,
        </div>
        <div className="pl-4">
          <span className="text-purple-400">&quot;damage_tags&quot;</span>:{" "}
          <span className="text-yellow-400">
            [&quot;rear bumper&quot;, &quot;trunk&quot;]
          </span>
        </div>
        <div className="text-white/30">{"}"}</div>
      </div>
    </div>
  );
}

export function ReviewMockup() {
  return (
    <div className="relative w-full h-full bg-[#0a0e1a] rounded-xl border border-white/10 overflow-hidden p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-2 text-xs text-white/30 font-mono">
          review-dashboard.tsx
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/70 font-medium">Review Queue</span>
        <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full border border-yellow-500/30">
          3 pending
        </span>
      </div>
      {[
        { id: "CLM-0731", conf: 62, flag: "Low confidence" },
        { id: "CLM-0688", conf: 55, flag: "Ambiguous fault" },
      ].map((item, i) => (
        <div
          key={i}
          className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/70 font-mono">{item.id}</span>
            <span className="text-xs text-yellow-400">{item.flag}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full bg-yellow-500 rounded-full ${item.conf === 62 ? "w-[62%]" : "w-[55%]"}`}
              />
            </div>
            <span className="text-xs text-white/50 font-mono">
              {item.conf}%
            </span>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 py-1 text-xs rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
              Approve
            </button>
            <button className="flex-1 py-1 text-xs rounded bg-red-500/20 text-red-400 border border-red-500/20">
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AuditMockup() {
  return (
    <div className="relative w-full h-full bg-[#0a0e1a] rounded-xl border border-white/10 overflow-hidden p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-2 text-xs text-white/30 font-mono">
          audit-log.tsx
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-purple-400" />
        <span className="text-sm text-white/70 font-medium">
          Immutable Audit Trail
        </span>
      </div>
      <div className="space-y-2 flex-1 overflow-hidden">
        {[
          {
            event: "AI Decision",
            detail: "Liability: 85%",
            conf: "94%",
            time: "09:42:11",
            color: "blue",
          },
          {
            event: "Human Override",
            detail: "Adjuster approved",
            conf: "—",
            time: "10:15:33",
            color: "purple",
          },
          {
            event: "Payout Triggered",
            detail: "$14,850 disbursed",
            conf: "—",
            time: "10:16:01",
            color: "emerald",
          },
        ].map((entry, i) => (
          <div key={i} className="flex gap-3 items-start">
            <div
              className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                entry.color === "blue"
                  ? "bg-blue-400"
                  : entry.color === "purple"
                    ? "bg-purple-400"
                    : "bg-emerald-400"
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70">{entry.event}</span>
                <span className="text-xs text-white/30 font-mono">
                  {entry.time}
                </span>
              </div>
              <div className="text-xs text-white/40">
                {entry.detail}
                {entry.conf !== "—" && ` · conf: ${entry.conf}`}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
        <Database className="w-4 h-4 text-purple-400" />
        <span className="text-xs text-purple-300">
          Tamper-proof · Regulatory compliant
        </span>
      </div>
    </div>
  );
}

export const FEATURES: Feature[] = [
  {
    id: "evidence-upload",
    icon: <Upload className="w-5 h-5" />,
    label: "Evidence Upload",
    tag: "Claimant",
    headline: "Submit evidence in seconds, not days",
    description:
      "Upload accident photos and written descriptions through an asynchronous pipeline. The platform instantly generates a unique Claim ID and triggers automated downstream workflows — no paperwork, no waiting.",
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
    description:
      "When a claim is rejected, claimants can instantly file a dispute with supplemental materials. Disputed claims bypass automated rejection and are escalated directly to human adjuster review.",
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
    description:
      "A live, stage-based progress indicator shows the current state of every claim in real time — from initial evidence analysis through final decision — updating within two seconds of any backend change.",
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
    description:
      "Claim approval instantly calls the payment service API, triggering a direct transfer to the claimant. Every transaction — success or failure — is logged and surfaced on the claimant dashboard.",
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
    description:
      "The system cross-references AI-determined liability findings against the claimant's active policy limits in real time. Covered claims auto-approve; uncovered claims auto-reject — eliminating manual lookups entirely.",
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
    description:
      "The AI engine analyses uploaded evidence and outputs a structured liability assessment with a fault determination, confidence score, liability percentage, and reason code. Claims with confidence below 70% are automatically escalated.",
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
    description:
      "The AI intake engine transforms freeform claimant descriptions and uploaded photos into clean, structured JSON — extracting incident date, time, location, involved parties, and tagging vehicle damage regions automatically.",
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
    description:
      "When AI confidence falls below threshold, claims surface automatically in the adjuster review queue. Adjusters can inspect AI-extracted data, read the AI's reasoning, and override decisions with a full audit trail.",
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
    description:
      "Every AI inference, human override, payout event, and state transition is written to an append-only, tamper-proof audit log. Confidence scores, timestamps, and agent IDs are captured, satisfying regulatory audit requirements.",
    bullets: [
      "Append-only log: all state changes recorded",
      "AI confidence scores stored with each decision",
      "Human overrides logged with adjuster ID + timestamp",
      "Regulatory-ready export at any time",
    ],
    mockup: <AuditMockup />,
  },
];
