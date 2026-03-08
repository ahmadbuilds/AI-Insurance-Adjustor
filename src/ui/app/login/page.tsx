import { login } from "@/app/auth/actions";
import LoginForm from "./LoginForm";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#030712] px-4 overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* Radial glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#3B82F6]/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-[400px] w-[400px] rounded-full bg-[#8B5CF6]/8 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo / brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden">
              <Image src="/favicon.png" alt="Logo" width={32} height={32} className="object-cover" />
            </div>
            <span className="text-white font-semibold text-sm tracking-tight">Immaculate Aegis</span>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8 shadow-2xl shadow-black/60 backdrop-blur-xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold text-white tracking-tight">Welcome back</h1>
            <p className="mt-2 text-sm text-white/40">
              Sign in to AI Insurance Adjuster
            </p>
          </div>

          <LoginForm action={login} />

          {/* Divider badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-white/20">
            {["SOC 2 Type II", "End-to-end encrypted", "GDPR Compliant"].map((b) => (
              <div key={b} className="flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {b}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030712] to-transparent" />
    </div>
  );
}