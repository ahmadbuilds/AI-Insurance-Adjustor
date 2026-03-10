import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import pdfParse from "pdf-parse"; 
import mammoth from "mammoth";

export const runtime = "nodejs";

async function extractTextFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const name = file.name.toLowerCase();
  const type = file.type;

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    const result = await pdfParse(buffer);
    return result.text ?? "";
  }

  if (
    type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value ?? "";
  }
  return "";
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "Server misconfiguration: missing service role key" },
        { status: 500 }
      );
    }
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );


    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const formData = await request.formData();

    const claimId = formData.get("claim_id");
    const description = (formData.get("description") ?? "").toString();

    if (!claimId || typeof claimId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid claim_id" },
        { status: 400 }
      );
    }

    const { data: claim, error: claimError } = await supabase
      .from("claims")
      .select("id, user_id, status")
      .eq("id", claimId)
      .single();

    if (claimError || !claim) {
      return NextResponse.json(
        { error: "Claim not found" },
        { status: 404 }
      );
    }

    if (claim.user_id !== user.id) {
      return NextResponse.json(
        { error: "You can only dispute your own claims" },
        { status: 403 }
      );
    }

    if (claim.status !== "rejected") {
      return NextResponse.json(
        { error: "Only rejected claims can be disputed" },
        { status: 400 }
      );
    }

    const evidenceFile = formData.get("evidence");
    const briefFile = formData.get("brief");
    const photoFile = formData.get("photos");

    let evidenceParts: string[] = [];

    if (evidenceFile instanceof File) {
      const text = await extractTextFromFile(evidenceFile);
      if (text.trim()) {
        evidenceParts.push(`Evidence file (${evidenceFile.name}):\n${text}`);
      }
    }

    if (briefFile instanceof File) {
      const text = await extractTextFromFile(briefFile);
      if (text.trim()) {
        evidenceParts.push(`Brief file (${briefFile.name}):\n${text}`);
      }
    }

    let photoUrl: string | null = null;

    if (photoFile instanceof File) {
      const arrayBuffer = await photoFile.arrayBuffer();
      const bytes = Buffer.from(arrayBuffer);
      const path = `${user.id}/${claimId}/${Date.now()}-${photoFile.name}`;

      const { error: uploadError } = await adminSupabase.storage
        .from("dispute_images")
        .upload(path, bytes, {
          contentType: photoFile.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json(
          { error: `Failed to upload photo: ${uploadError.message}` },
          { status: 500 }
        );
      }

      const { data: publicUrlData } = adminSupabase.storage
        .from("dispute_images")
        .getPublicUrl(path);

      photoUrl = publicUrlData.publicUrl ?? null;
    }

    const evidenceText = evidenceParts.join("\n\n-----\n\n");

    const { error: insertError } = await supabase.from("disputes").insert({
      user_id: user.id,
      claim_id: claimId,
      photo_url: photoUrl,
      description: description || null,
      evidence: evidenceText || null,
    });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating dispute:", error);
    return NextResponse.json(
      { error: "Unexpected error while creating dispute" },
      { status: 500 }
    );
  }
}

