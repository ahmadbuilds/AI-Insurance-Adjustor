import { createClient } from "@/lib/supabase/client";
import type {
  AdminClaim,
  AdminClaimDetail,
  ClaimImage,
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

    return {
      ...claim,
      user: user ?? null,
      images: images ?? [],
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