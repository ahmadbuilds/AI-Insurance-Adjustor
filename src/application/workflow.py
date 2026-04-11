from infrastructure.redis.redis_config import get_redis_client
from infrastructure.redis.redis_client import publish_to_stream
from domain.entities import ClaimEvent
redis=get_redis_client()

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

def setup_stream():
    """
    Function to set up the Redis streams and consumer groups for the workflow.
    """
    for stream in [NEW_CLAIM_STREAM, RESULT_STREAM]:
        try:
            redis.xgroup_create(stream, GROUP_NAME, id="0", mkstream=True)
            print(f"Consumer group '{GROUP_NAME}' created for stream '{stream}'")
        except redis.exceptions.ResponseError as e:
            if "BUSYGROUP" in str(e):
                print(f"Consumer group '{GROUP_NAME}' already exists for stream '{stream}'")
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
                                publish_to_stream(SAME_VEHICLE_STREAM, payload)
                                print(f"Routed claim {claim_id} to same vehicle detection")
                            else:
                                print(f"Claim {claim_id} was rejected by classification — no further processing")

                        elif source_task=="same_vehicle_detection":
                            print(f"Same vehicle detection agent completed for claim {claim_id}")

                            if claim_rejected=="False":
                                #route to vehicle type classification
                                payload=ClaimEvent(claim_id=claim_id,User_id=user_id).model_dump()
                                publish_to_stream(VEHICLE_TYPE_STREAM, payload)
                                print(f"Routed claim {claim_id} to vehicle type classification")
                            else:
                                print(f"Claim {claim_id} was rejected by same vehicle detection — no further processing")

                        elif source_task=="vehicle_type_classification":
                            print(f"Vehicle type classification agent completed for claim {claim_id}")

                            if claim_rejected=="False":
                                #route to damage detection
                                payload=ClaimEvent(claim_id=claim_id,User_id=user_id).model_dump()
                                publish_to_stream(DAMAGE_DETECTION_STREAM, payload)
                                print(f"Routed claim {claim_id} to damage detection")
                            else:
                                print(f"Claim {claim_id} was rejected by vehicle type classification — no further processing")

                        elif source_task=="damage_detection":
                            print(f"Damage detection agent completed for claim {claim_id}")

                            if claim_rejected=="False":
                                #route to image pipeline summary
                                payload=ClaimEvent(claim_id=claim_id,User_id=user_id).model_dump()
                                publish_to_stream(PIPELINE_SUMMARY_STREAM, payload)
                                print(f"Routed claim {claim_id} to image pipeline summary")
                            else:
                                print(f"Claim {claim_id} was rejected by damage detection — no further processing")

                        elif source_task=="image_pipeline_summary":
                            print(f"Image pipeline summary completed for claim {claim_id}")

                            if claim_rejected=="False":
                                #TODO: route to liability assessment stream when that agent is ready
                                #payload=ClaimEvent(claim_id=claim_id,User_id=user_id).model_dump()
                                #publish_to_stream(LIABILITY_STREAM, payload)
                                print(f"Image pipeline summary passed — awaiting liability agent implementation")
                            else:
                                print(f"Claim {claim_id} was rejected by image pipeline summary — no further processing")

                        #sending the ack to redis to mark the message as processed
                        redis.xack(RESULT_STREAM, GROUP_NAME, message_id)
                        print(f"Claim result {message_id} acknowledged in stream {RESULT_STREAM}")
                except Exception as e:
                    print(f"Error processing message {message_id} from stream {stream_name}: {str(e)}")
                    continue


if __name__=="__main__":
    run_workflow()