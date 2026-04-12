from domain.ports import DocumentStorePort
import redis.exceptions

class RedisDocumentStore(DocumentStorePort):
    """
    Implementation of DocumentStorePort using Redis Hashes and Strings.
    Used for tracking policy document versions and hashes.
    """
    def __init__(self, redis_client):
        """
        Initialize with a Redis client.
        """
        self.redis = redis_client
        self.doc_hash_key = "policy:hashes"
        self.version_key = "policy:current_version"

    def get_document_version_name(self) -> str | None:
        try:
            val = self.redis.get(self.version_key)
            return val.decode("utf-8") if val else None
        except redis.exceptions.RedisError as e:
            print(f"Redis get_document_version_name error: {e}")
            return None

    def save_document_version_name(self, name: str) -> bool:
        try:
            self.redis.set(self.version_key, name)
            return True
        except redis.exceptions.RedisError as e:
            print(f"Redis save_document_version_name error: {e}")
            return False

    def get_document_hash(self, document_id: str) -> str | None:
        try:
            val = self.redis.hget(self.doc_hash_key, document_id)
            return val.decode("utf-8") if val else None
        except redis.exceptions.RedisError as e:
            print(f"Redis get_document_hash error: {e}")
            return None

    def save_document_hash(self, document_id: str, doc_hash: str) -> bool:
        try:
            self.redis.hset(self.doc_hash_key, document_id, doc_hash)
            return True
        except redis.exceptions.RedisError as e:
            print(f"Redis save_document_hash error: {e}")
            return False

    def delete_document_hash(self, document_id: str) -> bool:
        try:
            self.redis.hdel(self.doc_hash_key, document_id)
            return True
        except redis.exceptions.RedisError as e:
            print(f"Redis delete_document_hash error: {e}")
            return False
