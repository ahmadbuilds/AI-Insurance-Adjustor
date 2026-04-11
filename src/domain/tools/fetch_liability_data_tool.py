from langchain_core.tools import tool
from domain.ports import ClaimRepositoryPort


#wrapper function to fetch claim details and image pipeline result for liability assessment
def make_fetch_liability_data_tool(
    claim_repository: ClaimRepositoryPort,
    claim_id: str,
):
    @tool(
        "fetch_liability_data",
        description="Fetches the claim details (title, description) and the image pipeline summary result for the current claim. No input is required.",
    )
    def fetch_liability_data() -> dict:
        """
        Tool function to fetch all data needed by the liability agent.
        Returns:
            dict: A dictionary with keys 'claim_details' and 'pipeline_result',
                  each containing the respective data dict or None.
        """
        claim_details = claim_repository.fetch_claim_details(claim_id)
        pipeline_result = claim_repository.fetch_image_pipeline_result(claim_id)

        return {
            "claim_details": claim_details,
            "pipeline_result": pipeline_result,
        }

    return fetch_liability_data
