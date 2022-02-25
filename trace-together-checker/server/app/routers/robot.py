from database.robot import RobotRepository, RobotState
from fastapi import APIRouter

router = APIRouter(
    prefix="/robot",
    tags=['Robot']
)


@router.get('/{serial}')
async def register_robot(serial):
    repo = RobotRepository()
    robot = repo.get_by_serial(serial)

    # New robot - create new
    if robot is None:
        robot = repo.register(serial)
    else:
        # Existing robot - update the state
        new_state = RobotState.IDLE if robot.location != '' else RobotState.PENDING
        repo.update_state(robot.serial, new_state)

    return robot.to_json()
