import json
import os
import requests
from infrastructure.redis.redis_config import get_redis_client
from infrastructure.redis.redis_client import publish_to_stream
from infrastructure.supabase.supabase_client import get_service_client
from infrastructure.adapters.combined_adapter import CombinedSupabaseAdapter
from domain.tools.fetch_liability_data_tool import make_fetch_liability_data_tool
from domain.tools.update_claim_status_tool import make_update_claim_status_tool
from domain.tools.log_agent_failure_tool import make_log_agent_failure_tool
from application.agents.liability_agent import LiabilityAgent


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


# Redis stream names
LIABILITY_STREAM = "stream:task:liability"
RESULT_STREAM = "stream:events:claim_results"

# Consumer group config
GROUP_NAME = "liability_group"
CONSUMER_NAME = "liability_consumer"


def setup_liability_stream():
    """Create the consumer group for the liability stream if it doesn't exist."""
    redis = get_redis_client()
    try:
        redis.xgroup_create(LIABILITY_STREAM, GROUP_NAME, id="0", mkstream=True)
        print(f"Consumer group '{GROUP_NAME}' created for stream '{LIABILITY_STREAM}'")
    except Exception as e:
        if "BUSYGROUP" in str(e):
            print(f"Consumer group '{GROUP_NAME}' already exists for stream '{LIABILITY_STREAM}'")
        else:
            raise e


def create_liability_agent(claim_id: str, adapter: CombinedSupabaseAdapter) -> LiabilityAgent:
    """
    Factory function to create a LiabilityAgent wired with tools for a specific claim.
    args:
        claim_id: str - the ID of the claim to process
        adapter: CombinedSupabaseAdapter - the adapter instance for DB operations
    returns:
        LiabilityAgent - an agent instance with tools configured for the claim
    """
    fetch_tool = make_fetch_liability_data_tool(
        claim_repository=adapter,
        claim_id=claim_id,
    )
    claim_status_tool = make_update_claim_status_tool(
        claim_repository=adapter,
        claim_id=claim_id,
    )
    log_failure_tool = make_log_agent_failure_tool(
        claim_repository=adapter,
        claim_id=claim_id,
        failed_task="liability_assessment",
    )

    agent = LiabilityAgent(
        fetch_liability_data_tool=fetch_tool,
        update_claim_status_tool=claim_status_tool,
        log_agent_failure_tool=log_failure_tool,
    )
    return agent


