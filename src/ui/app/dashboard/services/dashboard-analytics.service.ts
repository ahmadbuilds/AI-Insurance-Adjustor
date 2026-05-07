import { createClient } from "@/lib/supabase/client";

export interface DashboardStats {
  totalClaims: number;
  pendingClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  underReviewClaims: number;
  totalDisputes: number;
  activeDisputes: number;
  resolvedDisputes: number;
  avgProcessingTime: string;
  recentActivity: ActivityItem[];
}

export interface AdminDashboardStats extends DashboardStats {
  totalUsers: number;
  claimantUsers: number;
  adminUsers: number;
  claimsThisMonth: number;
  claimsLastMonth: number;
  approvalRate: number;
  statusDistribution: StatusDistribution[];
  recentClaims: RecentClaim[];
}

export interface ClaimantDashboardStats {
  myClaims: number;
  myPendingClaims: number;
  myApprovedClaims: number;
  myRejectedClaims: number;
  myDisputes: number;
  recentClaims: RecentClaim[];
  claimTimeline: TimelineItem[];
}

export interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

export interface RecentClaim {
  id: string;
  title: string;
  status: string;
  created_at: string;
  username?: string;
}

export interface ActivityItem {
  id: string;
  type: "claim" | "dispute" | "status_change";
  message: string;
  timestamp: string;
  status?: string;
}

export interface TimelineItem {
  date: string;
  count: number;
}

class DashboardAnalyticsService {
  private static instance: DashboardAnalyticsService;

  private constructor() {}

  public static getInstance(): DashboardAnalyticsService {
    if (!DashboardAnalyticsService.instance) {
      DashboardAnalyticsService.instance = new DashboardAnalyticsService();
    }
    return DashboardAnalyticsService.instance;
  }

  public async getAdminDashboardStats(): Promise<AdminDashboardStats> {
    const supabase = createClient();

    // Fetch all claims
    const { data: claims } = await supabase
      .from("claims")
      .select("id, user_id, title, status, created_at, updated_at");

    // Fetch all users
    const { data: users } = await supabase
      .from("users")
      .select("id, username, role, created_at");

    // Fetch all disputes
    const { data: disputes } = await supabase
      .from("disputes")
      .select("id, status, created_at");

    const totalClaims = claims?.length || 0;
    const pendingClaims = claims?.filter((c) => c.status === "pending").length || 0;
    const approvedClaims = claims?.filter((c) => c.status === "approved").length || 0;
    const rejectedClaims = claims?.filter((c) => c.status === "rejected").length || 0;
    const underReviewClaims = claims?.filter((c) => c.status === "under_review").length || 0;

    const totalUsers = users?.length || 0;
    const claimantUsers = users?.filter((u) => u.role === "claimant").length || 0;
    const adminUsers = users?.filter((u) => u.role === "admin").length || 0;

    const totalDisputes = disputes?.length || 0;
    const activeDisputes = disputes?.filter((d) => d.status === "pending").length || 0;
    const resolvedDisputes = disputes?.filter((d) => d.status === "resolved").length || 0;

    // Calculate claims this month and last month
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const claimsThisMonth = claims?.filter((c) => new Date(c.created_at) >= firstDayThisMonth).length || 0;
    const claimsLastMonth = claims?.filter(
      (c) => new Date(c.created_at) >= firstDayLastMonth && new Date(c.created_at) < firstDayThisMonth
    ).length || 0;

    // Calculate approval rate
    const approvalRate = totalClaims > 0 ? Math.round((approvedClaims / totalClaims) * 100) : 0;

    // Status distribution
    const statusDistribution: StatusDistribution[] = [
      { status: "Approved", count: approvedClaims, percentage: totalClaims > 0 ? Math.round((approvedClaims / totalClaims) * 100) : 0, color: "#10b981" },
      { status: "Under Review", count: underReviewClaims, percentage: totalClaims > 0 ? Math.round((underReviewClaims / totalClaims) * 100) : 0, color: "#3B82F6" },
      { status: "Pending", count: pendingClaims, percentage: totalClaims > 0 ? Math.round((pendingClaims / totalClaims) * 100) : 0, color: "#fbbf24" },
      { status: "Rejected", count: rejectedClaims, percentage: totalClaims > 0 ? Math.round((rejectedClaims / totalClaims) * 100) : 0, color: "#ef4444" },
    ];

    // Recent claims with user info
    const userMap = new Map(users?.map((u) => [u.id, u.username]) || []);
    const recentClaims: RecentClaim[] = (claims || [])
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        created_at: c.created_at,
        username: userMap.get(c.user_id) || "Unknown",
      }));

    // Recent activity
    const recentActivity: ActivityItem[] = (claims || [])
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 10)
      .map((c) => ({
        id: c.id,
        type: "claim" as const,
        message: `Claim "${c.title}" is ${c.status}`,
        timestamp: c.updated_at,
        status: c.status,
      }));

    // Calculate average processing time
    const completedClaims = claims?.filter((c) => c.status === "approved" || c.status === "rejected") || [];
    let avgProcessingTime = "N/A";
    if (completedClaims.length > 0) {
      const totalTime = completedClaims.reduce((sum, c) => {
        const created = new Date(c.created_at).getTime();
        const updated = new Date(c.updated_at).getTime();
        return sum + (updated - created);
      }, 0);
      const avgHours = Math.round(totalTime / completedClaims.length / (1000 * 60 * 60));
      avgProcessingTime = avgHours < 24 ? `${avgHours}h` : `${Math.round(avgHours / 24)}d`;
    }

    return {
      totalClaims,
      pendingClaims,
      approvedClaims,
      rejectedClaims,
      underReviewClaims,
      totalDisputes,
      activeDisputes,
      resolvedDisputes,
      avgProcessingTime,
      recentActivity,
      totalUsers,
      claimantUsers,
      adminUsers,
      claimsThisMonth,
      claimsLastMonth,
      approvalRate,
      statusDistribution,
      recentClaims,
    };
  }

  public async getClaimantDashboardStats(userId: string): Promise<ClaimantDashboardStats> {
    const supabase = createClient();

    // Fetch user's claims
    const { data: claims } = await supabase
      .from("claims")
      .select("id, title, status, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    // Fetch user's disputes
    const { data: disputes } = await supabase
      .from("disputes")
      .select("id, status, created_at")
      .eq("user_id", userId);

    const myClaims = claims?.length || 0;
    const myPendingClaims = claims?.filter((c) => c.status === "pending").length || 0;
    const myApprovedClaims = claims?.filter((c) => c.status === "approved").length || 0;
    const myRejectedClaims = claims?.filter((c) => c.status === "rejected").length || 0;
    const myDisputes = disputes?.length || 0;

    // Recent claims
    const recentClaims: RecentClaim[] = (claims || [])
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        created_at: c.created_at,
      }));

    // Claim timeline
    const claimTimeline: TimelineItem[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const count = claims?.filter((c) => c.created_at.startsWith(dateStr)).length || 0;
      claimTimeline.push({ date: dateStr, count });
    }

    return {
      myClaims,
      myPendingClaims,
      myApprovedClaims,
      myRejectedClaims,
      myDisputes,
      recentClaims,
      claimTimeline,
    };
  }
}

export const dashboardAnalyticsService = DashboardAnalyticsService.getInstance();
export default DashboardAnalyticsService;
