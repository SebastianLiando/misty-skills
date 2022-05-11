from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app_utils.detector import detect_mobile_phone
from app_utils.image_processing import remove_images, load_image, save_image, resize_image, crop_bbox, unsharp_mask, read_string_in_image
from app_utils.websocket import WSConnectionManager, TOPIC_CONFIRMATION_EMAIL
from database.confirmation_email import ConfirmEmailRepository

import base64
from bson.objectid import ObjectId
from fuzzywuzzy import fuzz

router = APIRouter(
    prefix="/info-session",
    tags=['SCSE Info Session 2022']
)


def extract_name(ocr: str) -> Optional[str]:
    lines = ocr.split("\n")

    for line in lines:
        if "dear " in line.lower():
            # Remove "dear "
            name = line[5:]
            name = name.strip()
            name = name.strip(",")

            return name

    return None


class InfoSessionPayload(BaseModel):
    """Payload for checking in to SCSE info session."""

    image: str
    """Base64 image string."""
    serial: str
    """The robot serial number that captures this image."""


@router.post("/verify")
async def verify_check_in_email(data: InfoSessionPayload):
    robot_serial = data.serial

    manager = WSConnectionManager()
    item_id = ObjectId()  # Generate MongoDB document id
    item_id_str = str(item_id)

    # Load image to memory
    img_bytes = base64.b64decode(data.image)
    original_image = load_image(img_bytes)

    # Save received image
    save_image(original_image, item_id_str, 'original.jpg')
    thumbnail = resize_image(original_image, height=512)
    save_image(thumbnail, item_id_str, 'thumbnail.jpg')

    # Try to detect mobile phone
    detected_phone = detect_mobile_phone(original_image)

    if detected_phone == None:
        print("Mobile phone not detected :(")
        remove_images(item_id_str)
        raise HTTPException(404, "Mobile phone not detected")

    # Crop the image and save it
    xmin, xmax = detected_phone['xmin'], detected_phone['xmax']
    ymin, ymax = detected_phone['ymin'], detected_phone['ymax']

    cropped = crop_bbox(original_image, xmin, xmax, ymin, ymax)
    save_image(cropped, item_id_str, 'cropped.jpg')

    enhanced = unsharp_mask(cropped, round=3)
    save_image(enhanced, item_id_str, 'enhanced.jpg')

    # Get the text in the image
    ocr_result = read_string_in_image(enhanced)
    print(ocr_result.split('\n'))

    # Extract the name, normalize it to lowercase
    fullname = extract_name(ocr_result)

    # TODO: if fullname is null, maybe name is dark mode?

    # If fullname is not detected at all
    if fullname == None:
        raise HTTPException(404, "Email salutation not detected!")

    # Normalize fullname
    fullname = fullname.lower()

    # Find name from database
    confirm_repo = ConfirmEmailRepository()
    confirmation = confirm_repo.get_by_fullname(fullname)

    # Handle minor typos in OCR detection
    THRESHOLD = 90
    if confirmation == None:
        all_items = confirm_repo.list()
        for item in all_items:
            if fuzz.ratio(item.fullname, fullname) > THRESHOLD:
                confirmation = item
                break

    # If name doesn't exist in the database
    if confirmation == None:
        raise HTTPException(404, f"Full name {fullname} not found!")

    # Update database
    if not confirmation.confirmed:
        confirmation.confirmed = True
        confirmation.confirmed_by = robot_serial
        confirmation.confirmed_at = datetime.utcnow()
        confirmation = confirm_repo.save(confirmation)

        # Notify subscribers
        await manager.publish_subscription_data(TOPIC_CONFIRMATION_EMAIL, [confirmation])

    return confirmation.to_json()
