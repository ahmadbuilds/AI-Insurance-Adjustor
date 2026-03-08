import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return renderPage("Invalid Link", "The confirmation link is missing the required token.", true);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return renderPage("Server Error", "Email confirmation is not configured. Please contact the administrator.", true);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Find the pending confirmation record
  const { data: record, error: fetchError } = await supabase
    .from("email_confirmations")
    .select("*")
    .eq("token", token)
    .eq("confirmed", false)
    .single();

  if (fetchError || !record) {
    return renderPage(
      "Link Expired or Invalid",
      "This confirmation link has already been used or is no longer valid. Please contact your administrator if you need a new one.",
      true
    );
  }

  // Check expiry (24 hours)
  const createdAt = new Date(record.created_at);
  const now = new Date();
  if (now.getTime() - createdAt.getTime() > 24 * 60 * 60 * 1000) {
    return renderPage(
      "Link Expired",
      "This confirmation link has expired. Please contact your administrator to resend it.",
      true
    );
  }

  // Confirm the user's email in Supabase Auth
  const { error: updateError } = await supabase.auth.admin.updateUserById(record.user_id, {
    email_confirm: true,
  });

  if (updateError) {
    return renderPage("Confirmation Failed", `Could not confirm your account: ${updateError.message}`, true);
  }

  // Mark the token as used
  await supabase
    .from("email_confirmations")
    .update({ confirmed: true })
    .eq("token", token);

  return renderPage(
    "Account Confirmed! 🎉",
    "Your email has been verified and your account is now active. You can log in with the credentials sent to your email.",
    false
  );
}

function renderPage(title: string, message: string, isError: boolean) {
  const accentColor = isError ? "#ef4444" : "#22c55e";
  const bgAccent = isError ? "#fef2f2" : "#f0fdf4";
  const icon = isError
    ? `<svg style="width:40px;height:40px;color:${accentColor};" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"/></svg>`
    : `<svg style="width:40px;height:40px;color:${accentColor};" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${title} — AI Insurance Adjuster</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;box-shadow:0 4px 6px rgba(0,0,0,0.07);overflow:hidden;">
    <tr>
      <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:20px;">🛡️ AI Insurance Adjuster</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:40px;text-align:center;">
        <div style="margin:0 auto 16px;width:64px;height:64px;border-radius:50%;background:${bgAccent};display:flex;align-items:center;justify-content:center;">
          ${icon}
        </div>
        <h2 style="margin:0 0 12px;color:#1f2937;font-size:22px;">${title}</h2>
        <p style="margin:0 0 28px;color:#6b7280;font-size:15px;line-height:1.6;">${message}</p>
        <a href="/login" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">
          Go to Login
        </a>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return new NextResponse(html, {
    status: isError ? 400 : 200,
    headers: { "Content-Type": "text/html" },
  });
}
