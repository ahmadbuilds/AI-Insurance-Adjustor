from pydantic import BaseModel,Field
from typing import Optional

class ClaimEvent(BaseModel):
    claim_id:str=Field(description="Unique identifier for the claim")
    User_id:str=Field(description="Unique identifier for the user associated with the claim")


#Pydantic model for the vehicle status update tool input
class isVehiclePresent(BaseModel):
    present:bool=Field(description="Indicates whether the vehicle is present in the image or not",default=False)


#pydantic model for the claim status update tool
class ImageRecord(BaseModel):
    id:str=Field(description="Unique identifier for the image record")
    claim_id:str=Field(description="Claim this image belongs to")
    user_id:str=Field(description="User who uploaded the image")
    storage_path:str=Field(description="Path inside the claim_images storage bucket")
    file_name:str=Field(description="Original file name")
    file_size:int=Field(default=0,description="File size in bytes")
    mime_type:str=Field(default="",description="MIME type of the image")
    is_vehical:Optional[bool]=Field(default=None,description="Whether a vehicle was detected in this image")


# Pydantic model that extends ImageRecord with a public URL for accessing the image
class ImageWithUrl(BaseModel):
    id:str=Field(description="Image record ID")
    claim_id:str=Field(description="Claim this image belongs to")
    storage_path:str=Field(description="Storage bucket path")
    file_name:str=Field(description="Original file name")
    mime_type:str=Field(default="",description="MIME type")
    public_url:str=Field(description="Resolved public URL for accessing the image")


# Result of vehicle classification for a single image
class ClassificationResult(BaseModel):
    image_id:str=Field(description="The image record ID that was classified")
    is_vehical:bool=Field(description="Whether a vehicle was detected in the image")

# Result of vehicle type classification for a single image
class VehicleTypeClassification(BaseModel):
    image_id:str=Field(description="The image record ID that was classified")
    vehicle_type:str=Field(description="The classified vehicle type category")


# A single damage detected on a vehicle part
class DamageItem(BaseModel):
    part:str=Field(description="The vehicle part affected (e.g., 'front bumper', 'left headlight', 'hood', 'right fender', 'windshield')")
    damage_type:str=Field(description="Type of damage observed (e.g., 'dent', 'scratch', 'crack', 'shatter', 'deformation', 'paint_damage', 'corrosion', 'puncture')")
    severity:str=Field(description="Damage severity level: 'minor', 'moderate', or 'severe'")
    description:str=Field(description="Detailed natural-language description of the damage appearance, approximate size, shape, and notable characteristics")


# Per-image damage analysis result
class ImageDamageResult(BaseModel):
    image_id:str=Field(description="The image record ID that was analyzed for damage")
    has_damage:bool=Field(description="Whether any damage was detected in this image")
    damages:list[DamageItem]=Field(default_factory=list, description="List of individual damages detected in the image, empty if has_damage is False")
    damage_summary:str=Field(default="", description="One-line natural-language summary of all damage found in this image")


# Unified image pipeline summary — combines results from all image analysis agents
class ImagePipelineSummary(BaseModel):
    claim_id:str=Field(description="The claim this summary belongs to")
    user_id:str=Field(description="The user who filed the claim")
    total_images:int=Field(default=0, description="Total number of images submitted with the claim")
    vehicle_images_count:int=Field(default=0, description="Number of images that contain a vehicle")
    non_vehicle_images_count:int=Field(default=0, description="Number of images that do not contain a vehicle")
    is_same_vehicle:bool=Field(default=False, description="Whether all vehicle images show the same vehicle")
    vehicle_type:Optional[str]=Field(default=None, description="The identified vehicle type (e.g., PC, MC, CT)")
    has_damage:bool=Field(default=False, description="Whether any vehicle image showed damage")
    images_with_damage:int=Field(default=0, description="Number of images that have visible damage")
    damage_details:list[dict]=Field(default_factory=list, description="Full structured per-image damage data from the damage detection agent")
    damage_summary:Optional[str]=Field(default=None, description="Aggregated natural-language summary of all detected damages")
    all_checks_passed:bool=Field(default=False, description="True if all image pipeline agents passed without rejection")
    pipeline_summary:str=Field(default="", description="Human-readable summary of the entire image pipeline outcome")


# Per-damage alignment analysis used by the liability agent
class DamageAlignmentItem(BaseModel):
    part:str=Field(description="The vehicle part from the damage detection result")
    damage_type:str=Field(description="The damage type from the damage detection result")
    severity:str=Field(description="The severity from the damage detection result")
    is_consistent:bool=Field(description="Whether this specific damage is consistent with the claimed scenario")
    alignment_score:float=Field(description="0.0-1.0 score for how well this damage aligns with the user's description")
    reasoning:str=Field(description="Detailed explanation of why this damage is or isn't consistent with the claim")


# Liability assessment result from the LLM analysis
class LiabilityAssessment(BaseModel):
    claim_id:str=Field(description="The claim that was assessed")
    user_id:str=Field(description="The user who filed the claim")
    overall_confidence:float=Field(description="0.0-1.0 overall confidence that the claim is legitimate based on damage-description alignment")
    confidence_percentage:int=Field(description="0-100 integer confidence percentage for display")
    scenario_plausibility:str=Field(description="Assessment of whether the described scenario could realistically cause the detected damage: 'plausible', 'questionable', or 'implausible'")
    scenario_reasoning:str=Field(description="Detailed reasoning about whether the described incident scenario could produce the observed damage patterns")
    damage_alignments:list[DamageAlignmentItem]=Field(default_factory=list, description="Per-damage alignment breakdown")
    consistent_damages:int=Field(default=0, description="Number of damages consistent with the claim")
    inconsistent_damages:int=Field(default=0, description="Number of damages inconsistent with the claim")
    overall_reasoning:str=Field(description="Full natural-language explanation of the liability decision with all contributing factors")
    recommendation:str=Field(description="Agent recommendation: 'approve', 'reject', or 'needs_human_review'")
    flags:list[str]=Field(default_factory=list, description="List of specific red flags or concerns identified during analysis")


# RAG assessment result evaluating the claim against the insurance policy
class RAGAssessment(BaseModel):
    policy_covered:bool=Field(description="Whether the insurance policy covers this incident/damage")
    coverage_type:Optional[str]=Field(default=None, description="Type of coverage that applies (e.g., 'comprehensive', 'collision')")
    applicable_sections:list[str]=Field(default_factory=list, description="List of policy section headers or clauses that apply")
    exclusions:list[str]=Field(default_factory=list, description="List of policy exclusions that were considered")
    compensation_amount:float=Field(description="Calculated total compensation amount based on policy limits and deductibles")
    compensation_breakdown:list[dict]=Field(default_factory=list, description="Breakdown of compensation per damage item")
    coverage_reasoning:str=Field(description="Detailed reasoning explaining how the policy applies and how the amount was calculated")
    recommendation:str=Field(description="Agent recommendation: 'approve_payment', 'reject_no_coverage', or 'needs_human_review'")
    flags:list[str]=Field(default_factory=list, description="List of red flags or concerns regarding policy interpretation")
