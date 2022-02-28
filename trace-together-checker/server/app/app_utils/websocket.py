from datetime import datetime
from typing import Set
from fastapi import WebSocket
import json
from dependencies import Singleton

from enum import Enum
from collections import defaultdict


class MessageTypes(Enum):
    SUBSCRIBE = 'SUBSCRIBE'
    UNSUBSCRIBE = 'UNSUBSCRIBE'


class DateTimeEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, datetime):
            return o.isoformat()

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

        # Remove from subscriptions
        for topic in MessageTypes:
            self.subscriptions[topic].discard(topic)

    def subscribe(self, topic: str, websocket: WebSocket):
        self.subscriptions[topic].add(websocket)
        print(f'Client subscribed to {topic}')

    def unsubscribe(self, topic: str, websocket: WebSocket):
        self.subscriptions[topic].remove(websocket)
        print(f'Client unsubscribed from {topic}')

    def _json_to_str(self, body) -> str:
        return json.dumps(body, cls=DateTimeEncoder)

    async def publish(self, topic: str, data):
        message = self._json_to_str(data)
        for subscriber in self.subscriptions[topic]:
            await self.send_personal_message(message, subscriber)

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
