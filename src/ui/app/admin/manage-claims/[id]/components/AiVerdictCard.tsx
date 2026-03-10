interface AiVerdictCardProps {
  verdict: string | null;
  status: string;
}

export function AiVerdictCard({ verdict, status }: AiVerdictCardProps) {
  const isApproved = status === "approved";
  const isRejected = status === "rejected";
  const isPending  = status === "pending";

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
      {/* Section header */}
      <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-white/8">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#8B5CF6]/15 ring-1 ring-[#8B5CF6]/20">
          <svg className="h-3.5 w-3.5 text-[#8B5CF6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1" />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-white/80">AI Verdict</h2>
      </div>

      {verdict ? (
        <div className={`rounded-xl border p-4 ${
          isApproved ? "border-emerald-500/20 bg-emerald-500/8"
          : isRejected ? "border-red-500/20 bg-red-500/8"
          : "border-[#3B82F6]/20 bg-[#3B82F6]/8"
        }`}>
          <p className={`text-sm leading-relaxed ${
            isApproved ? "text-emerald-200" : isRejected ? "text-red-200" : "text-blue-200"
          }`}>
            {verdict}
          </p>
        </div>
      ) : isPending ? (
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse shrink-0" />
          <p className="text-sm text-white/40 italic">Awaiting AI evaluation…</p>
        </div>
      ) : (
        <p className="text-sm text-white/35 italic">No AI verdict recorded.</p>
      )}
    </div>
  );
}