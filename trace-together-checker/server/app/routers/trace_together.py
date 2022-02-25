import base64
import os
from io import BytesIO
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from utils.image_processing import get_image_path

router = APIRouter(
    prefix="/trace-together",
    tags=['TraceTogether']
)


@router.get("/images/{image_id}/{file_name}")
async def get_tt_image(image_id: str, file_name: str):
    """Returns a TraceTogether image.

    Args:
        image_id (str): The image id.
        file_name (str): The actual file name. 

    Raises:
        HTTPException: If the file does not exists.

    Returns:
        The image file.
    """
    # Path of the image
    path = get_image_path(image_id, file_name)
    print(f'Image: {path}')

    # Check if the file exists
    if not os.path.exists(path):
        raise HTTPException(404)

    return FileResponse(path)


def decode_base64(base64_image: str) -> BytesIO:
    decoded_bytes = base64.b64decode(base64_image)
    return BytesIO(decoded_bytes)


class VerificationPayload(BaseModel):
    """Payload for TraceTogether image verification."""

    image: str
    """Base64 image string."""
    serial: str
    """The robot serial number that captures this image."""
