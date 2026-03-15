import { createClient } from "@/lib/supabase/client";
import type {
  AdminDispute,
  DisputeUpdatePayload,
} from "../types/admin-disputes.types";

class AdminDisputesService {
  private static instance: AdminDisputesService;

  private constructor() {}

  public static getInstance(): AdminDisputesService {
    if (!AdminDisputesService.instance) {
      AdminDisputesService.instance = new AdminDisputesService();
    }
    return AdminDisputesService.instance;
  }

  public async fetchAllDisputes(): Promise<AdminDispute[]> {
    const supabase = createClient();

    const { data: disputes, error } = await supabase
      .from("disputes")
      .select(
        "id, user_id, claim_id, description, evidence, photo_url, status, admin_note, created_at, updated_at"
      )
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    if (!disputes || disputes.length === 0) return [];

    const userIds = [...new Set(disputes.map((d) => d.user_id))];
    const claimIds = [...new Set(disputes.map((d) => d.claim_id))];

    const { data: users } = await supabase
      .from("users")
      .select("id, username, email, role, profile_image_url, created_at")
      .in("id", userIds);

    const { data: claims } = await supabase
      .from("claims")
      .select("id, title, description, status, ai_verdict")
      .in("id", claimIds);

    const userMap = new Map((users ?? []).map((u) => [u.id, u]));
    const claimMap = new Map((claims ?? []).map((c) => [c.id, c]));

    return disputes.map((d) => ({
      ...d,
      status: (d.status ?? "pending") as AdminDispute["status"],
      user: userMap.get(d.user_id) ?? null,
      claim: claimMap.get(d.claim_id) ?? null,
    }));
  }

  public async fetchDisputeById(id: string): Promise<AdminDispute | null> {
    const supabase = createClient();

    const { data: dispute, error } = await supabase
      .from("disputes")
      .select(
        "id, user_id, claim_id, description, evidence, photo_url, status, admin_note, created_at, updated_at"
      )
      .eq("id", id)
      .single();

    if (error || !dispute) return null;

    const { data: user } = await supabase
      .from("users")
      .select("id, username, email, role, profile_image_url, created_at")
      .eq("id", dispute.user_id)
      .maybeSingle();

    const { data: claim } = await supabase
      .from("claims")
      .select("id, title, description, status, ai_verdict")
      .eq("id", dispute.claim_id)
      .maybeSingle();

    return {
      ...dispute,
      status: (dispute.status ?? "pending") as AdminDispute["status"],
      user: user ?? null,
      claim: claim ?? null,
    };
  }

  public async updateDisputeStatus(
    disputeId: string,
    payload: DisputeUpdatePayload,
    claimId: string
  ): Promise<void> {
    const supabase = createClient();

    const updateData: Record<string, unknown> = {
      status: payload.status,
      updated_at: new Date().toISOString(),
    };

    if (payload.admin_note !== undefined) {
      updateData.admin_note = payload.admin_note;
    }

    const { error: disputeError } = await supabase
      .from("disputes")
      .update(updateData)
      .eq("id", disputeId);

    if (disputeError) throw new Error(disputeError.message);

    // If approved → reinstate the original claim as approved
    if (payload.status === "approved") {
      const { error: claimError } = await supabase
        .from("claims")
        .update({
          status: "approved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", claimId);

      if (claimError) throw new Error(claimError.message);
    }
  }
}

export const adminDisputesService = AdminDisputesService.getInstance();
export default AdminDisputesService;
