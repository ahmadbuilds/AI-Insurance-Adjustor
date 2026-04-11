from langchain_core.tools import tool
from domain.ports import ClaimRepositoryPort
from infrastructure.socket.socket_server import emit_agent_failure
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
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(emit_agent_failure(claim_id, failed_task, message))
            else:
                asyncio.run(emit_agent_failure(claim_id, failed_task, message))
        except RuntimeError:
            asyncio.run(emit_agent_failure(claim_id, failed_task, message))
            
        return f"Agent failure logged successfully."

    return log_agent_failure
