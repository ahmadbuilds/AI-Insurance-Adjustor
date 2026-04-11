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
