from infrastructure.redis.redis_config import get_redis_client
from infrastructure.redis.redis_client import publish_to_stream
from infrastructure.supabase.supabase_client import get_service_client
from infrastructure.adapters.combined_adapter import CombinedSupabaseAdapter
from domain.tools.fetch_vehicle_images_tool import make_fetch_vehicle_images_tool
from domain.tools.update_claim_status_tool import make_update_claim_status_tool
from domain.tools.log_agent_failure_tool import make_log_agent_failure_tool
from application.agents.same_vehicle_agent import SameVehicleAgent


# Redis stream names
SAME_VEHICLE_STREAM = "stream:task:same_vehicle"
RESULT_STREAM = "stream:events:claim_results"

# Consumer group config
GROUP_NAME = "same_vehicle_group"
CONSUMER_NAME = "same_vehicle_consumer"


def setup_same_vehicle_stream():
    """Create the consumer group for the same vehicle stream if it doesn't exist."""
    redis = get_redis_client()
    try:
        redis.xgroup_create(SAME_VEHICLE_STREAM, GROUP_NAME, id="0", mkstream=True)
        print(f"Consumer group '{GROUP_NAME}' created for stream '{SAME_VEHICLE_STREAM}'")
    except Exception as e:
        if "BUSYGROUP" in str(e):
            print(f"Consumer group '{GROUP_NAME}' already exists for stream '{SAME_VEHICLE_STREAM}'")
        else:
            raise e


def create_same_vehicle_agent(claim_id: str, adapter: CombinedSupabaseAdapter) -> SameVehicleAgent:
    """
    Factory function to create a SameVehicleAgent wired with tools for a specific claim.
    args:
        claim_id: str - the ID of the claim to process
        adapter: CombinedSupabaseAdapter - the adapter instance for DB/storage operations
    returns:
        SameVehicleAgent - an agent instance with tools configured for the claim
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
        failed_task="same_vehicle"
    )

    agent = SameVehicleAgent(
        fetch_vehicle_images_tool=fetch_tool,
        update_claim_status_tool=claim_status_tool,
        log_agent_failure_tool=log_agent_failure_tool,
    )
    return agent


def run_same_vehicle_service():
    setup_same_vehicle_stream()
    redis = get_redis_client()

    print("Same vehicle detection service started. Listening for tasks...")

    while True:
        response = redis.xreadgroup(
            GROUP_NAME,
            CONSUMER_NAME,
            streams={SAME_VEHICLE_STREAM: ">"},
            count=1,
            block=5000,
        )

        if not response:
            continue

        for stream_name, messages in response:
            for message_id, message_data in messages:
                print(f"\n{'='*60}")
                print(f"Same vehicle task received | Message ID: {message_id}")
                print(f"Data: {message_data}")

                try:
                    claim_id = message_data.get("claim_id")
                    user_id = message_data.get("User_id")

                    if not claim_id or not user_id:
                        print(f"Invalid message data (missing claim_id or User_id): {message_data}")
                        redis.xack(SAME_VEHICLE_STREAM, GROUP_NAME, message_id)
                        continue

                    # Create a fresh agent wired to this claim
                    service_client = get_service_client()
                    adapter = CombinedSupabaseAdapter(client=service_client)
                    agent = create_same_vehicle_agent(claim_id, adapter)

                    # Run the same vehicle detection graph
                    result = agent.invoke(claim_id=claim_id, user_id=user_id)

                    # Save full result to the same_vehicle_results DB table
                    adapter.save_same_vehicle_result(
                        claim_id=claim_id,
                        user_id=user_id,
                        vehicle_images_count=len(result.get("vehicle_images", [])),
                        is_same_vehicle=result.get("is_same_vehicle", False),
                        claim_rejected=result.get("claim_rejected", False),
                        status=result["status"],
                        error=result.get("error"),
                    )
                    print(f"Same vehicle result saved to database")

                    # Send minimal completion signal to the result stream
                    publish_to_stream(RESULT_STREAM, {
                        "claim_id": claim_id,
                        "User_id": user_id,
                        "source_task": "same_vehicle_detection",
                        "claim_rejected": str(result.get("claim_rejected", False)),
                    })
                    print(f"Completion signal published to {RESULT_STREAM}")

                    # Acknowledge the message
                    redis.xack(SAME_VEHICLE_STREAM, GROUP_NAME, message_id)
                    print(f"Message {message_id} acknowledged")

                except Exception as e:
                    print(f"Error processing same vehicle task: {str(e)}")
                    redis.xack(SAME_VEHICLE_STREAM, GROUP_NAME, message_id)


if __name__ == "__main__":
    run_same_vehicle_service()
