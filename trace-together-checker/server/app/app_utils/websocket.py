from datetime import datetime
from typing import Set
from fastapi import WebSocket
import json
from dependencies import Singleton
from database.robot import Robot
from database.verification import Verification

from enum import Enum
from collections import defaultdict


class MessageTypes(Enum):
    SUBSCRIBE = 'SUBSCRIBE'
    UNSUBSCRIBE = 'UNSUBSCRIBE'
    SUBSCRIPTION_DATA = 'SUBSCRIPTION_DATA'
    CONNECTED = 'CONNECTED'


TOPIC_ROBOT = 'ROBOT'
TOPIC_VERIFICATION = 'VERIFICATION'


class AppEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, datetime):
            return o.isoformat()
        elif isinstance(o, Enum):
            return o.value
        elif isinstance(o, (Robot, Verification)):
            return o.to_json()

        return super().default(o)


class WSConnectionManager(metaclass=Singleton):
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

        self.subscriptions = defaultdict(lambda: set())

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

        # Remove from all subscriptions
        for topic in self.subscriptions.keys():
            if websocket in self.subscriptions[topic]:
                self.unsubscribe(topic, websocket)

    def subscribe(self, topic: str, websocket: WebSocket):
        self.subscriptions[topic.upper()].add(websocket)
        print(f'Client subscribed to {topic}')

    def unsubscribe(self, topic: str, websocket: WebSocket):
        self.subscriptions[topic.upper()].remove(websocket)
        print(f'Client unsubscribed from {topic}')

    def _json_to_str(self, body) -> str:
        return json.dumps(body, cls=AppEncoder)

    async def publish(self, topic: str, body):
        message = self._json_to_str(body)
        for subscriber in self.subscriptions[topic]:
            await self.send_personal_message(message, subscriber)

    async def publish_subscription_data(self, topic: str, data):
        body = {
            'type': MessageTypes.SUBSCRIPTION_DATA.value,
            'data': {
                'topic': topic,
                'data': data
            }
        }

        await self.publish(topic, body)

    async def send_personal_message(self, message, websocket: WebSocket):
        body = message if isinstance(message, str) else \
            self._json_to_str(message)

        await websocket.send_text(body)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

    async def broadcast_json(self, body: dict):
        json_str = self._json_to_str(body)
        await self.broadcast(json_str)
