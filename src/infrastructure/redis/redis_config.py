import os 
import redis

try:
    import config 
except ModuleNotFoundError:
    from src import config


REDIS_HOST=os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT=int(os.getenv('REDIS_PORT', 6379))
_raw_password=os.getenv('REDIS_PASSWORD', None)
REDIS_PASSWORD=_raw_password.strip("'\"") if _raw_password else None

redis_client=redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    password=REDIS_PASSWORD,
    decode_responses=True,
    socket_keepalive=True
)

def get_redis_client()->redis.Redis:
    return redis_client