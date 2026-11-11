"""Data access repository helpers for SQLite database."""
from __future__ import annotations
import json
from typing import Any, Optional
from sqlalchemy import select, update, delete, desc
from sqlalchemy.orm import Session
from backend.app.db.tables import (
    SavedMaze, RaceHistory, Setting, BenchmarkRun, BenchmarkRow, MLModel, JobRecord
)


def serialize_json(data: Any) -> str:
    return json.dumps(data) if data is not None else ""


def deserialize_json(raw: Optional[str]) -> Any:
    return json.loads(raw) if raw else None


# ---------------------------------------------------------------------------
# Saved Mazes
# ---------------------------------------------------------------------------

def save_maze(session: Session, name: str, rows: int, cols: int, diagonal: bool,
              maze_data: dict, thumb_svg: Optional[str] = None, tags: Optional[str] = None) -> SavedMaze:
    item = SavedMaze(
        name=name,
        rows=rows,
        cols=cols,
        diagonal=1 if diagonal else 0,
        maze_json=serialize_json(maze_data),
        thumb_svg=thumb_svg,
        tags=tags,
    )
    session.add(item)
    session.flush()
    return item


def list_saved_mazes(session: Session, limit: int = 50, offset: int = 0) -> list[SavedMaze]:
    stmt = select(SavedMaze).order_by(desc(SavedMaze.id)).limit(limit).offset(offset)
    return list(session.scalars(stmt).all())


def get_saved_maze(session: Session, maze_id: int) -> Optional[SavedMaze]:
    return session.get(SavedMaze, maze_id)


def count_saved_mazes(session: Session) -> int:
    return session.query(SavedMaze).count()


def delete_saved_maze(session: Session, maze_id: int) -> bool:
    item = session.get(SavedMaze, maze_id)
    if not item:
        return False
    session.delete(item)
    return True


def update_saved_maze(session: Session, maze_id: int, name: Optional[str] = None, tags: Optional[str] = None) -> Optional[SavedMaze]:
    item = session.get(SavedMaze, maze_id)
    if not item:
        return None
    if name is not None:
        item.name = name
    if tags is not None:
        item.tags = tags
    session.flush()
    return item


# ---------------------------------------------------------------------------
# Race History
# ---------------------------------------------------------------------------

def record_race_history(session: Session, maze_data: dict, participants: list[dict],
                        summary: dict, reachable: bool = True, optimal_cost: Optional[float] = None) -> RaceHistory:
    item = RaceHistory(
        maze_json=serialize_json(maze_data),
        participants_json=serialize_json(participants),
        summary_json=serialize_json(summary),
        reachable=1 if reachable else 0,
        optimal_cost=optimal_cost,
    )
    session.add(item)
    session.flush()

    # Prune oldest if > 100
    total = session.query(RaceHistory).count()
    if total > 100:
        oldest_ids = session.scalars(
            select(RaceHistory.id).order_by(RaceHistory.id.asc()).limit(total - 100)
        ).all()
        session.execute(delete(RaceHistory).where(RaceHistory.id.in_(oldest_ids)))

    return item


def list_race_history(session: Session, limit: int = 20) -> list[RaceHistory]:
    stmt = select(RaceHistory).order_by(desc(RaceHistory.id)).limit(limit)
    return list(session.scalars(stmt).all())


def get_race_history(session: Session, history_id: int) -> Optional[RaceHistory]:
    return session.get(RaceHistory, history_id)


def delete_race_history(session: Session, history_id: int) -> bool:
    item = session.get(RaceHistory, history_id)
    if not item:
        return False
    session.delete(item)
    return True


def clear_race_history(session: Session) -> int:
    result = session.execute(delete(RaceHistory))
    return result.rowcount


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

def get_setting(session: Session, key: str, default: Any = None) -> Any:
    item = session.get(Setting, key)
    return deserialize_json(item.value_json) if item else default


def set_setting(session: Session, key: str, value: Any) -> None:
    item = session.get(Setting, key)
    raw = serialize_json(value)
    if item:
        item.value_json = raw
    else:
        session.add(Setting(key=key, value_json=raw))
    session.flush()


def get_all_settings(session: Session) -> dict[str, Any]:
    stmt = select(Setting)
    items = session.scalars(stmt).all()
    return {i.key: deserialize_json(i.value_json) for i in items}

