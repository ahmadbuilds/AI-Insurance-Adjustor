"use client";

import { useActionState } from "react";

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

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label
          htmlFor="login-email"
          className="block text-sm font-medium text-white/70"
        >
          Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          required
          className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label
          htmlFor="login-password"
          className="block text-sm font-medium text-white/70"
        >
          Password
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          required
          className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
          placeholder="••••••••"
        />
      </div>

      {state?.error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
      >
        {pending ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