def run_liability_service():
    """Main loop: subscribe to the liability Redis stream and process tasks."""
    setup_liability_stream()
    redis = get_redis_client()

    print("Liability assessment service started. Listening for tasks...")

    while True:
        response = redis.xreadgroup(
            GROUP_NAME,
            CONSUMER_NAME,
            streams={LIABILITY_STREAM: ">"},
            count=1,
            block=5000,
        )

        if not response:
            continue

        for stream_name, messages in response:
            for message_id, message_data in messages:
                print(f"\n{'='*60}")
                print(f"Liability assessment task received | Message ID: {message_id}")
                print(f"Data: {message_data}")

                try:
                    claim_id = message_data.get("claim_id")
                    user_id = message_data.get("User_id")

                    if not claim_id or not user_id:
                        print(f"Invalid message data (missing claim_id or User_id): {message_data}")
                        redis.xack(LIABILITY_STREAM, GROUP_NAME, message_id)
                        continue

                    # Create a fresh agent wired to this claim
                    service_client = get_service_client()
                    adapter = CombinedSupabaseAdapter(client=service_client)
                    agent = create_liability_agent(claim_id, adapter)

                    # Run the liability assessment graph
                    result = agent.invoke(claim_id=claim_id, user_id=user_id)
                    if hasattr(result, "model_dump"):
                        result = result.model_dump()
                    elif hasattr(result, "dict"):
                        result = result.dict()

                    # Extract assessment for DB storage
                    assessment = result.get("assessment")
                    status = result.get("status", "failed")
                    error = result.get("error")
                    needs_admin_review = result.get("needs_admin_review", False)

                    if assessment and hasattr(assessment, "model_dump"):
                        assessment_data = assessment.model_dump()
                    elif isinstance(assessment, dict):
                        assessment_data = assessment
                    else:
                        assessment_data = None

                    # Save to the liability_results table
                    if assessment_data:
                        # Serialize damage_alignments to list of dicts
                        alignments_serialized = []
                        for a in assessment_data.get("damage_alignments", []):
                            if hasattr(a, "model_dump"):
                                alignments_serialized.append(a.model_dump())
                            elif isinstance(a, dict):
                                alignments_serialized.append(a)

                        adapter.save_liability_result(
                            claim_id=claim_id,
                            user_id=user_id,
                            overall_confidence=assessment_data.get("overall_confidence", 0.0),
                            confidence_percentage=assessment_data.get("confidence_percentage", 0),
                            scenario_plausibility=assessment_data.get("scenario_plausibility", "questionable"),
                            scenario_reasoning=assessment_data.get("scenario_reasoning", ""),
                            damage_alignments=alignments_serialized,
                            consistent_damages=assessment_data.get("consistent_damages", 0),
                            inconsistent_damages=assessment_data.get("inconsistent_damages", 0),
                            overall_reasoning=assessment_data.get("overall_reasoning", ""),
                            recommendation=assessment_data.get("recommendation", "needs_human_review"),
                            flags=assessment_data.get("flags", []),
                            needs_admin_review=needs_admin_review,
                            admin_action="pending" if needs_admin_review else None,
                            status=status,
                            error=error,
                        )
                        print(f"Liability result saved to database")
                        
                        if needs_admin_review:
                            adapter.save_admin_notification(
                                claim_id=claim_id,
                                message="Manual review required: AI flagged this claim based on suspicious or low-confidence Liability conditions.",
                                failed_task="liability_assessment"
                            )
                            _emit_admin_notification(
                                claim_id=claim_id,
                                failed_task="liability_assessment",
                                message="Manual review required: AI flagged this claim based on suspicious or low-confidence Liability conditions."
                            )
                    else:
                        # Save a failed result row
                        adapter.save_liability_result(
                            claim_id=claim_id,
                            user_id=user_id,
                            overall_confidence=0.0,
                            confidence_percentage=0,
                            scenario_plausibility="unknown",
                            scenario_reasoning="Agent failed to produce assessment.",
                            damage_alignments=[],
                            consistent_damages=0,
                            inconsistent_damages=0,
                            overall_reasoning=error or "Liability assessment failed.",
                            recommendation="needs_human_review",
                            flags=["agent_failure"],
                            needs_admin_review=True,
                            admin_action="pending",
                            status="failed",
                            error=error,
                        )
                        print(f"Failed liability result saved to database")
                        
                        # Already explicitly true for failures
                        adapter.save_admin_notification(
                            claim_id=claim_id,
                            message=f"Manual review required: Liability assessment fundamentally failed. Error: {error}",
                            failed_task="liability_assessment"
                        )
                        _emit_admin_notification(
                            claim_id=claim_id,
                            failed_task="liability_assessment",
                            message=f"Manual review required: Liability assessment fundamentally failed. Error: {error}"
                        )

                    # Publish completion signal to RESULT_STREAM
                    publish_to_stream(RESULT_STREAM, {
                        "claim_id": claim_id,
                        "User_id": user_id,
                        "source_task": "liability_assessment",
                        "claim_rejected": "False",
                        "needs_admin_review": str(needs_admin_review),
                    })
                    print(f"Completion signal published to {RESULT_STREAM}")

                    # Acknowledge the message
                    redis.xack(LIABILITY_STREAM, GROUP_NAME, message_id)
                    print(f"Message {message_id} acknowledged")

                except Exception as e:
                    print(f"Error processing liability task: {str(e)}")
                    redis.xack(LIABILITY_STREAM, GROUP_NAME, message_id)


if __name__ == "__main__":
    run_liability_service()
