from pydantic import BaseModel, Field
from typing import Optional
from domain.intent import ClassificationStatus
from domain.entities import ImageWithUrl, ClassificationResult

# Classification Agent State for Vehicle Detection in Insurance Claims
class ClassificationAgentState(BaseModel):
    claim_id: str = Field(description="The claim being processed")
    user_id: str = Field(description="The user who filed the claim")
    images: list[ImageWithUrl] = Field(default_factory=list, description="Fetched images with public URLs")
    classification_results: list[ClassificationResult] = Field(default_factory=list, description="Per-image vehicle detection results")
    status: ClassificationStatus = Field(default="pending", description="Current stage in the agent lifecycle")
    error: Optional[str] = Field(default=None, description="Error message if the agent failed")
    claim_rejected: bool = Field(default=False, description="True if the claim was rejected because no images contained a vehicle")
