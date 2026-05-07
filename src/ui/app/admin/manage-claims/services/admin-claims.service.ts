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
      .select("id, user_id, title, description, status, ai_verdict, created_at, updated_at, admin_notifications(is_resolved, message)")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    if (!claims || claims.length === 0) return [];

    
    const userIds = [...new Set(claims.map((c) => c.user_id))];
    const { data: users } = await supabase
      .from("users")
      .select("id, username, email, role, profile_image_url, created_at")
      .in("id", userIds);

    const userMap = new Map((users ?? []).map((u) => [u.id, u]));

    return claims.map((claim) => {
      const unresolvedNotifications = (claim.admin_notifications as any[])?.filter(
        n => n.is_resolved === false && n.message !== "Manual review required: Liability passed, but AI policy analysis needs final human validation before payout."
      );
      const has_technical_failure = unresolvedNotifications && unresolvedNotifications.length > 0;
      
      const { admin_notifications, ...rest } = claim;
      
      return {
        ...rest,
        has_technical_failure,
        user: userMap.get(claim.user_id) ?? null,
      };
    });
  }

  
  public async fetchClaimsByStatus(status: ClaimStatus): Promise<AdminClaim[]> {
    const supabase = createClient();

    const { data: claims, error } = await supabase
      .from("claims")
      .select("id, user_id, title, description, status, ai_verdict, created_at, updated_at, admin_notifications(is_resolved, message)")
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

    return claims.map((claim) => {
      const unresolvedNotifications = (claim.admin_notifications as any[])?.filter(
        n => n.is_resolved === false && n.message !== "Manual review required: Liability passed, but AI policy analysis needs final human validation before payout."
      );
      const has_technical_failure = unresolvedNotifications && unresolvedNotifications.length > 0;
      
      const { admin_notifications, ...rest } = claim;

      return {
        ...rest,
        has_technical_failure,
        user: userMap.get(claim.user_id) ?? null,
      };
    });
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

 
  public async resolveNotificationAndResume(
    notificationId: string,
    claimId: string,
    failedTask: string,
  ): Promise<void> {
    const supabase = createClient();


    const { error: updateErr } = await supabase
      .from("admin_notifications")
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", notificationId);

    if (updateErr) throw new Error(updateErr.message);


    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated.");

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

  public async resolveRAGDecision(claimId: string, action: "payment_approved" | "rejected", rejectionReason?: string): Promise<void> {
    const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    const payload: any = { claim_id: claimId, action };
    if (action === "rejected" && rejectionReason) {
      payload.rejection_reason = rejectionReason;
    }

    const res = await fetch(`${FASTAPI_URL}/resolve_rag`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.detail || `FastAPI /resolve_rag failed with status ${res.status}`);
    }
  }

  public async fetchClaimAgentResults(claimId: string): Promise<any> {
    const supabase = createClient();
    
    const fetchLatest = async (table: string) => {
      const { data } = await supabase.from(table).select("*").eq("claim_id", claimId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    };

    const [
      classification,
      sameVehicle,
      vehicleType,
      damageDetection,
      liability,
      rag
    ] = await Promise.all([
      fetchLatest("classification_results"),
      fetchLatest("same_vehicle_results"),
      fetchLatest("vehicle_type_results"),
      fetchLatest("damage_detection_results"),
      fetchLatest("liability_results"),
      fetchLatest("rag_results")
    ]);

    return {
      classification,
      sameVehicle,
      vehicleType,
      damageDetection,
      liability,
      rag
    };
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