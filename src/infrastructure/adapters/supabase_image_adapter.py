from supabase import Client
from domain.ports import ImageRepositoryPort, ImageStoragePort, ClaimRepositoryPort
from domain.entities import ImageRecord

class SupabaseImageAdapter(ImageRepositoryPort, ImageStoragePort, ClaimRepositoryPort):
    
    def __init__(self, client: Client, bucket_name: str = "claim_images"):
        self._client = client
        self._bucket_name = bucket_name

    def fetch_claim_images(self, claim_id: str) -> list[ImageRecord]:
        """
        Fetch all images for a given claim_id from Supabase and return them as a list of ImageRecord.
        args:
            claim_id: UUID of the claim to fetch images for.
        returns:
            List of ImageRecord objects containing image metadata and storage path.
        """
        response = (
            self._client
            .table("claim_images")
            .select("id, claim_id, user_id, storage_path, file_name, file_size, mime_type, is_vehical")
            .eq("claim_id", claim_id)
            .execute()
        )
        if not response.data:
            return []

        return [ImageRecord(**row) for row in response.data]

    def update_vehicle_status(self, image_id: str, is_vehical: bool) -> bool:
        """
        Update the is_vehical column for a specific image in Supabase.
        args:
            image_id: UUID of the image to update.
            is_vehical: Boolean indicating whether a vehicle was detected in the image.
        returns:
            True if the update was successful, False otherwise.
        """
        response = (
            self._client
            .table("claim_images")
            .update({"is_vehical": is_vehical})
            .eq("id", image_id)
            .execute()
        )
        return bool(response.data)

    def get_public_url(self, storage_path: str) -> str:
        """
        Get the public URL for a given storage path in the Supabase bucket.
        args:
            storage_path: The path to the image file in the Supabase storage bucket.
        returns:
            A public URL string that can be used to access the image.
        """
        return self._client.storage.from_(self._bucket_name).get_public_url(storage_path)

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

    def fetch_vehicle_images(self, claim_id: str) -> list[ImageRecord]:
        """
        Fetch only images with is_vehical=True for a given claim_id from Supabase and return them as a list of ImageRecord.
        args:
            claim_id: UUID of the claim to fetch vehicle images for.
        returns:
            List of ImageRecord objects containing metadata for images that have is_vehical=True.
        """
        response = (
            self._client
            .table("claim_images")
            .select("id, claim_id, user_id, storage_path, file_name, file_size, mime_type, is_vehical")
            .eq("claim_id", claim_id)
            .eq("is_vehical", True)
            .execute()
        )
        if not response.data:
            return []

        return [ImageRecord(**row) for row in response.data]

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
        import json
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
        import json
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
