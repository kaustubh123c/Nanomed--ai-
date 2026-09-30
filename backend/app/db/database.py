"""
Storage abstraction layer.

Why this exists:
NanoMed AI targets MongoDB Atlas in production, but requiring every developer
to stand up an Atlas cluster before they can even see the login page is a bad
first-run experience. This module gives both a `MongoRepository` (Motor,
async, used when MONGO_URI is set) and a `JSONFileRepository` (zero-config,
used otherwise) behind the same interface, so the rest of the app never has
to know which one is active. Swapping to Atlas later is just setting
MONGO_URI in .env -- no code changes required.
"""

import json
import os
import uuid
from pathlib import Path
from typing import Any, Optional

from app.core.config import settings

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
DATA_FILE = DATA_DIR / "db.json"

COLLECTIONS = [
    "users",
    "materials",
    "experiments",
    "predictions",
    "research_papers",
    "reports",
    "detector_readings",
    "simulation_history",
    "calculation_history",
    "research_projects",
    "research_files",
    "workspace_checklists",
    "research_milestones",
    "studio_experiments",
    "material_comparisons",
    "visualization_presets",
]


class JSONFileRepository:
    """A minimal document-store shim over a single JSON file.

    Not for production concurrency, but perfect for local development and for
    running this module without any external services.
    """

    def __init__(self, path: Path):
        self.path = path
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self._write({name: [] for name in COLLECTIONS})

    def _read(self) -> dict:
        with open(self.path, "r") as f:
            return json.load(f)

    def _write(self, data: dict) -> None:
        with open(self.path, "w") as f:
            json.dump(data, f, indent=2, default=str)

    async def find_one(self, collection: str, query: dict) -> Optional[dict]:
        data = self._read()
        for doc in data.get(collection, []):
            if all(doc.get(k) == v for k, v in query.items()):
                return doc
        return None

    async def find(self, collection: str, query: Optional[dict] = None) -> list:
        data = self._read()
        docs = data.get(collection, [])
        if not query:
            return docs
        return [d for d in docs if all(d.get(k) == v for k, v in query.items())]

    async def insert_one(self, collection: str, document: dict) -> dict:
        data = self._read()
        document = {**document}
        document.setdefault("_id", str(uuid.uuid4()))
        data.setdefault(collection, []).append(document)
        self._write(data)
        return document

    async def update_one(self, collection: str, query: dict, update: dict) -> Optional[dict]:
        data = self._read()
        docs = data.get(collection, [])
        for i, doc in enumerate(docs):
            if all(doc.get(k) == v for k, v in query.items()):
                docs[i] = {**doc, **update}
                self._write(data)
                return docs[i]
        return None

    async def delete_one(self, collection: str, query: dict) -> bool:
        data = self._read()
        docs = data.get(collection, [])
        for i, doc in enumerate(docs):
            if all(doc.get(k) == v for k, v in query.items()):
                docs.pop(i)
                self._write(data)
                return True
        return False


class MongoRepository:
    """Thin async wrapper around Motor collections, same interface as above."""

    def __init__(self, uri: str, db_name: str):
        from motor.motor_asyncio import AsyncIOMotorClient  # imported lazily

        self.client = AsyncIOMotorClient(uri)
        self.db = self.client[db_name]

    async def find_one(self, collection: str, query: dict) -> Optional[dict]:
        return await self.db[collection].find_one(query)

    async def find(self, collection: str, query: Optional[dict] = None) -> list:
        cursor = self.db[collection].find(query or {})
        return [doc async for doc in cursor]

    async def insert_one(self, collection: str, document: dict) -> dict:
        document = {**document}
        document.setdefault("_id", str(uuid.uuid4()))
        await self.db[collection].insert_one(document)
        return document

    async def update_one(self, collection: str, query: dict, update: dict) -> Optional[dict]:
        await self.db[collection].update_one(query, {"$set": update})
        return await self.find_one(collection, query)

    async def delete_one(self, collection: str, query: dict) -> bool:
        result = await self.db[collection].delete_one(query)
        return result.deleted_count > 0


def get_repository() -> Any:
    if settings.MONGO_URI:
        return MongoRepository(settings.MONGO_URI, settings.MONGO_DB_NAME)
    return JSONFileRepository(DATA_FILE)


repository = get_repository()
