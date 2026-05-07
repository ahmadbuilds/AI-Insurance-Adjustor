from application.agents.image_pipeline_summary_agent import ImagePipelineSummaryAgent
from application.states import ImagePipelineSummaryAgentState
from tests.utils import FakeTool


def test_pipeline_summary_aggregates_results():
    fetch_tool = FakeTool(
        return_value={
            "classification": {
                "images_processed": 3,
                "vehicles_detected": 2,
                "claim_rejected": False,
            },
            "same_vehicle": {
                "is_same_vehicle": True,
                "claim_rejected": False,
            },
            "vehicle_type": {
                "identified_type": "PC",
                "claim_rejected": False,
            },
            "damage_detection": {
                "images_with_damage": 1,
                "damage_details": [
                    {
                        "image_id": "img1",
                        "damages": [{"part": "bumper", "damage_type": "dent", "severity": "minor"}],
                    }
                ],
                "damage_summary": "Bumper dent",
                "claim_rejected": False,
            },
        }
    )
    update_claim = FakeTool()
    log_failure = FakeTool()

    agent = ImagePipelineSummaryAgent(fetch_tool, update_claim, log_failure)
    result = agent.invoke(claim_id="c1", user_id="u1")

    summary = result.pipeline_summary
    assert summary.total_images == 3
    assert summary.vehicle_images_count == 2
    assert summary.non_vehicle_images_count == 1
    assert summary.all_checks_passed is True
    assert "Pipeline Status" in summary.pipeline_summary


def test_pipeline_summary_finalize_failure_logs_admin():
    fetch_tool = FakeTool(return_value={})
    update_claim = FakeTool()
    log_failure = FakeTool()

    agent = ImagePipelineSummaryAgent(fetch_tool, update_claim, log_failure)
    state = ImagePipelineSummaryAgentState(
        claim_id="c1",
        user_id="u1",
        status="failed",
        error="Missing results",
    )

    agent._finalize_node(state)

    assert update_claim.calls
    assert log_failure.calls
