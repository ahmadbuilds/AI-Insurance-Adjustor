from application.services.ingestion import IngestionService


class FakeRedisStore:
    def __init__(self):
        self.version = None
        self.hashes = {}

    def get_document_version_name(self):
        return self.version

    def save_document_version_name(self, name):
        self.version = name
        return True

    def get_document_hash(self, document_id):
        return self.hashes.get(document_id)

    def save_document_hash(self, document_id, doc_hash):
        self.hashes[document_id] = doc_hash
        return True

    def delete_document_hash(self, document_id):
        self.hashes.pop(document_id, None)
        return True


class FakeVectorStore:
    def __init__(self):
        self.upserts = []
        self.deleted = []
        self.existing_hashes = set()

    def upsert_embeddings(self, chunks, metadatas, ids):
        self.upserts.append((chunks, metadatas, ids))
        return True

    def get_existing_chunk_hashes(self, _doc_hash):
        return list(self.existing_hashes)

    def delete_chunks_by_chunk_hash(self, chunk_hash):
        self.deleted.append(chunk_hash)
        return True


def test_has_document_changed_no_policy():
    store = FakeRedisStore()
    vector = FakeVectorStore()
    service = IngestionService(store, vector)
    assert service.has_document_changed("doc") == "no_policy"


def test_has_document_changed_unchanged():
    store = FakeRedisStore()
    vector = FakeVectorStore()
    service = IngestionService(store, vector)

    store.version = "document_version_v1"
    doc_hash = service.hash_function("doc")
    store.hashes[store.version] = doc_hash

    assert service.has_document_changed("doc") == "unchanged"


def test_has_document_changed_changed():
    store = FakeRedisStore()
    vector = FakeVectorStore()
    service = IngestionService(store, vector)

    store.version = "document_version_v1"
    store.hashes[store.version] = service.hash_function("old")

    assert service.has_document_changed("new") == "changed"


def test_handle_new_policy_upload_saves_hash_and_version():
    store = FakeRedisStore()
    vector = FakeVectorStore()
    service = IngestionService(store, vector)

    ok = service.handle_new_policy_upload("new policy")

    assert ok is True
    assert store.version is not None
    assert store.hashes.get(store.version)
    assert vector.upserts


def test_handle_policy_update_increments_version_and_deletes_old_chunks():
    store = FakeRedisStore()
    vector = FakeVectorStore()
    service = IngestionService(store, vector)

    store.version = "document_version_v1"
    old_hash = service.hash_function("old policy")
    store.hashes[store.version] = old_hash
    vector.existing_hashes = {"old_chunk_hash"}

    ok = service.handle_policy_update("new policy content")

    assert ok is True
    assert store.version != "document_version_v1"
    assert store.hashes.get(store.version)
    assert "old_chunk_hash" in vector.deleted
