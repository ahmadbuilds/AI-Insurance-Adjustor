import { createClient } from "@/lib/supabase/client";
export type RejectedClaim = {
  id: string;
  title: string;
  description: string;
  status: string;
  ai_verdict: string | null;
  created_at: string;
};

export type ClaimImage = {
  id: string;
  file_name: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
};


class DisputeService {
  private static instance: DisputeService;

  private constructor() {}

  public static getInstance(): DisputeService {
    if (!DisputeService.instance) {
      DisputeService.instance = new DisputeService();
    }
    return DisputeService.instance;
  }

  public async fetchRejectedClaimsAndModes(): Promise<{
    claims: RejectedClaim[];
    modes: Record<string, "idle" | "detail" | "dispute" | "disputed">;
  }> {
    const supabase = createClient();

    // Fetch claims that were rejected
    const { data: claimsData, error: claimsErr } = await supabase
      .from("claims")
      .select("id, title, description, status, ai_verdict, created_at")
      .eq("status", "rejected")
      .order("created_at", { ascending: false });

    if (claimsErr) {
      throw new Error(claimsErr.message);
    }

    const fetchedClaims = claimsData ?? [];
    const modes: Record<string, "idle" | "detail" | "dispute" | "disputed"> = {};

    // Check for existing disputes from this user to set initial UI modes
    if (fetchedClaims.length > 0) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existingDisputes } = await supabase
          .from("disputes")
          .select("claim_id")
          .eq("user_id", user.id)
          .in("claim_id", fetchedClaims.map((c) => c.id));

        const disputedIds = new Set((existingDisputes ?? []).map((d) => d.claim_id));
        
        fetchedClaims.forEach((c) => {
          // If they already disputed it, mark it as 'disputed', otherwise 'idle'
          modes[c.id] = disputedIds.has(c.id) ? "disputed" : "idle";
        });
      }
    }

    return { claims: fetchedClaims, modes };
  }

  
  public async fetchClaimImages(claimId: string): Promise<ClaimImage[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("claim_images")
      .select("id, file_name, storage_path, file_size, mime_type")
      .eq("claim_id", claimId)
      .order("created_at", { ascending: true });

    if (error) {
       console.error("Failed to fetch claim images:", error);
       return [];
    }
    return data ?? [];
  }


  public async submitDispute(
    claimId: string,
    reason: string,
    evidenceFile: File | null,
    photoFile: File | null
  ): Promise<void> {
    const formData = new FormData();
    formData.append("claim_id", claimId);
    formData.append("description", reason);
    if (evidenceFile) formData.append("evidence", evidenceFile);
    if (photoFile) formData.append("photos", photoFile);

    const response = await fetch("/api/disputes", { 
        method: "POST", 
        body: formData 
    });
    
    if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result?.error || "Failed to submit dispute. Please try again.");
    }
  }
}

export const disputeService = DisputeService.getInstance();
export default DisputeService;
