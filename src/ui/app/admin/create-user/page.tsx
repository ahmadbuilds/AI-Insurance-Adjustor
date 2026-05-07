"use client";

import { useState, useEffect } from "react";
import { createUser } from "@/app/auth/actions";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { adminService } from "../services/admin.service";
import { LoadingShield } from "@/components/LoadingShield";

const USERNAME_MAX = 15;

function validateUsername(v: string): string[] {
  const errors: string[] = [];
  if (!v) return errors;
  if (!/^[a-zA-Z]/.test(v)) errors.push("Must start with a letter (a–z or A–Z)");
  if (!/^[a-zA-Z0-9_]+$/.test(v)) errors.push("Only letters, numbers, and underscores ( _ ) allowed");
  if (v.length > USERNAME_MAX) errors.push(`Maximum ${USERNAME_MAX} characters`);
  return errors;
}

function validateEmail(v: string): string[] {
  if (!v) return [];
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
    ? []
    : ["Enter a valid email address (e.g. john.doe@company.com)"];
}

interface PwCheck { label: string; pass: boolean }

function getPasswordChecks(v: string): PwCheck[] {
  return [
    { label: "At least 8 characters",             pass: v.length >= 8 },
    { label: "One uppercase letter (A–Z)",         pass: /[A-Z]/.test(v) },
    { label: "One lowercase letter (a–z)",         pass: /[a-z]/.test(v) },
    { label: "One number (0–9)",                   pass: /[0-9]/.test(v) },
    { label: "One special character (!@#$…)",      pass: /[^a-zA-Z0-9]/.test(v) },
  ];
}


function FieldErrors({ messages }: { messages: string[] }) {
  if (!messages.length) return null;
  return (
    <ul className="mt-2 space-y-1">
      {messages.map((m) => (
        <li key={m} className="flex items-center gap-2 text-xs text-red-400">
          <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          {m}
        </li>
      ))}
    </ul>
  );
}

function PasswordChecklist({ checks, visible }: { checks: PwCheck[]; visible: boolean }) {
  if (!visible) return null;
  return (
    <ul className="mt-2 space-y-1">
      {checks.map((c) => (
        <li
          key={c.label}
          className={`flex items-center gap-2 text-xs transition-colors ${c.pass ? "text-emerald-400" : "text-white/35"}`}
        >
          {c.pass ? (
            <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-3 w-3 shrink-0 text-white/20" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="2" />
            </svg>
          )}
          {c.label}
        </li>
      ))}
    </ul>
  );
}

function StatusIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  ) : (
    <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function inputCls(value: string, hasErrors: boolean, touched: boolean) {
  const base =
    "w-full rounded-lg border bg-white/5 px-4 py-2.5 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 transition-colors pr-10";
  if (!touched || !value)
    return `${base} border-white/10 focus:border-[#3B82F6]/50 focus:ring-[#3B82F6]/20`;
  if (hasErrors)
    return `${base} border-red-500/50 focus:border-red-500/60 focus:ring-red-500/20`;
  return `${base} border-emerald-500/40 focus:border-emerald-500/50 focus:ring-emerald-500/20`;
}


export default function CreateUserPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess]         = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [authorized, setAuthorized]   = useState(false);
  const [checking, setChecking]       = useState(true);
  const router = useRouter();

  // Field values
  const [username, setUsername]   = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPw, setShowPw]       = useState(false);

  const [tUser, setTUser] = useState(false);
  const [tEmail, setTEmail] = useState(false);
  const [tPw, setTPw]     = useState(false);
  const [pwFocused, setPwFocused] = useState(false); // Track focus state for checklist

  // Derived validation
  const usernameErrors  = validateUsername(username);
  const emailErrors     = validateEmail(email);
  const pwChecks        = getPasswordChecks(password);
  const pwValid         = pwChecks.every((c) => c.pass);

  const formValid =
    username && !usernameErrors.length &&
    email    && !emailErrors.length   &&
    password && pwValid;

  useEffect(() => {
    async function checkAdmin() {
      const adminId = await adminService.checkIsAdmin();
      if (!adminId) {
        // Dashboard will handle unauthenticated users
        router.push("/dashboard");
        return;
      }
      setAuthorized(true);
      setChecking(false);
    }
    checkAdmin();
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTUser(true); setTEmail(true); setTPw(true); setPwFocused(true);
    if (!formValid) return;

    setLoading(true);
    setServerError(null);
    setSuccess(null);

    const fd = new FormData();
    fd.set("username", username);
    fd.set("email", email);
    fd.set("password", password);
    const result = await createUser(fd);

    if (result?.error) {
      setServerError(result.error);
    } else if (result?.success) {
      setSuccess(
        `User created! A confirmation email has been sent to ${email}. They can sign in after confirming.`
      );
      setUsername(""); setEmail(""); setPassword("");
      setTUser(false); setTEmail(false); setTPw(false);
    }
    setLoading(false);
  }

 
  if (checking || !authorized) {
    return (
      <div className="relative min-h-screen bg-[#030712]">
        <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <Navbar />
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <LoadingShield className="h-12 w-12" />
        </div>
      </div>
    );
  }

  
  return (
    <div className="relative min-h-screen bg-[#030712] overflow-hidden">
      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:60px_60px]" />
      {/* Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#3B82F6]/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-[#8B5CF6]/8 blur-3xl" />
      </div>

      <Navbar />

      <main className="relative mx-auto max-w-lg px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-white/50 mb-5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
            Admin · User Management
          </div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">Create new user</h1>
          <p className="mt-2 text-sm text-white/40 leading-relaxed">
            Add a new user to the platform. They will receive a confirmation email with their login credentials.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8 shadow-2xl shadow-black/40">

          {/* Toasts */}
          {(success || serverError) && (
            <div className={`fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-xl border p-4 text-sm shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 w-80 ${
              success
                ? "border-emerald-500/20 bg-emerald-500/15 text-emerald-300"
                : "border-red-500/20 bg-red-500/15 text-red-400"
            }`}>
              <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {success
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                }
              </svg>
              <span className="flex-1">{success || serverError}</span>
              <button
                onClick={() => { setSuccess(null); setServerError(null); }}
                title="Dismiss"
                className="text-white/40 hover:text-white transition-colors"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off" noValidate className="space-y-6">

            {/* ── Username ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="username" className="text-sm text-white/60">Username</label>
                <span className={`text-xs tabular-nums transition-colors ${
                  username.length > USERNAME_MAX
                    ? "text-red-400"
                    : username.length >= USERNAME_MAX - 3
                    ? "text-yellow-400"
                    : "text-white/30"
                }`}>
                  {username.length}/{USERNAME_MAX}
                </span>
              </div>
              <div className="relative">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onBlur={() => setTUser(true)}
                  className={inputCls(username, !!usernameErrors.length, tUser)}
                  placeholder="e.g. john_doe"
                />
                {tUser && username && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    <StatusIcon ok={!usernameErrors.length} />
                  </span>
                )}
              </div>
              {tUser
                ? <FieldErrors messages={usernameErrors} />
                : <p className="mt-1.5 text-xs text-white/30">Starts with a letter · letters, numbers, underscores · max {USERNAME_MAX} chars</p>
              }
            </div>

            {/* ── Email ── */}
            <div>
              <label htmlFor="email" className="block text-sm text-white/60 mb-2">Email</label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTEmail(true)}
                  className={inputCls(email, !!emailErrors.length, tEmail)}
                  placeholder="e.g. john.doe@company.com"
                />
                {tEmail && email && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    <StatusIcon ok={!emailErrors.length} />
                  </span>
                )}
              </div>
              {tEmail && <FieldErrors messages={emailErrors} />}
            </div>

            {/* ── Password ── */}
            <div>
              <label htmlFor="password" className="block text-sm text-white/60 mb-2">Password</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPw ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPwFocused(true)}
                  onBlur={() => setTPw(true)}
                  // The `[&::-ms-reveal]:hidden` prevents Edge/Chrome from showing their native eye icon
                  className={inputCls(password, !pwValid, tPw) + " pr-20 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"} 
                  placeholder="e.g. SecurePass1!"
                />
                
                {/* Icons container */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {/* Validation Status Icon (only when touched) */}
                  {tPw && password && (
                    <StatusIcon ok={pwValid} />
                  )}

                  {/* Show/Hide Password Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    className="text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPw ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Password strength checklist — shows when focused or touched */}
              {pwFocused || tPw
                ? <PasswordChecklist checks={pwChecks} visible />
                : <p className="mt-1.5 text-xs text-white/30">Min 8 chars · uppercase · lowercase · number · special character</p>
              }
            </div>

            <div className="h-px bg-white/5" />

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-white px-4 py-3 text-sm font-medium text-black hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingShield className="h-4 w-4" color="#ffffff" />
                  Creating account…
                </span>
              ) : "Create user"}
            </button>

          </form>
        </div>
      </main>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030712] to-transparent" />
    </div>
  );
}