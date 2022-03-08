from typing import Optional
from database.robot import RobotRepository, RobotState, Robot
from app_utils.websocket import WSConnectionManager, TOPIC_ROBOT
from fastapi import APIRouter, HTTPException

from pydantic import BaseModel

router = APIRouter(
    prefix="/robot",
    tags=['Robot']
)


async def _notify_robot_subscribers(robot: Robot):
    """Notify all subscribers of robot topic."""
    manager = WSConnectionManager()
    await manager.publish_subscription_data(TOPIC_ROBOT, robot)


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
