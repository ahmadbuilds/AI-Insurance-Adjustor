import pytest

from application.services import (
    classification_service,
    same_vehicle_service,
    vehicle_type_service,
    damage_detection_service,
    image_pipeline_summary_service,
    liability_service,
)


class FakeRedis:
    def __init__(self, responses):
        self.responses = list(responses)
        self.groups = []
        self.acks = []

    def xgroup_create(self, stream, group, id="0", mkstream=True):
        self.groups.append((stream, group, id, mkstream))

    def xreadgroup(self, _group, _consumer, streams, count=1, block=5000):
        if not self.responses:
            raise KeyboardInterrupt()
        return self.responses.pop(0)

    def xack(self, stream, group, message_id):
        self.acks.append((stream, group, message_id))


class FakeAgent:
    def __init__(self, result):
        self.result = result
        self.calls = []

    def invoke(self, claim_id, user_id):
        self.calls.append((claim_id, user_id))
        return self.result


class FakeAdapter:
    def __init__(self, client=None, holder=None):
        self.client = client
        self.calls = []
        if holder is not None:
            holder["instance"] = self

    def save_classification_result(self, **kwargs):
        self.calls.append(("save_classification_result", kwargs))
        return True

    def save_same_vehicle_result(self, **kwargs):
        self.calls.append(("save_same_vehicle_result", kwargs))
        return True

    def save_vehicle_type_result(self, **kwargs):
        self.calls.append(("save_vehicle_type_result", kwargs))
        return True

    def save_damage_detection_result(self, **kwargs):
        self.calls.append(("save_damage_detection_result", kwargs))
        return True

    def save_image_pipeline_result(self, **kwargs):
        self.calls.append(("save_image_pipeline_result", kwargs))
        return True

    def save_liability_result(self, **kwargs):
        self.calls.append(("save_liability_result", kwargs))
        return True

    def save_admin_notification(self, **kwargs):
        self.calls.append(("save_admin_notification", kwargs))
        return True


def _run_service_once(monkeypatch, module, stream_name, message_data):
    fake_redis = FakeRedis([[(stream_name, [("m1", message_data)])]])
    publish_calls = []

    monkeypatch.setattr(module, "get_redis_client", lambda: fake_redis)
    monkeypatch.setattr(module, "publish_to_stream", lambda stream, payload: publish_calls.append((stream, payload)) or True)
    monkeypatch.setattr(module, "get_service_client", lambda: object())

    return fake_redis, publish_calls


def test_classification_service_processes_message(monkeypatch):
    result = {
        "classification_results": [
            {"image_id": "i1", "is_vehical": True},
            {"image_id": "i2", "is_vehical": False},
        ],
        "claim_rejected": False,
        "status": "completed",
        "error": None,
    }

    adapter_holder = {}
    fake_agent = FakeAgent(result)

    monkeypatch.setattr(classification_service, "create_classification_agent", lambda _claim_id, _adapter: fake_agent)
    monkeypatch.setattr(
        classification_service,
        "CombinedSupabaseAdapter",
        lambda client: FakeAdapter(client=client, holder=adapter_holder),
    )

    fake_redis, publish_calls = _run_service_once(
        monkeypatch,
        classification_service,
        classification_service.CLASSIFICATION_STREAM,
        {"claim_id": "c1", "User_id": "u1"},
    )

    with pytest.raises(KeyboardInterrupt):
        classification_service.run_classification_service()

    adapter = adapter_holder["instance"]
    save_calls = [c for c in adapter.calls if c[0] == "save_classification_result"]
    assert save_calls
    assert save_calls[0][1]["images_processed"] == 2
    assert save_calls[0][1]["vehicles_detected"] == 1

    assert publish_calls
    stream, payload = publish_calls[0]
    assert stream == classification_service.RESULT_STREAM
    assert payload["source_task"] == "classification"
    assert payload["claim_rejected"] == "False"

    assert (classification_service.CLASSIFICATION_STREAM, classification_service.GROUP_NAME, "m1") in fake_redis.acks


