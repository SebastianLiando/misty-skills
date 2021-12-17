import os
from typing import List
import json
import wave
import fastapi
from vosk import Model, KaldiRecognizer
from speech_recognition import Recognizer, AudioFile
from datetime import datetime
import re
from pydantic import BaseModel
from io import BytesIO
from fastapi import FastAPI
import uvicorn
import pytesseract

import base64

from image_processing import crop_bbox, detect_mobile_phone, save_image, simple_thresholding, unsharp_mask

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
    # Find the date string.
    DATE_PATTERN = r"\d{1,2} \w{3}"
    dates = re.findall(DATE_PATTERN, ocr_result)

    if (len(dates) == 0):
        return False

    # Parse the detected date
    detected_date = dates[0]
    detected_date = datetime.strptime(detected_date, "%d %b").date()
    print(f'Detected date: {detected_date}')

    # Compare the day and month
    date_now = datetime.now().date()
    return date_now.day == detected_date.day and date_now.month == detected_date.month


@app.post('/check')
def check_trace_together(data: TraceTogetherImage):
    # Save the base64 image.
    time = datetime.now().timestamp()
    img_path = os.getcwd() + \
        f"/trace-together-checker/server/images/{time}.jpg"
    img_bytes = base64.b64decode(data.image)

    with open(img_path, 'wb+') as f:
        f.write(img_bytes)

    # Try to detect mobile phone
    detected_phone = detect_mobile_phone(img_path)

    if detected_phone == None:
        raise fastapi.HTTPException(
            status_code=400, detail="Mobile phone not detected")

    # Crop the image and save it
    xmin, xmax = detected_phone['xmin'], detected_phone['xmax']
    ymin, ymax = detected_phone['ymin'], detected_phone['ymax']

    cropped = crop_bbox(img_path, xmin, xmax, ymin, ymax)
    enhanced = unsharp_mask(cropped, round=3)
    save_image(enhanced, path=img_path)

    # Get the text in the image
    result = pytesseract.image_to_string(enhanced, lang="eng")
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
        # Add this code to remove background noise
        # speech_recognizer.adjust_for_ambient_noise(source)
        audio_data = speech_recognizer.record(source)

    return speech_recognizer.recognize_sphinx(audio_data, lang)


def recognize_speech_with_vosk(wf) -> str:
    model = Model('trace-together-checker/server/model')
    recognizer = KaldiRecognizer(model, wf.getframerate())
    recognizer.SetWords(True)

    text_lst = []
    p_text_lst = []
    p_str = []
    len_p_str = []
    while True:
        data = wf.readframes(4000)
        if len(data) == 0:
            break
        if recognizer.AcceptWaveform(data):
            text_lst.append(recognizer.Result())
            # print(recognizer.Result())
        else:
            p_text_lst.append(recognizer.PartialResult())
            # print(recognizer.PartialResult())

    if len(text_lst) != 0:
        jd = json.loads(text_lst[0])
        txt_str = jd["text"]

    elif len(p_text_lst) != 0:
        for i in range(0, len(p_text_lst)):
            temp_txt_dict = json.loads(p_text_lst[i])
            p_str.append(temp_txt_dict['partial'])

        len_p_str = [len(p_str[j]) for j in range(0, len(p_str))]
        max_val = max(len_p_str)
        indx = len_p_str.index(max_val)
        txt_str = p_str[indx]

    else:
        txt_str = ''

    return txt_str


@app.post("/speech")
def check_speech(data: AudioData):
    # Get audio file
    audio_file = decode_base64(data.audio)

    # Save it as a reference
    file_path = os.getcwd() + "/trace-together-checker/server/audio.wav"
    with open(file_path, 'wb+') as f:
        f.write(audio_file.getvalue())

    # Do speech recognition with CMU Sphinx
    audio = AudioFile(audio_file)
    speech_text = recognize_speech_with_sphinx(audio)
    print('CMU Sphinx: ' + speech_text)

    # Do speech recognition with Vosk
    with wave.open("trace-together-checker/server/audio.wav", 'rb') as wf:
        speech_text = recognize_speech_with_vosk(wf)
    print('Vosk: ' + speech_text)

    return {
        "speech": speech_text
    }


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0")
