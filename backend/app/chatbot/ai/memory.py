"""
Conversation Memory
--------------------
Per-user in-process session store: chat history (for context) plus
`pending` -- a partially-filled action call awaiting more slots from the
user, e.g. after "create a material" the assistant asks for density and
Z, and the next message needs to be interpreted as answering *that*
question rather than as a fresh command.

This is in-memory (reset on backend restart), which matches the rest of
this project's zero-config default (JSON file DB). If persistence across
restarts is needed, back this with the same `repository` used elsewhere.
"""
from __future__ import annotations

from typing import Optional

_sessions: dict[str, dict] = {}

ANONYMOUS_KEY = "anonymous"


def _session(user_key: str) -> dict:
    return _sessions.setdefault(user_key, {"history": [], "pending": None})


def save_message(user_key: str, role: str, message: str) -> None:
    history = _session(user_key)["history"]
    history.append({"role": role, "message": message})
    # Keep memory bounded.
    if len(history) > 40:
        del history[: len(history) - 40]


def get_history(user_key: str) -> list[dict]:
    return _session(user_key)["history"]


def clear_history(user_key: str = ANONYMOUS_KEY) -> None:
    _session(user_key)["history"].clear()


def set_pending(user_key: str, pending: Optional[dict]) -> None:
    _session(user_key)["pending"] = pending


def get_pending(user_key: str) -> Optional[dict]:
    return _session(user_key)["pending"]


def clear_pending(user_key: str) -> None:
    _session(user_key)["pending"] = None
