from matplotlib.image import thumbnail
from app_utils.validator import is_check_in, is_safe_entry, is_date_valid, is_location_valid
from app_utils.detector import detect_mobile_phone
import base64
import os
from io import BytesIO
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app_utils.image_processing import get_trace_together_image_path, load_image, save_image, resize_image, crop_bbox, color_correct, get_green_ratio, unsharp_mask, read_string_in_image
from database.robot import RobotRepository
from database.verification import Verification, VerificationRepository

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
    path = get_trace_together_image_path(image_id, file_name)
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


@router.post('/verify')
async def check_trace_together(data: VerificationPayload):
    # Ensure robot is assigned location
    robot_repo = RobotRepository()
    robot = robot_repo.get_by_serial(data.serial)

    if robot is None:
        raise HTTPException(404, f'No robot with the serial {data.serial}')

    if robot.location == '':
        raise HTTPException(
            400, 'This robot has not been assigned a location!')

    assigned_location = robot.location

    # Load image to memory
    img_bytes = base64.b64decode(data.image)
    original_image = load_image(img_bytes)

    # Try to detect mobile phone
    detected_phone = detect_mobile_phone(original_image)

    if detected_phone == None:
        raise HTTPException(
            status_code=404, detail="Mobile phone not detected")

    # Crop the image and save it
    xmin, xmax = detected_phone['xmin'], detected_phone['xmax']
    ymin, ymax = detected_phone['ymin'], detected_phone['ymax']

    cropped = crop_bbox(original_image, xmin, xmax, ymin, ymax)
    enhanced = unsharp_mask(cropped, round=4)

    # Get the text in the image
    ocr_result = read_string_in_image(enhanced)
    print(ocr_result.split('\n'))

    # Check vaccination status
    color_corrected = color_correct(cropped)
    green_ratio, mask = get_green_ratio(color_corrected, diff=50)
    print(green_ratio)
    vaccinated = green_ratio > 0.35

    # Check if it's a SafeEntry
    safe_entry = is_safe_entry(ocr_result)

    # Check if it's check in
    check_in = is_check_in(ocr_result)

    # Check the date
    date_valid, detected_date = is_date_valid(ocr_result)

    # Check the location
    location_valid, detected_location = is_location_valid(
        ocr_result, assigned_location)

    verification = Verification(
        id='',
        robot_serial=data.serial,
        created_at=None,  # Will be replaced after persisting to database,
        raw_ocr=ocr_result,
        detected_date=detected_date,
        date_valid=date_valid,
        location_detected=detected_location,
        location_actual=assigned_location,
        location_valid=location_valid,
        check_in=check_in,
        safe_entry=safe_entry,
        green_ratio=green_ratio,
        fully_vaccinated=vaccinated
    )
    verification_repo = VerificationRepository()
    verification: Verification = verification_repo.save(verification)

    # Save images
    save_image(original_image, verification.id, 'original.jpg')
    save_image(cropped, verification.id, 'cropped.jpg')
    save_image(enhanced, verification.id, 'enhanced.jpg')
    save_image(mask, verification.id, 'mask.jpg')

    # Save thumbnail image
    thumbnail = resize_image(original_image, height=512)
    save_image(thumbnail, verification.id, 'thumbnail.jpg')

    response = verification.to_json()

    print(response)
    return response
