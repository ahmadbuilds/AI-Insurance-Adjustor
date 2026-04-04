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
