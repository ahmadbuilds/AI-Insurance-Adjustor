import socketio

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio)

@sio.event
async def connect(sid, environ):
    print(f"Socket connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Socket disconnected: {sid}")

async def emit_agent_failure(claim_id: str, failed_task: str, message: str):
    """
    Emit a real-time event to all connected admin clients that an agent has failed
    and requires manual intervention.
    """
    await sio.emit("agent_failure", {
        "claim_id": claim_id,
        "failed_task": failed_task,
        "message": message,
    })
    print(f"Emitted agent_failure for claim {claim_id} via Socket.IO")

async def emit_liability_review(claim_id: str, confidence_percentage: int, recommendation: str, reasoning: str):
    """
    Emit a real-time event to all connected admin clients that a claim
    requires manual liability review due to low confidence.
    """
    await sio.emit("liability_review", {
        "claim_id": claim_id,
        "confidence_percentage": confidence_percentage,
        "recommendation": recommendation,
        "reasoning": reasoning,
    })
    print(f"Emitted liability_review for claim {claim_id} via Socket.IO")
