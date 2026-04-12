import json
from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field
from domain.ports import ClaimRepositoryPort

class FetchRAGDataInput(BaseModel):
    claim_id: str = Field(description="The unique identifier for the claim")

def create_fetch_rag_data_tool(claim_repo: ClaimRepositoryPort) -> StructuredTool:
    """
    Creates a LangChain tool to fetch the required context for the RAG agent (claim details, pipeline summary, liability result).
    """

    def fetch_rag_data(claim_id: str) -> str:
        """
        Fetches the claim details, image pipeline summary, and liability assessment result from the database to be used as context for the RAG agent.
        """
        try:
            claim_details = claim_repo.fetch_claim_details(claim_id)
            if not claim_details:
                return f"Error: Claim {claim_id} not found."

            pipeline_result = claim_repo.fetch_image_pipeline_result(claim_id)
            liability_result = claim_repo.fetch_liability_result(claim_id)

            result = {
                "claim_details": claim_details,
                "pipeline_result": pipeline_result if pipeline_result else "No pipeline summary available.",
                "liability_result": liability_result if liability_result else "No liability assessment available."
            }
            return json.dumps(result, indent=2)
            
        except Exception as e:
            return f"Error fetching RAG data for claim {claim_id}: {str(e)}"

    return StructuredTool.from_function(
        func=fetch_rag_data,
        name="fetch_rag_data",
        description="Fetches claim details, pipeline summary, and liability assessment results for a given claim ID.",
        args_schema=FetchRAGDataInput
    )
