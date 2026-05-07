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
    def save_claimant_notification(self, claim_id: str, user_id: str, notification_type: str, message: str) -> bool:
        """
        Save a claimant notification for a claim status update.
        Args:
            claim_id: UUID of the claim.
            user_id: UUID of the claimant.
            notification_type: Type of notification ('progress', 'approved', 'rejected').
            message: Notification message to display.
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

    @abstractmethod
    def fetch_liability_result(self, claim_id: str) -> dict | None:
        """
        Fetch the liability assessment result for a claim.
        """
        pass

    @abstractmethod
    def save_rag_result(
        self,
        claim_id: str,
        user_id: str,
        policy_covered: bool,
        coverage_type: str | None,
        applicable_sections: list[str],
        exclusions: list[str],
        compensation_amount: float,
        compensation_breakdown: list[dict],
        coverage_reasoning: str,
        recommendation: str,
        flags: list[str],
        needs_admin_review: bool,
        admin_action: str | None,
        status: str,
        error: str | None,
    ) -> bool:
        """
        Save the RAG assessment result to the rag_results table.
        """
        pass

    @abstractmethod
    def fetch_rag_result(self, claim_id: str) -> dict | None:
        """
        Fetch the RAG assessment result for a claim.
        """
        pass

class VectorStorePort(ABC):
    @abstractmethod
    def upsert_embeddings(self,chunks:list,metadata:list,ids:list)->bool:
        """
        Method to upsert document chunks and their metadata into the vector store
        Args:
            chunks (list): List of document chunks to be upserted
            metadata (list): List of metadata corresponding to each document chunk
            ids (list): List of IDs for each document chunk
        Returns:
            bool: True if upsert is successful, False otherwise
        """
        pass

    @abstractmethod
    def get_existing_chunk_hashes(self,document_hash:str)->list:
        """
        Method to get the existing chunk hashes from the vector store
        Args:
            document_hash (str): Hash of the document for which to fetch the chunk hashes
        Returns:
            list: List of existing chunk hashes in the vector store for the given document hash
        """
        pass

    @abstractmethod
    def delete_chunks_by_chunk_hash(self,chunk_hash:str)->bool:
        """
        Method to delete chunks from the vector store based on the chunk hash
        Args:
            chunk_hash (str): Hash of the chunk for which to delete the corresponding chunks from the vector store
        Returns:
            bool: True if deletion is successful, False otherwise
        """
        pass

class DocumentStorePort(ABC):
    """Interface for document versioning and metadata storage."""
    
    @abstractmethod
    def get_document_version_name(self) -> str | None:
        pass

    @abstractmethod
    def save_document_version_name(self, name: str) -> bool:
        pass

    @abstractmethod
    def get_document_hash(self, document_id: str) -> str | None:
        pass

    @abstractmethod
    def save_document_hash(self, document_id: str, doc_hash: str) -> bool:
        pass

    @abstractmethod
    def delete_document_hash(self, document_id: str) -> bool:
        pass

class PolicyRetrievalPort(ABC):
    """Interface for querying insurance policy text from a vector store."""
    
    @abstractmethod
    def query_policy(self, query: str, k: int = 5) -> list[dict]:
        """
        Perform a semantic search against the policy document.
        Returns a list of dicts with 'content' and 'metadata'.
        """
        pass