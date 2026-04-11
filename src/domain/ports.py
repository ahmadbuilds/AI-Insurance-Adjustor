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

