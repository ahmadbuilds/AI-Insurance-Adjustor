import { createClient } from "@/lib/supabase/client";
import type { ImageFile } from "../utils/claim-helpers";

class ClaimsService {
  private static instance: ClaimsService;

  private constructor() {}

  public static getInstance(): ClaimsService {
    if (!ClaimsService.instance) {
      ClaimsService.instance = new ClaimsService();
    }
    return ClaimsService.instance;
  }

  public async submitClaim(
    title: string,
    description: string,
    images: ImageFile[]
  ): Promise<void> {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("You must be logged in to submit a claim.");
    }

    const { data: claim, error: claimError } = await supabase
      .from("claims")
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        status: "pending",
      })
      .select("id")
      .single();

    if (claimError || !claim) {
      throw new Error(claimError?.message || "Failed to create claim.");
    }

    const imageRecords: {
      claim_id: string;
      user_id: string;
      storage_path: string;
      file_name: string;
      file_size: number;
      mime_type: string;
    }[] = [];

    for (const img of images) {
      const ext = img.file.name.split(".").pop() || "jpg";
      const storagePath = `${user.id}/${claim.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("claim_images")
        .upload(storagePath, img.file, { contentType: img.file.type });

      if (uploadError) {
        throw new Error(`Failed to upload "${img.file.name}": ${uploadError.message}`);
      }

      imageRecords.push({
        claim_id: claim.id,
        user_id: user.id,
        storage_path: storagePath,
        file_name: img.file.name,
        file_size: img.file.size,
        mime_type: img.file.type,
      });
    }
    const { error: imgInsertError } = await supabase.from("claim_images").insert(imageRecords);
    if (imgInsertError) {
      throw new Error(`Claim created but image records failed: ${imgInsertError.message}`);
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:8000";
      
      await fetch(`${backendUrl}/publish_event?event_channel=claim_evaluation_${claim.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          claim_id: claim.id,
          user_id: user.id,
          action: "start_evaluation",
        }),
      }).catch(err => {
          console.error("Failed to trigger evaluation:", err);
      });
    }
  }
}

export const claimsService = ClaimsService.getInstance();
export default ClaimsService;
