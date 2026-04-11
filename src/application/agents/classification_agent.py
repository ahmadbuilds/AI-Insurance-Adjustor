from langgraph.graph import StateGraph, START, END
from IPython.display import Image, display
from application.states import ClassificationAgentState
from domain.entities import ImageWithUrl, ClassificationResult
from domain.prompts.classification_agent_prompt import vehicle_detection_prompt
from infrastructure.llm_providers.groq_provider import create_model_instance

# Groq vision model for image analysis
VISION_MODEL = "llama-3.2-90b-vision-preview"

# AI verdict message when all images lack a vehicle
REJECTION_VERDICT = (
    "Claim rejected: None of the submitted images contain a recognizable vehicle "
    "(car, motorcycle, bus, or truck). Please resubmit with valid vehicle images."
)

# Classification agent Graph
class ClassificationAgent:

    def __init__(
        self,
        fetch_images_tool,
        update_vehicle_status_tool,
        update_claim_status_tool,
        log_agent_failure_tool,
        model_name: str = VISION_MODEL,
    ):
        self._fetch_images_tool = fetch_images_tool
        self._update_vehicle_status_tool = update_vehicle_status_tool
        self._update_claim_status_tool = update_claim_status_tool
        self._log_agent_failure_tool = log_agent_failure_tool
        self._llm = create_model_instance(model_name=model_name, temperature=0)
        self._graph = self._build_graph()


    #function to build the graph of classification agent
    def _build_graph(self):
        graph = StateGraph(ClassificationAgentState)

        graph.add_node("fetch_images", self._fetch_images_node)
        graph.add_node("analyze_images", self._analyze_images_node)
        graph.add_node("update_results", self._update_results_node)
        graph.add_node("decide_claim", self._decide_claim_node)

        graph.add_edge(START, "fetch_images")
        graph.add_conditional_edges("fetch_images", self._route_after_fetch)
        graph.add_conditional_edges("analyze_images", self._route_after_analyze)
        graph.add_edge("update_results", "decide_claim")
        graph.add_edge("decide_claim", END)

        return graph.compile()

    def _route_after_fetch(self, state: ClassificationAgentState) -> str:
        if state.status == "failed" and state.error and "No images found" not in state.error and state.retry_count < 3:
            print(f"  [Classification] Retrying fetch_images (Attempt {state.retry_count}/3)...")
            return "fetch_images"
        return "analyze_images"

    def _route_after_analyze(self, state: ClassificationAgentState) -> str:
        if state.status == "failed" and state.retry_count < 3:
            print(f"  [Classification] Retrying analyze_images (Attempt {state.retry_count}/3)...")
            return "analyze_images"
        return "update_results"


    #function to fetch images for the claim using the fetch_claim_images tool 
    def _fetch_images_node(self, state: ClassificationAgentState) -> dict:
        """
        Fetch all images for the claim using the fetch_claim_images tool.
        args:
            state: ClassificationAgentState - the current state of the agent, containing claim_id and user_id
        returns:
            dict - containing list of ImageWithUrl and status of the operation                  
        """
        try:
            raw_images = self._fetch_images_tool.invoke({})

            if not raw_images:
                return {
                    "images": [],
                    "status": "failed",
                    "error": f"No images found for claim {state.claim_id}",
                }

            images = [ImageWithUrl(**img) for img in raw_images]
            return {"images": images, "status": "fetching_images"}

        except Exception as e:
            return {"images": [], "status": "failed", "error": str(e), "retry_count": state.retry_count + 1}


    #function to analyze each image using the vision LLM and classify if it contains a vehicle or not
    def _analyze_images_node(self, state: ClassificationAgentState) -> dict:
        """
        For each image, use the vision LLM to determine if it contains a vehicle.
        The prompt should instruct the model to return a simple "true" or "false" for each image URL.
        args:
            state: ClassificationAgentState - the current state of the agent, containing list of images to analyze
        returns:
            dict - containing list of ClassificationResult and status of the operation
        """
        if state.status == "failed":
            return {}

        results: list[ClassificationResult] = []

        for image in state.images:
            try:
                prompt_messages = vehicle_detection_prompt.format_messages(
                    image_url=image.public_url
                )
                response = self._llm.invoke(prompt_messages)
                response_text = response.content.strip().lower()

                is_vehical = response_text == "true"

                results.append(ClassificationResult(
                    image_id=image.id,
                    is_vehical=is_vehical,
                ))

                print(f"  Image '{image.file_name}': is_vehical={is_vehical} (raw='{response_text}')")

            except Exception as e:
                print(f"  Error analyzing image '{image.file_name}': {str(e)}")
                return {"classification_results": [], "status": "failed", "error": str(e), "retry_count": state.retry_count + 1}


        return {"classification_results": results, "status": "analyzing"}

    
    #function to update the vehicle status for each image using the update_vehicle_status tool based on the classification results
    def _update_results_node(self, state: ClassificationAgentState) -> dict:
        """
        Update the vehicle status for each image in the database using the update_vehicle_status tool.
        args:
            state: ClassificationAgentState - the current state of the agent, containing classification results for each image        
        returns:
            dict - containing status of the operation
        """
        if state.status == "failed":
            return {}

        success_count = 0
        fail_count = 0

        for result in state.classification_results:
            try:
                self._update_vehicle_status_tool.invoke({
                    "image_id": result.image_id,
                    "is_vehical": result.is_vehical,
                })
                success_count += 1
            except Exception as e:
                print(f"  Failed to update image {result.image_id}: {str(e)}")
                fail_count += 1

        print(f"  Update complete: {success_count} succeeded, {fail_count} failed")
        return {"status": "updating"}


    #function to decide the claim status based on the classification results and update the claim status using the update_claim_status tool if all images lack a vehicle
    def _decide_claim_node(self, state: ClassificationAgentState) -> dict:
        """
        Decide the claim status based on the classification results. If all images lack a vehicle, reject the claim.
        Update the claim status in the database using the update_claim_status tool.
        args:
            state: ClassificationAgentState - the current state of the agent, containing classification results for each
            image and the claim_id
        returns:
            dict - containing whether the claim was rejected and status of the operation
        """
        if state.status == "failed":
            if state.retry_count >= 3:
                print(f"  [Classification] Max retries exhausted! Sending claim {state.claim_id} to admin.")
                try:
                    self._update_claim_status_tool.invoke({
                        "status": "under_review",
                        "ai_verdict": f"Agent Failed: {state.error}",
                    })
                    self._log_agent_failure_tool.invoke(state.error or "Unknown network/LLM error")
                except Exception as e:
                    print(f"  Failed to set under_review status: {str(e)}")
            return {"claim_rejected": True, "status": "completed"}

        all_false = all(
            not result.is_vehical for result in state.classification_results
        )

        if all_false and len(state.classification_results) > 0:
            print(f"  All {len(state.classification_results)} images returned no vehicle — rejecting claim {state.claim_id}")

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
            vehicle_count = sum(1 for r in state.classification_results if r.is_vehical)
            print(f"  {vehicle_count}/{len(state.classification_results)} images contain a vehicle — claim passes classification")
            return {"claim_rejected": False, "status": "completed"}

    
    #function to invoke the classification agent for a specific claim_id and user_id, which runs the full graph pipeline
    def invoke(self, claim_id: str, user_id: str) -> ClassificationAgentState:
        """Run the full classification pipeline for a claim."""
        initial_state = ClassificationAgentState(
            claim_id=claim_id,
            user_id=user_id,
        )

        self.build_graph_image()
        result = self._graph.invoke(initial_state)
        return result

    #function to draw the graph for visualization and debugging purposes
    def build_graph_image(self):
        png_bytes=self._graph.get_graph(xray=True).draw_mermaid_png()
        with open("vehicle_classification_graph.png", "wb") as f:
            f.write(png_bytes)
        display(Image(png_bytes))