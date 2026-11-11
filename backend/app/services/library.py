"""Library service: SVG thumbnail rendering, validation, and maze persistence."""
from __future__ import annotations
from typing import Any, Optional
from sqlalchemy.orm import Session
from backend.app.config import settings
from backend.app.db import repo
from backend.app.errors import ApiError, LIBRARY_FULL, NOT_FOUND, INVALID_MAZE


def generate_maze_svg(cells: list[int], rows: int, cols: int, start: list[int], goal: list[int]) -> str:
    """Renders a crisp 160x160 SVG string representing the maze grid."""
    svg_parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {cols} {rows}" width="160" height="160" shape-rendering="crispEdges">',
        f'<rect width="{cols}" height="{rows}" fill="#111827"/>'
    ]

    for r in range(rows):
        for c in range(cols):
            idx = r * cols + c
            if idx >= len(cells):
                continue
            val = cells[idx]
            if val == 1:  # wall
                svg_parts.append(f'<rect x="{c}" y="{r}" width="1" height="1" fill="#374151"/>')
            elif val == 2:  # sand
                svg_parts.append(f'<rect x="{c}" y="{r}" width="1" height="1" fill="#d97706"/>')
            elif val == 3:  # water
                svg_parts.append(f'<rect x="{c}" y="{r}" width="1" height="1" fill="#0284c7"/>')

    # Start and Goal points
    if len(start) == 2:
        svg_parts.append(f'<rect x="{start[1]}" y="{start[0]}" width="1" height="1" fill="#22c55e"/>')
    if len(goal) == 2:
        svg_parts.append(f'<rect x="{goal[1]}" y="{goal[0]}" width="1" height="1" fill="#ef4444"/>')

    svg_parts.append('</svg>')
    return "".join(svg_parts)


def create_saved_maze(session: Session, name: str, maze: dict, tags: Optional[str] = None) -> dict[str, Any]:
    name = (name or "").strip()
    if not name or len(name) > 60:
        raise ApiError("INVALID_REQUEST", "Maze name must be between 1 and 60 characters.")

    count = repo.count_saved_mazes(session)
    if count >= settings.max_saved_mazes:
        raise ApiError(LIBRARY_FULL, f"Maze library is full (max {settings.max_saved_mazes}). Delete some mazes first.")

    rows = maze.get("rows")
    cols = maze.get("cols")
    cells = maze.get("cells")
    start = maze.get("start", [0, 0])
    goal = maze.get("goal", [rows - 1 if rows else 0, cols - 1 if cols else 0])
    diagonal = maze.get("diagonal", False)

    if not rows or not cols or not cells or len(cells) != rows * cols:
        raise ApiError(INVALID_MAZE, "Invalid maze specification.")

    thumb_svg = generate_maze_svg(cells, rows, cols, start, goal)

    saved = repo.save_maze(
        session=session,
        name=name,
        rows=rows,
        cols=cols,
        diagonal=diagonal,
        maze_data=maze,
        thumb_svg=thumb_svg,
        tags=tags,
    )

    return {
        "id": saved.id,
        "name": saved.name,
        "rows": saved.rows,
        "cols": saved.cols,
        "diagonal": bool(saved.diagonal),
        "tags": saved.tags,
        "created_at": saved.created_at,
        "thumb_url": f"/api/library/mazes/{saved.id}/thumb",
        "maze": maze,
    }


def list_saved_mazes(session: Session, limit: int = 50, offset: int = 0) -> list[dict[str, Any]]:
    items = repo.list_saved_mazes(session, limit=limit, offset=offset)
    return [
        {
            "id": item.id,
            "name": item.name,
            "rows": item.rows,
            "cols": item.cols,
            "diagonal": bool(item.diagonal),
            "tags": item.tags,
            "created_at": item.created_at,
            "thumb_url": f"/api/library/mazes/{item.id}/thumb",
        }
        for item in items
    ]


def get_saved_maze(session: Session, maze_id: int) -> dict[str, Any]:
    item = repo.get_saved_maze(session, maze_id)
    if not item:
        raise ApiError(NOT_FOUND, f"Saved maze #{maze_id} not found.")

    return {
        "id": item.id,
        "name": item.name,
        "rows": item.rows,
        "cols": item.cols,
        "diagonal": bool(item.diagonal),
        "tags": item.tags,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
        "thumb_url": f"/api/library/mazes/{item.id}/thumb",
        "maze": repo.deserialize_json(item.maze_json),
    }


def get_maze_thumb_svg(session: Session, maze_id: int) -> str:
    item = repo.get_saved_maze(session, maze_id)
    if not item:
        raise ApiError(NOT_FOUND, f"Saved maze #{maze_id} not found.")

    if item.thumb_svg:
        return item.thumb_svg

    maze_data = repo.deserialize_json(item.maze_json)
    if maze_data:
        svg = generate_maze_svg(
            maze_data.get("cells", []),
            maze_data.get("rows", item.rows),
            maze_data.get("cols", item.cols),
            maze_data.get("start", [0, 0]),
            maze_data.get("goal", [item.rows - 1, item.cols - 1]),
        )
        item.thumb_svg = svg
        return svg

    return '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="100%" height="100%" fill="#111827"/></svg>'


def update_saved_maze(session: Session, maze_id: int, name: Optional[str] = None, tags: Optional[str] = None) -> dict[str, Any]:
    if name is not None:
        name = name.strip()
        if not name or len(name) > 60:
            raise ApiError("INVALID_REQUEST", "Maze name must be between 1 and 60 characters.")

    item = repo.update_saved_maze(session, maze_id, name=name, tags=tags)
    if not item:
        raise ApiError(NOT_FOUND, f"Saved maze #{maze_id} not found.")

    return {
        "id": item.id,
        "name": item.name,
        "rows": item.rows,
        "cols": item.cols,
        "diagonal": bool(item.diagonal),
        "tags": item.tags,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
        "thumb_url": f"/api/library/mazes/{item.id}/thumb",
    }


def delete_saved_maze(session: Session, maze_id: int) -> bool:
    success = repo.delete_saved_maze(session, maze_id)
    if not success:
        raise ApiError(NOT_FOUND, f"Saved maze #{maze_id} not found.")
    return True
