import { dashboardService } from "./services/dashboard.service";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import { DashboardClient } from "./components/DashboardClient";

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
        <DashboardClient
          userId={data.user.id}
          username={profile?.username || "User"}
          role={profile?.role || "claimant"}
        />
      </main>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030712] to-transparent" />
    </div>
  );
}
