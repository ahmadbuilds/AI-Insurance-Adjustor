from infrastructure.redis.redis_config import get_redis_client
from infrastructure.redis.redis_client import publish_to_stream
from infrastructure.supabase.supabase_client import get_service_client
from infrastructure.adapters.combined_adapter import CombinedSupabaseAdapter
from domain.tools.fetch_vehicle_images_tool import make_fetch_vehicle_images_tool
from domain.tools.update_claim_status_tool import make_update_claim_status_tool
from domain.tools.log_agent_failure_tool import make_log_agent_failure_tool
from application.agents.vehicle_type_agent import VehicleTypeAgent


# Redis stream names
VEHICLE_TYPE_STREAM = "stream:task:vehicle_type"
RESULT_STREAM = "stream:events:claim_results"

# Consumer group config
GROUP_NAME = "vehicle_type_group"
CONSUMER_NAME = "vehicle_type_consumer"


def setup_vehicle_type_stream():
    """Create the consumer group for the vehicle type stream if it doesn't exist."""
    redis = get_redis_client()
    try:
        redis.xgroup_create(VEHICLE_TYPE_STREAM, GROUP_NAME, id="0", mkstream=True)
        print(f"Consumer group '{GROUP_NAME}' created for stream '{VEHICLE_TYPE_STREAM}'")
    except Exception as e:
        if "BUSYGROUP" in str(e):
            print(f"Consumer group '{GROUP_NAME}' already exists for stream '{VEHICLE_TYPE_STREAM}'")
        else:
            raise e


def create_vehicle_type_agent(claim_id: str, adapter: CombinedSupabaseAdapter) -> VehicleTypeAgent:
    """
    Factory function to create a VehicleTypeAgent wired with tools for a specific claim.
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
        failed_task="vehicle_type_classification"
    )

    agent = VehicleTypeAgent(
        fetch_vehicle_images_tool=fetch_tool,
        update_claim_status_tool=claim_status_tool,
        log_agent_failure_tool=log_agent_failure_tool,
    )
    return agent


def run_vehicle_type_service():
    """Main loop: subscribe to the vehicle type Redis stream and process tasks."""
    setup_vehicle_type_stream()
    redis = get_redis_client()

    print("Vehicle type classification service started. Listening for tasks...")

    while True:
        response = redis.xreadgroup(
            GROUP_NAME,
            CONSUMER_NAME,
            streams={VEHICLE_TYPE_STREAM: ">"},
            count=1,
            block=5000,
        )

        if not response:
            continue

        for stream_name, messages in response:
            for message_id, message_data in messages:
                print(f"\n{'='*60}")
                print(f"Vehicle type task received | Message ID: {message_id}")
                print(f"Data: {message_data}")

                try:
                    claim_id = message_data.get("claim_id")
                    user_id = message_data.get("User_id")

                    if not claim_id or not user_id:
                        print(f"Invalid message data (missing claim_id or User_id): {message_data}")
                        redis.xack(VEHICLE_TYPE_STREAM, GROUP_NAME, message_id)
                        continue

                    # Create a fresh agent wired to this claim
                    service_client = get_service_client()
                    adapter = CombinedSupabaseAdapter(client=service_client)
                    agent = create_vehicle_type_agent(claim_id, adapter)

                    # Run the vehicle type detection graph
                    result = agent.invoke(claim_id=claim_id, user_id=user_id)

                    # Save full result to the vehicle_type_results DB table
                    adapter.save_vehicle_type_result(
                        claim_id=claim_id,
                        user_id=user_id,
                        identified_type=result.get("identified_type"),
                        claim_rejected=result.get("claim_rejected", False),
                        status=result["status"],
                        error=result.get("error"),
                    )
                    print(f"Vehicle type result saved to database")

                    # Send minimal completion signal to the result stream
                    publish_to_stream(RESULT_STREAM, {
                        "claim_id": claim_id,
                        "User_id": user_id,
                        "source_task": "vehicle_type_classification",
                        "claim_rejected": str(result.get("claim_rejected", False)),
                    })
                    print(f"Completion signal published to {RESULT_STREAM}")

                    # Acknowledge the message
                    redis.xack(VEHICLE_TYPE_STREAM, GROUP_NAME, message_id)
                    print(f"Message {message_id} acknowledged")

                except Exception as e:
                    print(f"Error processing vehicle type task: {str(e)}")
                    redis.xack(VEHICLE_TYPE_STREAM, GROUP_NAME, message_id)


if __name__ == "__main__":
    run_vehicle_type_service()
