from langgraph.graph import StateGraph, START, END
from langchain_core.messages import SystemMessage, HumanMessage
from IPython.display import Image as IPyImage, display
from application.states import VehicleTypeAgentState
from domain.entities import ImageWithUrl, VehicleTypeClassification
from domain.prompts.vehicle_type_prompt import VEHICLE_TYPE_SYSTEM_PROMPT
from infrastructure.llm_providers.groq_provider import create_model_instance

# Groq vision model for image analysis
VISION_MODEL = "llama-3.2-90b-vision-preview"

# AI verdict message when images show inconsistent vehicle types
REJECTION_VERDICT = (
    "Claim rejected: The submitted images appear to show inconsistent vehicle types. "
    "All images in a claim must depict the same type of vehicle. "
    "Please resubmit with consistent images."
)

# Agent to classify vehicle type and reject claim if multiple conflicting types are detected
class VehicleTypeAgent:

    def __init__(
        self,
        fetch_vehicle_images_tool,
        update_claim_status_tool,
        model_name: str = VISION_MODEL,
    ):
        self._fetch_vehicle_images_tool = fetch_vehicle_images_tool
        self._update_claim_status_tool = update_claim_status_tool
        self._llm = create_model_instance(model_name=model_name, temperature=0, max_tokens=10)
        self._graph = self._build_graph()

    #function to build the graph of vehicle type detection agent
    def _build_graph(self):
        graph = StateGraph(VehicleTypeAgentState)

        graph.add_node("fetch_vehicle_images", self._fetch_vehicle_images_node)
        graph.add_node("analyze_vehicle_types", self._analyze_vehicle_types_node)
        graph.add_node("decide_claim", self._decide_claim_node)

        graph.add_edge(START, "fetch_vehicle_images")
        graph.add_edge("fetch_vehicle_images", "analyze_vehicle_types")
        graph.add_edge("analyze_vehicle_types", "decide_claim")
        graph.add_edge("decide_claim", END)

        return graph.compile()

    #function to fetch only vehicle images for the claim
    def _fetch_vehicle_images_node(self, state: VehicleTypeAgentState) -> dict:
        """
        Fetch images that contain vehicles using the fetch_vehicle_images tool.
        args:
            state: VehicleTypeAgentState - current state containing claim_id
        returns:
            dict - containing list of vehicle ImageWithUrl and status
        """
        try:
            raw_images = self._fetch_vehicle_images_tool.invoke({})

            if not raw_images:
                return {
                    "vehicle_images": [],
                    "status": "failed",
                    "error": f"No vehicle images found for claim {state.claim_id}",
                    "claim_rejected": True
                }

            images = [ImageWithUrl(**img) for img in raw_images]
            return {"vehicle_images": images, "status": "fetching_vehicle_images"}

        except Exception as e:
            return {"vehicle_images": [], "status": "failed", "error": str(e), "claim_rejected": True}

    #function to analyze vehicle type for each image using vision LLM
    def _analyze_vehicle_types_node(self, state: VehicleTypeAgentState) -> dict:
        """
        Classify the vehicle type for each image individually using the vision LLM.
        args:
            state: VehicleTypeAgentState - current state containing vehicle images to analyze
        returns:
            dict - containing type_classifications list and status
        """
        if state.status == "failed":
            return {}

        results = []
        try:
            system_msg = SystemMessage(content=VEHICLE_TYPE_SYSTEM_PROMPT)

            for image in state.vehicle_images:
                human_msg = HumanMessage(content=[
                    {"type": "text", "text": "Classify the vehicle type in this image."},
                    {"type": "image_url", "image_url": {"url": image.public_url}}
                ])
                
                response = self._llm.invoke([system_msg, human_msg])
                vehicle_type = response.content.strip().upper()
                
                # Sanitize output to expected types
                valid_types = ["PC", "MC", "CT", "EV", "CV", "SV", "OV"]
                if vehicle_type not in valid_types:
                    vehicle_type = "UNKNOWN"
                    
                print(f"  Image {image.id}: Classified completely as {vehicle_type}")

                results.append(
                    VehicleTypeClassification(image_id=image.id, vehicle_type=vehicle_type)
                )

            return {"type_classifications": results, "status": "analyzing"}

        except Exception as e:
            print(f"  Error classifying vehicle types: {str(e)}")
            return {"type_classifications": results, "status": "failed", "error": str(e), "claim_rejected": True}


    #function to decide whether to reject the claim based on classification consistency
    def _decide_claim_node(self, state: VehicleTypeAgentState) -> dict:
        """
        If the images depict different vehicle types, reject the claim.
        args:
            state: VehicleTypeAgentState - current state with type_classifications result
        returns:
            dict - containing identified_type, claim_rejected, and final status
        """
        if state.status == "failed":
            return {"status": "completed", "claim_rejected": True}

        # Check if all images have the same valid type
        unique_types = {cls.vehicle_type for cls in state.type_classifications if cls.vehicle_type != "UNKNOWN"}
        
        is_consistent = len(unique_types) == 1
        identified_type = list(unique_types)[0] if is_consistent else None
        
        if len(unique_types) == 0:
            print(f"  No vehicle types could be identified — sending claim {state.claim_id} for manual review")
            try:
                self._update_claim_status_tool.invoke({
                    "status": "under_review",
                    "ai_verdict": "Manual review required: AI could not identify a clear vehicle type from the images. They may be unrecognizable.",
                })
                return {"claim_rejected": True, "identified_type": None, "status": "completed"}
            except Exception as e:
                print(f"  Failed to set under_review status: {str(e)}")
                return {"claim_rejected": True, "status": "failed", "error": f"Failed to set status: {str(e)}"}

        elif not is_consistent:
            print(f"  Images show inconsistent vehicle types — rejecting claim {state.claim_id}")

            try:
                self._update_claim_status_tool.invoke({
                    "status": "rejected",
                    "ai_verdict": REJECTION_VERDICT,
                })
                return {"claim_rejected": True, "identified_type": None, "status": "completed"}
            except Exception as e:
                print(f"  Failed to reject claim: {str(e)}")
                return {"claim_rejected": True, "status": "failed", "error": f"Failed to reject claim: {str(e)}"}
        else:
            print(f"  All images show consistent vehicle type '{identified_type}' — claim passes vehicle type check")
            return {"claim_rejected": False, "identified_type": identified_type, "status": "completed"}

    #function to invoke the vehicle type agent for a specific claim
    def invoke(self, claim_id: str, user_id: str) -> VehicleTypeAgentState:
        """Run the full vehicle type detection pipeline for a claim."""
        initial_state = VehicleTypeAgentState(
            claim_id=claim_id,
            user_id=user_id,
        )

        result = self._graph.invoke(initial_state)
        return result
    
    #function to draw the graph for visualization and debugging purposes
    def build_graph_image(self):
        png_bytes=self._graph.get_graph(xray=True).draw_mermaid_png()
        with open("vehicle_type_agent_graph.png", "wb") as f:
            f.write(png_bytes)
        display(IPyImage(png_bytes))
