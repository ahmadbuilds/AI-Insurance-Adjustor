import asyncio
import sys
import types

import pytest
from fastapi import HTTPException

import main
from tests.utils import FakeSupabaseClient


class FakeAdapter:
    def __init__(self, client):
        self.client = client
        self.calls = []

    def update_claim_status(self, claim_id, status, ai_verdict):
        self.calls.append((claim_id, status, ai_verdict))
        return True


class StubRedisStore:
    def __init__(self, client, version=None):
        self.client = client
        self._version = version

    def get_document_version_name(self):
        return self._version


class StubIngestionService:
    change_result = "no_policy"
    new_called = False
    update_called = False

    def __init__(self, redis_store, vector_store):
        self.redis_store = redis_store
        self.vector_store = vector_store

    def has_document_changed(self, _content):
        return StubIngestionService.change_result

    def handle_new_policy_upload(self, _content):
        StubIngestionService.new_called = True
        return True

    def handle_policy_update(self, _content):
        StubIngestionService.update_called = True
        return True


class StubRedisDocumentStore:
    def __init__(self, _client):
        pass


class StubVectorStore:
    def __init__(self):
        pass


class FakeSio:
    def __init__(self):
        self.calls = []

    async def emit(self, event, payload):
        self.calls.append((event, payload))


class FakeDocx:
    class Paragraph:
        def __init__(self, text):
            self.text = text

    def __init__(self, paragraphs):
        self.paragraphs = [FakeDocx.Paragraph(p) for p in paragraphs]


def test_publish_event_missing_auth():
    with pytest.raises(HTTPException) as exc:
        asyncio.run(main.publish_event_endpoint({"claim_id": "c1"}, authorization=""))
    assert exc.value.status_code == 401


def test_publish_event_invalid_token(monkeypatch):
    monkeypatch.setattr(main, "get_user_from_token", lambda _token: None)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(main.publish_event_endpoint({"claim_id": "c1"}, authorization="Bearer bad"))
    assert exc.value.status_code == 401


def test_publish_event_publish_failure(monkeypatch):
    monkeypatch.setattr(main, "get_user_from_token", lambda _token: types.SimpleNamespace(id="u1"))
    monkeypatch.setattr(main, "publish_to_stream", lambda _stream, _payload: False)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(main.publish_event_endpoint({"claim_id": "c1"}, authorization="Bearer ok"))
    assert exc.value.status_code == 500


def test_publish_event_success(monkeypatch):
    monkeypatch.setattr(main, "get_user_from_token", lambda _token: types.SimpleNamespace(id="u1"))
    monkeypatch.setattr(main, "publish_to_stream", lambda _stream, _payload: True)
    res = asyncio.run(main.publish_event_endpoint({"claim_id": "c1"}, authorization="Bearer ok"))
    assert res["status"] == "success"


def test_resume_workflow_missing_fields(monkeypatch):
    monkeypatch.setattr(main, "get_user_from_token", lambda _token: types.SimpleNamespace(id="u1"))
    with pytest.raises(HTTPException) as exc:
        asyncio.run(main.resume_workflow_endpoint({"claim_id": "c1"}, authorization="Bearer ok"))
    assert exc.value.status_code == 400


def test_resume_workflow_success(monkeypatch):
    monkeypatch.setattr(main, "get_user_from_token", lambda _token: types.SimpleNamespace(id="u1"))
    monkeypatch.setattr(main, "publish_to_stream", lambda _stream, _payload: True)
    res = asyncio.run(
        main.resume_workflow_endpoint(
            {"claim_id": "c1", "source_task": "damage_detection"},
            authorization="Bearer ok",
        )
    )
    assert res["status"] == "success"


def test_resolve_liability_invalid_action(monkeypatch):
    monkeypatch.setattr(main, "get_user_from_token", lambda _token: types.SimpleNamespace(id="u1"))
    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            main.resolve_liability_endpoint({"claim_id": "c1", "action": "bad"}, authorization="Bearer ok")
        )
    assert exc.value.status_code == 400


def test_resolve_liability_accept(monkeypatch):
    fake_client = FakeSupabaseClient()
    adapter_holder = {}

    def _get_client():
        return fake_client

    class _Adapter(FakeAdapter):
        def __init__(self, client):
            super().__init__(client)
            adapter_holder["instance"] = self

    monkeypatch.setattr(main, "get_user_from_token", lambda _token: types.SimpleNamespace(id="u1"))
    monkeypatch.setattr("infrastructure.supabase.supabase_client.get_service_client", _get_client)
    monkeypatch.setattr("infrastructure.adapters.combined_adapter.CombinedSupabaseAdapter", _Adapter)
    monkeypatch.setattr("domain.tools.update_claim_status_tool.send_status_update_email", lambda *args, **kwargs: None)
    monkeypatch.setattr("domain.tools.update_claim_status_tool._save_claimant_notification_to_db", lambda *args, **kwargs: None)
    monkeypatch.setattr("domain.tools.update_claim_status_tool._emit_claimant_socket_event", lambda *args, **kwargs: None)

    res = asyncio.run(
        main.resolve_liability_endpoint({"claim_id": "c1", "action": "accept"}, authorization="Bearer ok")
    )

    assert res["status"] == "success"
    assert ("update", "liability_results", {"admin_action": "accepted"}) in fake_client.operations
    assert adapter_holder["instance"].calls[0][1] == "rejected"


