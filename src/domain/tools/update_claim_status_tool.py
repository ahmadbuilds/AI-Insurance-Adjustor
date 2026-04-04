from langchain_core.tools import tool
from domain.ports import ClaimRepositoryPort


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
            return f"Claim {claim_id} updated: status='{status}'"
        return f"Failed to update claim {claim_id}"

    return update_claim_status
