from dataclasses import dataclass
from enum import Enum
from datetime import datetime
from typing import Optional
from bson.objectid import ObjectId
from .mongo import MongoRepository, DEFAULT_CLIENT, DB_NAME, Singleton
from pymongo import MongoClient, ASCENDING


class RobotState(Enum):
    OFFLINE = 'OFFLINE'
    """Robot is offline."""
    PENDING = 'PENDING'
    """Robot needs to be assigned a location."""
    IDLE = 'IDLE'
    """Robot is idle."""
    ENGAGING = 'ENGAGING'
    """Robot detects nearby user and is detecting cell phone."""
    CAPTURING = 'CAPTURING'
    """Robot is taking a picture."""
    VERIFYING = 'VERIFYING'
    """Robot is verifying TraceTogether check-in certificate."""
    REJECT = 'REJECT'
    """Robot rejects the user's TraceTogether certificate."""
    ACCEPT = 'ACCEPT'
    """Robot accepts the user's TraceTogether certificate."""


@dataclass
class Robot:
    id: str
    serial: str
    location: str
    current_state: RobotState
    state_updated_at: datetime

    def to_json(self) -> dict:
        json = {
            'serial': self.serial,
            'location': self.location,
            'current_state': self.current_state.value,
            'state_updated_at': self.state_updated_at
        }

        if self.id != '':
            json['_id'] = self.id

        return json

    @staticmethod
    def from_json(json: dict):
        return Robot(
            id=str(json['_id']),
            serial=json['serial'],
            location=json['location'],
            current_state=RobotState(json['current_state']),
            state_updated_at=json['state_updated_at']
        )


class RobotRepository(MongoRepository, metaclass=Singleton):
    def __init__(self, client: MongoClient = DEFAULT_CLIENT, db_name: str = DB_NAME) -> None:
        super().__init__(client, db_name)

        # Create unique index on the serial number.
        self.collection.create_index(
            [("serial", ASCENDING), ],
            unique=True,
        )

    @property
    def collection_name(self) -> str:
        return "robots"

    def to_json(self, item: Robot):
        return item.to_json()

    def from_json(self, json):
        return Robot.from_json(json)

    def get_by_serial(self, serial: str) -> Optional[Robot]:
        doc = self.collection.find_one({'serial': serial})
        if doc is None:
            return None

        return self.from_json(doc)

    def register(self, serial: str) -> Robot:
        new_robot = Robot(
            id='',
            serial=serial,
            location='',
            # When a new robot is registered, it is in pending state
            # waiting for an administrator to assign location.
            current_state=RobotState.PENDING,
            state_updated_at=datetime.utcnow()
        )

        return self.save(new_robot)

    def _set_state(self, robot: Robot, state: RobotState):
        robot.current_state = state
        robot.state_updated_at = datetime.utcnow()

        return robot

    def update_state(self, serial: str, state: RobotState) -> Robot:
        robot = self.get_by_serial(serial)
        self._set_state(robot, state)

        return self.save(robot)

    def update_location(self, serial: str, location: str) -> Robot:
        robot = self.get_by_serial(serial)

        # If this is the first time assigning location, go to IDLE state from PENDING state.
        if robot.location == '':
            self._set_state(robot, RobotState.IDLE)

        robot.location = location.upper()

        return self.save(robot)
