import time
import json
import traceback
from infrastructure.redis.redis_client import consume_from_stream, publish_to_stream,get_redis_client
from infrastructure.supabase.supabase_client import get_service_client
from infrastructure.adapters.combined_adapter import CombinedSupabaseAdapter
from infrastructure.vector_store.chroma_client import create_chroma_instance
from infrastructure.adapters.chroma_store import ChromaVectorStore
from infrastructure.adapters.redis_document_store import RedisDocumentStore
from application.agents.rag_agent import RAGAgent
import config

STREAM_NAME = "stream:task:rag"
GROUP_NAME = "rag_group"
CONSUMER_NAME = "rag_consumer_1"
RESULT_STREAM = "stream:events:claim_results"

def process_rag_task():
    """
    Consumes tasks from the RAG stream and delegates to the RAG Agent.
    """
    print(f"[{CONSUMER_NAME}] Listening to {STREAM_NAME}...")

    # Initialize adapters
    supabase_client = get_service_client()
    claim_repo = CombinedSupabaseAdapter(client=supabase_client)
    policy_retrieval_port = ChromaVectorStore()

    agent = RAGAgent(claim_repo=claim_repo, policy_repo=policy_retrieval_port)

    while True:
        try:
            messages = consume_from_stream(STREAM_NAME, GROUP_NAME, CONSUMER_NAME)
            if not messages:
                time.sleep(1)
                continue

            for message_id, message_data in messages:
                print(f"[{CONSUMER_NAME}] Processing message {message_id}: {message_data}")

                claim_id = message_data.get("claim_id")
                user_id = message_data.get("User_id")

                if not claim_id or not user_id:
                    print(f"[{CONSUMER_NAME}] Invalid payload - skipping")
                    continue

                try:
                    # Run RAG agent
                    state = agent.run(claim_id=claim_id, user_id=user_id)
                    
                    status = state.get("status")
                    error = state.get("error")
                    assessment = state.get("assessment")

                    if status == "completed" and assessment:
                        print(f"[{CONSUMER_NAME}] Assessment completed. Policy covered: {assessment.policy_covered}")
                        
                        policy_covered = assessment.policy_covered
                        claim_rejected = not policy_covered

                        if policy_covered:
                            needs_admin_review = True
                        else:
                            needs_admin_review = False
                            claim_repo.update_claim_status(
                                claim_id=claim_id,
                                status="rejected",
                                ai_verdict="Claim rejected: Not covered by insurance policy."
                            )

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
