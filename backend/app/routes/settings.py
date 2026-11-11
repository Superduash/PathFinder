"""User settings API routes."""
from __future__ import annotations
from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.db.base import get_db
from backend.app.services import settings as settings_service

router = APIRouter()


@router.get("/settings")
def get_settings(
    db: Session = Depends(get_db),
):
    return settings_service.get_all_settings(db)


@router.put("/settings")
def update_settings(
    payload: dict[str, Any],
    db: Session = Depends(get_db),
):
    return settings_service.update_settings(db, payload)

