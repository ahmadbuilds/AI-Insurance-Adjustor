from langgraph.graph import StateGraph, START, END
from langchain_core.messages import SystemMessage, HumanMessage
from IPython.display import Image, display
from application.states import SameVehicleAgentState
from domain.entities import ImageWithUrl
from domain.prompts.same_vehicle_prompt import SAME_VEHICLE_SYSTEM_PROMPT
from infrastructure.llm_providers.groq_provider import create_model_instance

# Groq vision model for image analysis
VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

# AI verdict message when images show different vehicles
REJECTION_VERDICT = (
    "Claim rejected: The submitted images appear to show different vehicles. "
    "All images in a claim must depict the same vehicle or damage to the same vehicle. "
    "Please resubmit with images of a single vehicle."
)

# Agent to determine if all vehicle images in a claim show the same vehicle, and reject claim if not
class SameVehicleAgent:

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


    #function to build the graph of same vehicle detection agent
    def _build_graph(self):
        graph = StateGraph(SameVehicleAgentState)

        graph.add_node("fetch_vehicle_images", self._fetch_vehicle_images_node)
        graph.add_node("analyze_same_vehicle", self._analyze_same_vehicle_node)
        graph.add_node("decide_claim", self._decide_claim_node)

        graph.add_edge(START, "fetch_vehicle_images")
        graph.add_conditional_edges("fetch_vehicle_images", self._route_after_fetch)
        graph.add_conditional_edges("analyze_same_vehicle", self._route_after_analyze)
        graph.add_edge("decide_claim", END)

        return graph.compile()

    def _route_after_fetch(self, state: SameVehicleAgentState) -> str:
        if state.status == "failed":
            if state.error and "No vehicle images found" not in state.error and state.retry_count < 3:
                print(f"  [SameVehicle] Retrying fetch_vehicle_images (Attempt {state.retry_count}/3)...")
                return "fetch_vehicle_images"
            return "decide_claim"
        return "analyze_same_vehicle"

    def _route_after_analyze(self, state: SameVehicleAgentState) -> str:
        if state.status == "failed":
            if state.retry_count < 3:
                print(f"  [SameVehicle] Retrying analyze_same_vehicle (Attempt {state.retry_count}/3)...")
                return "analyze_same_vehicle"
            return "decide_claim"
        return "decide_claim"


    #function to fetch only vehicle images (is_vehical=True) for the claim
    def _fetch_vehicle_images_node(self, state: SameVehicleAgentState) -> dict:
        """
        Fetch images that contain vehicles using the fetch_vehicle_images tool.
        args:
            state: SameVehicleAgentState - current state containing claim_id
        returns:
            dict - containing list of vehicle ImageWithUrl and status
        """
        try:
            raw_images = self._fetch_vehicle_images_tool.invoke({})

            print(f"[SameVehicle] Fetched {len(raw_images)} vehicle images for claim {state.claim_id}")

            if not raw_images:
                return {
                    "vehicle_images": [],
                    "status": "failed",
                    "error": f"No vehicle images found for claim {state.claim_id}",
                }

            images = [ImageWithUrl(**img) for img in raw_images]
            return {"vehicle_images": images, "status": "fetching_vehicle_images"}

        except Exception as e:
            return {"vehicle_images": [], "status": "failed", "error": str(e), "retry_count": state.retry_count + 1}


    #function to analyze whether all vehicle images show the same vehicle using the vision LLM
    def _analyze_same_vehicle_node(self, state: SameVehicleAgentState) -> dict:
        """
        Send all vehicle images to the vision LLM in a single multi-image message
        to determine if they all show the same vehicle.
        args:
            state: SameVehicleAgentState - current state containing vehicle images to analyze
        returns:
            dict - containing is_same_vehicle result and status
        """
        if state.status == "failed":
            return {}

        # If only 1 vehicle image, automatically pass
        if len(state.vehicle_images) == 1:
            print(f"  Only 1 vehicle image — automatically passing same-vehicle check")
            return {"is_same_vehicle": True, "status": "analyzing"}

        try:
            # Build multi-image message dynamically
            system_msg = SystemMessage(content=SAME_VEHICLE_SYSTEM_PROMPT)

            human_content = [
                {"type": "text", "text": f"Analyze these {len(state.vehicle_images)} images from the same insurance claim. Determine if they all show the same vehicle or damage to the same vehicle."},
            ]
            for image in state.vehicle_images:
                human_content.append({
                    "type": "image_url",
                    "image_url": {"url": image.public_url},
                })

            human_msg = HumanMessage(content=human_content)

            print(f"[SameVehicle][LLM] model={self._model_name} images={len(state.vehicle_images)}")
            response = self._llm.invoke([system_msg, human_msg])
            response_text = response.content.strip().lower()

            is_same = response_text == "true"
            print(f"  Same vehicle detection: is_same_vehicle={is_same} (raw='{response_text}')")

            return {"is_same_vehicle": is_same, "status": "analyzing"}

        except Exception as e:
            print(f"  Error analyzing vehicle images: {str(e)}")
            return {"is_same_vehicle": False, "status": "failed", "error": str(e), "retry_count": state.retry_count + 1}


    #function to decide whether to reject the claim based on same-vehicle analysis
    def _decide_claim_node(self, state: SameVehicleAgentState) -> dict:
        """
        If images do NOT show the same vehicle, reject the claim by updating
        the claims table status to 'rejected' and setting the ai_verdict.
        args:
            state: SameVehicleAgentState - current state with is_same_vehicle result
        returns:
            dict - containing claim_rejected and final status
        """
        if state.status == "failed":
            if state.error and "No vehicle images found" in state.error:
                print(f"  [SameVehicle] Rejecting claim {state.claim_id}: {state.error}")
                try:
                    self._update_claim_status_tool.invoke({
                        "status": "rejected",
                        "ai_verdict": f"Claim rejected: {state.error}",
                    })
                except Exception as e:
                    print(f"  Failed to reject claim: {str(e)}")
            else:
                print(f"  [SameVehicle] Technical failure! Sending claim {state.claim_id} to admin.")
                try:
                    self._update_claim_status_tool.invoke({
                        "status": "under_review",
                        "ai_verdict": f"Agent Failed: {state.error}",
                    })
                    self._log_agent_failure_tool.invoke(state.error or "Unknown network/LLM error")
                except Exception as e:
                    print(f"  Failed to set under_review status: {str(e)}")
            return {"claim_rejected": True, "status": "completed"}

        if not state.is_same_vehicle:
            print(f"  Images show different vehicles — rejecting claim {state.claim_id}")

            try:
                self._update_claim_status_tool.invoke({
                    "status": "rejected",
                    "ai_verdict": REJECTION_VERDICT,
                })
                return {"claim_rejected": True, "status": "completed"}
            except Exception as e:
                print(f"  Failed to reject claim: {str(e)}")
                return {"claim_rejected": True, "status": "failed", "error": f"Failed to reject claim: {str(e)}"}
        else:
            print(f"  All {len(state.vehicle_images)} vehicle images show the same vehicle — claim passes same-vehicle check")
            return {"claim_rejected": False, "status": "completed"}


    #function to invoke the same vehicle detection agent for a specific claim
    def invoke(self, claim_id: str, user_id: str) -> SameVehicleAgentState:
        """Run the full same-vehicle detection pipeline for a claim."""
        initial_state = SameVehicleAgentState(
            claim_id=claim_id,
            user_id=user_id,
        )

        result = self._graph.invoke(initial_state)
        return result
    
    #function to draw the graph for visualization and debugging purposes
    def build_graph_image(self):
        png_bytes=self._graph.get_graph(xray=True).draw_mermaid_png()
        with open("same_vehicle_agent_graph.png", "wb") as f:
            f.write(png_bytes)
        display(Image(png_bytes))
