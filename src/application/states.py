from pydantic import BaseModel, Field
from typing import Optional
from domain.intent import ClassificationStatus, SameVehicleStatus, VehicleTypeStatus, DamageDetectionStatus, ImagePipelineSummaryStatus, LiabilityStatus,RAGStatus
from domain.entities import ImageWithUrl, ClassificationResult, VehicleTypeClassification, ImageDamageResult, ImagePipelineSummary, LiabilityAssessment ,RAGAssessment

# Classification Agent State for Vehicle Detection in Insurance Claims
class ClassificationAgentState(BaseModel):
    claim_id: str = Field(description="The claim being processed")
    user_id: str = Field(description="The user who filed the claim")
    images: list[ImageWithUrl] = Field(default_factory=list, description="Fetched images with public URLs")
    classification_results: list[ClassificationResult] = Field(default_factory=list, description="Per-image vehicle detection results")
    status: ClassificationStatus = Field(default="pending", description="Current stage in the agent lifecycle")
    error: Optional[str] = Field(default=None, description="Error message if the agent failed")
    claim_rejected: bool = Field(default=False, description="True if the claim was rejected because no images contained a vehicle")
    retry_count: int = Field(default=0, description="Counter for retry attempts on failure")

# Same Vehicle Detection Agent State
class SameVehicleAgentState(BaseModel):
    claim_id: str = Field(description="The claim being processed")
    user_id: str = Field(description="The user who filed the claim")
    vehicle_images: list[ImageWithUrl] = Field(default_factory=list, description="Images that contain vehicles")
    is_same_vehicle: bool = Field(default=False, description="Whether all vehicle images show the same vehicle")
    claim_rejected: bool = Field(default=False, description="True if the claim was rejected because images show different vehicles")
    status: SameVehicleStatus = Field(default="pending", description="Current stage in the agent lifecycle")
    error: Optional[str] = Field(default=None, description="Error message if the agent failed")
    retry_count: int = Field(default=0, description="Counter for retry attempts on failure")

# Vehicle Type Agent State
class VehicleTypeAgentState(BaseModel):
    claim_id: str = Field(description="The claim being processed")
    user_id: str = Field(description="The user who filed the claim")
    vehicle_images: list[ImageWithUrl] = Field(default_factory=list, description="Images that contain vehicles")
    type_classifications: list[VehicleTypeClassification] = Field(default_factory=list, description="Extracted vehicle types per image")
    identified_type: Optional[str] = Field(default=None, description="The final agreed vehicle type for the claim")
    claim_rejected: bool = Field(default=False, description="True if the claim was rejected because images show different vehicle types")
    status: VehicleTypeStatus = Field(default="pending", description="Current stage in the agent lifecycle")
    error: Optional[str] = Field(default=None, description="Error message if the agent failed")
    retry_count: int = Field(default=0, description="Counter for retry attempts on failure")

# Damage Detection Agent State
class DamageDetectionAgentState(BaseModel):
    claim_id: str = Field(description="The claim being processed")
    user_id: str = Field(description="The user who filed the claim")
    vehicle_images: list[ImageWithUrl] = Field(default_factory=list, description="Images that contain vehicles")
    damage_results: list[ImageDamageResult] = Field(default_factory=list, description="Per-image damage analysis results")
    damage_summary: Optional[str] = Field(default=None, description="Aggregated natural-language summary of all detected damages across all images")
    claim_rejected: bool = Field(default=False, description="True if the claim was rejected because no images showed any damage")
    status: DamageDetectionStatus = Field(default="pending", description="Current stage in the agent lifecycle")
    error: Optional[str] = Field(default=None, description="Error message if the agent failed")
    retry_count: int = Field(default=0, description="Counter for retry attempts on failure")

# Image Pipeline Summary Agent State
class ImagePipelineSummaryAgentState(BaseModel):
    claim_id: str = Field(description="The claim being processed")
    user_id: str = Field(description="The user who filed the claim")
    classification_result: Optional[dict] = Field(default=None, description="Raw classification agent result from DB")
    same_vehicle_result: Optional[dict] = Field(default=None, description="Raw same vehicle agent result from DB")
    vehicle_type_result: Optional[dict] = Field(default=None, description="Raw vehicle type agent result from DB")
    damage_detection_result: Optional[dict] = Field(default=None, description="Raw damage detection agent result from DB")
    pipeline_summary: Optional[ImagePipelineSummary] = Field(default=None, description="The aggregated pipeline summary")
    status: ImagePipelineSummaryStatus = Field(default="pending", description="Current stage in the agent lifecycle")
    error: Optional[str] = Field(default=None, description="Error message if the agent failed")
    retry_count: int = Field(default=0, description="Counter for retry attempts on failure")

# Liability Assessment Agent State
class LiabilityAgentState(BaseModel):
    claim_id: str = Field(description="The claim being processed")
    user_id: str = Field(description="The user who filed the claim")
    claim_details: Optional[dict] = Field(default=None, description="Raw claim details from claims table (title, description)")
    pipeline_result: Optional[dict] = Field(default=None, description="Raw image pipeline summary result from DB")
    assessment: Optional[LiabilityAssessment] = Field(default=None, description="The LLM's liability assessment output")
    needs_admin_review: bool = Field(default=False, description="True if confidence < 70% and requires admin review")
    status: LiabilityStatus = Field(default="pending", description="Current stage in the agent lifecycle")
    error: Optional[str] = Field(default=None, description="Error message if the agent failed")
    retry_count: int = Field(default=0, description="Counter for retry attempts on failure")

# RAG Assessment Agent State
class RAGAgentState(BaseModel):
    claim_id: str = Field(description="The claim being processed")
    user_id: str = Field(description="The user who filed the claim")
    claim_details: Optional[dict] = Field(default=None, description="Raw claim details from claims table")
    liability_result: Optional[dict] = Field(default=None, description="Raw liability result from DB")
    pipeline_result: Optional[dict] = Field(default=None, description="Raw image pipeline summary result from DB")
    policy_sections: list[dict] = Field(default_factory=list, description="Retrieved policy sections")
    assessment: Optional[RAGAssessment] = Field(default=None, description="The LLM's RAG assessment output")
    status: RAGStatus = Field(default="pending", description="Current stage in the agent lifecycle")
    error: Optional[str] = Field(default=None, description="Error message if the agent failed")
    retry_count: int = Field(default=0, description="Counter for retry attempts on failure")
