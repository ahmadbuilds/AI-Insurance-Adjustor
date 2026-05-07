import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI,HTTPException,Header,status
from fastapi.middleware.cors import CORSMiddleware
try:
    import config
    from domain.entities import ClaimEvent
except ModuleNotFoundError:
    from src import config
    from src.domain.entities import ClaimEvent

from infrastructure.redis.redis_client import publish_to_stream
from infrastructure.supabase.supabase_client import get_user_from_token

from contextlib import asynccontextmanager
import threading

@asynccontextmanager
async def lifespan(app: FastAPI):
    def start_background_workers():
        try:
            from application.workflow import run_workflow
            from application.services.classification_service import run_classification_service
            from application.services.damage_detection_service import run_damage_detection_service
            from application.services.image_pipeline_summary_service import run_image_pipeline_summary_service
            from application.services.liability_service import run_liability_service
            from application.services.rag_service import process_rag_task
            from application.services.same_vehicle_service import run_same_vehicle_service
            from application.services.vehicle_type_service import run_vehicle_type_service
            
            for func in [run_workflow, run_classification_service, run_damage_detection_service, run_image_pipeline_summary_service, run_liability_service, process_rag_task, run_same_vehicle_service, run_vehicle_type_service]:
                threading.Thread(target=func, daemon=True).start()
            print("Successfully started all background AI agents and workflow orchestrator")
        except Exception as e:
            print(f"Failed to start background workers: {e}")
            
    start_background_workers()
    yield

app=FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)

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
            ai_verdict = "Claim rejected after admin review. The AI liability assessment was confirmed by admin."
            adapter.update_claim_status(
                claim_id=claim_id,
                status="rejected",
                ai_verdict=ai_verdict
            )

            try:
                from domain.tools.update_claim_status_tool import send_status_update_email, _save_claimant_notification_to_db, _emit_claimant_socket_event
                send_status_update_email(claim_id, "rejected", ai_verdict)
                _save_claimant_notification_to_db(claim_id, "rejected", ai_verdict)
                _emit_claimant_socket_event(claim_id, "rejected", ai_verdict)
            except Exception as e:
                print(f"Failed to send email/notification to user: {e}")

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
    rejection_reason = event_data.get("rejection_reason")

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
        if action == "payment_approved":
            ai_verdict = "Payment Approved by Admin."
        else:
            ai_verdict = rejection_reason if rejection_reason else "Claim rejected after admin review of RAG policy assessment."

        adapter.update_claim_status(
            claim_id=claim_id,
            status=new_status,
            ai_verdict=ai_verdict
        )

        try:
            from domain.tools.update_claim_status_tool import send_status_update_email, _save_claimant_notification_to_db, _emit_claimant_socket_event
            send_status_update_email(claim_id, new_status, ai_verdict)
            _save_claimant_notification_to_db(claim_id, new_status, ai_verdict)
            _emit_claimant_socket_event(claim_id, new_status, ai_verdict)
        except Exception as e:
            print(f"Failed to send email/notification to user: {e}")

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

@app.post("/api/internal/emit-progress", status_code=status.HTTP_200_OK)
async def emit_progress_endpoint(payload: dict):
    claim_id = payload.get("claim_id")
    message = payload.get("message")
    
    if not claim_id or not message:
        raise HTTPException(status_code=400, detail="Missing claim_id or message")
        
    try:
        from infrastructure.socket.socket_server import sio
        await sio.emit("claim_progress", payload)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/internal/emit-agent-failure", status_code=status.HTTP_200_OK)
async def emit_agent_failure_endpoint(payload: dict):
    """Internal endpoint for background threads to emit admin manual review notifications."""
    claim_id = payload.get("claim_id")
    failed_task = payload.get("failed_task")
    message = payload.get("message")
    
    if not claim_id or not failed_task or not message:
        raise HTTPException(status_code=400, detail="Missing claim_id, failed_task, or message")
        
    try:
        from infrastructure.socket.socket_server import sio
        await sio.emit("agent_failure", {
            "claim_id": claim_id,
            "failed_task": failed_task,
            "message": message,
        })
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/internal/emit-claim-status", status_code=status.HTTP_200_OK)
async def emit_claim_status_endpoint(payload: dict):
    """Internal endpoint for background threads to emit claimant approval/rejection notifications."""
    claim_id = payload.get("claim_id")
    event_type = payload.get("type")  # "approved" or "rejected"
    message = payload.get("message")
    
    if not claim_id or not event_type or not message:
        raise HTTPException(status_code=400, detail="Missing claim_id, type, or message")
        
    try:
        from infrastructure.socket.socket_server import sio
        event_name = f"claim_{event_type}"  # "claim_approved" or "claim_rejected"
        await sio.emit(event_name, {
            "claim_id": claim_id,
            "message": message,
        })
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/policy/coverages", status_code=status.HTTP_200_OK)
async def get_policy_coverages(authorization: str = Header(...)):
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header missing")

    try:
        import docx
        import re
        import os
        
        policy_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'atlas_policy_v3.docx')
        doc = docx.Document(policy_path)
        
        coverages = []
        for p in doc.paragraphs:
            text = p.text.strip()
           
            if re.match(r'^(4|5)\.\d+\s', text) and len(text) < 100:
                cleaned_text = text.replace('\ufffd', '-').strip()
                cleaned_text = re.sub(r'^(4|5)\.\d+\s+', '', cleaned_text)
                coverages.append(cleaned_text)
                
        return {"status": "success", "coverages": coverages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract coverages: {str(e)}")



