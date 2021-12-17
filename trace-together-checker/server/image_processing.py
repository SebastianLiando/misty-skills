import time
from typing import Optional
from PIL import Image, ImageFilter
import json
import torch
import cv2
import numpy as np


def unsharp_mask_pil(image):
    image = Image.fromarray(image)
    image = image.filter(ImageFilter.UnsharpMask(
        radius=3, percent=200, threshold=4))

    return np.array(image)


def unsharp_mask(image, round: int = 1, radius: int = 3, alpha: float = 1.5, beta: float = -0.5, gamma: float = 0):
    result = image

    for _ in range(round):
        blur = cv2.GaussianBlur(result, (0, 0), radius)
        result = cv2.addWeighted(result, alpha, blur, beta, gamma)

    return result


def simple_thresholding(image, threshold: int = 180):
    grayscale = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    _, result = cv2.threshold(grayscale, threshold, 255, cv2.THRESH_BINARY)

    return result


def sharpen_with_kernel(image, factor=9):
    sharpen_kernel = np.array([[-1, -1, -1], [-1, factor, -1], [-1, -1, -1]])

    return cv2.filter2D(image, -1, sharpen_kernel)


def binarization(image):
    # Improve contrast with CLAHE
    image = cv2.equalizeHist(image)

    # Adaptive thresholding
    image = cv2.GaussianBlur(image, (5, 5), 1)
    image = cv2.adaptiveThreshold(
        image, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 25, 3)

    return image


# Object detector
model = torch.hub.load('ultralytics/yolov5', 'yolov5s')
model.conf = 0.1


def detect_mobile_phone(path: str) -> Optional[dict]:
    """Returns the detected cell phone data from the given image path."""
    start = time.time()
    results = model(path)
    end = time.time()

    print(f'Object detection takes {end - start} seconds')

    results = results.pandas().xyxy[0].to_json(orient="records")
    results = json.loads(results)

    # Remove other objects except cell phone
    results = list(filter(lambda item: item['name'] == 'cell phone', results))

    # Return the first result
    if len(results) > 0:
        return results[0]
    else:
        return None


def crop_bbox(path: str, xmin, xmax, ymin, ymax):
    """Crops the image according to the bounding box."""
    image = cv2.imread(path)

    cropped = image[int(ymin):int(ymax), int(xmin):int(xmax)]
    return cropped


def save_image(image, path: str):
    """Saves cv2 image to the given path."""
    cv2.imwrite(path, image)
