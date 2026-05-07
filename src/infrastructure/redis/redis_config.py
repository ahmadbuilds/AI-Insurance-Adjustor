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

_redis_client = None

def get_redis_client() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                password=REDIS_PASSWORD,
                decode_responses=True,
                socket_keepalive=True
            )
            _redis_client.ping()
        except redis.ConnectionError as e:
            print(f"Warning: Failed to connect to Redis: {e}")
            pass
    return _redis_client