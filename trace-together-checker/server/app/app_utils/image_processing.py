import os
from typing import Any, Tuple
import cv2
import numpy as np
import pytesseract


def get_trace_together_image_folder(image_id: str):
    """Returns the path to the TraceTogether image folder."""
    path_from_this_folder = os.sep.join([
        os.pardir,  # app folder
        os.pardir,  # trace-together-checker folder
        'images',
        image_id
    ])

    return os.path.dirname(__file__) + f"{os.sep}{path_from_this_folder}"


def get_trace_together_image_path(image_id: str, file_name: str):
    """Returns the path to the TraceTogether image file."""
    return get_trace_together_image_folder(image_id) + os.sep + file_name


def load_image(bytes: bytes):
    """Loads image from the given buffer."""
    inp = np.asarray(bytearray(bytes), dtype=np.uint8)

    # Read the file (will be in BGR)
    image = cv2.imdecode(inp, cv2.IMREAD_COLOR)
    return image


def save_image(image, image_id: str, name: str):
    """Saves cv2 image to the given path."""
    path = get_trace_together_image_path(image_id, name)

    # Create folder if not exist.
    folder = get_trace_together_image_folder(image_id)
    if not os.path.exists(folder):
        os.makedirs(folder)

    cv2.imwrite(path, image)
    print(f'Image written to: {path}')


def crop_bbox(image, xmin: float, xmax: float, ymin: float, ymax: float):
    """Crops the image according to the bounding box."""
    cropped = image[int(ymin):int(ymax), int(xmin):int(xmax)]
    return cropped


def unsharp_mask(image, round: int = 1, radius: float = 10, alpha: float = 1.5, beta: float = -0.5, gamma: float = 0):
    result = image

    for _ in range(round):
        blur = cv2.GaussianBlur(result, (0, 0), radius)
        result = cv2.addWeighted(result, alpha, blur, beta, gamma)

    return result


def read_string_in_image(image):
    return pytesseract.image_to_string(
        image,
        lang="eng",  # Language is English
        config='--oem 1'  # Use Mode 1: LSTM only
    )

# -------------------------- COLOR DETECTION --------------------------


def color_correct(img, threshold=0.5, grid_size=10):
    # Convert to LAB format
    img_lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)

    # Apply CLAHE to the L component.
    lab_planes = cv2.split(img_lab)
    clahe = cv2.createCLAHE(clipLimit=threshold,
                            tileGridSize=(grid_size, grid_size))
    lab_planes[0] = clahe.apply(lab_planes[0])

    img_lab = cv2.merge(lab_planes)

    # Convert back to BGR
    output = cv2.cvtColor(img_lab, cv2.COLOR_LAB2BGR)
    return output


def get_green_ratio(img, dark_green=(137, 117, 58), light_green=(198, 171, 114), diff=10) -> Tuple[float, Any]:
    # Boundaries in BGR
    boundaries = [
        # Darker green
        ([dark_green[0] - diff, dark_green[1] - diff, dark_green[2] - diff],
         [dark_green[0] + diff, dark_green[1] + diff, dark_green[2] + diff]),

        # Lighter green
        # ([light_green[0] - diff, light_green[1] - diff, light_green[2] - diff],
        #  [light_green[0] + diff, light_green[1] + diff, light_green[2] + diff])
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

    final = results[0]
    for result in range(1, len(results) - 1):
        final = cv2.bitwise_or(final, result)

    ratio_green = green_count / (img.size / 3)

    return ratio_green, final
