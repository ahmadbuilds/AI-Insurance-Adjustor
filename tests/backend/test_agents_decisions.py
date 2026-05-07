from types import SimpleNamespace

from application.agents.classification_agent import ClassificationAgent
from application.agents.same_vehicle_agent import SameVehicleAgent
from application.agents.vehicle_type_agent import VehicleTypeAgent
from application.agents.damage_detection_agent import DamageDetectionAgent
from application.agents.liability_agent import LiabilityAgent
from application.states import LiabilityAgentState
from domain.entities import LiabilityAssessment
from tests.utils import FakeLLM, FakeTool


def _make_image(image_id, claim_id="c1"):
    return {
        "id": image_id,
        "claim_id": claim_id,
        "storage_path": "path",
        "file_name": f"{image_id}.jpg",
        "mime_type": "image/jpeg",
        "public_url": "https://example.com/img.jpg",
    }


def test_classification_rejects_when_all_false(monkeypatch):
    monkeypatch.setattr("application.agents.classification_agent.create_model_instance", lambda *args, **kwargs: FakeLLM(["false", "false"]))

    fetch_tool = FakeTool(return_value=[_make_image("img1"), _make_image("img2")])
    update_vehicle = FakeTool()
    update_claim = FakeTool()
    log_failure = FakeTool()

    agent = ClassificationAgent(fetch_tool, update_vehicle, update_claim, log_failure)
    result = agent.invoke(claim_id="c1", user_id="u1")

    assert result.claim_rejected is True
    assert update_vehicle.calls
    assert any(call.get("status") == "rejected" for call in update_claim.calls)


def test_same_vehicle_rejects_when_mismatch(monkeypatch):
    monkeypatch.setattr("application.agents.same_vehicle_agent.create_model_instance", lambda *args, **kwargs: FakeLLM(["false"]))

    fetch_tool = FakeTool(return_value=[_make_image("img1"), _make_image("img2")])
    update_claim = FakeTool()
    log_failure = FakeTool()

    agent = SameVehicleAgent(fetch_tool, update_claim, log_failure)
    result = agent.invoke(claim_id="c1", user_id="u1")

    assert result.claim_rejected is True
    assert any(call.get("status") == "rejected" for call in update_claim.calls)


def test_vehicle_type_rejects_inconsistent_types(monkeypatch):
    monkeypatch.setattr(
        "application.agents.vehicle_type_agent.create_model_instance",
        lambda *args, **kwargs: FakeLLM(["PC", "MC"]),
    )

    fetch_tool = FakeTool(return_value=[_make_image("img1"), _make_image("img2")])
    update_claim = FakeTool()
    log_failure = FakeTool()

    agent = VehicleTypeAgent(fetch_tool, update_claim, log_failure)
    result = agent.invoke(claim_id="c1", user_id="u1")

    assert result.claim_rejected is True
    assert any(call.get("status") == "rejected" for call in update_claim.calls)


def test_damage_detection_rejects_no_damage(monkeypatch):
    response = "{\"has_damage\": false, \"damage_summary\": \"\", \"damages\": []}"
    monkeypatch.setattr("application.agents.damage_detection_agent.create_model_instance", lambda *args, **kwargs: FakeLLM([response, response]))

    fetch_tool = FakeTool(return_value=[_make_image("img1"), _make_image("img2")])
    update_claim = FakeTool()
    log_failure = FakeTool()

    agent = DamageDetectionAgent(fetch_tool, update_claim, log_failure)
    result = agent.invoke(claim_id="c1", user_id="u1")

    assert result.claim_rejected is True
    assert any(call.get("status") == "rejected" for call in update_claim.calls)


def test_liability_flags_low_confidence(monkeypatch):
    monkeypatch.setattr("application.agents.liability_agent.create_model_instance", lambda *args, **kwargs: FakeLLM(["{}"]))

    update_claim = FakeTool()
    log_failure = FakeTool()

    agent = LiabilityAgent(FakeTool(), update_claim, log_failure)

    assessment = LiabilityAssessment(
        claim_id="c1",
        user_id="u1",
        overall_confidence=0.4,
        confidence_percentage=40,
        scenario_plausibility="questionable",
        scenario_reasoning="Reason",
        damage_alignments=[],
        consistent_damages=1,
        inconsistent_damages=2,
        overall_reasoning="Overall",
        recommendation="needs_human_review",
        flags=["low_confidence"],
    )

    state = LiabilityAgentState(
        claim_id="c1",
        user_id="u1",
        assessment=assessment,
        needs_admin_review=True,
        status="completed",
    )

    res = agent._decide_node(state)

    assert res["status"] == "completed"
    assert update_claim.calls


def test_liability_passes_high_confidence(monkeypatch):
    monkeypatch.setattr("application.agents.liability_agent.create_model_instance", lambda *args, **kwargs: FakeLLM(["{}"]))

    update_claim = FakeTool()
    log_failure = FakeTool()

    agent = LiabilityAgent(FakeTool(), update_claim, log_failure)

    assessment = LiabilityAssessment(
        claim_id="c1",
        user_id="u1",
        overall_confidence=0.9,
        confidence_percentage=90,
        scenario_plausibility="plausible",
        scenario_reasoning="Reason",
        damage_alignments=[],
        consistent_damages=3,
        inconsistent_damages=0,
        overall_reasoning="Overall",
        recommendation="approve",
        flags=[],
    )

    state = LiabilityAgentState(
        claim_id="c1",
        user_id="u1",
        assessment=assessment,
        needs_admin_review=False,
        status="completed",
    )

    res = agent._decide_node(state)

    assert res["status"] == "completed"
    assert update_claim.calls
