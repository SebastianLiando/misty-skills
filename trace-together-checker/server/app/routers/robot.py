from typing import Dict, Optional
from database.robot import RobotRepository, RobotState, Robot
from app_utils.websocket import WSConnectionManager, TOPIC_ROBOT
from fastapi import APIRouter, HTTPException
import asyncio

from pydantic import BaseModel

router = APIRouter(
    prefix="/robot",
    tags=['Robot']
)


async def _notify_robot_subscribers(robot: Robot):
    """Notify all subscribers of robot topic."""
    manager = WSConnectionManager()
    await manager.publish_subscription_data(TOPIC_ROBOT, robot)

heartbeats: Dict[str, asyncio.Task] = {}


async def _heartbeat_timeout(*args):
    serial = args[0]

    # Timeout in 10 seconds
    await asyncio.sleep(10)

    repo = RobotRepository()
    robot = repo.update_state(serial, RobotState.OFFLINE)
    await _notify_robot_subscribers(robot)
    print(f'{serial} is now offline')


def restart_heartbeat_timer(serial):
    """Restarts the timeout timer for the serial number.
    If there is no ongoing timer, this function starts a new one."""

    # Stop ongoing timer if any
    if serial in heartbeats.keys():
        heartbeats[serial].cancel()

    # Create and start a new timer
    timer = asyncio.create_task(_heartbeat_timeout(serial))
    heartbeats[serial] = timer

    print(f'({serial}): Starting timer')


@router.get('/{serial}')
async def register_robot(serial):
    repo = RobotRepository()
    robot = repo.get_by_serial(serial)

    # New robot - create new
    if robot is None:
        robot = repo.register(serial)
    else:
        # Existing robot - update the state
        # If location has been assigned, immediately skip to idle state.
        new_state = RobotState.IDLE if robot.location != '' else RobotState.PENDING
        robot = repo.update_state(robot.serial, new_state)

    await _notify_robot_subscribers(robot)
    restart_heartbeat_timer(robot.serial)

    return robot.to_json()


class UpdateRobotPayload(BaseModel):
    location: Optional[str]
    state: Optional[RobotState]


@router.post("/{serial}")
async def update_robot(serial: str, payload: UpdateRobotPayload):
    repo = RobotRepository()
    robot = repo.get_by_serial(serial)

    if robot is None:
        raise HTTPException(
            status_code=404, detail=f'Robot with the serial {serial} not found!')

    new_state = payload.state
    if new_state is not None:
        robot = repo.update_state(serial, new_state)
        print(f'State update for {robot.serial}: {robot.current_state}')

        # State updates are sent only from the robot.
        # Therefore, if this branch is called, the robot is publishing its state, i.e. online
        restart_heartbeat_timer(robot.serial)

    new_location = payload.location
    if new_location is not None:
        new_location = new_location.strip()
        if new_location == '':
            raise HTTPException(
                status_code=400, detail="Location cannot be empty!")

        robot = repo.update_location(serial, new_location)

    if new_state is None and new_location is None:
        raise HTTPException(
            status_code=400, detail='Nothing to update! Please specify location or state update.')

    await _notify_robot_subscribers(robot)
    return robot.to_json()


class HeartbeatPayload(BaseModel):
    serial: str


@router.post('/heartbeat')
async def heartbeat(payload: HeartbeatPayload):
    serial = payload.serial
    restart_heartbeat_timer(serial)
    print(f'Heartbeat for {serial}')

    return {
        'heartbeat': True,
        'serial': serial
    }
