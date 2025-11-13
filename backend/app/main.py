import socketio
from fastapi import FastAPI
from app.events import register_socketio_events

sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins="*"
)

app = FastAPI()

socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

register_socketio_events(sio)

@app.get("/")
async def root():
    return {"message": "Socket.IO Chat Backend Running"}