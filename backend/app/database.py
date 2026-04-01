"""MongoDB connection via Motor (async driver)."""

import os
from urllib.parse import quote_plus
from motor.motor_asyncio import AsyncIOMotorClient


def _build_mongo_uri() -> str:
    """Build MongoDB URI, URL-encoding credentials if provided separately."""
    uri = os.environ.get("MONGO_URI")
    if uri:
        return uri
    user = os.environ.get("MONGO_USERNAME", "")
    password = os.environ.get("MONGO_PASSWORD", "")
    host = os.environ.get("MONGO_HOST", "mongo:27017")
    db = os.environ.get("MONGO_DB", "evil_blunts")
    if user and password:
        return f"mongodb://{quote_plus(user)}:{quote_plus(password)}@{host}/{db}?authSource=admin"
    return f"mongodb://{host}/{db}"


MONGO_URI = _build_mongo_uri()

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
