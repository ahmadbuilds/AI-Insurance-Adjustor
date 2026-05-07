import os
import time
import json
import requests
import traceback
from infrastructure.redis.redis_client import publish_to_stream,get_redis_client
from infrastructure.supabase.supabase_client import get_service_client
from infrastructure.adapters.combined_adapter import CombinedSupabaseAdapter
from infrastructure.vector_store.chroma_client import create_chroma_instance
from infrastructure.adapters.chroma_store import ChromaVectorStore
from infrastructure.adapters.redis_document_store import RedisDocumentStore
from application.agents.rag_agent import RAGAgent
import config


def _emit_admin_notification(claim_id: str, failed_task: str, message: str):
    """Emit admin notification via internal HTTP endpoint (thread-safe)."""
    try:
        api_url = os.getenv("BACKEND_API_URL", "http://127.0.0.1:8000")
        requests.post(
            f"{api_url}/api/internal/emit-agent-failure",
            json={"claim_id": claim_id, "failed_task": failed_task, "message": message},
            timeout=5
        )
    except Exception as e:
        print(f"Failed to emit admin notification: {e}")


def _emit_claimant_notification(claim_id: str, notif_type: str, message: str):
    """Emit claimant notification via internal HTTP endpoint (thread-safe)."""
    try:
        api_url = os.getenv("BACKEND_API_URL", "http://127.0.0.1:8000")
        requests.post(
            f"{api_url}/api/internal/emit-claim-status",
            json={"claim_id": claim_id, "type": notif_type, "message": message},
            timeout=5
        )
    except Exception as e:
        print(f"Failed to emit claimant notification: {e}")

STREAM_NAME = "stream:task:rag"
GROUP_NAME = "rag_group"
CONSUMER_NAME = "rag_consumer_1"
RESULT_STREAM = "stream:events:claim_results"

def setup_rag_stream():
    redis = get_redis_client()
    try:
        redis.xgroup_create(STREAM_NAME, GROUP_NAME, id="0", mkstream=True)
        print(f"Consumer group '{GROUP_NAME}' created for stream '{STREAM_NAME}'")
    except Exception as e:
        if "BUSYGROUP" in str(e):
            print(f"Consumer group '{GROUP_NAME}' already exists for stream '{STREAM_NAME}'")
        else:
            raise e

def process_rag_task():
    """
    Consumes tasks from the RAG stream and delegates to the RAG Agent.
    """
    setup_rag_stream()
    redis = get_redis_client()
    print(f"[{CONSUMER_NAME}] Listening to {STREAM_NAME}...")

    policy_retrieval_port = ChromaVectorStore()

    while True:
        try:
            response = redis.xreadgroup(
                GROUP_NAME,
                CONSUMER_NAME,
                streams={STREAM_NAME: ">"},
                count=1,
                block=5000,
            )
            if not response:
                time.sleep(1)
                continue

            for stream, messages in response:
                for message_id, message_data in messages:
                    print(f"[{CONSUMER_NAME}] Processing message {message_id}: {message_data}")

                    claim_id = message_data.get("claim_id")
                    user_id = message_data.get("User_id")

                    if not claim_id or not user_id:
                        print(f"[{CONSUMER_NAME}] Invalid payload - skipping")
                        redis = get_redis_client()
                        if redis:
                            redis.xack(STREAM_NAME, GROUP_NAME, message_id)
                        continue

                    try:
                        # Initialize fresh adapters for this claim
                        supabase_client = get_service_client()
                        claim_repo = CombinedSupabaseAdapter(client=supabase_client)
                        agent = RAGAgent(claim_repo=claim_repo, policy_repo=policy_retrieval_port)

                        # Run RAG agent
                        state = agent.run(claim_id=claim_id, user_id=user_id)
                        if hasattr(state, "model_dump"):
                            state = state.model_dump()
                        elif hasattr(state, "dict"):
                            state = state.dict()
                        
                        status = state.get("status")
                        error = state.get("error")
                        assessment = state.get("assessment")

                        if status == "completed" and assessment:
                            print(f"[{CONSUMER_NAME}] Assessment completed. Policy covered: {assessment.policy_covered}")
                            
                            policy_covered = assessment.policy_covered
                            claim_rejected = not policy_covered

                            if policy_covered:
                                needs_admin_review = True
                                claim_repo.update_claim_status(
                                    claim_id=claim_id,
                                    status="approved",
                                    ai_verdict="Claim approved by AI. Pending final admin validation."
                                )
                                try:
                                    from domain.tools.update_claim_status_tool import _save_claimant_notification_to_db
                                    _save_claimant_notification_to_db(claim_id, "approved", "Claim approved by AI. Final admin approval required for compensation.")
                                except Exception as e:
                                    print(f"Failed to save claimant notification: {e}")
                                _emit_claimant_notification(claim_id, "approved", "Claim approved by AI. Final admin approval required for compensation.")
                            else:
                                needs_admin_review = False
                                claim_repo.update_claim_status(
                                    claim_id=claim_id,
                                    status="rejected",
                                    ai_verdict="Claim rejected: Not covered by insurance policy."
                                )
                                # Save claimant notification and emit socket event for rejection
                                try:
                                    from domain.tools.update_claim_status_tool import _save_claimant_notification_to_db
                                    _save_claimant_notification_to_db(claim_id, "rejected", "Claim rejected: Not covered by insurance policy.")
                                except Exception as e:
                                    print(f"Failed to save claimant notification: {e}")
                                _emit_claimant_notification(claim_id, "rejected", "Claim rejected: Not covered by insurance policy.")

                            # Publish to results stream
                            payload = {
                                "claim_id": claim_id,
                                "User_id": user_id,
                                "source_task": "rag_assessment",
                                "claim_rejected": str(claim_rejected),
                                "needs_admin_review": str(needs_admin_review),
                                "policy_covered": str(policy_covered),
                                "status": status
                            }
                        else:
                            print(f"[{CONSUMER_NAME}] Agent failed with error: {error}")
                            payload = {
                                "claim_id": claim_id,
                                "User_id": user_id,
                                "source_task": "rag_assessment",
                                "claim_rejected": "False",
                                "status": status,
                                "error": error or "Unknown error"
                            }
                        
                        publish_to_stream(RESULT_STREAM, payload)

                    except Exception as e:
                        print(f"[{CONSUMER_NAME}] Error processing claim {claim_id}: {str(e)}")
                        print(traceback.format_exc())

                    redis = get_redis_client()
                    if redis:
                        redis.xack(STREAM_NAME, GROUP_NAME, message_id)

        except Exception as e:
            print(f"[{CONSUMER_NAME}] Stream listener error: {str(e)}")
            time.sleep(5)

if __name__ == "__main__":
    process_rag_task()
