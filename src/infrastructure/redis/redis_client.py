try:
    from src.infrastructure.redis.redis_config import get_redis_client
except ModuleNotFoundError:
    from infrastructure.redis.redis_config import get_redis_client
import json
redis=get_redis_client()

#function to publish an event to a redis channel
def publish_event(channel:str,event:dict)->str:
    try:
        redis.publish(channel,json.dumps(event))
        return True
    except Exception as e:
        print(f"Error publishing event: {str(e)}")
        return False