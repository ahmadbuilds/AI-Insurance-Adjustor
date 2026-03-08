from infrastructure.redis.redis_client import get_redis_client
import json
redis=get_redis_client()

#function to publish an event to a redis channel
def publish_event(channel:str,event:dict)->str:
    try:
        redis.publish(channel,json.dumps(event))
        return "Event published successfully"
    except Exception as e:
        return f"Error publishing event: {str(e)}"