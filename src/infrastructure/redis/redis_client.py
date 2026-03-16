try:
    from src.infrastructure.redis.redis_config import get_redis_client
except ModuleNotFoundError:
    from infrastructure.redis.redis_config import get_redis_client

#getting the redis client instance from infrastructure layer
redis=get_redis_client()

#function to publish the new pending claim to the redis stream
def publish_to_stream(stream_name:str,payload_data:dict):
    try:
        #adding the event to the redis stream with a max length of 10000 entries to prevent unbounded growth
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