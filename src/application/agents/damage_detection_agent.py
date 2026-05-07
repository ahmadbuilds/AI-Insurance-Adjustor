import json
from langgraph.graph import StateGraph, START, END
from langchain_core.messages import SystemMessage, HumanMessage
from application.states import DamageDetectionAgentState
from domain.entities import ImageDamageResult, DamageItem
from domain.prompts.damage_detection_prompt import DAMAGE_DETECTION_SYSTEM_PROMPT
from infrastructure.llm_providers.groq_provider import create_model_instance
from IPython.display import Image, display

# Groq vision model for image analysis
VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

# AI verdict message when no images contain any damage
REJECTION_VERDICT = (
    "Claim rejected: None of the submitted vehicle images show any visible damage. "
    "An insurance claim requires evidence of damage to the vehicle. "
    "Please resubmit with images that clearly show the vehicle damage."
)


class DamageDetectionAgent:
    """
    LangGraph agent that analyzes vehicle images for visible damage.
    For each image, it produces a structured list of damages with part, type, severity, and description.
    If no images contain damage, the claim is rejected.
    If some images have damage and some do not, only the damaged results are kept.
    """

    def __init__(
        self,
        fetch_vehicle_images_tool,
        update_claim_status_tool,
        log_agent_failure_tool,
        model_name: str = VISION_MODEL,
    ):
        self._fetch_vehicle_images_tool = fetch_vehicle_images_tool
        self._update_claim_status_tool = update_claim_status_tool
        self._log_agent_failure_tool = log_agent_failure_tool
        self._model_name = model_name
        self._llm = create_model_instance(model_name=model_name, temperature=0)
        self._graph = self._build_graph()


    #function to build the graph of damage detection agent
    def _build_graph(self):
        graph = StateGraph(DamageDetectionAgentState)

        graph.add_node("fetch_vehicle_images", self._fetch_vehicle_images_node)
        graph.add_node("analyze_damages", self._analyze_damages_node)
        graph.add_node("decide_claim", self._decide_claim_node)

        graph.add_edge(START, "fetch_vehicle_images")
        graph.add_conditional_edges("fetch_vehicle_images", self._route_after_fetch)
        graph.add_conditional_edges("analyze_damages", self._route_after_analyze)
        graph.add_edge("decide_claim", END)

        return graph.compile()

    def _route_after_fetch(self, state: DamageDetectionAgentState) -> str:
        if state.status == "failed":
            if state.error and "No vehicle images found" not in state.error and state.retry_count < 3:
                print(f"  [DamageDetection] Retrying fetch_vehicle_images (Attempt {state.retry_count}/3)...")
                return "fetch_vehicle_images"
            return "decide_claim"
        return "analyze_damages"

    def _route_after_analyze(self, state: DamageDetectionAgentState) -> str:
        if state.status == "failed":
            if state.retry_count < 3:
                print(f"  [DamageDetection] Retrying analyze_damages (Attempt {state.retry_count}/3)...")
                return "analyze_damages"
            return "decide_claim"
        return "decide_claim"


    #function to fetch only vehicle images for the claim
    def _fetch_vehicle_images_node(self, state: DamageDetectionAgentState) -> dict:
        """
        Fetch images that contain vehicles using the fetch_vehicle_images tool.
        args:
            state: DamageDetectionAgentState - current state containing claim_id
        returns:
            dict - containing list of vehicle ImageWithUrl and status
        """
        try:
            raw_images = self._fetch_vehicle_images_tool.invoke({})

            print(f"[DamageDetection] Fetched {len(raw_images)} vehicle images for claim {state.claim_id}")

            if not raw_images:
                return {
                    "vehicle_images": [],
                    "status": "failed",
                    "error": f"No vehicle images found for claim {state.claim_id}",
                }

            from domain.entities import ImageWithUrl
            images = [ImageWithUrl(**img) for img in raw_images]
            return {"vehicle_images": images, "status": "fetching_vehicle_images"}

        except Exception as e:
            return {"vehicle_images": [], "status": "failed", "error": str(e), "retry_count": state.retry_count + 1}


    #function to analyze each vehicle image for damage using the vision LLM
    def _analyze_damages_node(self, state: DamageDetectionAgentState) -> dict:
        """
        For each vehicle image, send it to the vision LLM with the damage detection prompt.
        Parse the structured JSON response into ImageDamageResult objects.
        args:
            state: DamageDetectionAgentState - current state containing vehicle images to analyze
        returns:
            dict - containing list of ImageDamageResult and status
        """
        if state.status == "failed":
            return {}

        results: list[ImageDamageResult] = []

        for image in state.vehicle_images:
            try:
                system_msg = SystemMessage(content=DAMAGE_DETECTION_SYSTEM_PROMPT)
                human_msg = HumanMessage(content=[
                    {"type": "text", "text": "Analyze this vehicle image for all visible damage."},
                    {"type": "image_url", "image_url": {"url": image.public_url}},
                ])

                print(f"[DamageDetection][LLM] model={self._model_name} image_id={image.id}")
                response = self._llm.invoke([system_msg, human_msg])
                response_text = response.content.strip()

                # Strip markdown code fences if the LLM wraps the JSON
                if response_text.startswith("```"):
                    lines = response_text.split("\n")
                    # Remove first and last line 
                    lines = [l for l in lines if not l.strip().startswith("```")]
                    response_text = "\n".join(lines).strip()

                # Parse the JSON response
                parsed = json.loads(response_text)

                has_damage = parsed.get("has_damage", False)
                damage_summary = parsed.get("damage_summary", "")

                damages = []
                if has_damage:
                    for d in parsed.get("damages", []):
                        damages.append(DamageItem(
                            part=d.get("part", "unknown"),
                            damage_type=d.get("damage_type", "unknown"),
                            severity=d.get("severity", "minor"),
                            description=d.get("description", ""),
                        ))

                result = ImageDamageResult(
                    image_id=image.id,
                    has_damage=has_damage,
                    damages=damages,
                    damage_summary=damage_summary,
                )
                results.append(result)

                damage_count = len(damages)
                print(f"  Image '{image.file_name}': has_damage={has_damage}, damages_found={damage_count}")

            except json.JSONDecodeError as e:
                print(f"  JSON parse error for image '{image.file_name}': {str(e)}")
                print(f"  Raw response: {response_text[:500]}")
                return {
                    "damage_results": results,
                    "status": "failed",
                    "error": f"Failed to parse damage analysis JSON for image {image.file_name}: {str(e)}",
                    "retry_count": state.retry_count + 1,
                }

            except Exception as e:
                print(f"  Error analyzing image '{image.file_name}' for damage: {str(e)}")
                return {
                    "damage_results": results,
                    "status": "failed",
                    "error": f"Failed to analyze image {image.file_name}: {str(e)}",
                    "retry_count": state.retry_count + 1,
                }

        return {"damage_results": results, "status": "analyzing"}


    #function to decide the claim status based on damage detection results
    def _decide_claim_node(self, state: DamageDetectionAgentState) -> dict:
        """
        Decide the claim status based on damage detection results.
        args:
            state: DamageDetectionAgentState - current state with damage_results
        returns:
            dict - containing claim_rejected, damage_summary, filtered damage_results, and status
        """
        # Handle failure after max retries
        if state.status == "failed":
            if state.error and "No vehicle images found" in state.error:
                print(f"  [DamageDetection] Rejecting claim {state.claim_id}: {state.error}")
                try:
                    self._update_claim_status_tool.invoke({
                        "status": "rejected",
                        "ai_verdict": f"Claim rejected: {state.error}",
                    })
                except Exception as e:
                    print(f"  Failed to reject claim: {str(e)}")
            else:
                print(f"  [DamageDetection] Technical failure! Sending claim {state.claim_id} to admin.")

                # Building descriptive message for admin with partial results context
                processed_count = len(state.damage_results)
                total_count = len(state.vehicle_images)
                partial_info = ""
                if processed_count > 0:
                    damaged_so_far = sum(1 for r in state.damage_results if r.has_damage)
                    partial_info = (
                        f" Partial results before failure: {processed_count}/{total_count} images analyzed, "
                        f"{damaged_so_far} showed damage."
                    )

                admin_message = (
                    f"Damage Detection agent failed for claim {state.claim_id}. "
                    f"Error: {state.error}.{partial_info} "
                    f"Manual damage assessment required. Please review the vehicle images and "
                    f"document all visible damage (parts affected, damage types, and severity levels)."
                )

                try:
                    self._update_claim_status_tool.invoke({
                        "status": "under_review",
                        "ai_verdict": f"Agent Failed: {state.error}",
                    })
                    self._log_agent_failure_tool.invoke(admin_message)
                except Exception as e:
                    print(f"  Failed to set under_review status: {str(e)}")
            return {"claim_rejected": True, "status": "completed"}

        # Count images with and without damage
        images_with_damage = [r for r in state.damage_results if r.has_damage]
        images_without_damage = [r for r in state.damage_results if not r.has_damage]

        # NO images have any damage then reject
        if len(images_with_damage) == 0 and len(state.damage_results) > 0:
            print(f"  All {len(state.damage_results)} images show no damage — rejecting claim {state.claim_id}")
            try:
                self._update_claim_status_tool.invoke({
                    "status": "rejected",
                    "ai_verdict": REJECTION_VERDICT,
                })
                return {"claim_rejected": True, "status": "completed", "damage_summary": "No damage detected in any image."}
            except Exception as e:
                print(f"  Failed to reject claim: {str(e)}")
                return {"claim_rejected": True, "status": "failed", "error": f"Failed to reject claim: {str(e)}"}

        # if Some or all images have damage then  pass claim or keep only damaged results
        if images_without_damage:
            print(f"  {len(images_with_damage)}/{len(state.damage_results)} images show damage — keeping only damaged results")
        else:
            print(f"  All {len(images_with_damage)} images show damage — claim passes damage detection")

        # Build aggregated damage summary from all damaged images
        all_summaries = [r.damage_summary for r in images_with_damage if r.damage_summary]
        aggregated_summary = " | ".join(all_summaries) if all_summaries else "Damage detected."

        # Count total individual damages across all images
        total_damages = sum(len(r.damages) for r in images_with_damage)
        print(f"  Total individual damages found: {total_damages} across {len(images_with_damage)} images")

        return {
            "damage_results": images_with_damage,
            "damage_summary": aggregated_summary,
            "claim_rejected": False,
            "status": "completed",
        }


    #function to invoke the damage detection agent for a specific claim
    def invoke(self, claim_id: str, user_id: str) -> DamageDetectionAgentState:
        """Run the full damage detection pipeline for a claim."""
        initial_state = DamageDetectionAgentState(
            claim_id=claim_id,
            user_id=user_id,
        )

        result = self._graph.invoke(initial_state)
        return result

    #function to draw the graph for visualization and debugging purposes
    def build_graph_image(self):
        png_bytes=self._graph.get_graph(xray=True).draw_mermaid_png()
        with open("damage_detection_agent_graph.png", "wb") as f:
            f.write(png_bytes)
        display(Image(png_bytes))