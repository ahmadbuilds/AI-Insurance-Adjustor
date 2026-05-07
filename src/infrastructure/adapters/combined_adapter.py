from supabase import Client
from domain.ports import ImageRepositoryPort, ImageStoragePort, ClaimRepositoryPort
from domain.entities import ImageRecord
from infrastructure.adapters.supabase_image_adapter import SupabaseImageAdapter
from infrastructure.adapters.supabase_claim_adapter import SupabaseClaimAdapter
from infrastructure.adapters.supabase_results_adapter import SupabaseResultsAdapter


class CombinedSupabaseAdapter(ImageRepositoryPort, ImageStoragePort, ClaimRepositoryPort):
    """
    CombinedSupabaseAdapter serves as a unified interface to interact with Supabase for all operations related to images, 
    claims, and results. 
    It delegates specific tasks to the underlying adapters while providing a single point of access for the application services and agents. 
    This design promotes separation of concerns while maintaining simplicity in the service layer.
    """

    def __init__(self, client: Client, bucket_name: str = "claim_images"):
        self._image_adapter = SupabaseImageAdapter(client, bucket_name)
        self._claim_adapter = SupabaseClaimAdapter(client)
        self._results_adapter = SupabaseResultsAdapter(client)
        self._client = client

    # Image repository delegates
    def fetch_claim_images(self, claim_id: str) -> list[ImageRecord]:
        return self._image_adapter.fetch_claim_images(claim_id)

    def update_vehicle_status(self, image_id: str, is_vehical: bool) -> bool:
        return self._image_adapter.update_vehicle_status(image_id, is_vehical)

    def fetch_vehicle_images(self, claim_id: str) -> list[ImageRecord]:
        return self._image_adapter.fetch_vehicle_images(claim_id)

    #Image StoragePort delegates
    def get_public_url(self, storage_path: str) -> str:
        return self._image_adapter.get_public_url(storage_path)

   # Claim repository delegates
    def update_claim_status(self, claim_id: str, status: str, ai_verdict: str) -> bool:
        return self._claim_adapter.update_claim_status(claim_id, status, ai_verdict)

    def save_admin_notification(self, claim_id: str, message: str, failed_task: str) -> bool:
        return self._claim_adapter.save_admin_notification(claim_id, message, failed_task)

    def save_claimant_notification(self, claim_id: str, user_id: str, notification_type: str, message: str) -> bool:
        return self._claim_adapter.save_claimant_notification(claim_id, user_id, notification_type, message)

    def fetch_claim_details(self, claim_id: str) -> dict | None:
        return self._claim_adapter.fetch_claim_details(claim_id)

    # Result delegates 
    def save_classification_result(self, claim_id, user_id, images_processed, vehicles_detected, claim_rejected, status, error):
        return self._results_adapter.save_classification_result(claim_id, user_id, images_processed, vehicles_detected, claim_rejected, status, error)

    def fetch_classification_result(self, claim_id: str) -> dict | None:
        return self._results_adapter.fetch_classification_result(claim_id)

    def save_same_vehicle_result(self, claim_id, user_id, vehicle_images_count, is_same_vehicle, claim_rejected, status, error):
        return self._results_adapter.save_same_vehicle_result(claim_id, user_id, vehicle_images_count, is_same_vehicle, claim_rejected, status, error)

    def fetch_same_vehicle_result(self, claim_id: str) -> dict | None:
        return self._results_adapter.fetch_same_vehicle_result(claim_id)

    def save_vehicle_type_result(self, claim_id, user_id, identified_type, claim_rejected, status, error):
        return self._results_adapter.save_vehicle_type_result(claim_id, user_id, identified_type, claim_rejected, status, error)

    def fetch_vehicle_type_result(self, claim_id: str) -> dict | None:
        return self._results_adapter.fetch_vehicle_type_result(claim_id)

    def save_damage_detection_result(self, claim_id, user_id, images_analyzed, images_with_damage, claim_rejected, damage_details, damage_summary, status, error):
        return self._results_adapter.save_damage_detection_result(claim_id, user_id, images_analyzed, images_with_damage, claim_rejected, damage_details, damage_summary, status, error)

    def fetch_damage_detection_result(self, claim_id: str) -> dict | None:
        return self._results_adapter.fetch_damage_detection_result(claim_id)

    def save_image_pipeline_result(self, claim_id, user_id, total_images, vehicle_images_count, non_vehicle_images_count, is_same_vehicle, vehicle_type, has_damage, images_with_damage, damage_details, damage_summary, all_checks_passed, pipeline_summary, status, error):
        return self._results_adapter.save_image_pipeline_result(claim_id, user_id, total_images, vehicle_images_count, non_vehicle_images_count, is_same_vehicle, vehicle_type, has_damage, images_with_damage, damage_details, damage_summary, all_checks_passed, pipeline_summary, status, error)

    def fetch_image_pipeline_result(self, claim_id: str) -> dict | None:
        return self._results_adapter.fetch_image_pipeline_result(claim_id)

    def save_liability_result(self, claim_id, user_id, overall_confidence, confidence_percentage, scenario_plausibility, scenario_reasoning, damage_alignments, consistent_damages, inconsistent_damages, overall_reasoning, recommendation, flags, needs_admin_review, admin_action, status, error):
        return self._results_adapter.save_liability_result(claim_id, user_id, overall_confidence, confidence_percentage, scenario_plausibility, scenario_reasoning, damage_alignments, consistent_damages, inconsistent_damages, overall_reasoning, recommendation, flags, needs_admin_review, admin_action, status, error)

    def fetch_liability_result(self, claim_id: str) -> dict | None:
        return self._results_adapter.fetch_liability_result(claim_id)

    def save_rag_result(self, claim_id: str, user_id: str, policy_covered: bool, coverage_type: str | None, applicable_sections: list[str], exclusions: list[str], compensation_amount: float, compensation_breakdown: list[dict], coverage_reasoning: str, recommendation: str, flags: list[str], needs_admin_review: bool, admin_action: str | None, status: str, error: str | None) -> bool:
        return self._results_adapter.save_rag_result(claim_id, user_id, policy_covered, coverage_type, applicable_sections, exclusions, compensation_amount, compensation_breakdown, coverage_reasoning, recommendation, flags, needs_admin_review, admin_action, status, error)

    def fetch_rag_result(self, claim_id: str) -> dict | None:
        return self._results_adapter.fetch_rag_result(claim_id)
