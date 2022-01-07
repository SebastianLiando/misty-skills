from typing import Optional
import time
import json
import torch

# Object detector
PRETRAINED_MODEL = 'yolov5n'
MIN_CONFIDENCE = 0.1

model = torch.hub.load('ultralytics/yolov5', PRETRAINED_MODEL)
model.conf = MIN_CONFIDENCE


def detect_mobile_phone(image) -> Optional[dict]:
    """Returns the detected cell phone data from the given image path."""
    start = time.time()
    results = model(image)
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
