"""Race history API routes."""
from __future__ import annotations
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.db.base import get_db
from backend.app.services import history as history_service

router = APIRouter()


@router.get("/history/races")
def list_races(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    items = history_service.list_race_history(db, limit=limit)
    return {"races": items}


@router.get("/history/races/{history_id}")
def get_race(
    history_id: int,
    db: Session = Depends(get_db),
):
    return history_service.get_race_history(db, history_id)


@router.delete("/history/races/{history_id}")
def delete_race(
    history_id: int,
    db: Session = Depends(get_db),
):
    history_service.delete_race_history(db, history_id)
    return {"status": "ok", "deleted": history_id}


@router.delete("/history/races")
def clear_all_races(
    confirm: bool = Query(False),
    db: Session = Depends(get_db),
):
    deleted_count = history_service.clear_race_history(db, confirm=confirm)
    return {"status": "ok", "deleted_count": deleted_count}
