import json
from langgraph.graph import StateGraph, START, END
from langchain_core.messages import SystemMessage, HumanMessage
from application.states import LiabilityAgentState
from domain.entities import LiabilityAssessment, DamageAlignmentItem
from domain.prompts.liability_assessment_prompt import LIABILITY_ASSESSMENT_SYSTEM_PROMPT
from infrastructure.llm_providers.groq_provider import create_model_instance
from IPython.display import Image, display
# Text reasoning model 
REASONING_MODEL = "llama-3.3-70b-versatile"

# Confidence threshold below which claims go to admin review
CONFIDENCE_THRESHOLD = 0.70

#Liability Agent class definition
class LiabilityAgent:
    def __init__(
        self,
        fetch_liability_data_tool,
        update_claim_status_tool,
        log_agent_failure_tool,
        model_name: str = REASONING_MODEL,
    ):
        self._fetch_liability_data_tool = fetch_liability_data_tool
        self._update_claim_status_tool = update_claim_status_tool
        self._log_agent_failure_tool = log_agent_failure_tool
        self._llm = create_model_instance(model_name=model_name, temperature=0)
        self._graph = self._build_graph()


    #function to build the LangGraph state graph
    def _build_graph(self):
        graph = StateGraph(LiabilityAgentState)

        graph.add_node("fetch_data", self._fetch_data_node)
        graph.add_node("analyze_liability", self._analyze_liability_node)
        graph.add_node("decide", self._decide_node)

        graph.add_edge(START, "fetch_data")
        graph.add_conditional_edges("fetch_data", self._route_after_fetch)
        graph.add_conditional_edges("analyze_liability", self._route_after_analyze)
        graph.add_edge("decide", END)

        return graph.compile()

    def _route_after_fetch(self, state: LiabilityAgentState) -> str:
        if state.status == "failed" and state.retry_count < 3:
            print(f"  [Liability] Retrying fetch_data (Attempt {state.retry_count}/3)...")
            return "fetch_data"
        return "analyze_liability"

    def _route_after_analyze(self, state: LiabilityAgentState) -> str:
        if state.status == "failed" and state.retry_count < 3:
            print(f"  [Liability] Retrying analyze_liability (Attempt {state.retry_count}/3)...")
            return "analyze_liability"
        return "decide"


    #function to fetch claim details and image pipeline result
    def _fetch_data_node(self, state: LiabilityAgentState) -> dict:
        """
        Fetch the claim details (title, description) and image pipeline result
        using the fetch_liability_data tool.
        args:
            state: LiabilityAgentState - current state containing claim_id
        returns:
            dict - containing claim_details and pipeline_result
        """
        try:
            data = self._fetch_liability_data_tool.invoke({})

            claim_details = data.get("claim_details")
            pipeline_result = data.get("pipeline_result")

            if not claim_details:
                return {
                    "status": "failed",
                    "error": f"No claim details found for claim {state.claim_id}",
                    "retry_count": state.retry_count + 1,
                }

            if not pipeline_result:
                return {
                    "status": "failed",
                    "error": f"No image pipeline result found for claim {state.claim_id}",
                    "retry_count": state.retry_count + 1,
                }

            print(f"  Fetched claim details and pipeline result for claim {state.claim_id}")
            return {
                "claim_details": claim_details,
                "pipeline_result": pipeline_result,
                "status": "fetching_data",
            }

        except Exception as e:
            return {
                "status": "failed",
                "error": f"Failed to fetch liability data: {str(e)}",
                "retry_count": state.retry_count + 1,
            }


    #function to run the LLM liability analysis
    def _analyze_liability_node(self, state: LiabilityAgentState) -> dict:
        """
        Send claim details and damage data to the reasoning LLM for liability assessment.
        Parse the structured JSON response into a LiabilityAssessment.
        args:
            state: LiabilityAgentState - current state with claim_details and pipeline_result
        returns:
            dict - containing the LiabilityAssessment and updated status
        """
        if state.status == "failed":
            return {}

        try:
            claim = state.claim_details
            pipeline = state.pipeline_result

            claim_title = claim.get("title", "No title provided")
            claim_description = claim.get("description", "No description provided")
            vehicle_type = pipeline.get("vehicle_type", "Unknown")
            damage_summary = pipeline.get("damage_summary", "No damage summary available")

            # Parse damage_details
            damage_details_raw = pipeline.get("damage_details")
            if isinstance(damage_details_raw, str):
                try:
                    damage_details = json.loads(damage_details_raw)
                except json.JSONDecodeError:
                    damage_details = []
            elif isinstance(damage_details_raw, list):
                damage_details = damage_details_raw
            else:
                damage_details = []

            # Build a structured damage summary for the LLM
            damage_listing = []
            for img_result in damage_details:
                image_id = img_result.get("image_id", "unknown")
                damages = img_result.get("damages", [])
                for d in damages:
                    damage_listing.append(
                        f"  - Part: {d.get('part', 'unknown')}, "
                        f"Type: {d.get('damage_type', 'unknown')}, "
                        f"Severity: {d.get('severity', 'unknown')}, "
                        f"Description: {d.get('description', 'N/A')}"
                    )

            if not damage_listing:
                damage_listing_text = "  No individual damages found in the pipeline data."
            else:
                damage_listing_text = "\n".join(damage_listing)

            # Construct the user message with all context
            user_message = f"""CLAIM DETAILS:
                Title: {claim_title}
                Description: {claim_description}

                VEHICLE TYPE: {vehicle_type}

                DAMAGE SUMMARY: {damage_summary}

                DETECTED DAMAGES (from image analysis):
                {damage_listing_text}

                Please analyze the alignment between the claim description and the detected damages.
                Provide your assessment in the required JSON format.
            """

            system_msg = SystemMessage(content=LIABILITY_ASSESSMENT_SYSTEM_PROMPT)
            human_msg = HumanMessage(content=user_message)

            print(f"  Sending liability analysis request to LLM...")
            response = self._llm.invoke([system_msg, human_msg])
            response_text = response.content.strip()

            # Strip markdown code fences if present
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                lines = [l for l in lines if not l.strip().startswith("```")]
                response_text = "\n".join(lines).strip()

            # Parse the JSON response
            parsed = json.loads(response_text)

            # Build DamageAlignmentItem list
            alignments = []
            for a in parsed.get("damage_alignments", []):
                alignments.append(DamageAlignmentItem(
                    part=a.get("part", "unknown"),
                    damage_type=a.get("damage_type", "unknown"),
                    severity=a.get("severity", "unknown"),
                    is_consistent=a.get("is_consistent", False),
                    alignment_score=a.get("alignment_score", 0.0),
                    reasoning=a.get("reasoning", ""),
                ))

            overall_confidence = parsed.get("overall_confidence", 0.0)
            confidence_percentage = parsed.get("confidence_percentage", round(overall_confidence * 100))

            assessment = LiabilityAssessment(
                claim_id=state.claim_id,
                user_id=state.user_id,
                overall_confidence=overall_confidence,
                confidence_percentage=confidence_percentage,
                scenario_plausibility=parsed.get("scenario_plausibility", "questionable"),
                scenario_reasoning=parsed.get("scenario_reasoning", ""),
                damage_alignments=alignments,
                consistent_damages=parsed.get("consistent_damages", 0),
                inconsistent_damages=parsed.get("inconsistent_damages", 0),
                overall_reasoning=parsed.get("overall_reasoning", ""),
                recommendation=parsed.get("recommendation", "needs_human_review"),
                flags=parsed.get("flags", []),
            )

            needs_review = overall_confidence < CONFIDENCE_THRESHOLD

            print(f"  Liability assessment: confidence={confidence_percentage}%, "
                  f"recommendation={assessment.recommendation}, "
                  f"needs_admin_review={needs_review}")

            return {
                "assessment": assessment,
                "needs_admin_review": needs_review,
                "status": "analyzing",
            }

        except json.JSONDecodeError as e:
            print(f"  JSON parse error in liability analysis: {str(e)}")
            print(f"  Raw response: {response_text[:500]}")
            return {
                "status": "failed",
                "error": f"Failed to parse liability assessment JSON: {str(e)}",
                "retry_count": state.retry_count + 1,
            }

        except Exception as e:
            print(f"  Error in liability analysis: {str(e)}")
            return {
                "status": "failed",
                "error": f"Failed to run liability analysis: {str(e)}",
                "retry_count": state.retry_count + 1,
            }


    #function to decide the claim status based on liability assessment
    def _decide_node(self, state: LiabilityAgentState) -> dict:
        """
        Make the final decision:
        - If agent failed after max retries → escalate to admin for technical failure
        - If confidence >= 70% → claim passes liability, forward to next agent
        - If confidence < 70% → flag for admin review with full reasoning
        args:
            state: LiabilityAgentState - current state with assessment
        returns:
            dict - final status update
        """
        # Handle technical failure after max retries
        if state.status == "failed":
            if state.retry_count >= 3:
                print(f"  [Liability] Max retries exhausted! Sending claim {state.claim_id} to admin.")

                admin_message = (
                    f"Liability Assessment agent failed after 3 retries for claim {state.claim_id}. "
                    f"Error: {state.error}. "
                    f"The image pipeline results exist, but liability could not be assessed. "
                    f"Manual liability review is required."
                )

                try:
                    self._update_claim_status_tool.invoke({
                        "status": "under_review",
                        "ai_verdict": f"Liability Agent Failed: {state.error}",
                    })
                    self._log_agent_failure_tool.invoke(admin_message)
                except Exception as e:
                    print(f"  Failed to set under_review status: {str(e)}")

            return {"status": "failed"}

        # if Assessment completed then check confidence
        assessment = state.assessment
        if not assessment:
            return {"status": "failed", "error": "No assessment produced"}

        if state.needs_admin_review:
            # if Confidence < 70% then send to admin with full reasoning
            print(f"  Confidence {assessment.confidence_percentage}% < 70% — flagging for admin review")

            # Build a human-readable verdict for the claim status
            flags_text = ""
            if assessment.flags:
                flags_text = " Red flags: " + "; ".join(assessment.flags) + "."

            ai_verdict = (
                f"Liability assessment confidence: {assessment.confidence_percentage}% "
                f"(below 70% threshold). Scenario: {assessment.scenario_plausibility}. "
                f"{assessment.consistent_damages} damages consistent, "
                f"{assessment.inconsistent_damages} inconsistent. "
                f"Recommendation: {assessment.recommendation}.{flags_text} "
                f"Reasoning: {assessment.overall_reasoning}"
            )

            try:
                self._update_claim_status_tool.invoke({
                    "status": "under_review",
                    "ai_verdict": ai_verdict,
                })
            except Exception as e:
                print(f"  Failed to update claim status: {str(e)}")

            return {"status": "completed"}

        else:
            # if Confidence >= 70% then claim passes liability check
            print(f"  Confidence {assessment.confidence_percentage}% >= 70% — claim passes liability")

            ai_verdict = (
                f"Liability assessment PASSED with {assessment.confidence_percentage}% confidence. "
                f"Scenario: {assessment.scenario_plausibility}. "
                f"{assessment.consistent_damages}/{assessment.consistent_damages + assessment.inconsistent_damages} "
                f"damages aligned with description."
            )

            try:
                self._update_claim_status_tool.invoke({
                    "status": "under_review",
                    "ai_verdict": ai_verdict,
                })
            except Exception as e:
                print(f"  Failed to update claim status: {str(e)}")

            return {"status": "completed"}


    #function to invoke the liability agent for a specific claim
    def invoke(self, claim_id: str, user_id: str) -> LiabilityAgentState:
        """Run the full liability assessment pipeline for a claim."""
        initial_state = LiabilityAgentState(
            claim_id=claim_id,
            user_id=user_id,
        )

        result = self._graph.invoke(initial_state)
        return result

    #function to draw the graph for visualization and debugging purposes
    def build_graph_image(self):
        png_bytes=self._graph.get_graph(xray=True).draw_mermaid_png()
        with open("liability_agent_graph.png", "wb") as f:
            f.write(png_bytes)
        display(Image(png_bytes))