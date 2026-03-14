import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_ADDRESS =
  process.env.SMTP_FROM || "AI Insurance Adjuster <no-reply@ai-insurance.com>";

// ── Account Confirmation Email ────────────────────────────────────────────────
export async function sendConfirmationEmail({
  to,
  username,
  password,
  confirmUrl,
}: {
  to: string;
  username: string;
  password: string;
  confirmUrl: string;
}) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                🛡️ AI Insurance Adjuster
              </h1>
              <p style="margin:8px 0 0;color:#c7d2fe;font-size:14px;">
                Intelligent Claims Processing Platform
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;color:#1f2937;font-size:20px;font-weight:600;">
                Welcome aboard, ${username}! 🎉
              </h2>
              <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
                An administrator has created an account for you on the <strong>AI Insurance Adjuster</strong> platform.
                Please confirm your email to activate your account.
              </p>

              <!-- Credentials Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;color:#166534;font-size:14px;font-weight:600;">
                      Your Login Credentials
                    </p>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:4px 0;color:#374151;font-size:14px;font-weight:600;width:90px;">Email:</td>
                        <td style="padding:4px 0;color:#374151;font-size:14px;">${to}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#374151;font-size:14px;font-weight:600;width:90px;">Password:</td>
                        <td style="padding:4px 0;color:#374151;font-size:14px;">${password}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${confirmUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
                      Confirm My Account
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">
                This is an automated message from AI Insurance Adjuster.
              </p>
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                If you did not expect this email, please ignore it or contact your administrator.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: FROM_ADDRESS,
    to,
    subject: "AI Insurance Adjuster — Confirm Your Account",
    html,
  });
}

