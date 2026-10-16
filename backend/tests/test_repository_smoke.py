"""Offline smoke test for the repository CRUD contract; requires no Atlas account."""
import asyncio
import tempfile
import unittest
from pathlib import Path

from app.db.database import JSONFileRepository


class RepositorySmokeTests(unittest.TestCase):
    def test_crud_and_ping(self):
        async def scenario():
            with tempfile.TemporaryDirectory() as tmp:
                repo = JSONFileRepository(Path(tmp) / "db.json")
                ping = await repo.ping()
                self.assertTrue(ping["connected"])
                self.assertEqual(ping["engine"], "json")

                created = await repo.insert_one("users", {"email": "smoke@example.test", "role": "researcher"})
                self.assertTrue(created.get("_id"))
                found = await repo.find_one("users", {"email": "smoke@example.test"})
                self.assertEqual(found["_id"], created["_id"])
                listed = await repo.find("users", {"role": "researcher"})
                self.assertEqual(len(listed), 1)
                updated = await repo.update_one("users", {"_id": created["_id"]}, {"role": "admin"})
                self.assertEqual(updated["role"], "admin")
                self.assertTrue(await repo.delete_one("users", {"_id": created["_id"]}))
                self.assertIsNone(await repo.find_one("users", {"_id": created["_id"]}))
        asyncio.run(scenario())


if __name__ == "__main__":
    unittest.main()
