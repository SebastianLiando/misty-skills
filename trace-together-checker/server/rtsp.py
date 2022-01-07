import cv2
from detector import detect_mobile_phone
from validator import is_location_valid
from image_processing import crop_bbox, unsharp_mask, save_image, color_correct, get_green_ratio
import time
import pytesseract
import threading

frame = None


def find_mobile_phone():
    while True:
        if not (frame is None):
            frame_final = frame

            detected = detect_mobile_phone(frame_final)

            if not (detected is None):
                xmin, xmax = detected['xmin'], detected['xmax']
                ymin, ymax = detected['ymin'], detected['ymax']

                cropped = crop_bbox(frame_final, xmin, xmax, ymin, ymax)
                enhanced = unsharp_mask(cropped, round=3)
                # enhanced = cv2.GaussianBlur(enhanced, (3, 3), 1)
                save_image(enhanced, 'from_av.jpg')

                ocr_result: str = pytesseract.image_to_string(enhanced)
                print(ocr_result)

                color_corrected = color_correct(cropped)
                ratio, _ = get_green_ratio(color_corrected, diff=50)
                print(ratio)

                location_valid = is_location_valid(
                    ocr_result, 'NTU - N3 AND N4 CLUSTER')

                if location_valid:
                    print('Location valid!')

        time.sleep(0.2)


MISTY_IP = '192.168.137.110'
PORT = 1936

print('Connecting')
video = cv2.VideoCapture(f"rtsp://{MISTY_IP}:{PORT}")
print('Connected')

if not video.isOpened():
    print('Opening video')
    video.open(0)

if not video.isOpened():
    print('Cannot open video')
    exit()

cv2.namedWindow('VIDEO', cv2.WINDOW_NORMAL)
background = threading.Thread(target=find_mobile_phone)
background.setDaemon(True)  # Kill thread when the program ends
background.start()

while True:
    ret, frame = video.read()
    try:
        frame = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)

        cv2.imshow('VIDEO', frame)
        cv2.waitKey(1)
    except Exception:
        print('Assert error!')
        exit()
