import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendCompensationInvoiceEmail } from "@/lib/email";

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
      .select("id, user_id, title, status")
      .eq("id", claimId)
      .single();

    if (cErr || !claim) {
      return NextResponse.json(
        { error: "Claim not found" },
        { status: 404 }
      );
    }

    if (claim.status === "closed") {
      return NextResponse.json(
        { error: "Claim is already closed." },
        { status: 400 }
      );
    }

    // Fetch RAG results for compensation data
    const { data: rag, error: rErr } = await supabase
      .from("rag_results")
      .select("compensation_amount, compensation_breakdown")
      .eq("claim_id", claimId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rErr || !rag) {
      return NextResponse.json(
        { error: "No compensation details found for this claim." },
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

    // Parse breakdown from JSON string or list
    let breakdown = [];
    if (typeof rag.compensation_breakdown === "string") {
      try {
        breakdown = JSON.parse(rag.compensation_breakdown);
      } catch (e) {
        breakdown = [];
      }
    } else if (Array.isArray(rag.compensation_breakdown)) {
      breakdown = rag.compensation_breakdown;
    }

    // Send email
    await sendCompensationInvoiceEmail({
      to: user.email,
      username: user.username,
      claimTitle: claim.title ?? "Your Claim",
      compensationAmount: rag.compensation_amount || 0,
      breakdown: breakdown,
    });

    // Mark as closed
    await supabase
      .from("claims")
      .update({
        status: "closed",
        ai_verdict: "Compensation Approved by Admin. Invoice Sent.",
        updated_at: new Date().toISOString()
      })
      .eq("id", claimId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Claim accept error:", error);
    return NextResponse.json(
      { error: "Failed to process acceptance" },
      { status: 500 }
    );
  }
}
