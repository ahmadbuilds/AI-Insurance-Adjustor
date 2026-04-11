from supabase import Client
from domain.ports import ClaimRepositoryPort


class SupabaseClaimAdapter(ClaimRepositoryPort):
    """
    Adapter for claim-level database operations.
    Implements ClaimRepositoryPort for status updates, admin notifications, and claim detail fetches.
    """

    def __init__(self, client: Client):
        self._client = client

    def update_claim_status(self, claim_id: str, status: str, ai_verdict: str) -> bool:
        """
        Update the status and ai_verdict for a specific claim in Supabase.
        args:
            claim_id: UUID of the claim to update.
            status: New status for the claim (e.g., 'approved', 'rejected').
            ai_verdict: Text summary of the AI's decision for the claim.
        returns:
            True if the update was successful, False otherwise.
        """
        response = (
            self._client
            .table("claims")
            .update({"status": status, "ai_verdict": ai_verdict})
            .eq("id", claim_id)
            .execute()
        )
        return bool(response.data)

    def save_admin_notification(self, claim_id: str, message: str, failed_task: str) -> bool:
        """
        Insert a new admin notification into the admin_notifications table when an agent fails and requires manual review.
        args:
            claim_id: UUID of the claim associated with this notification.
            message: A message describing the reason for the notification (e.g., error details).
            failed_task: The specific task or agent that failed (e.g., 'same_vehicle_detection').
        returns:
            True if the insert was successful, False otherwise.
        """
        response = (
            self._client
            .table("admin_notifications")
            .insert({
                "claim_id": claim_id,
                "message": message,
                "failed_task": failed_task,
                "is_resolved": False
            })
            .execute()
        )
        return bool(response.data)

    def fetch_claim_details(self, claim_id: str) -> dict | None:
        """Fetch the claim details (title, description, status) from the claims table."""
        response = (
            self._client
            .table("claims")
            .select("id, user_id, title, description, status, ai_verdict, created_at")
            .eq("id", claim_id)
            .limit(1)
            .execute()
        )
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None

   
    
    # When using CombinedSupabaseAdapter, these stubs are never called.
    def save_classification_result(self, *args, **kwargs) -> bool:
        raise NotImplementedError("Use SupabaseResultsAdapter or CombinedSupabaseAdapter")

    def save_same_vehicle_result(self, *args, **kwargs) -> bool:
        raise NotImplementedError("Use SupabaseResultsAdapter or CombinedSupabaseAdapter")

    def save_vehicle_type_result(self, *args, **kwargs) -> bool:
        raise NotImplementedError("Use SupabaseResultsAdapter or CombinedSupabaseAdapter")

    def save_damage_detection_result(self, *args, **kwargs) -> bool:
        raise NotImplementedError("Use SupabaseResultsAdapter or CombinedSupabaseAdapter")

    def fetch_classification_result(self, *args, **kwargs) -> dict | None:
        raise NotImplementedError("Use SupabaseResultsAdapter or CombinedSupabaseAdapter")

    def fetch_same_vehicle_result(self, *args, **kwargs) -> dict | None:
        raise NotImplementedError("Use SupabaseResultsAdapter or CombinedSupabaseAdapter")

    def fetch_vehicle_type_result(self, *args, **kwargs) -> dict | None:
        raise NotImplementedError("Use SupabaseResultsAdapter or CombinedSupabaseAdapter")

    def fetch_damage_detection_result(self, *args, **kwargs) -> dict | None:
        raise NotImplementedError("Use SupabaseResultsAdapter or CombinedSupabaseAdapter")

    def save_image_pipeline_result(self, *args, **kwargs) -> bool:
        raise NotImplementedError("Use SupabaseResultsAdapter or CombinedSupabaseAdapter")

    def fetch_image_pipeline_result(self, *args, **kwargs) -> dict | None:
        raise NotImplementedError("Use SupabaseResultsAdapter or CombinedSupabaseAdapter")

    def save_liability_result(self, *args, **kwargs) -> bool:
        raise NotImplementedError("Use SupabaseResultsAdapter or CombinedSupabaseAdapter")
