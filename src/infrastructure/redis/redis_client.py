from infrastructure.redis.redis_config import get_redis_client

#function to publish the new pending claim to the redis stream
def publish_to_stream(stream_name:str,payload_data:dict):
    try:
        redis = get_redis_client()
        if not redis:
            print("Redis client is not available")
            return False
            
        redis.xadd(
            stream_name,
            payload_data,
            maxlen=10000,
            approximate=True,
        )

        print(f"Event published to stream {stream_name}")
        return True
    except Exception as e:
        print(f"Error publishing event to stream {stream_name}: {str(e)}")
        return False