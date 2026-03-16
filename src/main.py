from fastapi import FastAPI,HTTPException,Header,status
from fastapi.middleware.cors import CORSMiddleware
import json
from domain.entities import ClaimEvent
try:
    from src.infrastructure.supabase.supabase_client import get_user_from_token
except ModuleNotFoundError:
    from infrastructure.redis.redis_client import publish_to_stream
    from infrastructure.supabase.supabase_client import get_user_from_token

app=FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

@app.post("/publish_event",status_code=status.HTTP_202_ACCEPTED)
async def publish_event_endpoint(event_data:dict,authorization: str = Header(...)):
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="Authorization header missing")
    
    token=authorization.replace("Bearer ","").replace("bearer ","").strip()

    #fetch user details from token
    user=get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="Invalid token")
    
    #publish event to redis channel
    payload_data=ClaimEvent(claim_id=event_data.get("claim_id"),User_id=user.id).model_dump()
    stream_name="stream:events:new_claims"
    result=publish_to_stream(stream_name, payload_data)
    if not result:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to publish event")

    return{
        "status":"success",
        "message":f"Event published to stream {stream_name}"
    }