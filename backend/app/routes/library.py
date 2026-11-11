"""Library API routes for saved mazes."""
from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.db.base import get_db
from backend.app.services import library as library_service
from backend.app.models import Maze

router = APIRouter()


class SaveMazeRequest(BaseModel):
    name: str
    maze: Maze
    tags: Optional[str] = None


class UpdateMazeRequest(BaseModel):
    name: Optional[str] = None
    tags: Optional[str] = None


@router.get("/library/mazes")
def list_mazes(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    items = library_service.list_saved_mazes(db, limit=limit, offset=offset)
    return {"mazes": items}


@router.post("/library/mazes", status_code=201)
def save_maze(
    payload: SaveMazeRequest,
    db: Session = Depends(get_db),
):
    saved = library_service.create_saved_maze(
        session=db,
        name=payload.name,
        maze=payload.maze.model_dump(),
        tags=payload.tags,
    )
    return saved


@router.get("/library/mazes/{maze_id}")
def get_maze(
    maze_id: int,
    db: Session = Depends(get_db),
):
    return library_service.get_saved_maze(db, maze_id)


@router.get("/library/mazes/{maze_id}/thumb")
def get_maze_thumb(
    maze_id: int,
    db: Session = Depends(get_db),
):
    svg_data = library_service.get_maze_thumb_svg(db, maze_id)
    return Response(
        content=svg_data,
        media_type="image/svg+xml",
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.patch("/library/mazes/{maze_id}")
def update_maze(
    maze_id: int,
    payload: UpdateMazeRequest,
    db: Session = Depends(get_db),
):
    return library_service.update_saved_maze(
        session=db,
        maze_id=maze_id,
        name=payload.name,
        tags=payload.tags,
    )


@router.delete("/library/mazes/{maze_id}")
def delete_maze(
    maze_id: int,
    db: Session = Depends(get_db),
):
    library_service.delete_saved_maze(db, maze_id)
    return {"status": "ok", "deleted": maze_id}

