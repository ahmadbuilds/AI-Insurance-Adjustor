"use client";

import { useActionState, useState, useRef } from "react";

interface LoginFormProps {
  action: (formData: FormData) => Promise<{ error: string } | void>;
}

export default function LoginForm({ action }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error: string } | null, formData: FormData) => {
      const result = await action(formData);
      return result ?? null;
    },
    null
  );

  const [showPassword, setShowPassword] = useState(false);

  // Ref to the hidden submit button so we can trigger it programmatically on Enter
  const submitRef = useRef<HTMLButtonElement>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      submitRef.current?.click();
    }
  }

  return (
    <form action={formAction} className="space-y-4">
      {/* Email */}
      <div>
        <label htmlFor="login-email" className="block text-sm text-white/60 mb-2">
          Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          required
          onKeyDown={handleKeyDown}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-white/30 focus:border-[#3B82F6]/50 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-colors"
          placeholder="you@example.com"
        />
      </div>

      {/* Password */}
      <div>
        <label htmlFor="login-password" className="block text-sm text-white/60 mb-2">
          Password
        </label>
        <div className="relative">
          <input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            onKeyDown={handleKeyDown}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 pr-11 text-white placeholder:text-white/30 focus:border-[#3B82F6]/50 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-colors"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
          >
            {showPassword ? (
              /* Eye-off */
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              /* Eye */
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {state?.error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {state.error}
        </div>
      )}

      {/* Hidden submit — triggered by Enter key handler above */}
      <button ref={submitRef} type="submit" className="hidden" aria-hidden="true" />

      {/* Visible submit */}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-full rounded-full bg-white px-4 py-3 text-sm font-medium text-black hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}