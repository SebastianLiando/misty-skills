from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app_utils.websocket import WSConnectionManager

manager = WSConnectionManager()
router = APIRouter(prefix='/ws', tags=['WebSocket'])


@router.websocket('/')
async def connect_websocket(socket: WebSocket):
    await manager.connect(socket)
    print(f'Client connected.')

    try:
        while True:
            await socket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(socket)
        print('Client disconnected.')
