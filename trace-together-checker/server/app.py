from speech_recognition import Recognizer, AudioFile
from datetime import datetime
from os import getcwd
import re
from pydantic import BaseModel
from io import BytesIO
from PIL import Image
from fastapi import FastAPI
import uvicorn
import pytesseract

import base64

app = FastAPI()


@app.get("/")
def home():
    return {"Server": True}


class TraceTogetherImage(BaseModel):
    image: str


def decode_base64(base64_image: str) -> BytesIO:
    decoded_bytes = base64.b64decode(base64_image)
    return BytesIO(decoded_bytes)


def is_date_valid(ocr_result: str) -> bool:
    """Returns `true` if the date is valid. Date is valid if it matches today.

    Args:
        ocr_result (str): The result of OCR.

    Returns:
        bool: `true` if the date is valid.
    """
    DATE_PATTERN = r"\d{1,2} \w{3} \d{4}"
    dates = re.findall(DATE_PATTERN, ocr_result)

    if (len(dates) == 0):
        return False

    date_str = dates[0]
    date = datetime.strptime(date_str, "%d %b %Y").date()
    date_now = datetime.now().date()
    return date == date_now


@app.post('/check')
def check_trace_together(data: TraceTogetherImage):
    # Convert base 64 string into PIL Image
    image_file = decode_base64(data.image)
    image = Image.open(image_file)

    # Save image as a reference
    image.save(getcwd() + "/trace-together-checker/server/image.jpg")

    # Get the text in the image
    result = pytesseract.image_to_string(image, lang="eng")
    print(result)

    # Check if it's a SafeEntry
    safe_entry = result.find("SafeEntry") != -1

    # Check if it's check in
    check_in = result.find("Check-in") != -1

    # Check the date
    date_valid = is_date_valid(result)

    return {
        "date_valid": date_valid,
        "check_in": check_in,
        "safe_entry": safe_entry
    }


class AudioData(BaseModel):
    audio: str


def recognize_speech_with_sphinx(audio: AudioFile, lang="en-US") -> str:
    speech_recognizer = Recognizer()

    # Do speech recognition
    with audio as source:
        audio_data = speech_recognizer.record(source)

    return speech_recognizer.recognize_sphinx(audio_data)


@app.post("/speech")
def check_speech(data: AudioData):
    # Get audio file
    audio_file = decode_base64(data.audio)

    # Save it as a reference
    file_path = getcwd() + "/trace-together-checker/server/audio.wav"
    with open(file_path, 'wb+') as f:
        f.write(audio_file.getvalue())

    # Do speech recognition
    audio = AudioFile(audio_file)
    speech_text = recognize_speech_with_sphinx(audio)

    print('Speech: ' + speech_text)

    return {
        "speech": speech_text
    }


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0")
