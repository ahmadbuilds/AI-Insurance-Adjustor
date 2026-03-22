from pydantic import BaseModel,Field

class ClaimEvent(BaseModel):
    claim_id:str=Field(description="Unique identifier for the claim")
    User_id:str=Field(description="Unique identifier for the user associated with the claim")


#pydantic model for Safety guard of Vehicle Checking
class isVehiclePresent(BaseModel):
    present:bool=Field(description="Indicates whether the vehicle is present in the image or not",default=False)