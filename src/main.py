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

@app.post("/upload_policy", status_code=status.HTTP_200_OK)
async def upload_policy_endpoint(event_data: dict, authorization: str = Header(...)):
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header missing")

    token = authorization.replace("Bearer ", "").replace("bearer ", "").strip()
    user = get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    policy_content = event_data.get("policy_text")
    if not policy_content:
        raise HTTPException(status_code=400, detail="Missing policy_text")

    try:
        from application.services.ingestion import IngestionService
        from infrastructure.adapters.redis_document_store import RedisDocumentStore
        from infrastructure.adapters.chroma_store import ChromaVectorStore
        from infrastructure.redis.redis_client import get_redis_client

        redis_client = get_redis_client()
        redis_store = RedisDocumentStore(redis_client)
        vector_store = ChromaVectorStore()
        
        service = IngestionService(redis_store=redis_store, vector_store=vector_store)
        
        status_change = service.has_document_changed(policy_content)
        
        if status_change == "no_policy":
            success = service.handle_new_policy_upload(policy_content)
        elif status_change == "changed":
            success = service.handle_policy_update(policy_content)
        else:
            return {"status": "success", "message": "Policy has not changed."}

        if not success:
             raise HTTPException(status_code=500, detail="Failed to process policy document")

        return {"status": "success", "message": "Policy uploaded and processed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/resolve_rag", status_code=status.HTTP_200_OK)
async def resolve_rag_endpoint(event_data: dict, authorization: str = Header(...)):
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header missing")

    token = authorization.replace("Bearer ", "").replace("bearer ", "").strip()
    user = get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    claim_id = event_data.get("claim_id")
    action = event_data.get("action")

    if not claim_id or action not in ("payment_approved", "rejected"):
        raise HTTPException(status_code=400, detail="Missing claim_id or invalid action")

    try:
        from infrastructure.supabase.supabase_client import get_service_client
        from infrastructure.adapters.combined_adapter import CombinedSupabaseAdapter

        service_client = get_service_client()
        adapter = CombinedSupabaseAdapter(client=service_client)

        # Update rag_results admin_action
        service_client.table("rag_results").update({
            "admin_action": action
        }).eq("claim_id", claim_id).execute()

        new_status = "approved" if action == "payment_approved" else "rejected"
        ai_verdict = "Payment Approved by Admin." if action == "payment_approved" else "Claim rejected after admin review of RAG policy assessment."

        adapter.update_claim_status(
            claim_id=claim_id,
            status=new_status,
            ai_verdict=ai_verdict
        )

        return {
            "status": "success",
            "message": f"RAG decision resolved as {action}",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/policy_status", status_code=status.HTTP_200_OK)
async def policy_status_endpoint(authorization: str = Header(...)):
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header missing")

    try:
        from infrastructure.adapters.redis_document_store import RedisDocumentStore
        from infrastructure.redis.redis_client import get_redis_client

        redis_client = get_redis_client()
        if not redis_client:
            return {"status": "error", "message": "Redis client unavailable", "version": None}
            
        redis_store = RedisDocumentStore(redis_client)
        version_name = redis_store.get_document_version_name()
        
        return {
            "status": "success",
            "version": version_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

