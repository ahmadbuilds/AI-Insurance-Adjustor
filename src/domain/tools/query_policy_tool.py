import json
from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field
from domain.ports import PolicyRetrievalPort

class QueryPolicyInput(BaseModel):
    query: str = Field(description="The search query to match against the policy document (e.g., 'water damage coverage limitations' or 'car bumper collision deductible')")
    k: int = Field(default=5, description="Number of policy sections to retrieve. Default is 5.")

def create_query_policy_tool(policy_retrieval_port: PolicyRetrievalPort) -> StructuredTool:
    """
    Creates a LangChain tool to query the insurance policy vector store.
    """

    def query_policy(query: str, k: int = 5) -> str:
        """
        Queries the ChromaDB vector store for relevant policy sections based on the search query.
        """
        try:
            results = policy_retrieval_port.query_policy(query, k=k)
            if not results:
                return "No relevant policy sections found for the query."
            
            formatted_results = []
            for i, result in enumerate(results):
                formatted_results.append(f"--- Document Section {i+1} ---\n{result['content']}")
            
            return "\n\n".join(formatted_results)
        except Exception as e:
            return f"Error querying policy vector store: {str(e)}"

    return StructuredTool.from_function(
        func=query_policy,
        name="query_policy",
        description="Searches the insurance policy document for specific coverage clauses, limits, or terms.",
        args_schema=QueryPolicyInput
    )
