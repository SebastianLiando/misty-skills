from datetime import datetime
import mongomock
import pytest
import pymongo
from bson import ObjectId
from app.database.robot import RobotState, RobotRepository
from app.database.mongo import DB_NAME

robots = [
    {
        "_id": ObjectId('5edf1cd43260aab97ea0d588'),
        'serial': '123',
        'location': '',
        'current_state': RobotState.PENDING.value,
        'state_updated_at': datetime(2000, 1, 1)
    },
    {
        "_id": ObjectId('5edf1cd43260aab97ea0d589'),
        'serial': '456',
        'location': '',
        'current_state': RobotState.PENDING.value,
        'state_updated_at': datetime(2000, 1, 1)
    },
]


@mongomock.patch(servers=(("localhost", 27017),))
@pytest.fixture
def repo():
    client = pymongo.MongoClient('localhost', 27017)
    db = client.get_database(DB_NAME)
    db.robots.insert_many(robots)

    yield RobotRepository(client=client)

    db.robots.drop()


def test_get_by_serial(repo):
    serial = '123'

    assert repo.get_by_serial(serial).serial == serial


def test_register_robot_set_states_to_pending(repo):
    assert repo.register('91011').current_state == RobotState.PENDING


def test_update_state(repo):
    robot = repo.update_state(robots[0]['serial'], RobotState.ACCEPT)

    assert robot.current_state == RobotState.ACCEPT and \
        robot.state_updated_at.timestamp(
        ) > robots[0]['state_updated_at'].timestamp()


def test_update_location_sets_to_uppercase(repo):
    location = 'hello-world'
    expected_location = 'HELLO-WORLD'
    robot = repo.update_location(robots[0]['serial'], location)

    assert robot.location == expected_location and robot.location.isupper()


def test_update_location_first_time_sets_state_to_idle(repo):
    repo.update_state(robots[0]['serial'], RobotState.PENDING)
    robot = repo.update_location(robots[0]['serial'], 'something')

    assert robot.current_state == RobotState.IDLE
