from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app_utils.websocket import WSConnectionManager, MessageTypes, TOPIC_ROBOT, TOPIC_VERIFICATION
from database.robot import RobotRepository
from database.verification import VerificationRepository
import json

manager = WSConnectionManager()
router = APIRouter(prefix='/ws', tags=['WebSocket'])


async def process_topic_data(client: WebSocket, message_type: str, data: dict):
    try:
        parsed = MessageTypes(message_type.upper())
    except Exception:
        return

    if parsed == MessageTypes.SUBSCRIBE:
        # Add to subscriber list
        topic = data['topic'].upper()
        manager.subscribe(topic, client)

        # Publish the initial data
        if topic == TOPIC_ROBOT:
            repo = RobotRepository()
            robots = repo.list()
            await manager.publish_subscription_data(TOPIC_ROBOT, robots)
        elif topic == TOPIC_VERIFICATION:
            repo = VerificationRepository()
            verifications = repo.list()
            await manager.send_personal_message(verifications, client)
    elif parsed == MessageTypes.UNSUBSCRIBE:
        topic = data['topic'].upper()
        manager.unsubscribe(topic, client)


@router.websocket('/')
async def connect_websocket(socket: WebSocket):
    await manager.connect(socket)
    print(f'Client connected.')

    # Notify client that you are connected
    await manager.send_personal_message({
        'type': MessageTypes.CONNECTED,
        'data': {}
    }, socket)

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
