import json
from langgraph.graph import StateGraph, START, END
from application.states import ImagePipelineSummaryAgentState
from domain.entities import ImagePipelineSummary
from IPython.display import Image, display

class ImagePipelineSummaryAgent:
    """
    LangGraph agent that aggregates results from all image pipeline agents
    (classification, same vehicle, vehicle type, damage detection) into a
    single structured ImagePipelineSummary for the liability agent to consume.

    This agent does NOT call any LLM — it is purely a data aggregation step
    that reads from the database and merges results.
    """

    def __init__(
        self,
        fetch_pipeline_results_tool,
        update_claim_status_tool,
        log_agent_failure_tool,
    ):
        self._fetch_pipeline_results_tool = fetch_pipeline_results_tool
        self._update_claim_status_tool = update_claim_status_tool
        self._log_agent_failure_tool = log_agent_failure_tool
        self._graph = self._build_graph()


    #function to build the LangGraph state graph
    def _build_graph(self):
        graph = StateGraph(ImagePipelineSummaryAgentState)

        graph.add_node("fetch_results", self._fetch_results_node)
        graph.add_node("aggregate_results", self._aggregate_results_node)
        graph.add_node("finalize", self._finalize_node)

        graph.add_edge(START, "fetch_results")
        graph.add_conditional_edges("fetch_results", self._route_after_fetch)
        graph.add_conditional_edges("aggregate_results", self._route_after_aggregate)
        graph.add_edge("finalize", END)

        return graph.compile()

    def _route_after_fetch(self, state: ImagePipelineSummaryAgentState) -> str:
        if state.status == "failed" and state.retry_count < 3:
            print(f"  [PipelineSummary] Retrying fetch_results (Attempt {state.retry_count}/3)...")
            return "fetch_results"
        return "aggregate_results"

    def _route_after_aggregate(self, state: ImagePipelineSummaryAgentState) -> str:
        if state.status == "failed" and state.retry_count < 3:
            print(f"  [PipelineSummary] Retrying aggregate_results (Attempt {state.retry_count}/3)...")
            return "aggregate_results"
        return "finalize"


    #function to fetch all previous agent results from the database
    def _fetch_results_node(self, state: ImagePipelineSummaryAgentState) -> dict:
        """
        Fetch results from all 4 image pipeline agents using the pipeline results tool.
        args:
            state: ImagePipelineSummaryAgentState - current state containing claim_id
        returns:
            dict - containing raw results from each agent and updated status
        """
        try:
            results = self._fetch_pipeline_results_tool.invoke({})

            classification = results.get("classification")
            same_vehicle = results.get("same_vehicle")
            vehicle_type = results.get("vehicle_type")
            damage_detection = results.get("damage_detection")

            # Validate that we have results from all previous agents
            missing = []
            if not classification:
                missing.append("classification")
            if not same_vehicle:
                missing.append("same_vehicle")
            if not vehicle_type:
                missing.append("vehicle_type")
            if not damage_detection:
                missing.append("damage_detection")

            if missing:
                return {
                    "classification_result": classification,
                    "same_vehicle_result": same_vehicle,
                    "vehicle_type_result": vehicle_type,
                    "damage_detection_result": damage_detection,
                    "status": "failed",
                    "error": f"Missing results from agents: {', '.join(missing)}",
                    "retry_count": state.retry_count + 1,
                }

            print(f"  Fetched results from all 4 pipeline agents for claim {state.claim_id}")
            return {
                "classification_result": classification,
                "same_vehicle_result": same_vehicle,
                "vehicle_type_result": vehicle_type,
                "damage_detection_result": damage_detection,
                "status": "fetching_results",
            }

        except Exception as e:
            return {
                "status": "failed",
                "error": f"Failed to fetch pipeline results: {str(e)}",
                "retry_count": state.retry_count + 1,
            }


    #function to aggregate all results into a single ImagePipelineSummary
    def _aggregate_results_node(self, state: ImagePipelineSummaryAgentState) -> dict:
        """
        Combine results from all agents into a unified ImagePipelineSummary.
        args:
            state: ImagePipelineSummaryAgentState - current state with raw results from each agent
        returns:
            dict - containing the aggregated ImagePipelineSummary and updated status
        """
        if state.status == "failed":
            return {}

        try:
            cls = state.classification_result
            sv = state.same_vehicle_result
            vt = state.vehicle_type_result
            dd = state.damage_detection_result

            # Extract classification data
            total_images = cls.get("images_processed", 0)
            vehicles_detected = cls.get("vehicles_detected", 0)
            non_vehicle_images = total_images - vehicles_detected

            # Extract same vehicle data
            is_same_vehicle = sv.get("is_same_vehicle", False)

            # Extract vehicle type data
            vehicle_type = vt.get("identified_type")

            # Extract damage detection data
            has_damage = dd.get("images_with_damage", 0) > 0
            images_with_damage = dd.get("images_with_damage", 0)
            damage_summary = dd.get("damage_summary")

            # Parse damage_details — it may be a JSON string from the JSONB column
            damage_details_raw = dd.get("damage_details")
            if isinstance(damage_details_raw, str):
                try:
                    damage_details = json.loads(damage_details_raw)
                except json.JSONDecodeError:
                    damage_details = []
            elif isinstance(damage_details_raw, list):
                damage_details = damage_details_raw
            else:
                damage_details = []

            # Determine if all checks passed (no agent rejected the claim)
            all_checks_passed = (
                not cls.get("claim_rejected", True)
                and not sv.get("claim_rejected", True)
                and not vt.get("claim_rejected", True)
                and not dd.get("claim_rejected", True)
            )

            # Build a human-readable pipeline summary
            summary_parts = []

            # Classification summary
            summary_parts.append(
                f"Image Classification: {vehicles_detected}/{total_images} images contain a vehicle."
            )

            # Same vehicle summary
            if is_same_vehicle:
                summary_parts.append("Same Vehicle Check: All images show the same vehicle.")
            else:
                summary_parts.append("Same Vehicle Check: Images may show different vehicles.")

            # Vehicle type summary
            vehicle_type_names = {
                "PC": "Passenger Car",
                "MC": "Motorcycle",
                "CT": "Commercial Truck",
                "EV": "Emergency Vehicle",
                "CV": "Construction Vehicle",
                "SV": "Special Vehicle",
                "OV": "Other Vehicle",
                "UNKNOWN": "Unknown",
            }
            type_label = vehicle_type_names.get(vehicle_type, vehicle_type or "Unknown")
            summary_parts.append(f"Vehicle Type: {type_label} ({vehicle_type}).")

            # Damage summary
            if has_damage:
                total_damage_count = 0
                for img_result in damage_details:
                    damages_list = img_result.get("damages", [])
                    total_damage_count += len(damages_list)
                summary_parts.append(
                    f"Damage Detection: {images_with_damage} images show damage with "
                    f"{total_damage_count} individual damage areas identified."
                )
                if damage_summary:
                    summary_parts.append(f"Damage Summary: {damage_summary}")
            else:
                summary_parts.append("Damage Detection: No damage detected.")

            # Overall status
            if all_checks_passed:
                summary_parts.append("Pipeline Status: All image analysis checks PASSED.")
            else:
                summary_parts.append("Pipeline Status: One or more checks FAILED or resulted in rejection.")

            pipeline_summary_text = " | ".join(summary_parts)

            pipeline_summary = ImagePipelineSummary(
                claim_id=state.claim_id,
                user_id=state.user_id,
                total_images=total_images,
                vehicle_images_count=vehicles_detected,
                non_vehicle_images_count=non_vehicle_images,
                is_same_vehicle=is_same_vehicle,
                vehicle_type=vehicle_type,
                has_damage=has_damage,
                images_with_damage=images_with_damage,
                damage_details=damage_details,
                damage_summary=damage_summary,
                all_checks_passed=all_checks_passed,
                pipeline_summary=pipeline_summary_text,
            )

            print(f"  Pipeline summary aggregated: all_checks_passed={all_checks_passed}")
            return {"pipeline_summary": pipeline_summary, "status": "aggregating"}

        except Exception as e:
            return {
                "status": "failed",
                "error": f"Failed to aggregate pipeline results: {str(e)}",
                "retry_count": state.retry_count + 1,
            }


    #function to finalize — handle failures or confirm success
    def _finalize_node(self, state: ImagePipelineSummaryAgentState) -> dict:
        """
        Finalize the pipeline summary. If the agent failed after max retries,
        escalate to admin. Otherwise, mark as completed.
        args:
            state: ImagePipelineSummaryAgentState - current state with pipeline_summary
        returns:
            dict - final status update
        """
        if state.status == "failed":
            if state.retry_count >= 3:
                print(f"  [PipelineSummary] Max retries exhausted! Sending claim {state.claim_id} to admin.")

                admin_message = (
                    f"Image Pipeline Summary agent failed after 3 retries for claim {state.claim_id}. "
                    f"Error: {state.error}. "
                    f"The individual agent results may exist in their respective tables, but the "
                    f"pipeline summary could not be generated. Manual review of all image analysis "
                    f"results is required before proceeding to liability assessment."
                )

                try:
                    self._update_claim_status_tool.invoke({
                        "status": "under_review",
                        "ai_verdict": f"Pipeline Summary Failed: {state.error}",
                    })
                    self._log_agent_failure_tool.invoke(admin_message)
                except Exception as e:
                    print(f"  Failed to set under_review status: {str(e)}")

            return {"status": "failed"}

        return {"status": "completed"}


    #function to invoke the pipeline summary agent for a specific claim
    def invoke(self, claim_id: str, user_id: str) -> ImagePipelineSummaryAgentState:
        """Run the full pipeline summary aggregation for a claim."""
        initial_state = ImagePipelineSummaryAgentState(
            claim_id=claim_id,
            user_id=user_id,
        )

        result = self._graph.invoke(initial_state)
        return result

    #function to draw the graph for visualization and debugging purposes
    def build_graph_image(self):
        png_bytes=self._graph.get_graph(xray=True).draw_mermaid_png()
        with open("image_pipeline_summary_agent_graph.png", "wb") as f:
            f.write(png_bytes)
        display(Image(png_bytes))