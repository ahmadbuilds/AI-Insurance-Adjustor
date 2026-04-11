import json
from supabase import Client
from domain.ports import ClaimRepositoryPort


class SupabaseResultsAdapter(ClaimRepositoryPort):
    """
    Adapter for all agent result save/fetch operations.
    Implements the result-related methods of ClaimRepositoryPort using Supabase.
    """

    def __init__(self, client: Client):
        self._client = client

    
    def save_classification_result(
        self,
        claim_id: str,
        user_id: str,
        images_processed: int,
        vehicles_detected: int,
        claim_rejected: bool,
        status: str,
        error: str | None,
    ) -> bool:
        """Insert a classification result row into the classification_results table."""
        response = (
            self._client
            .table("classification_results")
            .insert({
                "claim_id": claim_id,
                "user_id": user_id,
                "images_processed": images_processed,
                "vehicles_detected": vehicles_detected,
                "claim_rejected": claim_rejected,
                "status": status,
                "error": error,
            })
            .execute()
        )
        return bool(response.data)

    def fetch_classification_result(self, claim_id: str) -> dict | None:
        """Fetch the most recent classification result for a claim."""
        response = (
            self._client
            .table("classification_results")
            .select("*")
            .eq("claim_id", claim_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None

    def save_same_vehicle_result(
        self,
        claim_id: str,
        user_id: str,
        vehicle_images_count: int,
        is_same_vehicle: bool,
        claim_rejected: bool,
        status: str,
        error: str | None,
    ) -> bool:
        """
        Insert a same vehicle detection result row into the same_vehicle_results table.
        args:
            claim_id: UUID of the claim associated with this result.
            user_id: UUID of the user associated with this claim.
            vehicle_images_count: Number of vehicle images analyzed.
            is_same_vehicle: Boolean indicating if all vehicle images show the same vehicle.
            claim_rejected: Boolean indicating if the claim was rejected based on this analysis.
            status: Status of the same vehicle detection process (e.g., 'completed', 'failed').
            error: Optional error message if the process failed.
        returns:
            True if the insert was successful, False otherwise.
        """
        response = (
            self._client
            .table("same_vehicle_results")
            .insert({
                "claim_id": claim_id,
                "user_id": user_id,
                "vehicle_images_count": vehicle_images_count,
                "is_same_vehicle": is_same_vehicle,
                "claim_rejected": claim_rejected,
                "status": status,
                "error": error,
            })
            .execute()
        )
        return bool(response.data)

    def fetch_same_vehicle_result(self, claim_id: str) -> dict | None:
        """Fetch the most recent same vehicle result for a claim."""
        response = (
            self._client
            .table("same_vehicle_results")
            .select("*")
            .eq("claim_id", claim_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None

    # ========== Vehicle Type Results ==========

    def save_vehicle_type_result(
        self,
        claim_id: str,
        user_id: str,
        identified_type: str | None,
        claim_rejected: bool,
        status: str,
        error: str | None,
    ) -> bool:
        """
        Insert a vehicle type classification result row into the vehicle_type_results table.
        args:
            claim_id: UUID of the claim associated with this result.
            user_id: UUID of the user associated with this claim.
            identified_type: The final identified vehicle type for the claim, or None if it couldn't be determined.
            claim_rejected: Boolean indicating if the claim was rejected based on this analysis.
            status: Status of the vehicle type classification process (e.g., 'completed', 'failed').
            error: Optional error message if the process failed.
        returns:
            True if the insert was successful, False otherwise.
        """
        response = (
            self._client
            .table("vehicle_type_results")
            .insert({
                "claim_id": claim_id,
                "user_id": user_id,
                "identified_type": identified_type,
                "claim_rejected": claim_rejected,
                "status": status,
                "error": error,
            })
            .execute()
        )
        return bool(response.data)

    def fetch_vehicle_type_result(self, claim_id: str) -> dict | None:
        """Fetch the most recent vehicle type result for a claim."""
        response = (
            self._client
            .table("vehicle_type_results")
            .select("*")
            .eq("claim_id", claim_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None

   
    def save_damage_detection_result(
        self,
        claim_id: str,
        user_id: str,
        images_analyzed: int,
        images_with_damage: int,
        claim_rejected: bool,
        damage_details: list[dict],
        damage_summary: str | None,
        status: str,
        error: str | None,
    ) -> bool:
        """
        Insert a damage detection result row into the damage_detection_results table.
        args:
            claim_id: UUID of the claim associated with this result.
            user_id: UUID of the user associated with this claim.
            images_analyzed: Total number of vehicle images analyzed for damage.
            images_with_damage: Number of images where damage was detected.
            claim_rejected: Boolean indicating if the claim was rejected (no damage found).
            damage_details: Serialized list of per-image damage results stored as JSONB.
            damage_summary: Aggregated natural-language summary of all detected damages.
            status: Status of the damage detection process (e.g., 'completed', 'failed').
            error: Optional error message if the process failed.
        returns:
            True if the insert was successful, False otherwise.
        """
        response = (
            self._client
            .table("damage_detection_results")
            .insert({
                "claim_id": claim_id,
                "user_id": user_id,
                "images_analyzed": images_analyzed,
                "images_with_damage": images_with_damage,
                "claim_rejected": claim_rejected,
                "damage_details": json.dumps(damage_details),
                "damage_summary": damage_summary,
                "status": status,
                "error": error,
            })
            .execute()
        )
        return bool(response.data)

    def fetch_damage_detection_result(self, claim_id: str) -> dict | None:
        """Fetch the most recent damage detection result for a claim."""
        response = (
            self._client
            .table("damage_detection_results")
            .select("*")
            .eq("claim_id", claim_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None

    
    def save_image_pipeline_result(
        self,
        claim_id: str,
        user_id: str,
        total_images: int,
        vehicle_images_count: int,
        non_vehicle_images_count: int,
        is_same_vehicle: bool,
        vehicle_type: str | None,
        has_damage: bool,
        images_with_damage: int,
        damage_details: list[dict],
        damage_summary: str | None,
        all_checks_passed: bool,
        pipeline_summary: str,
        status: str,
        error: str | None,
    ) -> bool:
        """
        Insert an image pipeline summary result into the image_pipeline_results table.
        args:
            claim_id: UUID of the claim.
            user_id: UUID of the user.
            total_images: Total images submitted with the claim.
            vehicle_images_count: Number of images containing a vehicle.
            non_vehicle_images_count: Number of images without a vehicle.
            is_same_vehicle: Whether all vehicle images are the same vehicle.
            vehicle_type: Identified vehicle type code or None.
            has_damage: Whether any image showed damage.
            images_with_damage: Count of images with detected damage.
            damage_details: Full structured per-image damage data as JSONB.
            damage_summary: Aggregated damage summary text.
            all_checks_passed: Whether every pipeline agent passed.
            pipeline_summary: Human-readable pipeline outcome string.
            status: Agent status ('completed' or 'failed').
            error: Error message if failed, else None.
        returns:
            True if insert was successful, False otherwise.
        """
        response = (
            self._client
            .table("image_pipeline_results")
            .insert({
                "claim_id": claim_id,
                "user_id": user_id,
                "total_images": total_images,
                "vehicle_images_count": vehicle_images_count,
                "non_vehicle_images_count": non_vehicle_images_count,
                "is_same_vehicle": is_same_vehicle,
                "vehicle_type": vehicle_type,
                "has_damage": has_damage,
                "images_with_damage": images_with_damage,
                "damage_details": json.dumps(damage_details),
                "damage_summary": damage_summary,
                "all_checks_passed": all_checks_passed,
                "pipeline_summary": pipeline_summary,
                "status": status,
                "error": error,
            })
            .execute()
        )
        return bool(response.data)

    def fetch_image_pipeline_result(self, claim_id: str) -> dict | None:
        """Fetch the most recent image pipeline summary result for a claim."""
        response = (
            self._client
            .table("image_pipeline_results")
            .select("*")
            .eq("claim_id", claim_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None

    
    def save_liability_result(
        self,
        claim_id: str,
        user_id: str,
        overall_confidence: float,
        confidence_percentage: int,
        scenario_plausibility: str,
        scenario_reasoning: str,
        damage_alignments: list[dict],
        consistent_damages: int,
        inconsistent_damages: int,
        overall_reasoning: str,
        recommendation: str,
        flags: list[str],
        needs_admin_review: bool,
        admin_action: str | None,
        status: str,
        error: str | None,
    ) -> bool:
        """
        Insert a liability assessment result into the liability_results table.
        args:
            claim_id: UUID of the claim.
            user_id: UUID of the user.
            overall_confidence: 0.0-1.0 confidence score.
            confidence_percentage: 0-100 integer.
            scenario_plausibility: Assessment of scenario.
            scenario_reasoning: Detailed scenario reasoning text.
            damage_alignments: Per-damage alignment analysis as JSONB.
            consistent_damages: Number of consistent damages.
            inconsistent_damages: Number of inconsistent damages.
            overall_reasoning: Full reasoning text.
            recommendation: Agent recommendation.
            flags: List of red flags as JSONB.
            needs_admin_review: Whether admin review is needed.
            admin_action: Current admin action status.
            status: Agent status.
            error: Error message if failed.
        returns:
            True if insert was successful.
        """
        response = (
            self._client
            .table("liability_results")
            .insert({
                "claim_id": claim_id,
                "user_id": user_id,
                "overall_confidence": overall_confidence,
                "confidence_percentage": confidence_percentage,
                "scenario_plausibility": scenario_plausibility,
                "scenario_reasoning": scenario_reasoning,
                "damage_alignments": json.dumps(damage_alignments),
                "consistent_damages": consistent_damages,
                "inconsistent_damages": inconsistent_damages,
                "overall_reasoning": overall_reasoning,
                "recommendation": recommendation,
                "flags": json.dumps(flags),
                "needs_admin_review": needs_admin_review,
                "admin_action": admin_action,
                "status": status,
                "error": error,
            })
            .execute()
        )
        return bool(response.data)

    
    #these stubs are never called because when using CombinedSupabaseAdapter
    # the claim-level methods delegate to SupabaseClaimAdapter, 
    # and the result save/fetch methods delegate to SupabaseResultsAdapter.
    def update_claim_status(self, *args, **kwargs) -> bool:
        raise NotImplementedError("Use SupabaseClaimAdapter or CombinedSupabaseAdapter")

    def save_admin_notification(self, *args, **kwargs) -> bool:
        raise NotImplementedError("Use SupabaseClaimAdapter or CombinedSupabaseAdapter")

    def fetch_claim_details(self, *args, **kwargs) -> dict | None:
        raise NotImplementedError("Use SupabaseClaimAdapter or CombinedSupabaseAdapter")
