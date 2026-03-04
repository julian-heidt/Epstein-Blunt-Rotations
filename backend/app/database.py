"""MongoDB connection via Motor (async driver)."""

import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/cursed_rotations")

_client = None
_db = None


def get_db():
    global _client, _db
    if _db is None:
        _client = AsyncIOMotorClient(MONGO_URI)
        db_name = MONGO_URI.rsplit("/", 1)[-1].split("?")[0]
        _db = _client[db_name]
    return _db


async def close_db():
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
