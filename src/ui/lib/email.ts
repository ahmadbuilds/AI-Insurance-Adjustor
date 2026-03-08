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
