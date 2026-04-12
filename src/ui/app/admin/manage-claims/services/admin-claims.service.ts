import { createClient } from "@/lib/supabase/client";
import type {
  AdminClaim,
  AdminClaimDetail,
  ClaimStatus,
  ClaimUpdatePayload,
} from "../types/admin-claims.types";





class AdminClaimsService {
  private static instance: AdminClaimsService;

  private constructor() {}

  public static getInstance(): AdminClaimsService {
    if (!AdminClaimsService.instance) {
      AdminClaimsService.instance = new AdminClaimsService();
    }
    return AdminClaimsService.instance;
  }

  

  public async assertAdmin(): Promise<string> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated.");

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin") {
      throw new Error("Insufficient permissions.");
    }

    return user.id;
  }

  

  
  public async fetchAllClaims(): Promise<AdminClaim[]> {
    const supabase = createClient();

    const { data: claims, error } = await supabase
      .from("claims")
      .select("id, user_id, title, description, status, ai_verdict, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    if (!claims || claims.length === 0) return [];

    
    const userIds = [...new Set(claims.map((c) => c.user_id))];
    const { data: users } = await supabase
      .from("users")
      .select("id, username, email, role, profile_image_url, created_at")
      .in("id", userIds);

    const userMap = new Map((users ?? []).map((u) => [u.id, u]));

    return claims.map((claim) => ({
      ...claim,
      user: userMap.get(claim.user_id) ?? null,
    }));
  }

  
  public async fetchClaimsByStatus(status: ClaimStatus): Promise<AdminClaim[]> {
    const supabase = createClient();

    const { data: claims, error } = await supabase
      .from("claims")
      .select("id, user_id, title, description, status, ai_verdict, created_at, updated_at")
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    if (!claims || claims.length === 0) return [];

    const userIds = [...new Set(claims.map((c) => c.user_id))];
    const { data: users } = await supabase
      .from("users")
      .select("id, username, email, role, profile_image_url, created_at")
      .in("id", userIds);

    const userMap = new Map((users ?? []).map((u) => [u.id, u]));

    return claims.map((claim) => ({
      ...claim,
      user: userMap.get(claim.user_id) ?? null,
    }));
  }

  

  
  public async fetchClaimDetail(claimId: string): Promise<AdminClaimDetail> {
    const supabase = createClient();

    const { data: claim, error } = await supabase
      .from("claims")
      .select("id, user_id, title, description, status, ai_verdict, created_at, updated_at")
      .eq("id", claimId)
      .single();

    if (error || !claim) throw new Error(error?.message ?? "Claim not found.");

    
    const { data: user } = await supabase
      .from("users")
      .select("id, username, email, role, profile_image_url, created_at")
      .eq("id", claim.user_id)
      .maybeSingle();

    
    const { data: images } = await supabase
      .from("claim_images")
      .select("id, claim_id, user_id, storage_path, file_name, file_size, mime_type, created_at")
      .eq("claim_id", claimId)
      .order("created_at", { ascending: true });

    // Fetch active admin notification for this claim
    const { data: notification } = await supabase
      .from("admin_notifications")
      .select("id, claim_id, message, failed_task, is_resolved, created_at")
      .eq("claim_id", claimId)
      .eq("is_resolved", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      ...claim,
      user: user ?? null,
      images: images ?? [],
      active_notification: notification ?? null,
    };
  }

  /**
   * Resolve an admin notification and resume the AI workflow via the FastAPI backend.
   */
  public async resolveNotificationAndResume(
    notificationId: string,
    claimId: string,
    failedTask: string,
  ): Promise<void> {
    const supabase = createClient();

    // 1. Mark the notification as resolved
    const { error: updateErr } = await supabase
      .from("admin_notifications")
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", notificationId);

    if (updateErr) throw new Error(updateErr.message);

    // 2. Get the current session token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated.");

    // 3. Call FastAPI /resume_workflow to push completion event to Redis
    const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";
    const res = await fetch(`${FASTAPI_URL}/resume_workflow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        claim_id: claimId,
        source_task: failedTask,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || "Failed to resume workflow.");
    }
  }

  public async fetchRAGResult(claimId: string): Promise<any | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("rag_results")
      .select("*")
      .eq("claim_id", claimId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }

  public async resolveRAGDecision(claimId: string, action: "payment_approved" | "rejected"): Promise<void> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated.");

    const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";
    const res = await fetch(`${FASTAPI_URL}/resolve_rag`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        claim_id: claimId,
        action: action,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || "Failed to resolve RAG decision.");
    }
  }

  

  
  public getImagePublicUrl(storagePath: string): string {
    const supabase = createClient();
    const { data } = supabase.storage
      .from("claim_images")
      .getPublicUrl(storagePath);
    return data.publicUrl;
  }

  

  
  public async updateClaimStatus(
    claimId: string,
    payload: ClaimUpdatePayload
  ): Promise<void> {
    const supabase = createClient();

    const updateData: Record<string, unknown> = {
      status: payload.status,
      updated_at: new Date().toISOString(),
    };

    if (payload.ai_verdict !== undefined) {
      updateData.ai_verdict = payload.ai_verdict;
    }

    const { error } = await supabase
      .from("claims")
      .update(updateData)
      .eq("id", claimId);

    if (error) throw new Error(error.message);
  }
}


export const adminClaimsService = AdminClaimsService.getInstance();
export default AdminClaimsService;