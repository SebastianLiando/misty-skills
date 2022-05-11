from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional
from .dependencies import Singleton
from .mongo import MongoRepository


@dataclass
class ConfirmationEmail:
    id: str
    fullname: str
    confirmed: bool = False
    confirmed_by: Optional[str] = None
    confirmed_at: Optional[datetime] = None

    def to_json(self) -> dict:
        json = {
            'fullname': self.fullname,
            'confirmed': self.confirmed,
            'confirmed_by': self.confirmed_by,
            'confirmed_at': self.confirmed_at,
        }

        if self.id != '':
            json['_id'] = self.id

        return json

    @staticmethod
    def from_json(json: dict):
        return ConfirmationEmail(
            id=str(json['_id']),
            fullname=json['fullname'],
            confirmed=json['confirmed'],
            confirmed_by=json.get('confirmed_by'),
            confirmed_at=json.get('confirmed_at'),
        )


class ConfirmEmailRepository(MongoRepository, metaclass=Singleton):
    @property
    def collection_name(self) -> str:
        return "confirmation-emails"

    def list_confirmed(self) -> List[ConfirmationEmail]:
        return self.list({'confirmed': True})

    def to_json(self, item: ConfirmationEmail):
        return item.to_json()

    def from_json(self, json):
        return ConfirmationEmail.from_json(json)

    def get_by_fullname(self, fullname: str) -> Optional[ConfirmationEmail]:
        doc = self.collection.find_one({'fullname': fullname})
        if doc is None:
            return None

        return self.from_json(doc)
