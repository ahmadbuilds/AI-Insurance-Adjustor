import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendClaimSubmissionEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { claimId } = body as {
      claimId: string;
    };

    if (!claimId) {
      return NextResponse.json(
        { error: "Missing required field: claimId" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server misconfiguration: missing Supabase credentials" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch claim details
    const { data: claim, error: cErr } = await supabase
      .from("claims")
      .select("id, user_id, title")
      .eq("id", claimId)
      .single();

    if (cErr || !claim) {
      return NextResponse.json(
        { error: "Claim not found" },
        { status: 404 }
      );
    }

    // Fetch user
    const { data: user, error: uErr } = await supabase
      .from("users")
      .select("username, email")
      .eq("id", claim.user_id)
      .maybeSingle();

    if (uErr || !user?.email) {
      return NextResponse.json(
        { error: "User not found or missing email" },
        { status: 404 }
      );
    }

    await sendClaimSubmissionEmail({
      to: user.email,
      username: user.username,
      claimTitle: claim.title ?? "Your Claim",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Claim notification error:", error);
    return NextResponse.json(
      { error: "Failed to send notification email" },
      { status: 500 }
    );
  }
}
