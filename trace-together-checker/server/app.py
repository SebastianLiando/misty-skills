import os
import fastapi
from datetime import datetime
from pydantic import BaseModel
from io import BytesIO
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from ws import WSConnectionManager
import uvicorn
import pytesseract

import base64

from validator import is_date_valid, is_location_valid, is_check_in, is_safe_entry
from detector import detect_mobile_phone
from image_processing import crop_bbox, save_image, unsharp_mask, load_image, color_correct, get_green_ratio
from config import get_location_for_robot

app = FastAPI()
manager = WSConnectionManager()


@app.get("/")
async def home():
    return {"Server": True}


@app.websocket('/')
async def websocket_endpoint(socket: WebSocket):
    await manager.connect(socket)
    print(f'Client connected.')

    try:
        while True:
            await socket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(socket)
        print('Client disconnected.')


class RobotState(BaseModel):
    robot_id: str
    state: str


@app.post('/state')
async def robot_state_update(data: RobotState):
    body = {
        'type': 'ROBOT_STATE',
        'data': data.json()
    }

    await manager.broadcast_json(body)


class TraceTogetherImage(BaseModel):
    image: str
    serial: str


def decode_base64(base64_image: str) -> BytesIO:
    decoded_bytes = base64.b64decode(base64_image)
    return BytesIO(decoded_bytes)


@app.post('/check')
def check_trace_together(data: TraceTogetherImage):
    # Save the base64 image.
    time = datetime.now().timestamp()
    img_path = os.getcwd() + \
        f"/trace-together-checker/server/images/{time}"
    os.makedirs(img_path)
    img_bytes = base64.b64decode(data.image)

    # Write image to file
    with open(f'{img_path}/original.jpg', 'wb+') as f:
        f.write(img_bytes)

    # Load image to memory
    image = load_image(f'{img_path}/original.jpg')

    # Try to detect mobile phone
    detected_phone = detect_mobile_phone(image)

    if detected_phone == None:
        raise fastapi.HTTPException(
            status_code=404, detail="Mobile phone not detected")

    # Crop the image and save it
    xmin, xmax = detected_phone['xmin'], detected_phone['xmax']
    ymin, ymax = detected_phone['ymin'], detected_phone['ymax']

    cropped = crop_bbox(image, xmin, xmax, ymin, ymax)
    enhanced = unsharp_mask(cropped, round=4)
    save_image(cropped, path=f'{img_path}/cropped.jpg')
    save_image(enhanced, path=f'{img_path}/enhanced.jpg')

    # Get the text in the image
    result = pytesseract.image_to_string(
        enhanced,
        lang="eng",  # Language is English
        config='--oem 1'  # Use Mode 1: LSTM only
    )
    print(result.split('\n'))

    # Check vaccination status
    color_corrected = color_correct(cropped)
    ratio, mask = get_green_ratio(color_corrected, diff=50)
    save_image(mask, f"{img_path}/mask.jpg")
    print(ratio)
    vaccinated = ratio > 0.35

    # Check if it's a SafeEntry
    safe_entry = is_safe_entry(result)

    # Check if it's check in
    check_in = is_check_in(result)

    # Check the date
    date_valid = is_date_valid(result)

    # Check the location
    assigned_location = get_location_for_robot(data.serial)
    location_valid = is_location_valid(result, assigned_location)

    response = {
        "dateValid": date_valid,
        'locationValid': location_valid,
        'location': assigned_location,
        "checkIn": check_in,
        "safeEntry": safe_entry,
        'vaccinated': vaccinated,
    }

    print(response)
    return response


if __name__ == "__main__":
    # Run this script on port 8000 (default port number)
    uvicorn.run("app:app", host="0.0.0.0")
