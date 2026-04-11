from abc import ABC, abstractmethod
from domain.entities import ImageRecord


class ImageRepositoryPort(ABC):
    """
    Interface for database operations on claim images.
    Defines methods for fetching image records and updating vehicle detection status.
    """

    @abstractmethod
    def fetch_claim_images(self, claim_id: str) -> list[ImageRecord]:
        """
        Fetch all image records for a given claim_id. Returns a list of ImageRecord objects.
        Args:
            claim_id: UUID of the claim to fetch images for.
        Returns:
            list[ImageRecord]: List of image records associated with the claim.
        """
        pass

    @abstractmethod
    def update_vehicle_status(self, image_id: str, is_vehical: bool) -> bool:
        """
        Update the is_vehical column for a specific image. Returns True on success.
        Args:
            image_id: UUID of the image to update.
            is_vehical: New value for the is_vehical column.
        Returns:
            bool: True if the update was successful, False otherwise.
        """
        pass

    @abstractmethod
    def fetch_vehicle_images(self, claim_id: str) -> list[ImageRecord]:
        """
        Fetch only images where is_vehical=True for a given claim.
        Args:
            claim_id: UUID of the claim to fetch vehicle images for.
        Returns:
            list[ImageRecord]: List of image records that contain vehicles.
        """
        pass

class ImageStoragePort(ABC):
    """Interface for storage operations on claim images."""

    @abstractmethod
    def get_public_url(self, storage_path: str) -> str:
        """
        Get the public URL for an image given its storage path.
        Args:
            storage_path: Path to the image in storage.
        Returns:
            str: Public URL for the image.
        """
        pass


