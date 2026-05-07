import pytest

from application import workflow


class FakeRedis:
    def __init__(self, responses):
        self.responses = list(responses)
        self.acks = []
        self.groups = []

    def xgroup_create(self, stream, group, id="0", mkstream=True):
        self.groups.append((stream, group, id, mkstream))

    def xreadgroup(self, _group, _consumer, streams, count=1, block=5000):
        if not self.responses:
            raise KeyboardInterrupt()
        return self.responses.pop(0)

    def xack(self, stream, group, message_id):
        self.acks.append((stream, group, message_id))


def _run_workflow_once(monkeypatch, response):
    fake_redis = FakeRedis([response])
    publish_calls = []
    progress_calls = []

    monkeypatch.setattr(workflow, "get_redis_client", lambda: fake_redis)
    monkeypatch.setattr(workflow, "publish_to_stream", lambda stream, payload: publish_calls.append((stream, payload)) or True)
    monkeypatch.setattr(workflow, "emit_progress", lambda claim_id, message: progress_calls.append((claim_id, message)))

    with pytest.raises(KeyboardInterrupt):
        workflow.run_workflow()

    return fake_redis, publish_calls, progress_calls


def test_run_workflow_routes_new_claim_to_classification(monkeypatch):
    response = [
        (
            workflow.NEW_CLAIM_STREAM,
            [("m1", {"claim_id": "c1", "User_id": "u1"})],
        )
    ]

    fake_redis, publish_calls, progress_calls = _run_workflow_once(monkeypatch, response)

    assert publish_calls
    assert publish_calls[0][0] == workflow.CLASSIFICATION_STREAM
    assert progress_calls
    assert progress_calls[0][0] == "c1"
    assert (workflow.NEW_CLAIM_STREAM, workflow.GROUP_NAME, "m1") in fake_redis.acks


@pytest.mark.parametrize(
    "source_task,claim_rejected,needs_admin_review,expected_stream",
    [
        ("classification", "False", None, workflow.SAME_VEHICLE_STREAM),
        ("classification", "True", None, None),
        ("same_vehicle_detection", "False", None, workflow.VEHICLE_TYPE_STREAM),
        ("vehicle_type_classification", "False", None, workflow.DAMAGE_DETECTION_STREAM),
        ("damage_detection", "False", None, workflow.PIPELINE_SUMMARY_STREAM),
        ("image_pipeline_summary", "False", None, workflow.LIABILITY_STREAM),
        ("liability_assessment", "False", "False", "stream:task:rag"),
        ("liability_assessment", "False", "True", None),
    ],
)
def test_run_workflow_routes_result_stream(monkeypatch, source_task, claim_rejected, needs_admin_review, expected_stream):
    payload = {
        "claim_id": "c1",
        "User_id": "u1",
        "source_task": source_task,
        "claim_rejected": claim_rejected,
    }
    if needs_admin_review is not None:
        payload["needs_admin_review"] = needs_admin_review

    response = [
        (
            workflow.RESULT_STREAM,
            [("m1", payload)],
        )
    ]

    fake_redis, publish_calls, _progress_calls = _run_workflow_once(monkeypatch, response)

    if expected_stream is None:
        assert not publish_calls
    else:
        assert publish_calls
        assert publish_calls[0][0] == expected_stream
        assert publish_calls[0][1]["claim_id"] == "c1"
        assert publish_calls[0][1]["User_id"] == "u1"

    assert (workflow.RESULT_STREAM, workflow.GROUP_NAME, "m1") in fake_redis.acks
