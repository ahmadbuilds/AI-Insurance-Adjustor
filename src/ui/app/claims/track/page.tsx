"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import Navbar from "@/components/Navbar";
import { LoadingShield } from "@/components/LoadingShield";
import { motion } from "framer-motion";
import { CheckCircle2, CircleDashed, ArrowRight, ChevronDown } from "lucide-react";

type Claim = {
  id: string;
  title: string;
  description: string;
  status: string;
  ai_verdict: string | null;
  created_at: string;
};

type ProgressEvent = {
  id: string;
  msg: string;
  time: string;
};

const AGENT_PIPELINE_MAP: Record<string, string> = {
  "Classification": "Checking Images",
  "Same Vehicle": "Comparing Vehicles",
  "Vehicle Type": "Identifying Vehicle",
  "Damage": "Detecting Damage",
  "Pipeline Summary": "Summarizing Results",
  "Liability": "Assessing Liability",
  "RAG": "Reviewing Policy",
};

const AGENT_PIPELINE = Object.keys(AGENT_PIPELINE_MAP);

export default function TrackClaimPage() {
  const router = useRouter();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activityLogOpen, setActivityLogOpen] = useState(false);
  const [progressEvents, setProgressEvents] = useState<Record<string, ProgressEvent[]>>({});
  const [activeAgents, setActiveAgents] = useState<Record<string, string | null>>({});

  useEffect(() => {
    async function loadClaims() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }
      
      const { data } = await supabase
        .from("claims")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const sorted = data.sort((a, b) => {
          const aPending = ["in_queue", "processing"].includes(a.status) ? 1 : 0;
          const bPending = ["in_queue", "processing"].includes(b.status) ? 1 : 0;
          return bPending - aPending; 
        });
        
        setClaims(sorted);
        setActiveClaimId(sorted[0].id);
      }
      setLoading(false);
    }
    
    loadClaims();
  }, [router]);

  useEffect(() => {
    let socket: Socket | null = null;
    
    if (claims.length > 0) {
      const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://127.0.0.1:8000";
      socket = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
        reconnectionAttempts: 5,
      });

      socket.on("connect", () => {
        console.log("Socket connected for tracking claim progress");
      });

      socket.on("claim_progress", (data: { claim_id: string; message: string; active_agent?: string }) => {
       
        let currentAgent = data.active_agent || null;
        if (!currentAgent) {
          const lowerMsg = data.message.toLowerCase();
          for (const agent of AGENT_PIPELINE) {
            if (lowerMsg.includes(agent.toLowerCase()) || lowerMsg.replace(/ /g, "_").includes(agent.toLowerCase().replace(/ /g, "_"))) {
              currentAgent = agent;
              break;
            }
          }
        }

        setProgressEvents((prev) => ({
          ...prev,
          [data.claim_id]: [
            ...(prev[data.claim_id] || []),
            { id: Math.random().toString(), msg: data.message, time: new Date().toISOString() },
          ],
        }));

        if (currentAgent) {
          setActiveAgents((prev) => ({ ...prev, [data.claim_id]: currentAgent }));
        }
      });
      
      const intervalId = setInterval(async () => {
        const supabase = createClient();
        if (activeClaimId) {
          const { data } = await supabase
            .from("claims")
            .select("*")
            .eq("id", activeClaimId)
            .single();
          
          if (data) {
            setClaims(prev => prev.map(c => c.id === data.id ? data : c));
          }
        }
      }, 5000);

      return () => {
        socket?.disconnect();
        clearInterval(intervalId);
      };
    }
  }, [claims.length, activeClaimId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex flex-col text-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <LoadingShield className="w-10 h-10 animate-pulse" color="#3B82F6" />
        </div>
      </div>
    );
  }

  if (claims.length === 0) {
    return (
      <div className="relative min-h-screen bg-[#030712] overflow-hidden font-sans">
        {/* Grid and Glows */}
        <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#3B82F6]/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-[#8B5CF6]/8 blur-3xl" />
        </div>

        <Navbar />
        
        <main className="relative mx-auto w-full max-w-6xl px-4 md:px-8 py-8 md:py-14">
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/8 text-xs text-white/70 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse inline-block" />
              Claim Tracking
            </div>
            <h1 className="text-3xl font-semibold text-white tracking-tight">
              Track your claim progress
            </h1>
            <p className="mt-2 text-sm text-white/60 leading-relaxed max-w-xl">
              Select an active claim to monitor its real-time AI evaluation pipeline.
            </p>
          </div>
          
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
              <CheckCircle2 className="h-6 w-6 text-white/20" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/60">
                No active claims
              </p>
              <p className="text-xs text-white/30 mt-1">
                You have no claims currently being evaluated. Submit a claim to start tracking.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const calculateDerivedAgent = (claim: Claim) => {
    if (claim.status === "approved" || claim.status === "rejected") return "Completed";
    if (claim.status === "under_review" || claim.ai_verdict) {
      const lowerVerdict = (claim.ai_verdict || "").toLowerCase();
      if (lowerVerdict.includes("classification")) return "Classification";
      if (lowerVerdict.includes("same vehicle")) return "Same Vehicle";
      if (lowerVerdict.includes("vehicle type")) return "Vehicle Type";
      if (lowerVerdict.includes("damage")) return "Damage";
      if (lowerVerdict.includes("pipeline") || lowerVerdict.includes("summary")) return "Pipeline Summary";
      if (lowerVerdict.includes("liability")) return "Liability";
      if (lowerVerdict.includes("policy") || lowerVerdict.includes("rag")) return "RAG";
     
      return claim.status === "under_review" ? "Liability" : "Classification";
    }
    return "Classification";
  };

  const generateHistoricalEvents = (claim: Claim): ProgressEvent[] => {
    if (claim.status === "in_queue" && !claim.ai_verdict) return [];
    
    const events: ProgressEvent[] = [];
    events.push({
      id: "initial_" + claim.id,
      msg: `Claim synced from database. Current status: ${claim.status.replace(/_/g, " ").toUpperCase()}`,
      time: claim.created_at
    });

    if (claim.ai_verdict) {
      events.push({
        id: "verdict_" + claim.id,
        msg: `Pipeline state: ${claim.ai_verdict}`,
        time: new Date().toISOString() 
      });
    }
    return events;
  };

  const activeClaim = claims.find(c => c.id === activeClaimId) || claims[0];
  const currentEvents = progressEvents[activeClaim.id] && progressEvents[activeClaim.id].length > 0 
    ? progressEvents[activeClaim.id] 
    : generateHistoricalEvents(activeClaim);

  const currentAgent = activeAgents[activeClaim.id] || calculateDerivedAgent(activeClaim);

  const getAgentStatus = (agentName: string) => {
    if (activeClaim.status === "approved" || activeClaim.status === "rejected") return "completed";
    
    const agentIdx = AGENT_PIPELINE.findIndex(a => a === agentName);
    const currIdx = AGENT_PIPELINE.findIndex(a => a === currentAgent);

    if (currentAgent === "Completed") return "completed";
    if (activeClaim.status === "under_review" && currIdx === agentIdx) return "active"; // It paused here
    if (currIdx > agentIdx) return "completed";
    if (currIdx === agentIdx) return "active";
    return "pending";
  };

  return (
    <div className="relative min-h-screen bg-[#030712] flex flex-col">
      <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:60px_60px]" />
      
      {/* Radial glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#3B82F6]/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-[#8B5CF6]/8 blur-3xl" />
      </div>

      <Navbar />

      <main className="relative mx-auto w-full max-w-6xl px-4 md:px-8 py-6 md:py-10 flex flex-col min-h-[calc(100vh-64px)] md:h-[calc(100vh-64px)]">
        {/* Header with Dropdown */}
        <div className="mb-6 md:mb-8 shrink-0 flex flex-col md:flex-row gap-4 justify-between items-start w-full">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/8 text-xs text-white/70 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse inline-block" />
              Claim Tracking
            </div>
            <h1 className="text-3xl font-semibold text-white tracking-tight">
              Track your claim progress
            </h1>
            <p className="mt-2 text-sm text-white/60 leading-relaxed max-w-xl">
              Monitor your real-time AI evaluation pipeline.
            </p>
          </div>

          {claims.length > 1 && (
            <div className="relative z-30 w-full md:w-auto">
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center justify-between w-full md:w-auto gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors shadow-lg"
              >
                <div className="flex flex-col items-start pr-4 text-left">
                  <span className="text-xs text-[#3B82F6] font-semibold uppercase tracking-wider mb-0.5">Switch Claim</span>
                  <span className="truncate max-w-[200px] md:max-w-[150px]">{activeClaim.title}</span>
                </div>
                <ChevronDown className={`w-4 h-4 shrink-0 text-white/50 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>
              
              {dropdownOpen && (
                <div className="absolute left-0 md:left-auto right-0 mt-3 w-full md:w-72 rounded-xl bg-[#080d1a] border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-xl">
                  <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                    {claims.map((claim) => (
                      <button
                        key={claim.id}
                        onClick={() => {
                           setActiveClaimId(claim.id);
                           setDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                          activeClaimId === claim.id ? "bg-[#3B82F6]/15 border border-[#3B82F6]/30" : "border border-transparent hover:bg-white/5"
                        }`}
                      >
                        <div className="text-left min-w-0 pr-2">
                            <div className={`font-medium text-sm truncate ${activeClaimId === claim.id ? "text-white" : "text-white/80"}`}>{claim.title}</div>
                            <div className="text-[10px] uppercase text-white/40 mt-1">{claim.status.replace(/_/g, " ")}</div>
                        </div>
                        {activeClaimId === claim.id && <CheckCircle2 className="w-4 h-4 text-[#3B82F6] shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main tracking area (now full width) */}
        <div className="flex-1 flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm shadow-2xl relative min-h-0 mb-6 md:mb-0">
          {/* Claim header details */}
          <div className="p-4 md:p-6 border-b border-white/10 bg-gradient-to-br from-white/10 to-white/5 shrink-0">
            <h2 className="text-lg md:text-xl font-medium">{activeClaim.title}</h2>
            {activeClaim.ai_verdict && (
              <div className="mt-4 p-4 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/20">
                <h3 className="text-sm font-semibold text-[#3B82F6] mb-1">AI Verdict</h3>
                <p className="text-sm text-white/80 leading-relaxed">{activeClaim.ai_verdict}</p>
              </div>
            )}
          </div>

          {/* Visual AI Pipeline */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto hide-scrollbar">
            <h3 className="text-xs md:text-sm font-medium text-white/50 uppercase tracking-wider mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>AI Evaluation Pipeline</span>
              {activeClaim.status === "processing" && (
                <span className="flex items-center gap-2 text-[#3B82F6] text-xs normal-case self-start sm:self-auto">
                  <LoadingShield className="w-3 h-3 animate-pulse" color="#3B82F6" /> Analyzing
                </span>
              )}
            </h3>
            <div className="flex flex-wrap items-start justify-center sm:justify-start gap-4 sm:gap-6 pb-4 px-2">
              {AGENT_PIPELINE.map((agent, index) => {
                const status = getAgentStatus(agent);
                
                return (
                  <div key={agent} className="flex items-start">
                    <motion.div
                      layout
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex flex-col items-center gap-3 relative w-24"
                    >
                      <div className={$(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 z-10",
                        status === "completed" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]" :
                          status === "active" ? "bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/50 shadow-[0_0_20px_rgba(59,130,246,0.4)]" :
                          "bg-white/5 text-white/20 border border-white/10"
                      )}>
                        {status === "completed" ? <CheckCircle2 className="w-6 h-6" /> :
                         status === "active" ? <LoadingShield className="w-6 h-6 animate-pulse" color="#3B82F6" /> :
                         <CircleDashed className="w-6 h-6" />}
                      </div>
                      
                      {status === "active" && (
                        <motion.div
                          layoutId="activeGlow"
                          className="absolute inset-0 rounded-full bg-[#3B82F6]/20 blur-xl z-0 pointer-events-none"
                        />
                      )}
                      
                      <span className={$(
                        "text-xs font-medium text-center whitespace-normal leading-tight",
                        status === "completed" ? "text-emerald-400" :
                        status === "active" ? "text-[#3B82F6]" :
                        "text-white/40"
                      )}>
                        {AGENT_PIPELINE_MAP[agent]}
                      </span>
                    </motion.div>


                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Progress Logs Dropdown */}
          <div className="border-t border-white/10 bg-black/20 shrink-0">
            <button 
              onClick={() => setActivityLogOpen(!activityLogOpen)}
              className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors focus:outline-none"
            >
              <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${activityLogOpen ? 'bg-white/20' : 'bg-emerald-500 animate-pulse'}`} />
                Live Activity Log
              </h3>
              <ChevronDown className={`w-4 h-4 text-white/50 transition-transform duration-300 ${activityLogOpen ? 'rotate-180' : ''}`} />
            </button>
            
            <motion.div 
              initial={false}
              animate={{ height: activityLogOpen ? "auto" : 0, opacity: activityLogOpen ? 1 : 0 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-6 overflow-y-auto max-h-[300px] hide-scrollbar font-mono text-sm flex flex-col">
                {currentEvents.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-white/40 py-8">
                    <CircleDashed className="w-8 h-8 mb-4 animate-spin-slow opacity-20" />
                    <p className="text-sm italic font-sans">Waiting for AI agents to start evaluation...</p>
                  </div>
                ) : (
                  <div className="space-y-4 pb-4">
                    {currentEvents.map((evt, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={evt.id} 
                        className={$(
                          "flex gap-4 p-3 rounded-lg border transition-colors",
                          idx === currentEvents.length - 1 
                            ? "bg-[#3B82F6]/10 border-[#3B82F6]/30 text-white shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                            : "bg-transparent border-white/5 text-white/60"
                        )}
                      >
                        <span className="text-[#3B82F6] shrink-0 pt-0.5 whitespace-nowrap text-xs">
                          {new Date(evt.time).toLocaleTimeString()}
                        </span>
                        <span className="break-words font-sans">{evt.msg}</span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}

function $(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}