// ── Dispute Decision Email ────────────────────────────────────────────────────
export async function sendDisputeDecisionEmail({
  to,
  username,
  claimTitle,
  status,
  adminNote,
}: {
  to: string;
  username: string;
  claimTitle: string;
  status: "approved" | "rejected";
  adminNote: string | null;
}) {
  const isApproved = status === "approved";

  // Colour palette — green for approved, red for rejected
  const accentColor = isApproved ? "#10b981" : "#ef4444";
  const accentDark  = isApproved ? "#065f46" : "#7f1d1d";
  const accentLight = isApproved ? "#f0fdf4" : "#fff1f2";
  const accentBorder = isApproved ? "#6ee7b7" : "#fca5a5";
  const accentText  = isApproved ? "#065f46" : "#991b1b";

  const statusLabel = isApproved ? "Approved" : "Rejected";
  const statusEmoji = isApproved ? "✅" : "❌";

  const headline = isApproved
    ? "Your dispute has been upheld"
    : "Your dispute has been reviewed";

  const bodyMessage = isApproved
    ? `We are pleased to inform you that, following a thorough review of your dispute for the claim <strong>"${claimTitle}"</strong>, our adjuster team has found your dispute to be valid. Your claim has been <strong>reinstated and approved</strong>.`
    : `Thank you for filing a dispute regarding the claim <strong>"${claimTitle}"</strong>. After careful review by our adjuster team, we were unable to uphold your dispute at this time. The original rejection decision will remain in place, and this claim cannot be disputed again.`;

  const nextStepsText = isApproved
    ? "Your claim is now approved. Please log in to your account to view the updated status and any further details regarding your payout."
    : "If you believe there has been an error or have questions regarding this decision, please reach out to our support team using the contact details below.";

  const adminNoteBlock = adminNote
    ? `
    <!-- Admin Note -->
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background-color:${accentLight};border:1px solid ${accentBorder};border-left:4px solid ${accentColor};border-radius:8px;margin:20px 0;">
      <tr>
        <td style="padding:18px 22px;">
          <p style="margin:0 0 8px;color:${accentText};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;">
            Note from the Adjuster
          </p>
          <p style="margin:0;color:${accentDark};font-size:14px;line-height:1.65;">${adminNote}</p>
        </td>
      </tr>
    </table>`
    : "";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dispute ${statusLabel} — Immaculate Aegis</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0"
          style="background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.08),0 2px 6px rgba(0,0,0,0.04);">

          <!-- ── Brand Header ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:32px 44px;text-align:center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <p style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;line-height:1.2;">
                      🛡️ Immaculate Aegis
                    </p>
                    <p style="margin:6px 0 0;color:#c7d2fe;font-size:13px;letter-spacing:0.3px;">
                      AI Insurance Adjuster &nbsp;·&nbsp; Dispute Resolution Centre
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Status Banner ── -->
          <tr>
            <td style="background-color:${accentColor};padding:14px 44px;text-align:center;">
              <p style="margin:0;color:#ffffff;font-size:17px;font-weight:700;letter-spacing:-0.2px;">
                ${statusEmoji} &nbsp; Dispute ${statusLabel}
              </p>
            </td>
          </tr>

          <!-- ── Main Body ── -->
          <tr>
            <td style="padding:40px 44px;">

              <!-- Greeting -->
              <h2 style="margin:0 0 6px;color:#0f172a;font-size:22px;font-weight:700;">
                Dear ${username},
              </h2>
              <p style="margin:0 0 6px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;">
                ${headline}
              </p>

              <div style="height:1px;background-color:#e2e8f0;margin:20px 0;"></div>

              <!-- Message -->
              <p style="margin:0 0 22px;color:#374151;font-size:15px;line-height:1.75;">
                ${bodyMessage}
              </p>

              <!-- Claim Reference -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background-color:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid ${accentColor};border-radius:8px;margin-bottom:8px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 4px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;">
                      Claim Reference
                    </p>
                    <p style="margin:0;color:#0f172a;font-size:15px;font-weight:600;">
                      ${claimTitle}
                    </p>
                  </td>
                </tr>
              </table>

              ${adminNoteBlock}

              <!-- Next Steps -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:24px 0;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 10px;color:#0f172a;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;">
                      What happens next?
                    </p>
                    <p style="margin:0;color:#374151;font-size:14px;line-height:1.7;">
                      ${nextStepsText}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/dispute-panel"
                      style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.2px;">
                      View My Disputes
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ── Contact & Location Footer ── -->
          <tr>
            <td style="background-color:#f8fafc;padding:28px 44px;border-top:1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Contact column -->
                  <td style="width:50%;vertical-align:top;padding-right:20px;">
                    <p style="margin:0 0 10px;color:#1e293b;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;">
                      Contact Us
                    </p>
                    <p style="margin:0 0 4px;color:#64748b;font-size:12px;line-height:1.7;">
                      <a href="mailto:l233023@lhr.nu.edu.pk" style="color:#4f46e5;text-decoration:none;">l233023@lhr.nu.edu.pk</a>
                      &nbsp;—&nbsp; Syed Hadi Zaidi
                    </p>
                    <p style="margin:0 0 4px;color:#64748b;font-size:12px;line-height:1.7;">
                      <a href="mailto:l233022@lhr.nu.edu.pk" style="color:#4f46e5;text-decoration:none;">l233022@lhr.nu.edu.pk</a>
                      &nbsp;—&nbsp; Muhammad Mazan
                    </p>
                    <p style="margin:0 0 4px;color:#64748b;font-size:12px;line-height:1.7;">
                      <a href="mailto:l233104@lhr.nu.edu.pk" style="color:#4f46e5;text-decoration:none;">l233104@lhr.nu.edu.pk</a>
                      &nbsp;—&nbsp; Muhammad Ahmad
                    </p>
                    <p style="margin:0 0 12px;color:#64748b;font-size:12px;line-height:1.7;">
                      <a href="mailto:l233080@lhr.nu.edu.pk" style="color:#4f46e5;text-decoration:none;">l233080@lhr.nu.edu.pk</a>
                      &nbsp;—&nbsp; Abdullah Latif
                    </p>
                    <p style="margin:0;color:#64748b;font-size:12px;">
                      📞 <a href="tel:+923193705678" style="color:#4f46e5;text-decoration:none;font-weight:500;">0319-3705678</a>
                    </p>
                  </td>

                  <!-- Divider -->
                  <td style="width:1px;background-color:#e2e8f0;">&nbsp;</td>

                  <!-- Location column -->
                  <td style="width:50%;vertical-align:top;padding-left:20px;">
                    <p style="margin:0 0 10px;color:#1e293b;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;">
                      Our Location
                    </p>
                    <p style="margin:0 0 10px;color:#64748b;font-size:12px;line-height:1.8;">
                      FAST-NUCES<br />
                      852-B Milaad Street, Block B<br />
                      Faisal Town, Lahore 54770<br />
                      Pakistan
                    </p>
                    <p style="margin:0;color:#64748b;font-size:12px;line-height:1.7;">
                      🕐 Monday – Friday<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;9:00 AM – 6:00 PM PKT<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;Support available 24/7
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Legal Footer ── -->
          <tr>
            <td style="background-color:#f1f5f9;padding:18px 44px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;">
                © 2024 Immaculate Aegis &nbsp;·&nbsp; AI Insurance Adjuster &nbsp;·&nbsp; All rights reserved.
              </p>
              <p style="margin:0;color:#94a3b8;font-size:11px;">
                This is an automated notification. Please do not reply directly to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

  await transporter.sendMail({
    from: FROM_ADDRESS,
    to,
    subject: `Immaculate Aegis — Dispute ${statusLabel}: "${claimTitle}"`,
    html,
  });
}
