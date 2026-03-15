import { dashboardService } from "./services/dashboard.service";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await dashboardService.getDashboardProfile();

  if (!data?.user) {
    redirect("/login");
  }

  const { profile } = data;

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

      <main className="relative mx-auto max-w-7xl px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-white/50 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {profile?.role === "admin" ? "Admin access" : "Claimant portal"}
          </div>
          <h1 className="text-4xl font-semibold text-white tracking-tight leading-tight">
            Welcome back,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3B82F6] via-[#6366F1] to-[#8B5CF6]">
              {profile?.username || "User"}
            </span>
          </h1>
          <p className="mt-3 text-white/40 text-sm">
            Your AI Insurance Adjuster dashboard — manage claims, view
            analytics, and configure your account.
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Claims (claimants only) */}
          {profile?.role !== "admin" && (
            <Link
              href="/claims"
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 hover:border-[#3B82F6]/30 transition-all duration-300"
            >
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-[#3B82F6]/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#3B82F6]/15 ring-1 ring-[#3B82F6]/25">
                  <svg
                    className="h-5 w-5 text-[#3B82F6]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-white mb-2">
                  Claims
                </h3>
                <p className="text-sm text-white/40 leading-relaxed mb-4">
                  View and manage your insurance claims.
                </p>
                <div className="flex items-center gap-1.5 text-xs text-[#3B82F6]/70">
                  <span>Submit a claim</span>
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          )}

          {/* Analytics */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 hover:border-emerald-500/30 transition-all duration-300">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/25">
                <svg
                  className="h-5 w-5 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white mb-2">
                Analytics
              </h3>
              <p className="text-sm text-white/40 leading-relaxed mb-4">
                View analytics and insights on your claims.
              </p>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400/70">
                <span>View analytics</span>
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Profile */}
          <Link
            href="/profile"
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 hover:border-[#8B5CF6]/30 transition-all duration-300"
          >
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-[#8B5CF6]/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B5CF6]/15 ring-1 ring-[#8B5CF6]/25">
                <svg
                  className="h-5 w-5 text-[#8B5CF6]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white mb-2">
                Profile
              </h3>
              <p className="text-sm text-white/40 leading-relaxed mb-4">
                Manage your profile and account settings.
              </p>
              <div className="flex items-center gap-1.5 text-xs text-[#8B5CF6]/70">
                <span>Edit profile</span>
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* Admin Panel */}
        {profile?.role === "admin" && (
          <div className="mt-12">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-lg font-semibold text-white">Admin Panel</h2>
              <span className="inline-flex items-center rounded-full border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-2.5 py-0.5 text-xs font-medium text-[#8B5CF6]">
                Admin
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Create User */}
              <Link
                href="/admin/create-user"
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 hover:border-[#3B82F6]/30 transition-all"
              >
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#3B82F6]/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3B82F6]/15 ring-1 ring-[#3B82F6]/25">
                    <svg
                      className="h-5 w-5 text-[#3B82F6]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">
                      Create User
                    </h3>
                    <p className="text-xs text-white/40">
                      Add new users with email confirmation.
                    </p>
                  </div>
                </div>
              </Link>

              {/* Manage Users */}
              <Link
                href="/admin/manage-users"
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 hover:border-[#8B5CF6]/30 transition-all"
              >
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#8B5CF6]/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8B5CF6]/15 ring-1 ring-[#8B5CF6]/25">
                    <svg
                      className="h-5 w-5 text-[#8B5CF6]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">
                      Manage Users
                    </h3>
                    <p className="text-xs text-white/40">
                      Search, filter, and remove users.
                    </p>
                  </div>
                </div>
              </Link>

              {/* Manage Claims */}
              <Link
                href="/admin/manage-claims"
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 hover:border-emerald-500/30 transition-all"
              >
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/25">
                    <svg
                      className="h-5 w-5 text-emerald-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">
                      Manage Claims
                    </h3>
                    <p className="text-xs text-white/40">
                      Review AI-evaluated claims and payout status.
                    </p>
                  </div>
                </div>
              </Link>

              {/* Manage Disputes */}
              <Link
                href="/admin/manage-disputes"
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 hover:border-red-500/30 transition-all"
              >
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-red-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 ring-1 ring-red-500/25">
                    <svg
                      className="h-5 w-5 text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">
                      Manage Disputes
                    </h3>
                    <p className="text-xs text-white/40">
                      Review and resolve user-filed disputes.
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030712] to-transparent" />
    </div>
  );
}
