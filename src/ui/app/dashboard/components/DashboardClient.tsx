"use client";

import { useEffect, useState } from "react";
import { dashboardAnalyticsService, AdminDashboardStats, ClaimantDashboardStats } from "../services/dashboard-analytics.service";
import Link from "next/link";

interface DashboardClientProps {
  userId: string;
  username: string;
  role: string;
}

export function DashboardClient({ userId, username, role }: DashboardClientProps) {
  const [adminStats, setAdminStats] = useState<AdminDashboardStats | null>(null);
  const [claimantStats, setClaimantStats] = useState<ClaimantDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        if (role === "admin") {
          const stats = await dashboardAnalyticsService.getAdminDashboardStats();
          setAdminStats(stats);
        } else {
          const stats = await dashboardAnalyticsService.getClaimantDashboardStats(userId);
          setClaimantStats(stats);
        }
      } catch (error) {
        console.error("Failed to load dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [userId, role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3B82F6]"></div>
      </div>
    );
  }

  if (role === "admin" && adminStats) {
    return <AdminDashboard stats={adminStats} username={username} />;
  }

  if (claimantStats) {
    return <ClaimantDashboard stats={claimantStats} username={username} />;
  }

  return null;
}

function AdminDashboard({ stats, username }: { stats: AdminDashboardStats; username: string }) {
  return (
    <>
      {/* Header */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-white/50 mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Admin access
        </div>
        <h1 className="text-4xl font-semibold text-white tracking-tight leading-tight">
          Welcome back,{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3B82F6] via-[#6366F1] to-[#8B5CF6]">
            {username}
          </span>
        </h1>
        <p className="mt-3 text-white/40 text-sm">
          System overview and analytics dashboard
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <MetricCard
          title="Total Claims"
          value={stats.totalClaims}
          subtitle={`${stats.claimsThisMonth} this month`}
          trend={stats.claimsThisMonth > stats.claimsLastMonth ? "up" : stats.claimsThisMonth < stats.claimsLastMonth ? "down" : "neutral"}
          color="blue"
        />
        <MetricCard
          title="Approval Rate"
          value={`${stats.approvalRate}%`}
          subtitle={`${stats.approvedClaims} approved`}
          color="green"
        />
        <MetricCard
          title="Active Disputes"
          value={stats.activeDisputes}
          subtitle={`${stats.totalDisputes} total`}
          color="red"
        />
        <MetricCard
          title="Avg Processing"
          value={stats.avgProcessingTime}
          subtitle="Time to decision"
          color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Status Distribution */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Claim Status Distribution</h3>
          <div className="space-y-4">
            {stats.statusDistribution.map((item) => (
              <div key={item.status}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/70">{item.status}</span>
                  <span className="text-sm font-semibold text-white">{item.count} ({item.percentage}%)</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Stats */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
          <h3 className="text-lg font-semibold text-white mb-6">System Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            <StatItem label="Total Users" value={stats.totalUsers} />
            <StatItem label="Claimants" value={stats.claimantUsers} />
            <StatItem label="Admins" value={stats.adminUsers} />
            <StatItem label="Pending" value={stats.pendingClaims} />
            <StatItem label="Under Review" value={stats.underReviewClaims} />
            <StatItem label="Resolved" value={stats.approvedClaims + stats.rejectedClaims} />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Recent Claims */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Recent Claims</h3>
            <Link href="/admin/manage-claims" className="text-xs text-[#3B82F6] hover:text-[#3B82F6]/80">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recentClaims.map((claim) => (
              <Link
                key={claim.id}
                href={`/admin/manage-claims/${claim.id}`}
                className="block p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{claim.title}</p>
                    <p className="text-xs text-white/40 mt-1">by {claim.username}</p>
                  </div>
                  <StatusBadge status={claim.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Recent Activity</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {stats.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/70">{activity.message}</p>
                  <p className="text-xs text-white/40 mt-1">{new Date(activity.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Admin Panel Links */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard
            href="/admin/create-user"
            icon={<UserPlusIcon />}
            title="Create User"
            description="Add new users"
            color="blue"
          />
          <QuickActionCard
            href="/admin/manage-users"
            icon={<UsersIcon />}
            title="Manage Users"
            description="View all users"
            color="purple"
          />
          <QuickActionCard
            href="/admin/manage-claims"
            icon={<ClipboardIcon />}
            title="Manage Claims"
            description="Review claims"
            color="green"
          />
          <QuickActionCard
            href="/admin/manage-disputes"
            icon={<AlertIcon />}
            title="Manage Disputes"
            description="Resolve disputes"
            color="red"
          />
        </div>
      </div>
    </>
  );
}

function ClaimantDashboard({ stats, username }: { stats: ClaimantDashboardStats; username: string }) {
  return (
    <>
      {/* Header */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-white/50 mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Claimant portal
        </div>
        <h1 className="text-4xl font-semibold text-white tracking-tight leading-tight">
          Welcome back,{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3B82F6] via-[#6366F1] to-[#8B5CF6]">
            {username}
          </span>
        </h1>
        <p className="mt-3 text-white/40 text-sm">
          Your claims overview and activity dashboard
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <MetricCard
          title="Total Claims"
          value={stats.myClaims}
          subtitle="All time"
          color="blue"
        />
        <MetricCard
          title="Approved"
          value={stats.myApprovedClaims}
          subtitle="Successfully processed"
          color="green"
        />
        <MetricCard
          title="Pending"
          value={stats.myPendingClaims}
          subtitle="Awaiting review"
          color="yellow"
        />
        <MetricCard
          title="Disputes"
          value={stats.myDisputes}
          subtitle="Filed disputes"
          color="red"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Claim Timeline */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Claims Activity (Last 7 Days)</h3>
          <div className="flex items-end justify-between gap-2 h-40">
            {stats.claimTimeline.map((item, idx) => {
              const maxCount = Math.max(...stats.claimTimeline.map((t) => t.count), 1);
              const height = (item.count / maxCount) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end justify-center h-32">
                    <div
                      className="w-full bg-gradient-to-t from-[#3B82F6] to-[#6366F1] rounded-t-lg transition-all duration-500"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/40">{new Date(item.date).toLocaleDateString("en-US", { weekday: "short" })}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Overview */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Claim Status Overview</h3>
          <div className="space-y-4">
            <StatusRow label="Approved" count={stats.myApprovedClaims} total={stats.myClaims} color="#10b981" />
            <StatusRow label="Pending" count={stats.myPendingClaims} total={stats.myClaims} color="#fbbf24" />
            <StatusRow label="Rejected" count={stats.myRejectedClaims} total={stats.myClaims} color="#ef4444" />
          </div>
        </div>
      </div>

      {/* Recent Claims */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Recent Claims</h2>
          <Link href="/claims" className="text-sm text-[#3B82F6] hover:text-[#3B82F6]/80">
            View all →
          </Link>
        </div>
        <div className="grid gap-4">
          {stats.recentClaims.length > 0 ? (
            stats.recentClaims.map((claim) => (
              <div
                key={claim.id}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 hover:border-white/20 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-white mb-2">{claim.title}</h3>
                    <p className="text-sm text-white/40">
                      Filed on {new Date(claim.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={claim.status} />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-white/40">
              <p>No claims yet. File your first claim to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 sm:grid-cols-3">
        <Link
          href="/claims"
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 hover:border-[#3B82F6]/30 transition-all"
        >
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-[#3B82F6]/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#3B82F6]/15 ring-1 ring-[#3B82F6]/25">
              <ClipboardIcon />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">View Claims</h3>
            <p className="text-sm text-white/40">Manage your claims</p>
          </div>
        </Link>

        <Link
          href="/dispute-panel"
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 hover:border-red-500/30 transition-all"
        >
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-red-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 ring-1 ring-red-500/25">
              <AlertIcon />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Disputes</h3>
            <p className="text-sm text-white/40">File or view disputes</p>
          </div>
        </Link>

        <Link
          href="/profile"
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 hover:border-[#8B5CF6]/30 transition-all"
        >
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-[#8B5CF6]/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B5CF6]/15 ring-1 ring-[#8B5CF6]/25">
              <UserIcon />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Profile</h3>
            <p className="text-sm text-white/40">Manage your account</p>
          </div>
        </Link>
      </div>
    </>
  );
}

// Helper Components
function MetricCard({
  title,
  value,
  subtitle,
  trend,
  color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  trend?: "up" | "down" | "neutral";
  color: "blue" | "green" | "red" | "purple" | "yellow";
}) {
  const colorClasses = {
    blue: "from-[#3B82F6]/10 to-[#3B82F6]/5 border-[#3B82F6]/20",
    green: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
    red: "from-red-500/10 to-red-500/5 border-red-500/20",
    purple: "from-[#8B5CF6]/10 to-[#8B5CF6]/5 border-[#8B5CF6]/20",
    yellow: "from-yellow-500/10 to-yellow-500/5 border-yellow-500/20",
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 ${colorClasses[color]}`}>
      <div className="relative">
        <p className="text-sm text-white/60 mb-2">{title}</p>
        <p className="text-3xl font-bold text-white mb-1">{value}</p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-white/40">{subtitle}</p>
          {trend && trend !== "neutral" && (
            <span className={`text-xs ${trend === "up" ? "text-emerald-400" : "text-red-400"}`}>
              {trend === "up" ? "↑" : "↓"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 rounded-lg bg-white/5 border border-white/5">
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-xs text-white/40">{label}</p>
    </div>
  );
}

function StatusRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-white/70">{label}</span>
        <span className="text-sm font-semibold text-white">{count} ({percentage}%)</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-yellow-500/10", text: "text-yellow-400", label: "Pending" },
    under_review: { bg: "bg-[#3B82F6]/10", text: "text-[#3B82F6]", label: "Under Review" },
    approved: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Approved" },
    rejected: { bg: "bg-red-500/10", text: "text-red-400", label: "Rejected" },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.text.replace("text-", "bg-")}`} />
      {config.label}
    </span>
  );
}

function QuickActionCard({
  href,
  icon,
  title,
  description,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "blue" | "green" | "red" | "purple";
}) {
  const colorClasses = {
    blue: "hover:border-[#3B82F6]/30 bg-[#3B82F6]/10",
    green: "hover:border-emerald-500/30 bg-emerald-500/10",
    red: "hover:border-red-500/30 bg-red-500/10",
    purple: "hover:border-[#8B5CF6]/30 bg-[#8B5CF6]/10",
  };

  return (
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 transition-all ${colorClasses[color]}`}
    >
      <div className="relative flex items-start gap-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
          <p className="text-xs text-white/40">{description}</p>
        </div>
      </div>
    </Link>
  );
}

// Icons
function UserPlusIcon() {
  return (
    <svg className="h-5 w-5 text-[#3B82F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-5 w-5 text-[#8B5CF6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="h-5 w-5 text-[#8B5CF6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
