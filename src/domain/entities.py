from pydantic import BaseModel,Field

class ClaimEvent(BaseModel):
    claim_id:str=Field(description="Unique identifier for the claim")
    User_id:str=Field(description="Unique identifier for the user associated with the claim")