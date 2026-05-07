from infrastructure.redis.redis_config import get_redis_client
from infrastructure.redis.redis_client import publish_to_stream
from domain.entities import ClaimEvent
import os
import requests


#redis Result and new claim stream names
RESULT_STREAM="stream:events:claim_results"
NEW_CLAIM_STREAM="stream:events:new_claims"

#redis stream name for agents to publish their results after processing the claim
CLASSIFICATION_STREAM="stream:task:classification"
SAME_VEHICLE_STREAM="stream:task:same_vehicle"
VEHICLE_TYPE_STREAM="stream:task:vehicle_type"
DAMAGE_DETECTION_STREAM="stream:task:damage_detection"
PIPELINE_SUMMARY_STREAM="stream:task:image_pipeline_summary"
LIABILITY_STREAM="stream:task:liability"

#redis consumer group name and consumer name for processing new claim events
GROUP_NAME="orchestration_group"
CONSUMER_NAME="orchestration_consumer"

def emit_progress(claim_id, message):
    try:
        api_url = os.getenv("BACKEND_API_URL", "http://127.0.0.1:8000")
        requests.post(
            f"{api_url}/api/internal/emit-progress",
            json={"claim_id": claim_id, "message": message},
            timeout=5
        )
    except Exception as e:
        print(f"Failed to emit progress: {e}")

def setup_stream():
    """
    Function to set up the Redis streams and consumer groups for the workflow.
    """
    redis = get_redis_client()
    if not redis:
        print("Redis client is not available")
        return
        
    for stream in [NEW_CLAIM_STREAM, RESULT_STREAM]:
        try:
            redis.xgroup_create(stream, GROUP_NAME, id="0", mkstream=True)
            print(f"Consumer group '{GROUP_NAME}' created for stream '{stream}'")
        except Exception as e:
            if "BUSYGROUP" in str(e):
                print(f"Consumer group '{GROUP_NAME}' already exists for stream '{stream}'")
            else:
                raise e
            
