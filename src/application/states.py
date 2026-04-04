from pydantic import BaseModel, Field
from typing import Optional
from domain.intent import ClassificationStatus, SameVehicleStatus, VehicleTypeStatus
from domain.entities import ImageWithUrl, ClassificationResult, VehicleTypeClassification

# Classification Agent State for Vehicle Detection in Insurance Claims
class ClassificationAgentState(BaseModel):
    claim_id: str = Field(description="The claim being processed")
    user_id: str = Field(description="The user who filed the claim")
    images: list[ImageWithUrl] = Field(default_factory=list, description="Fetched images with public URLs")
    classification_results: list[ClassificationResult] = Field(default_factory=list, description="Per-image vehicle detection results")
    status: ClassificationStatus = Field(default="pending", description="Current stage in the agent lifecycle")
    error: Optional[str] = Field(default=None, description="Error message if the agent failed")
    claim_rejected: bool = Field(default=False, description="True if the claim was rejected because no images contained a vehicle")

# Same Vehicle Detection Agent State
class SameVehicleAgentState(BaseModel):
    claim_id: str = Field(description="The claim being processed")
    user_id: str = Field(description="The user who filed the claim")
    vehicle_images: list[ImageWithUrl] = Field(default_factory=list, description="Images that contain vehicles")
    is_same_vehicle: bool = Field(default=False, description="Whether all vehicle images show the same vehicle")
    claim_rejected: bool = Field(default=False, description="True if the claim was rejected because images show different vehicles")
    status: SameVehicleStatus = Field(default="pending", description="Current stage in the agent lifecycle")
    error: Optional[str] = Field(default=None, description="Error message if the agent failed")

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

