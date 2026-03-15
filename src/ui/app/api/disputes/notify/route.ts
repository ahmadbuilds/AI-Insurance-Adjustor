import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendDisputeDecisionEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { disputeId, newStatus, adminNote } = body as {
      disputeId: string;
      newStatus: "approved" | "rejected";
      adminNote: string | null;
    };

    if (!disputeId || !newStatus) {
      return NextResponse.json(
        { error: "Missing required fields: disputeId and newStatus" },
        { status: 400 }
      );
    }

    if (newStatus !== "approved" && newStatus !== "rejected") {
      return NextResponse.json(
        { error: "Invalid status. Must be 'approved' or 'rejected'." },
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

    // Fetch dispute details
    const { data: dispute, error: dErr } = await supabase
      .from("disputes")
      .select("id, user_id, claim_id")
      .eq("id", disputeId)
      .single();

    if (dErr || !dispute) {
      return NextResponse.json(
        { error: "Dispute not found" },
        { status: 404 }
      );
    }

    // Fetch user
    const { data: user, error: uErr } = await supabase
      .from("users")
      .select("username, email")
      .eq("id", dispute.user_id)
      .maybeSingle();

    if (uErr || !user?.email) {
      return NextResponse.json(
        { error: "User not found or missing email" },
        { status: 404 }
      );
    }

    // Fetch claim title
    const { data: claim } = await supabase
      .from("claims")
      .select("title")
      .eq("id", dispute.claim_id)
      .maybeSingle();

    await sendDisputeDecisionEmail({
      to: user.email,
      username: user.username,
      claimTitle: claim?.title ?? "Your Claim",
      status: newStatus,
      adminNote: adminNote ?? null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dispute notification error:", error);
    return NextResponse.json(
      { error: "Failed to send notification email" },
      { status: 500 }
    );
  }
}