def run_workflow():
    """
    Main function to run the workflow. It continuously listens for new claim events and processes them.
    """
    setup_stream()
    print("Workflow started. Listening for new claim events...")

    stream_to_read={
        NEW_CLAIM_STREAM:">",
        RESULT_STREAM:">"
    }
    
    while True:
        redis = get_redis_client()
        if not redis:
            import time
            time.sleep(5)
            continue
        response=redis.xreadgroup(
            GROUP_NAME, 
            CONSUMER_NAME, 
            streams=stream_to_read, 
            count=1, 
            block=5000
        )

        if not response:
            continue

        for stream_name,messages in response:
            for message_id,message_data in messages:
                print(f"\n--- New Message on {stream_name} ---")
                
                try:
                    if stream_name==NEW_CLAIM_STREAM:
                        print(f"New claim event received: {message_data}")
                        
                        # Simulate processing 
                        user_id=message_data.get("User_id")
                        claim_id=message_data.get("claim_id")

                        #publishing the stream for classification task
                        payload=ClaimEvent(claim_id=claim_id,User_id=user_id).model_dump()
                        emit_progress(claim_id, "Routed claim to classification task")
                        publish_to_stream(CLASSIFICATION_STREAM, payload)

                        #sending the ack to redis to mark the message as processed
                        redis.xack(NEW_CLAIM_STREAM, GROUP_NAME, message_id)
                        print(f"Claim event {message_id} acknowledged in stream {NEW_CLAIM_STREAM}")
                    
                    elif stream_name==RESULT_STREAM:
                        print(f"Claim result received: {message_data}")

                        source_task=message_data.get("source_task","")
                        claim_id=message_data.get("claim_id")
                        user_id=message_data.get("User_id")
                        claim_rejected=message_data.get("claim_rejected","False")

                        if source_task=="classification":
                            print(f"Classification agent completed for claim {claim_id}")

                            if claim_rejected=="False":
                                #claim has vehicle images — route to same vehicle detection
                                payload=ClaimEvent(claim_id=claim_id,User_id=user_id).model_dump()
                                emit_progress(claim_id, "Routed claim to same vehicle detection")
                                publish_to_stream(SAME_VEHICLE_STREAM, payload)
                                print(f"Routed claim {claim_id} to same vehicle detection")
                            else:
                                print(f"Claim {claim_id} was rejected by classification — no further processing")

                        elif source_task=="same_vehicle_detection":
                            print(f"Same vehicle detection agent completed for claim {claim_id}")

                            if claim_rejected=="False":
                                #route to vehicle type classification
                                payload=ClaimEvent(claim_id=claim_id,User_id=user_id).model_dump()
                                emit_progress(claim_id, "Routed claim to vehicle type classification")
                                publish_to_stream(VEHICLE_TYPE_STREAM, payload)
                                print(f"Routed claim {claim_id} to vehicle type classification")
                            else:
                                print(f"Claim {claim_id} was rejected by same vehicle detection — no further processing")

                        elif source_task=="vehicle_type_classification":
                            print(f"Vehicle type classification agent completed for claim {claim_id}")

                            if claim_rejected=="False":
                                #route to damage detection
                                payload=ClaimEvent(claim_id=claim_id,User_id=user_id).model_dump()
                                emit_progress(claim_id, "Routed claim to damage detection")
                                publish_to_stream(DAMAGE_DETECTION_STREAM, payload)
                                print(f"Routed claim {claim_id} to damage detection")
                            else:
                                print(f"Claim {claim_id} was rejected by vehicle type classification — no further processing")

                        elif source_task=="damage_detection":
                            print(f"Damage detection agent completed for claim {claim_id}")

                            if claim_rejected=="False":
                                #route to image pipeline summary
                                payload=ClaimEvent(claim_id=claim_id,User_id=user_id).model_dump()
                                emit_progress(claim_id, "Routed claim to image pipeline summary")
                                publish_to_stream(PIPELINE_SUMMARY_STREAM, payload)
                                print(f"Routed claim {claim_id} to image pipeline summary")
                            else:
                                print(f"Claim {claim_id} was rejected by damage detection — no further processing")

                        elif source_task=="image_pipeline_summary":
                            print(f"Image pipeline summary completed for claim {claim_id}")

                            if claim_rejected=="False":
                                #route to liability assessment
                                payload=ClaimEvent(claim_id=claim_id,User_id=user_id).model_dump()
                                emit_progress(claim_id, "Routed claim to liability assessment")
                                publish_to_stream(LIABILITY_STREAM, payload)
                                print(f"Routed claim {claim_id} to liability assessment")
                            else:
                                print(f"Claim {claim_id} was rejected by image pipeline summary — no further processing")

                        elif source_task=="liability_assessment":
                            print(f"Liability assessment completed for claim {claim_id}")
                            needs_admin_review=message_data.get("needs_admin_review","False")

                            if needs_admin_review=="True":
                                #confidence < 70%  admin will decide via the resolve endpoint
                                print(f"Claim {claim_id} flagged for admin review (low confidence)")
                            elif claim_rejected=="False":
                                #confidence >= 70% — claim passed liability
                                RAG_STREAM="stream:task:rag"
                                payload=ClaimEvent(claim_id=claim_id,User_id=user_id).model_dump()
                                emit_progress(claim_id, "Routed claim to RAG policy assessment")
                                publish_to_stream(RAG_STREAM, payload)
                                print(f"Liability passed — routed to RAG agent stream")
                            else:
                                print(f"Claim {claim_id} was rejected by liability assessment")

                        elif source_task=="rag_assessment":
                            print(f"RAG assessment completed for claim {claim_id}")
                            needs_admin_review=message_data.get("needs_admin_review","False")
                            policy_covered=message_data.get("policy_covered","False")

                            if needs_admin_review=="True" and policy_covered=="True":
                                print(f"Claim {claim_id} covered by policy — awaiting admin payment decision")
                            elif policy_covered=="False":
                                print(f"Claim {claim_id} rejected by RAG due to no policy coverage")

                        #sending the ack to redis to mark the message as processed
                        redis.xack(RESULT_STREAM, GROUP_NAME, message_id)
                        print(f"Claim result {message_id} acknowledged in stream {RESULT_STREAM}")
                except Exception as e:
                    print(f"Error processing message {message_id} from stream {stream_name}: {str(e)}")
                    continue


if __name__=="__main__":
    run_workflow()