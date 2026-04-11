from fastapi import FastAPI,HTTPException,Header,status
from fastapi.middleware.cors import CORSMiddleware
import config
from domain.entities import ClaimEvent

try:
    from src.infrastructure.redis.redis_client import publish_to_stream
except ModuleNotFoundError:
    from infrastructure.redis.redis_client import publish_to_stream

try:
    from src.infrastructure.supabase.supabase_client import get_user_from_token
except ModuleNotFoundError:
    from infrastructure.supabase.supabase_client import get_user_from_token

app=FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

try:
    from src.infrastructure.socket.socket_server import socket_app
except ModuleNotFoundError:
    from infrastructure.socket.socket_server import socket_app

app.mount("/socket.io", socket_app)

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

@app.post("/resume_workflow",status_code=status.HTTP_202_ACCEPTED)
async def resume_workflow_endpoint(event_data:dict,authorization: str = Header(...)):
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="Authorization header missing")
    
    token=authorization.replace("Bearer ","").replace("bearer ","").strip()
    user=get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="Invalid token")

    claim_id = event_data.get("claim_id")
    source_task = event_data.get("source_task")#task which has been failed

    if not claim_id or not source_task:
        raise HTTPException(status_code=400, detail="Missing claim_id or source_task")
    
    # Simulate the agent passing
    payload_data = {
        "claim_id": claim_id,
        "User_id": user.id,
        "source_task": source_task,
        "claim_rejected": "False"
    }

    stream_name = "stream:events:claim_results"
    result = publish_to_stream(stream_name, payload_data)
    if not result:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to resume workflow")

    return{
        "status":"success",
        "message":f"Workflow resumed on stream {stream_name}"
    }

@app.post("/resolve_liability", status_code=status.HTTP_200_OK)
async def resolve_liability_endpoint(event_data: dict, authorization: str = Header(...)):
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header missing")

    token = authorization.replace("Bearer ", "").replace("bearer ", "").strip()
    user = get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    claim_id = event_data.get("claim_id")
    action = event_data.get("action")

    if not claim_id or not action:
        raise HTTPException(status_code=400, detail="Missing claim_id or action")

    if action not in ("accept", "override"):
        raise HTTPException(status_code=400, detail="action must be 'accept' or 'override'")

    try:
        from infrastructure.supabase.supabase_client import get_service_client
        from infrastructure.adapters.combined_adapter import CombinedSupabaseAdapter

        service_client = get_service_client()
        adapter = CombinedSupabaseAdapter(client=service_client)

        if action == "accept":
            service_client.table("liability_results").update({
                "admin_action": "accepted"
            }).eq("claim_id", claim_id).execute()

            # Update claim status to rejected with the AI reasoning
            adapter.update_claim_status(
                claim_id=claim_id,
                status="rejected",
                ai_verdict="Claim rejected after admin review. The AI liability assessment was confirmed by admin."
            )

            return {
                "status": "success",
                "message": f"Claim {claim_id} rejected (admin accepted AI decision). User will see rejection.",
            }

        elif action == "override":
            service_client.table("liability_results").update({
                "admin_action": "overridden"
            }).eq("claim_id", claim_id).execute()

            payload_data = {
                "claim_id": claim_id,
                "User_id": user.id,
                "source_task": "liability_assessment",
                "claim_rejected": "False",
                "needs_admin_review": "False",
            }
            result_stream = "stream:events:claim_results"
            publish_to_stream(result_stream, payload_data)

            return {
                "status": "success",
                "message": f"Claim {claim_id} overridden by admin. Forwarded to next pipeline stage (RAG).",
            }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resolve liability: {str(e)}"
        )