def test_same_vehicle_service_processes_message(monkeypatch):
    result = {
        "vehicle_images": [{"id": "i1"}, {"id": "i2"}],
        "is_same_vehicle": True,
        "claim_rejected": False,
        "status": "completed",
        "error": None,
    }

    adapter_holder = {}
    fake_agent = FakeAgent(result)

    monkeypatch.setattr(same_vehicle_service, "create_same_vehicle_agent", lambda _claim_id, _adapter: fake_agent)
    monkeypatch.setattr(
        same_vehicle_service,
        "CombinedSupabaseAdapter",
        lambda client: FakeAdapter(client=client, holder=adapter_holder),
    )

    fake_redis, publish_calls = _run_service_once(
        monkeypatch,
        same_vehicle_service,
        same_vehicle_service.SAME_VEHICLE_STREAM,
        {"claim_id": "c1", "User_id": "u1"},
    )

    with pytest.raises(KeyboardInterrupt):
        same_vehicle_service.run_same_vehicle_service()

    adapter = adapter_holder["instance"]
    save_calls = [c for c in adapter.calls if c[0] == "save_same_vehicle_result"]
    assert save_calls
    assert save_calls[0][1]["vehicle_images_count"] == 2

    assert publish_calls
    stream, payload = publish_calls[0]
    assert stream == same_vehicle_service.RESULT_STREAM
    assert payload["source_task"] == "same_vehicle_detection"

    assert (same_vehicle_service.SAME_VEHICLE_STREAM, same_vehicle_service.GROUP_NAME, "m1") in fake_redis.acks


def test_vehicle_type_service_processes_message(monkeypatch):
    result = {
        "vehicle_images": [{"id": "i1"}],
        "identified_type": "PC",
        "claim_rejected": False,
        "status": "completed",
        "error": None,
    }

    adapter_holder = {}
    fake_agent = FakeAgent(result)

    monkeypatch.setattr(vehicle_type_service, "create_vehicle_type_agent", lambda _claim_id, _adapter: fake_agent)
    monkeypatch.setattr(
        vehicle_type_service,
        "CombinedSupabaseAdapter",
        lambda client: FakeAdapter(client=client, holder=adapter_holder),
    )

    fake_redis, publish_calls = _run_service_once(
        monkeypatch,
        vehicle_type_service,
        vehicle_type_service.VEHICLE_TYPE_STREAM,
        {"claim_id": "c1", "User_id": "u1"},
    )

    with pytest.raises(KeyboardInterrupt):
        vehicle_type_service.run_vehicle_type_service()

    adapter = adapter_holder["instance"]
    save_calls = [c for c in adapter.calls if c[0] == "save_vehicle_type_result"]
    assert save_calls
    assert save_calls[0][1]["identified_type"] == "PC"

    assert publish_calls
    stream, payload = publish_calls[0]
    assert stream == vehicle_type_service.RESULT_STREAM
    assert payload["source_task"] == "vehicle_type_classification"

    assert (vehicle_type_service.VEHICLE_TYPE_STREAM, vehicle_type_service.GROUP_NAME, "m1") in fake_redis.acks


def test_damage_detection_service_processes_message(monkeypatch):
    result = {
        "vehicle_images": [{"id": "i1"}, {"id": "i2"}],
        "damage_results": [
            {"image_id": "i1", "has_damage": True, "damages": [{"part": "bumper"}], "damage_summary": "Dent"},
            {"image_id": "i2", "has_damage": False, "damages": [], "damage_summary": ""},
        ],
        "damage_summary": "Dent",
        "claim_rejected": False,
        "status": "completed",
        "error": None,
    }

    adapter_holder = {}
    fake_agent = FakeAgent(result)

    monkeypatch.setattr(damage_detection_service, "create_damage_detection_agent", lambda _claim_id, _adapter: fake_agent)
    monkeypatch.setattr(
        damage_detection_service,
        "CombinedSupabaseAdapter",
        lambda client: FakeAdapter(client=client, holder=adapter_holder),
    )

    fake_redis, publish_calls = _run_service_once(
        monkeypatch,
        damage_detection_service,
        damage_detection_service.DAMAGE_DETECTION_STREAM,
        {"claim_id": "c1", "User_id": "u1"},
    )

    with pytest.raises(KeyboardInterrupt):
        damage_detection_service.run_damage_detection_service()

    adapter = adapter_holder["instance"]
    save_calls = [c for c in adapter.calls if c[0] == "save_damage_detection_result"]
    assert save_calls
    assert save_calls[0][1]["images_analyzed"] == 2
    assert save_calls[0][1]["images_with_damage"] == 1
    assert len(save_calls[0][1]["damage_details"]) == 2

    assert publish_calls
    stream, payload = publish_calls[0]
    assert stream == damage_detection_service.RESULT_STREAM
    assert payload["source_task"] == "damage_detection"

    assert (damage_detection_service.DAMAGE_DETECTION_STREAM, damage_detection_service.GROUP_NAME, "m1") in fake_redis.acks


