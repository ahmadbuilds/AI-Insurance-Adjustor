import json
from langgraph.graph import StateGraph, END
from application.states import RAGAgentState
from domain.ports import ClaimRepositoryPort, PolicyRetrievalPort
from domain.tools.fetch_rag_data_tool import create_fetch_rag_data_tool
from domain.tools.query_policy_tool import create_query_policy_tool
from domain.prompts.rag_assessment_prompt import get_rag_assessment_prompt
from domain.entities import RAGAssessment
from infrastructure.llm_providers.groq_provider import create_model_instance
from IPython.display import Image, display

class RAGAgent:
    def __init__(self, claim_repo: ClaimRepositoryPort, policy_repo: PolicyRetrievalPort, max_retries: int = 3):
        self.claim_repo = claim_repo
        self.policy_repo = policy_repo
        self.max_retries = max_retries
        
        # Tools
        self.fetch_data_tool = create_fetch_rag_data_tool(claim_repo)
        self.query_tool = create_query_policy_tool(policy_repo)
        
        self.llm = create_model_instance()
        self.structured_llm = self.llm.with_structured_output(RAGAssessment, method="json_mode")

        self.prompt = get_rag_assessment_prompt()
        self.chain = self.prompt | self.structured_llm
        self.graph = self._build_graph()

    def _build_graph(self):
        workflow = StateGraph(RAGAgentState)

        workflow.add_node("fetch_data", self.fetch_data)
        workflow.add_node("query_policy", self.query_policy)
        workflow.add_node("analyze_coverage", self.analyze_coverage)
        workflow.add_node("decide_and_save", self.decide_and_save)
        
        workflow.set_entry_point("fetch_data")
        
        workflow.add_conditional_edges("fetch_data", self.route_fetch, {"query_policy": "query_policy", "fetch_data": "fetch_data", "decide_and_save": "decide_and_save"})
        workflow.add_conditional_edges("query_policy", self.route_query, {"analyze_coverage": "analyze_coverage", "query_policy": "query_policy", "decide_and_save": "decide_and_save"})
        workflow.add_conditional_edges("analyze_coverage", self.route_analyze, {"decide_and_save": "decide_and_save", "analyze_coverage": "analyze_coverage"})
        
        workflow.add_edge("decide_and_save", END)

        return workflow.compile()

    def fetch_data(self, state: RAGAgentState) -> dict:
        try:
            res_str = self.fetch_data_tool.invoke({"claim_id": state.claim_id})
            if res_str.startswith("Error"):
                return {"status": "failed", "error": res_str, "retry_count": state.retry_count + 1}
            data = json.loads(res_str)
            return {
                "claim_details": data.get("claim_details", {}),
                "pipeline_result": data.get("pipeline_result", {}),
                "liability_result": data.get("liability_result", {}),
                "status": "querying_policy",
                "error": None,
                "retry_count": 0
            }
        except Exception as e:
            return {"status": "failed", "error": f"Data fetch error: {str(e)}", "retry_count": state.retry_count + 1}

    def route_fetch(self, state: RAGAgentState) -> str:
        if state.status == "querying_policy":
            return "query_policy"
        if state.retry_count < self.max_retries:
            return "fetch_data"
        return "decide_and_save"

    def query_policy(self, state: RAGAgentState) -> dict:
        try:
            claim_desc = state.claim_details.get("description", "")
            search_query = f"{claim_desc[:200]}" 
            
            res_str = self.query_tool.invoke({"query": search_query, "k": 5})
            if res_str.startswith("Error"):
                return {"status": "failed", "error": res_str, "retry_count": state.retry_count + 1}
            
            return {
                "policy_sections": [{"content": res_str}],
                "status": "analyzing_coverage",
                "error": None,
                "retry_count": 0
            }
        except Exception as e:
            return {"status": "failed", "error": f"Policy query error: {str(e)}", "retry_count": state.retry_count + 1}

    def route_query(self, state: RAGAgentState) -> str:
        if state.status == "analyzing_coverage":
            return "analyze_coverage"
        if state.retry_count < self.max_retries:
            return "query_policy"
        return "decide_and_save"

    def analyze_coverage(self, state: RAGAgentState) -> dict:
        try:
            claim_details_str = json.dumps(state.claim_details, indent=2) if state.claim_details else ""
            pipeline_str = json.dumps(state.pipeline_result, indent=2) if state.pipeline_result else ""
            liability_str = json.dumps(state.liability_result, indent=2) if state.liability_result else ""
            policy_str = state.policy_sections[0]["content"] if state.policy_sections else ""

            assessment: RAGAssessment = self.chain.invoke({
                "claim_details": claim_details_str,
                "pipeline_summary": pipeline_str,
                "liability_result": liability_str,
                "policy_sections": policy_str
            })

            return {"assessment": assessment, "status": "completed", "error": None, "retry_count": 0}
        except Exception as e:
            return {"status": "failed", "error": f"Analysis error: {str(e)}", "retry_count": state.retry_count + 1}

    def route_analyze(self, state: RAGAgentState) -> str:
        if state.status == "completed":
            return "decide_and_save"
        if state.retry_count < self.max_retries:
            return "analyze_coverage"
        return "decide_and_save"

    def decide_and_save(self, state: RAGAgentState) -> dict:
        try:
            if state.retry_count >= self.max_retries:
                state.status = "failed"
                if not state.error:
                    state.error = "Max retries exceeded during RAG assessment."
            
            # Save or alert
            if state.status == "failed":
                self.claim_repo.save_admin_notification(
                    state.claim_id,
                    f"RAG Agent failed: {state.error}",
                    "rag_assessment"
                )
                self.claim_repo.save_rag_result(
                    claim_id=state.claim_id,
                    user_id=state.user_id,
                    policy_covered=False,
                    coverage_type=None,
                    applicable_sections=[],
                    exclusions=[],
                    compensation_amount=0.0,
                    compensation_breakdown=[],
                    coverage_reasoning="",
                    recommendation="needs_human_review",
                    flags=[],
                    needs_admin_review=True,
                    admin_action="pending",
                    status="failed",
                    error=state.error
                )
                return {"status": "failed"}

            assessment = state.assessment
            needs_admin_review = assessment.policy_covered
            admin_action = "pending" if needs_admin_review else None

            self.claim_repo.save_rag_result(
                claim_id=state.claim_id,
                user_id=state.user_id,
                policy_covered=assessment.policy_covered,
                coverage_type=assessment.coverage_type,
                applicable_sections=assessment.applicable_sections,
                exclusions=assessment.exclusions,
                compensation_amount=assessment.compensation_amount,
                compensation_breakdown=assessment.compensation_breakdown,
                coverage_reasoning=assessment.coverage_reasoning,
                recommendation=assessment.recommendation,
                flags=assessment.flags,
                needs_admin_review=needs_admin_review,
                admin_action=admin_action,
                status="completed",
                error=None
            )
            return {"status": "completed"}
        except Exception as e:
            return {"status": "failed", "error": f"Save error: {str(e)}"}

    def run(self, claim_id: str, user_id: str) -> dict:
        initial_state = RAGAgentState(
            claim_id=claim_id,
            user_id=user_id,
            status="pending"
        )
        final_state = self.graph.invoke(initial_state)
        return final_state


    #function to draw the graph for visualization and debugging purposes
    def build_graph_image(self):
        png_bytes=self._graph.get_graph(xray=True).draw_mermaid_png()
        with open("rag_agent_graph.png", "wb") as f:
            f.write(png_bytes)
        display(Image(png_bytes))