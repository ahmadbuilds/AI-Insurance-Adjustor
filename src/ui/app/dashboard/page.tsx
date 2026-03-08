import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-[#030712]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white">
            Welcome, <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{profile?.username || "User"}</span>!
          </h1>
          <p className="mt-2 text-white/50">
            Your AI Insurance Adjuster dashboard
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Claims card */}
          <div className="group rounded-xl border border-white/10 bg-[#0a0e1a] p-6 shadow-lg hover:border-blue-500/40 hover:bg-[#0f1629] transition-all">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15 ring-1 ring-blue-500/30">
                <svg
                  className="h-5 w-5 text-blue-400"
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
              <h3 className="text-lg font-semibold text-white">Claims</h3>
            </div>
            <p className="mt-3 text-sm text-white/50">
              View and manage your insurance claims.
            </p>
          </div>

          {/* Analytics card */}
          <div className="group rounded-xl border border-white/10 bg-[#0a0e1a] p-6 shadow-lg hover:border-emerald-500/40 hover:bg-[#0f1629] transition-all">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/30">
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
              <h3 className="text-lg font-semibold text-white">Analytics</h3>
            </div>
            <p className="mt-3 text-sm text-white/50">
              View analytics and insights on your claims.
            </p>
          </div>

          {/* Profile card */}
          <div className="group rounded-xl border border-white/10 bg-[#0a0e1a] p-6 shadow-lg hover:border-purple-500/40 hover:bg-[#0f1629] transition-all">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/15 ring-1 ring-purple-500/30">
                <svg
                  className="h-5 w-5 text-purple-400"
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
              <h3 className="text-lg font-semibold text-white">Profile</h3>
            </div>
            <p className="mt-3 text-sm text-white/50">
              Manage your profile and account settings.
            </p>
          </div>
        </div>

        {profile?.role === "admin" && (
          <div className="mt-10">
            <h2 className="mb-4 text-xl font-semibold text-white">
              Admin Panel
            </h2>
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-6">
              <p className="text-sm text-white/50">
                You have admin access. Additional admin features will appear
                here.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
