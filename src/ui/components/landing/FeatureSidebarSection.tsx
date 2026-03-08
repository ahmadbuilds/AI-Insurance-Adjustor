import { useState, useRef, useEffect, useCallback } from "react";
import { CheckCircle } from "lucide-react";
import { FEATURES } from "@/lib/landing-data";
import { Reveal } from "./Reveal";

export function FeatureSidebarSection() {
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

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
