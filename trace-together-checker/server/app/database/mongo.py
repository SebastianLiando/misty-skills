from pymongo import MongoClient
from bson import ObjectId

# The name of the database.
DB_NAME = 'misty_tracer'
DEFAULT_CLIENT = MongoClient(
    host='localhost',
    port=27017,
    connect=False  # Lazy connect on the first operation
)


class MongoRepository():
    def __init__(self, client: MongoClient = DEFAULT_CLIENT, db_name: str = DB_NAME) -> None:
        database = client.get_database(db_name)
        self.collection = database[self.collection_name]

    @property
    def collection_name(self) -> str:
        raise NotImplementedError()

    def to_json(self, item):
        raise NotImplementedError()

    def from_json(self, json):
        raise NotImplementedError()

    def _parse_id(self, id) -> ObjectId:
        if isinstance(id, ObjectId):
            return id
        else:
            return ObjectId(id)

    def list(self, query={}):
        return [self.from_json(x) for x in self.collection.find(query)]

    def get(self, id):
        target_id = self._parse_id(id)
        return self.from_json(self.collection.find_one({'_id': target_id}))

    def save(self, item):
        data: dict = self.to_json(item)

        if '_id' not in data:
            result = self.collection.insert_one(data)
            updated_id = result.inserted_id
        else:
            updated_id = self._parse_id(data.pop('_id'))
            self.collection.update_one({'_id': updated_id},
                                       update={"$set": data},
                                       )

        return self.get(updated_id)

    def delete(self, id):
        target_id = self._parse_id(id)
        return self.from_json(self.collection.find_one_and_delete(target_id))