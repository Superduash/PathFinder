"""Race history service: formatting, query, and pruning."""
from __future__ import annotations
from typing import Any, Optional
from sqlalchemy.orm import Session
from backend.app.db import repo
from backend.app.errors import ApiError, NOT_FOUND


def list_race_history(session: Session, limit: int = 20) -> list[dict[str, Any]]:
    rows = repo.list_race_history(session, limit=limit)
    out = []
    for r in rows:
        participants = repo.deserialize_json(r.participants_json) or []
        summary = repo.deserialize_json(r.summary_json) or {}
        winner = summary.get("winner")
        if not winner and participants:
            ranking = summary.get("ranking")
            if isinstance(ranking, list) and len(ranking) > 0:
                top = ranking[0]
                if isinstance(top, int) and 0 <= top < len(participants):
                    winner = participants[top].get("algorithm", "None")
                elif isinstance(top, dict):
                    winner = top.get("algorithm", "None")
            if not winner:
                winner = participants[0].get("algorithm", "None")
        out.append({
            "id": r.id,
            "created_at": r.created_at,
            "racers": [{"algorithm": p.get("algorithm"), "heuristic": p.get("heuristic")} for p in participants],
            "winner": winner or "None",
            "reachable": bool(r.reachable),
            "optimal_cost": r.optimal_cost,
        })
    return out


def get_race_history(session: Session, history_id: int) -> dict[str, Any]:
    r = repo.get_race_history(session, history_id)
    if not r:
        raise ApiError(NOT_FOUND, f"Race history #{history_id} not found.")

    return {
        "id": r.id,
        "created_at": r.created_at,
        "maze": repo.deserialize_json(r.maze_json),
        "participants": repo.deserialize_json(r.participants_json),
        "summary": repo.deserialize_json(r.summary_json),
        "reachable": bool(r.reachable),
        "optimal_cost": r.optimal_cost,
    }


def delete_race_history(session: Session, history_id: int) -> bool:
    success = repo.delete_race_history(session, history_id)
    if not success:
        raise ApiError(NOT_FOUND, f"Race history #{history_id} not found.")
    return True


def clear_race_history(session: Session, confirm: bool = False) -> int:
    if not confirm:
        raise ApiError("INVALID_REQUEST", "Must supply confirm=true to clear all race history.")
    return repo.clear_race_history(session)
