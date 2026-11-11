"""User settings service."""
from __future__ import annotations
from typing import Any
from sqlalchemy.orm import Session
from backend.app.db import repo
from backend.app.errors import ApiError

DEFAULT_SETTINGS: dict[str, Any] = {
    "theme": "dark",
    "speed_level": 3,
    "narrate": True,
    "tour_seen": False,
    "last_maze_params": {
        "rows": 21,
        "cols": 21,
        "type": "backtracker",
        "density": 0.3,
        "weighted": False,
    },
}

ALLOWED_KEYS = set(DEFAULT_SETTINGS.keys())


def get_all_settings(session: Session) -> dict[str, Any]:
    persisted = repo.get_all_settings(session)
    merged = dict(DEFAULT_SETTINGS)
    merged.update(persisted)
    return merged


def update_settings(session: Session, updates: dict[str, Any]) -> dict[str, Any]:
    for key, val in updates.items():
        if key not in ALLOWED_KEYS:
            continue
        # Type & range validations
        if key == "theme" and val not in ("dark", "light", "system"):
            raise ApiError("INVALID_REQUEST", f"Invalid theme value: {val}")
        if key == "speed_level" and (not isinstance(val, int) or val < 1 or val > 5):
            raise ApiError("INVALID_REQUEST", "speed_level must be an integer between 1 and 5")
        if key == "narrate" and not isinstance(val, bool):
            raise ApiError("INVALID_REQUEST", "narrate must be a boolean")
        if key == "tour_seen" and not isinstance(val, bool):
            raise ApiError("INVALID_REQUEST", "tour_seen must be a boolean")
        if key == "last_maze_params" and not isinstance(val, dict):
            raise ApiError("INVALID_REQUEST", "last_maze_params must be an object")

        repo.set_setting(session, key, val)

    return get_all_settings(session)