def test_resolve_liability_override(monkeypatch):
    fake_client = FakeSupabaseClient()

    monkeypatch.setattr(main, "get_user_from_token", lambda _token: types.SimpleNamespace(id="u1"))
    monkeypatch.setattr("infrastructure.supabase.supabase_client.get_service_client", lambda: fake_client)
    monkeypatch.setattr("infrastructure.adapters.combined_adapter.CombinedSupabaseAdapter", FakeAdapter)
    publish_calls = []
    monkeypatch.setattr(main, "publish_to_stream", lambda _stream, payload: publish_calls.append(payload) or True)

    res = asyncio.run(
        main.resolve_liability_endpoint({"claim_id": "c1", "action": "override"}, authorization="Bearer ok")
    )

    assert res["status"] == "success"
    assert ("update", "liability_results", {"admin_action": "overridden"}) in fake_client.operations
    assert publish_calls


def test_resolve_rag_invalid_action(monkeypatch):
    monkeypatch.setattr(main, "get_user_from_token", lambda _token: types.SimpleNamespace(id="u1"))
    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            main.resolve_rag_endpoint({"claim_id": "c1", "action": "bad"}, authorization="Bearer ok")
        )
    assert exc.value.status_code == 400


def test_resolve_rag_payment_approved(monkeypatch):
    fake_client = FakeSupabaseClient()
    adapter_holder = {}

    class _Adapter(FakeAdapter):
        def __init__(self, client):
            super().__init__(client)
            adapter_holder["instance"] = self

    monkeypatch.setattr(main, "get_user_from_token", lambda _token: types.SimpleNamespace(id="u1"))
    monkeypatch.setattr("infrastructure.supabase.supabase_client.get_service_client", lambda: fake_client)
    monkeypatch.setattr("infrastructure.adapters.combined_adapter.CombinedSupabaseAdapter", _Adapter)
    monkeypatch.setattr("domain.tools.update_claim_status_tool.send_status_update_email", lambda *args, **kwargs: None)
    monkeypatch.setattr("domain.tools.update_claim_status_tool._save_claimant_notification_to_db", lambda *args, **kwargs: None)
    monkeypatch.setattr("domain.tools.update_claim_status_tool._emit_claimant_socket_event", lambda *args, **kwargs: None)

    res = asyncio.run(
        main.resolve_rag_endpoint(
            {"claim_id": "c1", "action": "payment_approved"}, authorization="Bearer ok"
        )
    )

    assert res["status"] == "success"
    assert ("update", "rag_results", {"admin_action": "payment_approved"}) in fake_client.operations
    assert adapter_holder["instance"].calls[0][1] == "approved"


def test_resolve_rag_rejected_with_reason(monkeypatch):
    fake_client = FakeSupabaseClient()
    adapter_holder = {}

    class _Adapter(FakeAdapter):
        def __init__(self, client):
            super().__init__(client)
            adapter_holder["instance"] = self

    monkeypatch.setattr(main, "get_user_from_token", lambda _token: types.SimpleNamespace(id="u1"))
    monkeypatch.setattr("infrastructure.supabase.supabase_client.get_service_client", lambda: fake_client)
    monkeypatch.setattr("infrastructure.adapters.combined_adapter.CombinedSupabaseAdapter", _Adapter)
    monkeypatch.setattr("domain.tools.update_claim_status_tool.send_status_update_email", lambda *args, **kwargs: None)
    monkeypatch.setattr("domain.tools.update_claim_status_tool._save_claimant_notification_to_db", lambda *args, **kwargs: None)
    monkeypatch.setattr("domain.tools.update_claim_status_tool._emit_claimant_socket_event", lambda *args, **kwargs: None)

    res = asyncio.run(
        main.resolve_rag_endpoint(
            {"claim_id": "c1", "action": "rejected", "rejection_reason": "No coverage"},
            authorization="Bearer ok",
        )
    )

    assert res["status"] == "success"
    assert adapter_holder["instance"].calls[0][1] == "rejected"


def test_upload_policy_missing_text(monkeypatch):
    monkeypatch.setattr(main, "get_user_from_token", lambda _token: types.SimpleNamespace(id="u1"))
    with pytest.raises(HTTPException) as exc:
        asyncio.run(main.upload_policy_endpoint({}, authorization="Bearer ok"))
    assert exc.value.status_code == 400