def test_pipeline_summary_service_processes_message(monkeypatch):
    summary = {
        "total_images": 3,
        "vehicle_images_count": 2,
        "non_vehicle_images_count": 1,
        "is_same_vehicle": True,
        "vehicle_type": "PC",
        "has_damage": True,
        "images_with_damage": 1,
        "damage_details": [{"image_id": "i1", "damages": [{"part": "bumper"}]}],
        "damage_summary": "Bumper dent",
        "all_checks_passed": True,
        "pipeline_summary": "All checks passed",
    }
    result = {
        "pipeline_summary": summary,
        "status": "completed",
        "error": None,
    }

    adapter_holder = {}
    fake_agent = FakeAgent(result)

    monkeypatch.setattr(image_pipeline_summary_service, "create_pipeline_summary_agent", lambda _claim_id, _adapter: fake_agent)
    monkeypatch.setattr(
        image_pipeline_summary_service,
        "CombinedSupabaseAdapter",
        lambda client: FakeAdapter(client=client, holder=adapter_holder),
    )

    fake_redis, publish_calls = _run_service_once(
        monkeypatch,
        image_pipeline_summary_service,
        image_pipeline_summary_service.PIPELINE_SUMMARY_STREAM,
        {"claim_id": "c1", "User_id": "u1"},
    )

    with pytest.raises(KeyboardInterrupt):
        image_pipeline_summary_service.run_image_pipeline_summary_service()

    adapter = adapter_holder["instance"]
    save_calls = [c for c in adapter.calls if c[0] == "save_image_pipeline_result"]
    assert save_calls
    assert save_calls[0][1]["total_images"] == 3
    assert save_calls[0][1]["all_checks_passed"] is True

    assert publish_calls
    stream, payload = publish_calls[0]
    assert stream == image_pipeline_summary_service.RESULT_STREAM
    assert payload["source_task"] == "image_pipeline_summary"
    assert payload["claim_rejected"] == "False"

    assert (image_pipeline_summary_service.PIPELINE_SUMMARY_STREAM, image_pipeline_summary_service.GROUP_NAME, "m1") in fake_redis.acks


def test_liability_service_processes_message_admin_review(monkeypatch):
    assessment = {
        "overall_confidence": 0.5,
        "confidence_percentage": 50,
        "scenario_plausibility": "questionable",
        "scenario_reasoning": "Low confidence",
        "damage_alignments": [
            {
                "part": "bumper",
                "damage_type": "dent",
                "severity": "minor",
                "is_consistent": False,
                "alignment_score": 0.2,
                "reasoning": "Mismatch",
            }
        ],
        "consistent_damages": 0,
        "inconsistent_damages": 1,
        "overall_reasoning": "Needs review",
        "recommendation": "needs_human_review",
        "flags": ["low_confidence"],
    }
    result = {
        "assessment": assessment,
        "needs_admin_review": True,
        "status": "completed",
        "error": None,
    }

    adapter_holder = {}
    fake_agent = FakeAgent(result)

    monkeypatch.setattr(liability_service, "create_liability_agent", lambda _claim_id, _adapter: fake_agent)
    monkeypatch.setattr(
        liability_service,
        "CombinedSupabaseAdapter",
        lambda client: FakeAdapter(client=client, holder=adapter_holder),
    )
    monkeypatch.setattr(liability_service, "_emit_admin_notification", lambda *args, **kwargs: None)

    fake_redis, publish_calls = _run_service_once(
        monkeypatch,
        liability_service,
        liability_service.LIABILITY_STREAM,
        {"claim_id": "c1", "User_id": "u1"},
    )

    with pytest.raises(KeyboardInterrupt):
        liability_service.run_liability_service()

    adapter = adapter_holder["instance"]
    save_calls = [c for c in adapter.calls if c[0] == "save_liability_result"]
    assert save_calls
    assert save_calls[0][1]["needs_admin_review"] is True
    assert save_calls[0][1]["admin_action"] == "pending"

    admin_calls = [c for c in adapter.calls if c[0] == "save_admin_notification"]
    assert admin_calls

    assert publish_calls
    stream, payload = publish_calls[0]
    assert stream == liability_service.RESULT_STREAM
    assert payload["source_task"] == "liability_assessment"
    assert payload["needs_admin_review"] == "True"

    assert (liability_service.LIABILITY_STREAM, liability_service.GROUP_NAME, "m1") in fake_redis.acks
