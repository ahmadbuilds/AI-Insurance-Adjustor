import os
import asyncio
import logging
import requests
from langchain_core.tools import tool
from domain.ports import ClaimRepositoryPort
from infrastructure.supabase.supabase_client import get_service_client

logger = logging.getLogger(__name__)

async def send_email(to_email: str, subject: str, body: str):
    service_id = os.getenv("EMAILJS_SERVICE_ID")
    template_id = os.getenv("EMAILJS_TEMPLATE_ID")
    public_key = os.getenv("EMAILJS_PUBLIC_KEY")
    private_key = os.getenv("EMAILJS_PRIVATE_KEY")

    if not all([service_id, template_id, public_key, private_key]):
        logger.warning("EmailJS credentials not fully configured. Skipping email.")
        return

    payload = {
        "service_id": service_id,
        "template_id": template_id,
        "user_id": public_key,
        "accessToken": private_key,
        "template_params": {
            "to_email": to_email,
            "subject": subject,
            "html_message": body
        }
    }

    def _send():
        try:
            response = requests.post(
                "https://api.emailjs.com/api/v1.0/email/send",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            if response.status_code == 200:
                logger.info("Email sent successfully to %s", to_email)
            else:
                logger.error("Failed to send email: %s", response.text)
        except Exception as e:
            logger.error("Failed to send email via EmailJS: %s", e)

    await asyncio.to_thread(_send)

def send_status_update_email(claim_id: str, status: str, ai_verdict: str):
    """Utility function to fetch user email and send formatted claim status update."""
    try:
        supabase = get_service_client()
        claim_res = supabase.table('claims').select('user_id').eq('id', claim_id).execute()
        if claim_res.data and claim_res.data[0].get('user_id'):
            user_id = claim_res.data[0]['user_id']
            user_res = supabase.table('users').select('email').eq('id', user_id).execute()
            if user_res.data and user_res.data[0].get('email'):
                email = user_res.data[0]['email']
                claim_short = claim_id[:8].upper()
                status_text = "APPROVED" if status == "approved" else "REJECTED"
                subject = f"Insurance Claim Update: Decision {status_text} (Claim #{claim_short})"
                is_approved = status == "approved"
                accent_color = "#10b981" if is_approved else "#ef4444"
                status_emoji = "✅" if is_approved else "❌"
                status_label = "Approved" if is_approved else "Rejected"
                
                html_verdict = ai_verdict.replace("\\n", "<br/>")

                body = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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
                      AI Insurance Adjuster
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Status Banner ── -->
          <tr>
            <td style="background-color:{accent_color};padding:14px 44px;text-align:center;">
              <p style="margin:0;color:#ffffff;font-size:17px;font-weight:700;letter-spacing:-0.2px;">
                {status_emoji} &nbsp; Claim {status_label}
              </p>
            </td>
          </tr>

          <!-- ── Main Body ── -->
          <tr>
            <td style="padding:40px 44px;">

              <!-- Greeting -->
              <h2 style="margin:0 0 6px;color:#0f172a;font-size:22px;font-weight:700;">
                Hello,
              </h2>
              <p style="margin:0 0 6px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;">
                Decision on your claim #{claim_short}
              </p>

              <div style="height:1px;background-color:#e2e8f0;margin:20px 0;"></div>

              <!-- Message -->
              <p style="margin:0 0 22px;color:#374151;font-size:15px;line-height:1.75;">
                After a thorough review, your recent insurance claim has been <strong>{status_label.lower()}</strong>.
              </p>

              <!-- Claim Reference -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background-color:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid {accent_color};border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 4px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;">
                      Decision Details / Verdict
                    </p>
                    <p style="margin:0;color:#0f172a;font-size:14px;line-height:1.6;">
                      {html_verdict}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Next Steps -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:24px 0;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 10px;color:#0f172a;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;">
                      What happens next?
                    </p>
                    <p style="margin:0;color:#374151;font-size:14px;line-height:1.7;">
                      If you have any questions or wish to file a dispute regarding this decision, please visit the Claimant Portal.
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
</html>
"""
                
                try:
                    loop = asyncio.get_running_loop()
                    loop.create_task(send_email(email, subject, body))
                except RuntimeError:
                    asyncio.run(send_email(email, subject, body))
    except Exception as e:
        logger.error("Error setting up email task: %s", e)


def _emit_claimant_socket_event(claim_id: str, status: str, ai_verdict: str):
    """Emit a real-time socket event to notify claimants of claim approval/rejection via internal HTTP endpoint (thread-safe)."""
    try:
        claim_short = claim_id[:8].upper()
        if status == "approved":
            message = f"Your claim #{claim_short} has been approved! {ai_verdict}"
        elif status == "rejected":
            message = f"Your claim #{claim_short} has been rejected. {ai_verdict}"
        else:
            return

        api_url = os.getenv("BACKEND_API_URL", "http://127.0.0.1:8000")
        requests.post(
            f"{api_url}/api/internal/emit-claim-status",
            json={"claim_id": claim_id, "type": status, "message": message},
            timeout=5
        )
    except Exception as e:
        logger.error("Failed to emit claimant socket event: %s", e)


def _save_claimant_notification_to_db(claim_id: str, status: str, ai_verdict: str):
    """Save a persistent notification to the claimant_notifications table."""
    try:
        supabase = get_service_client()
        # Fetch user_id for this claim
        claim_res = supabase.table('claims').select('user_id').eq('id', claim_id).execute()
        if not claim_res.data or not claim_res.data[0].get('user_id'):
            logger.warning("Could not find user_id for claim %s to save notification", claim_id)
            return

        user_id = claim_res.data[0]['user_id']
        claim_short = claim_id[:8].upper()

        if status == "approved":
            notification_type = "approved"
            message = f"Your claim #{claim_short} has been approved. {ai_verdict}"
        elif status == "rejected":
            notification_type = "rejected"
            message = f"Your claim #{claim_short} has been rejected. {ai_verdict}"
        else:
            return

        supabase.table('claimant_notifications').insert({
            "claim_id": claim_id,
            "user_id": user_id,
            "type": notification_type,
            "message": message,
            "is_read": False
        }).execute()
        logger.info("Claimant notification saved for claim %s", claim_id)
    except Exception as e:
        logger.error("Failed to save claimant notification: %s", e)


#wrapper function to update claim status using the ClaimRepositoryPort
def make_update_claim_status_tool(claim_repository: ClaimRepositoryPort, claim_id: str):
    @tool(
        "update_claim_status",
        description="Updates the status and ai_verdict columns of the current claim in the claims table. Use this to reject a claim when no vehicle is detected in any submitted image.",
    )
    def update_claim_status(status: str, ai_verdict: str) -> str:
        """
        Tool function to update the claim's status and AI verdict.
        Args:
            status: New status for the claim (e.g. 'rejected', 'approved', 'under_review').
            ai_verdict: AI-generated explanation for the status decision.
        Returns:
            str: Success or failure message.
        """
        success = claim_repository.update_claim_status(claim_id, status, ai_verdict)
        if success:
            if status in ["approved", "rejected"]:
                send_status_update_email(claim_id, status, ai_verdict)
                _save_claimant_notification_to_db(claim_id, status, ai_verdict)
                _emit_claimant_socket_event(claim_id, status, ai_verdict)

            return f"Claim {claim_id} updated: status='{status}'"
        return f"Failed to update claim {claim_id}"

    return update_claim_status

