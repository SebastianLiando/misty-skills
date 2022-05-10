from dataclasses import dataclass, field
from typing import Optional
from .dependencies import Singleton
from .mongo import MongoRepository


@dataclass
class ConfirmationEmail:
    id: str
    fullname: str
    confirmed: bool = False
    confirmed_by: Optional[str] = None

    def to_json(self) -> dict:
        json = {
            'fullname': self.fullname,
            'confirmed': self.confirmed,
            'confirmed_by': self.confirmed_by
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
            confirmed_by=json['confirmed_by']
        )


class ConfirmEmailRepository(MongoRepository, metaclass=Singleton):
    @property
    def collection_name(self) -> str:
        return "confirmation-emails"

    def to_json(self, item: ConfirmationEmail):
        return item.to_json()

    def from_json(self, json):
        return ConfirmationEmail.from_json(json)

    def get_by_fullname(self, fullname: str) -> Optional[ConfirmationEmail]:
        doc = self.collection.find_one({'fullname': fullname})
        if doc is None:
            return None

        return self.from_json(doc)
