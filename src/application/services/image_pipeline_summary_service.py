import json
from infrastructure.redis.redis_config import get_redis_client
from infrastructure.redis.redis_client import publish_to_stream
from infrastructure.supabase.supabase_client import get_service_client
from infrastructure.adapters.combined_adapter import CombinedSupabaseAdapter
from domain.tools.fetch_pipeline_results_tool import make_fetch_pipeline_results_tool
from domain.tools.update_claim_status_tool import make_update_claim_status_tool
from domain.tools.log_agent_failure_tool import make_log_agent_failure_tool
from application.agents.image_pipeline_summary_agent import ImagePipelineSummaryAgent


# Redis stream names
PIPELINE_SUMMARY_STREAM = "stream:task:image_pipeline_summary"
RESULT_STREAM = "stream:events:claim_results"

# Consumer group config
GROUP_NAME = "image_pipeline_summary_group"
CONSUMER_NAME = "image_pipeline_summary_consumer"


def setup_pipeline_summary_stream():
    """Create the consumer group for the image pipeline summary stream if it doesn't exist."""
    redis = get_redis_client()
    try:
        redis.xgroup_create(PIPELINE_SUMMARY_STREAM, GROUP_NAME, id="0", mkstream=True)
        print(f"Consumer group '{GROUP_NAME}' created for stream '{PIPELINE_SUMMARY_STREAM}'")
    except Exception as e:
        if "BUSYGROUP" in str(e):
            print(f"Consumer group '{GROUP_NAME}' already exists for stream '{PIPELINE_SUMMARY_STREAM}'")
        else:
            raise e


def create_pipeline_summary_agent(claim_id: str, adapter: CombinedSupabaseAdapter) -> ImagePipelineSummaryAgent:
    """
    Factory function to create an ImagePipelineSummaryAgent wired with tools for a specific claim.
    args:
        claim_id: str - the ID of the claim to process
        adapter: CombinedSupabaseAdapter - the adapter instance for DB operations
    returns:
        ImagePipelineSummaryAgent - an agent instance with tools configured for the claim
    """
    fetch_pipeline_tool = make_fetch_pipeline_results_tool(
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
        failed_task="image_pipeline_summary",
    )

    agent = ImagePipelineSummaryAgent(
        fetch_pipeline_results_tool=fetch_pipeline_tool,
        update_claim_status_tool=claim_status_tool,
        log_agent_failure_tool=log_failure_tool,
    )
    return agent


def run_image_pipeline_summary_service():
    """Main loop: subscribe to the image pipeline summary Redis stream and process tasks."""
    setup_pipeline_summary_stream()
    redis = get_redis_client()

    print("Image pipeline summary service started. Listening for tasks...")

    while True:
        response = redis.xreadgroup(
            GROUP_NAME,
            CONSUMER_NAME,
            streams={PIPELINE_SUMMARY_STREAM: ">"},
            count=1,
            block=5000,
        )

        if not response:
            continue

        for stream_name, messages in response:
            for message_id, message_data in messages:
                print(f"\n{'='*60}")
                print(f"Pipeline summary task received | Message ID: {message_id}")
                print(f"Data: {message_data}")

                try:
                    claim_id = message_data.get("claim_id")
                    user_id = message_data.get("User_id")

                    if not claim_id or not user_id:
                        print(f"Invalid message data (missing claim_id or User_id): {message_data}")
                        redis.xack(PIPELINE_SUMMARY_STREAM, GROUP_NAME, message_id)
                        continue

                    # Create a fresh agent wired to this claim
                    service_client = get_service_client()
                    adapter = CombinedSupabaseAdapter(client=service_client)
                    agent = create_pipeline_summary_agent(claim_id, adapter)

                    # Run the pipeline summary graph
                    result = agent.invoke(claim_id=claim_id, user_id=user_id)
                    if hasattr(result, "model_dump"):
                        result = result.model_dump()
                    elif hasattr(result, "dict"):
                        result = result.dict()

                    # Extract the pipeline summary for DB storage
                    pipeline_summary = result.get("pipeline_summary")
                    status = result.get("status", "failed")
                    error = result.get("error")

                    if pipeline_summary and hasattr(pipeline_summary, "model_dump"):
                        summary_data = pipeline_summary.model_dump()
                    elif isinstance(pipeline_summary, dict):
                        summary_data = pipeline_summary
                    else:
                        summary_data = None

                    # Save to the image_pipeline_results table
                    if summary_data:
                        adapter.save_image_pipeline_result(
                            claim_id=claim_id,
                            user_id=user_id,
                            total_images=summary_data.get("total_images", 0),
                            vehicle_images_count=summary_data.get("vehicle_images_count", 0),
                            non_vehicle_images_count=summary_data.get("non_vehicle_images_count", 0),
                            is_same_vehicle=summary_data.get("is_same_vehicle", False),
                            vehicle_type=summary_data.get("vehicle_type"),
                            has_damage=summary_data.get("has_damage", False),
                            images_with_damage=summary_data.get("images_with_damage", 0),
                            damage_details=summary_data.get("damage_details", []),
                            damage_summary=summary_data.get("damage_summary"),
                            all_checks_passed=summary_data.get("all_checks_passed", False),
                            pipeline_summary=summary_data.get("pipeline_summary", ""),
                            status=status,
                            error=error,
                        )
                        print(f"Pipeline summary saved to database")
                    else:
                        # Save a failed result row
                        adapter.save_image_pipeline_result(
                            claim_id=claim_id,
                            user_id=user_id,
                            total_images=0,
                            vehicle_images_count=0,
                            non_vehicle_images_count=0,
                            is_same_vehicle=False,
                            vehicle_type=None,
                            has_damage=False,
                            images_with_damage=0,
                            damage_details=[],
                            damage_summary=None,
                            all_checks_passed=False,
                            pipeline_summary="Pipeline summary generation failed.",
                            status="failed",
                            error=error,
                        )
                        print(f"Failed pipeline result saved to database")

                    # Publish completion signal to RESULT_STREAM
                    all_passed = summary_data.get("all_checks_passed", False) if summary_data else False
                    publish_to_stream(RESULT_STREAM, {
                        "claim_id": claim_id,
                        "User_id": user_id,
                        "source_task": "image_pipeline_summary",
                        "claim_rejected": str(not all_passed) if status == "completed" else "True",
                    })
                    print(f"Completion signal published to {RESULT_STREAM}")

                    # Acknowledge the message
                    redis.xack(PIPELINE_SUMMARY_STREAM, GROUP_NAME, message_id)
                    print(f"Message {message_id} acknowledged")

                except Exception as e:
                    print(f"Error processing pipeline summary task: {str(e)}")
                    redis.xack(PIPELINE_SUMMARY_STREAM, GROUP_NAME, message_id)


if __name__ == "__main__":
    run_image_pipeline_summary_service()