def test_upload_policy_no_policy(monkeypatch):
    StubIngestionService.change_result = "no_policy"
    StubIngestionService.new_called = False

    monkeypatch.setattr(main, "get_user_from_token", lambda _token: types.SimpleNamespace(id="u1"))
    monkeypatch.setattr("application.services.ingestion.IngestionService", StubIngestionService)
    monkeypatch.setattr("infrastructure.adapters.redis_document_store.RedisDocumentStore", StubRedisDocumentStore)
    monkeypatch.setattr("infrastructure.adapters.chroma_store.ChromaVectorStore", StubVectorStore)
    monkeypatch.setattr("infrastructure.redis.redis_client.get_redis_client", lambda: object())

    res = asyncio.run(main.upload_policy_endpoint({"policy_text": "policy"}, authorization="Bearer ok"))
    assert res["status"] == "success"
    assert StubIngestionService.new_called is True


def test_upload_policy_changed(monkeypatch):
    StubIngestionService.change_result = "changed"
    StubIngestionService.update_called = False

    monkeypatch.setattr(main, "get_user_from_token", lambda _token: types.SimpleNamespace(id="u1"))
    monkeypatch.setattr("application.services.ingestion.IngestionService", StubIngestionService)
    monkeypatch.setattr("infrastructure.adapters.redis_document_store.RedisDocumentStore", StubRedisDocumentStore)
    monkeypatch.setattr("infrastructure.adapters.chroma_store.ChromaVectorStore", StubVectorStore)
    monkeypatch.setattr("infrastructure.redis.redis_client.get_redis_client", lambda: object())

    res = asyncio.run(main.upload_policy_endpoint({"policy_text": "policy"}, authorization="Bearer ok"))
    assert res["status"] == "success"
    assert StubIngestionService.update_called is True


def test_upload_policy_unchanged(monkeypatch):
    StubIngestionService.change_result = "unchanged"

    monkeypatch.setattr(main, "get_user_from_token", lambda _token: types.SimpleNamespace(id="u1"))
    monkeypatch.setattr("application.services.ingestion.IngestionService", StubIngestionService)
    monkeypatch.setattr("infrastructure.adapters.redis_document_store.RedisDocumentStore", StubRedisDocumentStore)
    monkeypatch.setattr("infrastructure.adapters.chroma_store.ChromaVectorStore", StubVectorStore)
    monkeypatch.setattr("infrastructure.redis.redis_client.get_redis_client", lambda: object())

    res = asyncio.run(main.upload_policy_endpoint({"policy_text": "policy"}, authorization="Bearer ok"))
    assert res["message"] == "Policy has not changed."


def test_policy_status_no_redis(monkeypatch):
    monkeypatch.setattr("infrastructure.redis.redis_client.get_redis_client", lambda: None)
    res = asyncio.run(main.policy_status_endpoint(authorization="Bearer ok"))
    assert res["status"] == "error"
    assert res["version"] is None


def test_policy_status_returns_version(monkeypatch):
    monkeypatch.setattr("infrastructure.redis.redis_client.get_redis_client", lambda: object())
    monkeypatch.setattr("infrastructure.adapters.redis_document_store.RedisDocumentStore", lambda _client: StubRedisStore(_client, version="document_v2"))
    res = asyncio.run(main.policy_status_endpoint(authorization="Bearer ok"))
    assert res["status"] == "success"
    assert res["version"] == "document_v2"


def test_emit_progress_requires_fields():
    with pytest.raises(HTTPException) as exc:
        asyncio.run(main.emit_progress_endpoint({}))
    assert exc.value.status_code == 400


def test_emit_progress_success(monkeypatch):
    fake_sio = FakeSio()
    monkeypatch.setattr("infrastructure.socket.socket_server.sio", fake_sio)
    res = asyncio.run(main.emit_progress_endpoint({"claim_id": "c1", "message": "ok"}))
    assert res["status"] == "success"
    assert fake_sio.calls[0][0] == "claim_progress"


def test_emit_agent_failure_success(monkeypatch):
    fake_sio = FakeSio()
    monkeypatch.setattr("infrastructure.socket.socket_server.sio", fake_sio)
    res = asyncio.run(
        main.emit_agent_failure_endpoint({"claim_id": "c1", "failed_task": "classification", "message": "err"})
    )
    assert res["status"] == "success"
    assert fake_sio.calls[0][0] == "agent_failure"


def test_emit_claim_status_success(monkeypatch):
    fake_sio = FakeSio()
    monkeypatch.setattr("infrastructure.socket.socket_server.sio", fake_sio)
    res = asyncio.run(
        main.emit_claim_status_endpoint({"claim_id": "c1", "type": "approved", "message": "ok"})
    )
    assert res["status"] == "success"
    assert fake_sio.calls[0][0] == "claim_approved"


def test_get_policy_coverages_parses_sections(monkeypatch):
    fake_doc = FakeDocx([
        "4.1 Collision Damage",
        "5.2 Zero Depreciation Cover",
        "Not a coverage",
    ])
    class FakeDocxModule:
        def __init__(self, doc):
            self.Document = lambda _path: doc

    monkeypatch.setitem(sys.modules, "docx", FakeDocxModule(fake_doc))
    res = asyncio.run(main.get_policy_coverages(authorization="Bearer ok"))
    assert res["status"] == "success"
    assert "Collision Damage" in res["coverages"]
    assert "Zero Depreciation Cover" in res["coverages"]
