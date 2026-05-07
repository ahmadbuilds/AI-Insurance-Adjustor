from langchain_core.tools import tool
from domain.ports import ClaimRepositoryPort
import asyncio

def make_log_agent_failure_tool(
    claim_repository: ClaimRepositoryPort,
    claim_id: str,
    failed_task: str,
):
    """
    Factory function to create a tool that logs an agent failure to the database 
    and emits a real-time socket.io notification to admins.
    """
    
    @tool(
        "log_agent_failure_tool",
        description="Logs a fatal agent error to the admin notifications system and emits a real-time alert."
    )
    def log_agent_failure(message: str) -> str:
        """
        Tool function to log an agent failure.
        Args:
            message: The full error message detailing why the agent failed.
        Returns:
            str: confirmation message
        """
        # Save to database
        success = claim_repository.save_admin_notification(
            claim_id=claim_id,
            message=message,
            failed_task=failed_task
        )
        
        if not success:
            return "Failed to save admin notification to database."
        
        try:
            import os
            import requests
            api_url = os.getenv("BACKEND_API_URL", "http://127.0.0.1:8000")
            requests.post(
                f"{api_url}/api/internal/emit-agent-failure",
                json={"claim_id": claim_id, "failed_task": failed_task, "message": message},
                timeout=5
            )
        except Exception as e:
            print(f"Failed to emit admin notification: {e}")
            
        return f"Agent failure logged successfully."

    return log_agent_failure
