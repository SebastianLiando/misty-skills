from typing import Any, Tuple
from PIL import Image, ImageFilter
import cv2
import numpy as np


def unsharp_mask_pil(image):
    image = Image.fromarray(image)
    image = image.filter(ImageFilter.UnsharpMask(
        radius=3, percent=200, threshold=4))

    return np.array(image)


def unsharp_mask(image, round: int = 1, radius: float = 10, alpha: float = 1.5, beta: float = -0.5, gamma: float = 0):
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


def crop_bbox(image, xmin: float, xmax: float, ymin: float, ymax: float):
    """Crops the image according to the bounding box."""
    cropped = image[int(ymin):int(ymax), int(xmin):int(xmax)]
    return cropped


def load_image(path: str):
    """Loads image from the given path."""
    image = cv2.imread(path)  # Read the file (will be in BGR)

    return image


def save_image(image, path: str):
    """Saves cv2 image to the given path."""
    cv2.imwrite(path, image)

# -------------------------- COLOR DETECTION --------------------------


def color_correct(img, threshold=0.5, grid_size=10):
    img_lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)

    lab_planes = cv2.split(img_lab)
    clahe = cv2.createCLAHE(clipLimit=threshold,
                            tileGridSize=(grid_size, grid_size))
    lab_planes[0] = clahe.apply(lab_planes[0])

    img_lab = cv2.merge(lab_planes)

    # Convert back to RGB
    output = cv2.cvtColor(img_lab, cv2.COLOR_LAB2BGR)
    return output


def get_green_ratio(img, dark_green=(137, 117, 58), light_green=(198, 171, 114), diff=30) -> Tuple[float, Any]:
    # Boundaries in BGR
    boundaries = [
        # Darker green
        ([dark_green[0] - diff, dark_green[1] - diff, dark_green[2] - diff],
         [dark_green[0] + diff, dark_green[1] + diff, dark_green[2] + diff]),

        # Lighter green
        ([light_green[0] - diff, light_green[1] - diff, light_green[2] - diff],
         [light_green[0] + diff, light_green[1] + diff, light_green[2] + diff])
    ]

    results = []
    green_count = 0

    for (lower, upper) in boundaries:
        lower = np.array(lower, dtype='uint8')
        upper = np.array(upper, dtype='uint8')

        mask = cv2.inRange(img, lower, upper)
        output = cv2.bitwise_and(img, img, mask=mask)

        results.append(output)
        green_count += cv2.countNonZero(mask)

    final = cv2.bitwise_or(results[0], results[1])

    ratio_green = green_count / (img.size / 3)

    return ratio_green, final
