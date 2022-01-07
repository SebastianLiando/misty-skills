import re
from datetime import datetime
from fuzzywuzzy import fuzz


def is_location_valid(ocr: str, actual: str, threshold=50) -> bool:
    for line in ocr.split('\n'):
        # Remove whitespaces
        cleaned = line.strip()

        # Don't check empty string
        if len(cleaned) == 0:
            continue

        similarity = fuzz.partial_ratio(line, actual)
        if similarity >= threshold:
            print(f'Location similarity: {similarity}')
            return True

    return False


def is_check_in(ocr: str) -> bool:
    return ocr.lower().find("check-in") != -1


def is_safe_entry(ocr: str) -> bool:
    lower = ocr.lower()
    return lower.find("safeentry") != -1 or lower.find('entry') != -1


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

    if len(dates) == 0:
        return False

    # Try parse the date
    detected_date = dates[0]
    try:
        pattern = "%d %b"  # e.g. 14 Dec
        detected_date = datetime.strptime(detected_date, pattern).date()
        print(f'Detected date: {detected_date.day}-{detected_date.month}')
    except ValueError:
        return False

    # Compare the day and month
    date_now = datetime.now().date()
    return date_now.day == detected_date.day and date_now.month == detected_date.month
