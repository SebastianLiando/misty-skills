from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app_utils.websocket import WSConnectionManager, MessageTypes
from database.robot import RobotRepository
from database.verification import VerificationRepository
import json

manager = WSConnectionManager()
router = APIRouter(prefix='/ws', tags=['WebSocket'])

TOPIC_ROBOT = 'ROBOT'
TOPIC_VERIFICATION = 'VERIFICATION'

async def process_topic_data(client: WebSocket, message_type: str, verifications: dict):
    try:
        parsed = MessageTypes(message_type.upper())
    except Exception:
        return

    if parsed == MessageTypes.SUBSCRIBE:
        # Add to subscriber list
        topic = verifications['topic'].upper()
        manager.subscribe(topic, client)

        # Publish the initial data
        if topic == TOPIC_ROBOT:
            repo = RobotRepository()
            robots = repo.list()
            robots = list(map(lambda r: r.to_json(), robots))
            await manager.send_personal_message(robots, client)
        elif topic == TOPIC_VERIFICATION:
            repo = VerificationRepository()
            verifications = repo.list()
            await manager.send_personal_message(verifications, client)
    elif parsed == MessageTypes.UNSUBSCRIBE:
        topic = verifications['topic'].upper()
        manager.unsubscribe(topic, client)


@router.websocket('/')
async def connect_websocket(socket: WebSocket):
    await manager.connect(socket)
    print(f'Client connected.')

    try:
        while True:
            message = await socket.receive_text()
            body = json.loads(message)

            topic = body['type']
            data = body['data']

            await process_topic_data(socket, topic, data)

    except WebSocketDisconnect:
        manager.disconnect(socket)
        print('Client disconnected.')
