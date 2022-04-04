from typing import Optional
from .mongo import MongoRepository
from .dependencies import Singleton

from dataclasses import dataclass
from datetime import datetime


@dataclass
class Verification():
    id: str
    robot_serial: str
    """The robot that captures the picture."""
    created_at: datetime
    """When the verification happened."""

    raw_ocr: str
    """The raw OCR result."""
    detected_date: Optional[datetime]
    """The date computed form OCR result."""
    date_valid: bool
    """Whether the certificate is the valid date."""
    location_detected: str
    """The location computed from OCR result."""
    location_actual: str
    """The location to match."""
    location_valid: bool
    """Whether the certification is for the correct location."""
    check_in: str
    """Whether the certificate is a check-in certificate."""
    safe_entry: str
    """Whether the certificate is a TraceTogether certificate."""

    green_ratio: float
    """How many percent of the image is green pixel."""
    fully_vaccinated: bool
    """Whether the user is fully vaccinated based on the amount of green pixels."""

    def to_json(self) -> dict:
        json = {
            'robot_serial': self.robot_serial,
            'raw_ocr': self.raw_ocr,
            'detected_date': self.detected_date,
            'date_valid': self.date_valid,
            'location_detected': self.location_detected,
            'location_actual': self.location_actual,
            'location_valid': self.location_valid,
            'check_in': self.check_in,
            'safe_entry': self.safe_entry,
            'green_ratio': self.green_ratio,
            'fully_vaccinated': self.fully_vaccinated
        }

        if self.id != '':
            json['_id'] = self.id

        return json

    @staticmethod
    def from_json(json: dict):
        return Verification(
            id=str(json['_id']),
            robot_serial=json['robot_serial'],
            # ObjectID contains information about creation date.
            created_at=json['_id'].generation_time,

            raw_ocr=json['raw_ocr'],
            detected_date=json.get('detected_date'),
            date_valid=json['date_valid'],
            location_detected=json['location_detected'],
            location_actual=json['location_actual'],
            location_valid=json['location_valid'],
            check_in=json['check_in'],
            safe_entry=json['safe_entry'],

            green_ratio=json['green_ratio'],
            fully_vaccinated=json['fully_vaccinated']
        )


class VerificationRepository(MongoRepository, metaclass=Singleton):
    @property
    def collection_name(self) -> str:
        return "verifications"

    def to_json(self, item: Verification) -> dict:
        return item.to_json()

    def from_json(self, json: dict) -> Verification:
        return Verification.from_json(json)
