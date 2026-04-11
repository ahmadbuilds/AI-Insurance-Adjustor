from langchain_core.tools import tool
from domain.ports import ClaimRepositoryPort


#wrapper function to fetch all image pipeline agent results for a claim
def make_fetch_pipeline_results_tool(
    claim_repository: ClaimRepositoryPort,
    claim_id: str,
):
    @tool(
        "fetch_pipeline_results",
        description="Fetches results from all image pipeline agents (classification, same vehicle, vehicle type, damage detection) for the current claim. No input is required.",
    )
    def fetch_pipeline_results() -> dict:
        """
        Tool function to fetch all image pipeline agent results for the current claim.
        Returns:
            dict: A dictionary with keys 'classification', 'same_vehicle', 'vehicle_type',
                  'damage_detection', each containing the respective agent's result dict or None.
        """
        classification = claim_repository.fetch_classification_result(claim_id)
        same_vehicle = claim_repository.fetch_same_vehicle_result(claim_id)
        vehicle_type = claim_repository.fetch_vehicle_type_result(claim_id)
        damage_detection = claim_repository.fetch_damage_detection_result(claim_id)

        return {
            "classification": classification,
            "same_vehicle": same_vehicle,
            "vehicle_type": vehicle_type,
            "damage_detection": damage_detection,
        }

    return fetch_pipeline_results
