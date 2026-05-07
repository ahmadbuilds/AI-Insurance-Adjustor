from application.agents.rag_agent import RAGAgent
from application.states import RAGAgentState
from domain.entities import RAGAssessment


class FakeClaimRepo:
    def __init__(self):
        self.admin_notifications = []
        self.rag_results = []

    def save_admin_notification(self, claim_id, message, failed_task):
        self.admin_notifications.append((claim_id, message, failed_task))
        return True

    def save_rag_result(self, **kwargs):
        self.rag_results.append(kwargs)
        return True


def test_rag_decide_and_save_failed_state():
    repo = FakeClaimRepo()
    agent = RAGAgent.__new__(RAGAgent)
    agent.claim_repo = repo
    agent.max_retries = 3

    state = RAGAgentState(
        claim_id="c1",
        user_id="u1",
        status="failed",
        error="LLM error",
        retry_count=3,
    )

    res = RAGAgent.decide_and_save(agent, state)

    assert res["status"] == "failed"
    assert repo.admin_notifications
    assert repo.rag_results


def test_rag_decide_and_save_success_policy_covered():
    repo = FakeClaimRepo()
    agent = RAGAgent.__new__(RAGAgent)
    agent.claim_repo = repo
    agent.max_retries = 3

    assessment = RAGAssessment(
        policy_covered=True,
        coverage_type="comprehensive",
        applicable_sections=["4.1 Collision"],
        exclusions=[],
        compensation_amount=5000.0,
        compensation_breakdown=[{"part": "bumper", "amount": 2000.0}],
        coverage_reasoning="Covered",
        recommendation="approve_payment",
        flags=[],
    )

    state = RAGAgentState(
        claim_id="c1",
        user_id="u1",
        status="completed",
        assessment=assessment,
        retry_count=0,
    )

    res = RAGAgent.decide_and_save(agent, state)

    assert res["status"] == "completed"
    assert repo.rag_results
    saved = repo.rag_results[0]
    assert saved["needs_admin_review"] is True
    assert saved["admin_action"] == "pending"