class ClaimRepositoryPort(ABC):
    """Interface for database operations on the claims table."""

    @abstractmethod
    def update_claim_status(self, claim_id: str, status: str, ai_verdict: str) -> bool:
        """
        Update the status and ai_verdict columns of a claim. Returns True on success.
        Args:
            claim_id: UUID of the claim to update.
            status: New value for the status column.
            ai_verdict: New value for the ai_verdict column.
        Returns:
            bool: True if the update was successful, False otherwise.
        """
        pass

    @abstractmethod
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
        """
        Save the classification agent result to the classification_results table.
        Args:
            claim_id: UUID of the claim that was processed.
            user_id: UUID of the user who filed the claim.
            images_processed: Total number of images analyzed.
            vehicles_detected: Number of images where a vehicle was detected.
            claim_rejected: Whether the claim was rejected (all images had no vehicle).
            status: Agent status ('completed' or 'failed').
            error: Error message if the agent failed, None otherwise.
        Returns:
            bool: True if the insert was successful, False otherwise.
        """
        pass

    @abstractmethod
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
        Save the same vehicle detection agent result to the same_vehicle_results table.
        Args:
            claim_id: UUID of the claim that was processed.
            user_id: UUID of the user who filed the claim.
            vehicle_images_count: Number of vehicle images analyzed.
            is_same_vehicle: Whether all images show the same vehicle.
            claim_rejected: Whether the claim was rejected.
            status: Agent status ('completed' or 'failed').
            error: Error message if the agent failed, None otherwise.
        Returns:
            bool: True if the insert was successful, False otherwise.
        """
        pass

    @abstractmethod
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
        Save the vehicle type detection agent result to the vehicle_type_results table.
        Args:
            claim_id: UUID of the claim that was processed.
            user_id: UUID of the user who filed the claim.
            identified_type: The identified vehicle type (e.g., PC, MC, CT), or None if rejected/failed.
            claim_rejected: Whether the claim was rejected due to inconsistent vehicle types.
            status: Agent status ('completed' or 'failed').
            error: Error message if the agent failed, None otherwise.
        Returns:
            bool: True if the insert was successful, False otherwise.
        """
        pass

    @abstractmethod
    def save_admin_notification(self, claim_id: str, message: str, failed_task: str) -> bool:
        """
        Save an admin notification for a failed agent task.
        Args:
            claim_id: UUID of the claim.
            message: Error message to display.
            failed_task: The task that failed (e.g. classification, same_vehicle).
        Returns:
            bool: True if successful.
        """
        pass

    @abstractmethod
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
        Save the damage detection agent result to the damage_detection_results table.
        Args:
            claim_id: UUID of the claim that was processed.
            user_id: UUID of the user who filed the claim.
            images_analyzed: Total number of vehicle images analyzed for damage.
            images_with_damage: Number of images where damage was detected.
            claim_rejected: Whether the claim was rejected (no images had damage).
            damage_details: Serialized list of per-image damage results (ImageDamageResult dicts).
            damage_summary: Aggregated natural-language summary of all detected damages.
            status: Agent status ('completed' or 'failed').
            error: Error message if the agent failed, None otherwise.
        Returns:
            bool: True if the insert was successful, False otherwise.
        """
        pass

    @abstractmethod
    def fetch_classification_result(self, claim_id: str) -> dict | None:
        """
        Fetch the classification agent result for a claim.
        Args:
            claim_id: UUID of the claim.
        Returns:
            dict or None: The result row as a dict, or None if not found.
        """
        pass

    @abstractmethod
    def fetch_same_vehicle_result(self, claim_id: str) -> dict | None:
        """
        Fetch the same vehicle detection result for a claim.
        Args:
            claim_id: UUID of the claim.
        Returns:
            dict or None: The result row as a dict, or None if not found.
        """
        pass

    @abstractmethod
    def fetch_vehicle_type_result(self, claim_id: str) -> dict | None:
        """
        Fetch the vehicle type classification result for a claim.
        Args:
            claim_id: UUID of the claim.
        Returns:
            dict or None: The result row as a dict, or None if not found.
        """
        pass

    @abstractmethod
    def fetch_damage_detection_result(self, claim_id: str) -> dict | None:
        """
        Fetch the damage detection result for a claim.
        Args:
            claim_id: UUID of the claim.
        Returns:
            dict or None: The result row as a dict (including damage_details JSONB), or None if not found.
        """
        pass

    @abstractmethod
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
        Save the image pipeline summary result to the image_pipeline_results table.
        Args:
            claim_id: UUID of the claim.
            user_id: UUID of the user.
            total_images: Total images submitted.
            vehicle_images_count: Images containing a vehicle.
            non_vehicle_images_count: Images not containing a vehicle.
            is_same_vehicle: Whether all vehicle images show the same vehicle.
            vehicle_type: Identified vehicle type or None.
            has_damage: Whether damage was detected.
            images_with_damage: Count of images with damage.
            damage_details: Full structured damage data (JSONB).
            damage_summary: Aggregated damage summary text.
            all_checks_passed: Whether every pipeline check passed.
            pipeline_summary: Human-readable summary of the full pipeline.
            status: Agent status ('completed' or 'failed').
            error: Error message if failed, else None.
        Returns:
            bool: True if successful.
        """
        pass

    @abstractmethod
    def fetch_claim_details(self, claim_id: str) -> dict | None:
        """
        Fetch the claim details (title, description, status) from the claims table.
        Args:
            claim_id: UUID of the claim.
        Returns:
            dict or None: The claim row as a dict, or None if not found.
        """
        pass

    @abstractmethod
    def fetch_image_pipeline_result(self, claim_id: str) -> dict | None:
        """
        Fetch the image pipeline summary result for a claim.
        Args:
            claim_id: UUID of the claim.
        Returns:
            dict or None: The pipeline summary row as a dict, or None if not found.
        """
        pass

    @abstractmethod
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
        Save the liability assessment result to the liability_results table.
        Args:
            claim_id: UUID of the claim.
            user_id: UUID of the user.
            overall_confidence: 0.0-1.0 confidence score.
            confidence_percentage: 0-100 confidence percentage.
            scenario_plausibility: 'plausible', 'questionable', or 'implausible'.
            scenario_reasoning: Detailed scenario assessment text.
            damage_alignments: Per-damage alignment analysis as JSONB.
            consistent_damages: Number of consistent damages.
            inconsistent_damages: Number of inconsistent damages.
            overall_reasoning: Full reasoning text for the decision.
            recommendation: 'approve', 'reject', or 'needs_human_review'.
            flags: List of red flags or concerns.
            needs_admin_review: Whether this requires admin review (confidence < 70%).
            admin_action: Current admin action ('pending', 'accepted', 'overridden'), None if not under review.
            status: Agent status ('completed' or 'failed').
            error: Error message if failed, else None.
        Returns:
            bool: True if successful.
        """
        pass
