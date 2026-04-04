from infrastructure.redis.redis_config import get_redis_client
from infrastructure.redis.redis_client import publish_to_stream
from infrastructure.supabase.supabase_client import get_service_client
from infrastructure.adapters.supabase_image_adapter import SupabaseImageAdapter
from domain.tools.fetch_claim_images_tool import make_fetch_claim_images_tool
from domain.tools.update_vehicle_status_tool import make_update_vehicle_status_tool
from domain.tools.update_claim_status_tool import make_update_claim_status_tool
from application.agents.classification_agent import ClassificationAgent


# Redis stream names
CLASSIFICATION_STREAM = "stream:task:classification"
RESULT_STREAM = "stream:events:claim_results"

# Consumer group config
GROUP_NAME = "classification_group"
CONSUMER_NAME = "classification_consumer"


def setup_classification_stream():
    """Create the consumer group for the classification stream if it doesn't exist."""
    redis = get_redis_client()
    try:
        redis.xgroup_create(CLASSIFICATION_STREAM, GROUP_NAME, id="0", mkstream=True)
        print(f"Consumer group '{GROUP_NAME}' created for stream '{CLASSIFICATION_STREAM}'")
    except Exception as e:
        if "BUSYGROUP" in str(e):
            print(f"Consumer group '{GROUP_NAME}' already exists for stream '{CLASSIFICATION_STREAM}'")
        else:
            raise e


def create_classification_agent(claim_id: str, adapter: SupabaseImageAdapter) -> ClassificationAgent:
    """
    Factory function to create a ClassificationAgent instance wired with the necessary tools for a specific claim_id.
    args:
        claim_id: str - the ID of the claim for which the agent will process images
        adapter: SupabaseImageAdapter - the adapter instance to use for DB/storage operations
    returns:
        ClassificationAgent - an instance of the ClassificationAgent with tools configured for the claim
    """
    fetch_tool = make_fetch_claim_images_tool(
        image_repository=adapter,
        image_storage=adapter,
        claim_id=claim_id,
    )
    update_tool = make_update_vehicle_status_tool(
        image_repository=adapter,
    )
    claim_status_tool = make_update_claim_status_tool(
        claim_repository=adapter,
        claim_id=claim_id,
    )

    agent = ClassificationAgent(
        fetch_images_tool=fetch_tool,
        update_vehicle_status_tool=update_tool,
        update_claim_status_tool=claim_status_tool,
    )
    return agent


def run_classification_service():
    """
    Main function to run the classification service. It listens for classification tasks on the Redis stream,
    processes them using the ClassificationAgent, and publishes results to the result stream.
    """
    setup_classification_stream()
    redis = get_redis_client()

    print("Classification service started. Listening for tasks...")

    while True:
        response = redis.xreadgroup(
            GROUP_NAME,
            CONSUMER_NAME,
            streams={CLASSIFICATION_STREAM: ">"},
            count=1,
            block=5000,
        )

        if not response:
            continue

        for stream_name, messages in response:
            for message_id, message_data in messages:
                print(f"\n{'='*60}")
                print(f"Classification task received | Message ID: {message_id}")
                print(f"Data: {message_data}")

                try:
                    claim_id = message_data.get("claim_id")
                    user_id = message_data.get("User_id")

                    if not claim_id or not user_id:
                        print(f"Invalid message data (missing claim_id or User_id): {message_data}")
                        redis.xack(CLASSIFICATION_STREAM, GROUP_NAME, message_id)
                        continue

                    # Create a fresh agent wired to this claim
                    service_client = get_service_client()
                    adapter = SupabaseImageAdapter(client=service_client)
                    agent = create_classification_agent(claim_id, adapter)

                    # Run the classification graph
                    result = agent.invoke(claim_id=claim_id, user_id=user_id)

                    # Save full result to the classification_results DB table
                    classification_results = result.get("classification_results", [])
                    vehicles_detected = sum(1 for r in classification_results if r.is_vehical)

                    adapter.save_classification_result(
                        claim_id=claim_id,
                        user_id=user_id,
                        images_processed=len(classification_results),
                        vehicles_detected=vehicles_detected,
                        claim_rejected=result.get("claim_rejected", False),
                        status=result["status"],
                        error=result.get("error"),
                    )
                    print(f"Classification result saved to database")

                    # Send minimal completion signal to the result stream
                    publish_to_stream(RESULT_STREAM, {
                        "claim_id": claim_id,
                        "User_id": user_id,
                        "source_task": "classification",
                        "claim_rejected": str(result.get("claim_rejected", False)),
                    })
                    print(f"Completion signal published to {RESULT_STREAM}")

                    # Acknowledge the message
                    redis.xack(CLASSIFICATION_STREAM, GROUP_NAME, message_id)
                    print(f"Message {message_id} acknowledged")

                except Exception as e:
                    print(f"Error processing classification task: {str(e)}")
                    redis.xack(CLASSIFICATION_STREAM, GROUP_NAME, message_id)


if __name__ == "__main__":
    run_classification_service()
