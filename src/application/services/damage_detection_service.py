import json
from infrastructure.redis.redis_config import get_redis_client
from infrastructure.redis.redis_client import publish_to_stream
from infrastructure.supabase.supabase_client import get_service_client
from infrastructure.adapters.supabase_image_adapter import SupabaseImageAdapter
from domain.tools.fetch_vehicle_images_tool import make_fetch_vehicle_images_tool
from domain.tools.update_claim_status_tool import make_update_claim_status_tool
from domain.tools.log_agent_failure_tool import make_log_agent_failure_tool
from application.agents.damage_detection_agent import DamageDetectionAgent


# Redis stream names
DAMAGE_DETECTION_STREAM = "stream:task:damage_detection"
RESULT_STREAM = "stream:events:claim_results"

# Consumer group config
GROUP_NAME = "damage_detection_group"
CONSUMER_NAME = "damage_detection_consumer"


def setup_damage_detection_stream():
    """Create the consumer group for the damage detection stream if it doesn't exist."""
    redis = get_redis_client()
    try:
        redis.xgroup_create(DAMAGE_DETECTION_STREAM, GROUP_NAME, id="0", mkstream=True)
        print(f"Consumer group '{GROUP_NAME}' created for stream '{DAMAGE_DETECTION_STREAM}'")
    except Exception as e:
        if "BUSYGROUP" in str(e):
            print(f"Consumer group '{GROUP_NAME}' already exists for stream '{DAMAGE_DETECTION_STREAM}'")
        else:
            raise e


def create_damage_detection_agent(claim_id: str, adapter: SupabaseImageAdapter) -> DamageDetectionAgent:
    """
    Factory function to create a DamageDetectionAgent wired with tools for a specific claim.
    args:
        claim_id: str - the ID of the claim to process
        adapter: SupabaseImageAdapter - the adapter instance for DB/storage operations
    returns:
        DamageDetectionAgent - an agent instance with tools configured for the claim
    """
    fetch_tool = make_fetch_vehicle_images_tool(
        image_repository=adapter,
        image_storage=adapter,
        claim_id=claim_id,
    )
    claim_status_tool = make_update_claim_status_tool(
        claim_repository=adapter,
        claim_id=claim_id,
    )

    log_agent_failure_tool = make_log_agent_failure_tool(
        claim_repository=adapter,
        claim_id=claim_id,
        failed_task="damage_detection"
    )

    agent = DamageDetectionAgent(
        fetch_vehicle_images_tool=fetch_tool,
        update_claim_status_tool=claim_status_tool,
        log_agent_failure_tool=log_agent_failure_tool,
    )
    return agent


def run_damage_detection_service():
    """Main loop: subscribe to the damage detection Redis stream and process tasks."""
    setup_damage_detection_stream()
    redis = get_redis_client()

    print("Damage detection service started. Listening for tasks...")

    while True:
        response = redis.xreadgroup(
            GROUP_NAME,
            CONSUMER_NAME,
            streams={DAMAGE_DETECTION_STREAM: ">"},
            count=1,
            block=5000,
        )

        if not response:
            continue

        for stream_name, messages in response:
            for message_id, message_data in messages:
                print(f"\n{'='*60}")
                print(f"Damage detection task received | Message ID: {message_id}")
                print(f"Data: {message_data}")

                try:
                    claim_id = message_data.get("claim_id")
                    user_id = message_data.get("User_id")

                    if not claim_id or not user_id:
                        print(f"Invalid message data (missing claim_id or User_id): {message_data}")
                        redis.xack(DAMAGE_DETECTION_STREAM, GROUP_NAME, message_id)
                        continue

                    # Create a fresh agent wired to this claim
                    service_client = get_service_client()
                    adapter = SupabaseImageAdapter(client=service_client)
                    agent = create_damage_detection_agent(claim_id, adapter)

                    # Run the damage detection graph
                    result = agent.invoke(claim_id=claim_id, user_id=user_id)

                    # Serialize damage_results to dicts for DB storage
                    damage_results = result.get("damage_results", [])
                    damage_details_serialized = []
                    for dr in damage_results:
                        if hasattr(dr, "model_dump"):
                            damage_details_serialized.append(dr.model_dump())
                        elif isinstance(dr, dict):
                            damage_details_serialized.append(dr)

                    images_with_damage = sum(1 for dr in damage_results if (dr.has_damage if hasattr(dr, "has_damage") else dr.get("has_damage", False)))

                    # Save full result to the damage_detection_results DB table
                    adapter.save_damage_detection_result(
                        claim_id=claim_id,
                        user_id=user_id,
                        images_analyzed=len(result.get("vehicle_images", [])),
                        images_with_damage=images_with_damage,
                        claim_rejected=result.get("claim_rejected", False),
                        damage_details=damage_details_serialized,
                        damage_summary=result.get("damage_summary"),
                        status=result["status"],
                        error=result.get("error"),
                    )
                    print(f"Damage detection result saved to database")

                    # Send minimal completion signal to the result stream
                    publish_to_stream(RESULT_STREAM, {
                        "claim_id": claim_id,
                        "User_id": user_id,
                        "source_task": "damage_detection",
                        "claim_rejected": str(result.get("claim_rejected", False)),
                    })
                    print(f"Completion signal published to {RESULT_STREAM}")

                    # Acknowledge the message
                    redis.xack(DAMAGE_DETECTION_STREAM, GROUP_NAME, message_id)
                    print(f"Message {message_id} acknowledged")

                except Exception as e:
                    print(f"Error processing damage detection task: {str(e)}")
                    redis.xack(DAMAGE_DETECTION_STREAM, GROUP_NAME, message_id)


if __name__ == "__main__":
    run_damage_detection_service()
