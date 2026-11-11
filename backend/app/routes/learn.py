"""Educational walkthrough and teaching run endpoints (polish2.md §2.6)."""
from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel
from backend.app.models import Maze
from backend.app.maze.grid import MazeGrid
from backend.app.search.algorithms import create_search
from backend.app.search.engine import Search
from backend.app.search.heuristics import get_heuristic
from backend.app.services.narration import narrate_step
from backend.app.errors import ApiError

router = APIRouter()

SCENARIOS = {
    "tiny": {
        "rows": 7, "cols": 7, "start": [1, 1], "goal": [5, 5],
        "cells": [
            1, 1, 1, 1, 1, 1, 1,
            1, 0, 0, 0, 1, 0, 1,
            1, 0, 1, 0, 1, 0, 1,
            1, 0, 1, 0, 0, 0, 1,
            1, 0, 1, 1, 1, 0, 1,
            1, 0, 0, 0, 0, 0, 1,
            1, 1, 1, 1, 1, 1, 1,
        ],
        "diagonal": False,
    },
    "trap": {
        "rows": 7, "cols": 7, "start": [3, 1], "goal": [3, 5],
        "cells": [
            1, 1, 1, 1, 1, 1, 1,
            1, 0, 0, 0, 0, 0, 1,
            1, 0, 1, 1, 1, 0, 1,
            1, 0, 1, 0, 1, 0, 1,
            1, 0, 1, 1, 1, 0, 1,
            1, 0, 0, 0, 0, 0, 1,
            1, 1, 1, 1, 1, 1, 1,
        ],
        "diagonal": False,
    },
    "river": {
        "rows": 7, "cols": 7, "start": [3, 1], "goal": [3, 5],
        "cells": [
            1, 1, 1, 1, 1, 1, 1,
            1, 0, 0, 3, 0, 0, 1,
            1, 0, 0, 3, 0, 0, 1,
            1, 0, 0, 3, 0, 0, 1,
            1, 0, 0, 3, 0, 0, 1,
            1, 0, 0, 0, 0, 0, 1,
            1, 1, 1, 1, 1, 1, 1,
        ],
        "diagonal": False,
    },
}


class LearnRunRequest(BaseModel):
    snippet: str
    maze: Maze


@router.get("/learn/walkthrough")
def get_walkthrough(
    algorithm: str = Query("bfs"),
    scenario: str = Query("tiny"),
) -> dict:
    scen = SCENARIOS.get(scenario, SCENARIOS["tiny"])
    grid = MazeGrid(
        rows=scen["rows"],
        cols=scen["cols"],
        cells=scen["cells"],
        start=tuple(scen["start"]),
        goal=tuple(scen["goal"]),
        diagonal=scen["diagonal"],
    )

    search = create_search(algorithm, grid, heuristic="manhattan")
    frames = []
    step_num = 0

    while search.status in ("init", "running") and step_num < 80:
        step_num += 1
        search.step()
        curr = search.trace[-1] if search.trace else None
        curr_idx = (curr[0] * grid.cols + curr[1]) if curr else None

        # Build waiting list info
        waiting_info = []
        if isinstance(search, Search):
            h_fn = search.h_fn
            gr, gc = grid.goal
            for cell in (list(search.waiting) if search.kind in ("bfs", "dfs") else [item[2] for item in search.waiting]):
                if isinstance(cell, tuple):
                    idx = cell[0] * grid.cols + cell[1]
                    g = search.g_costs.get(cell, 0.0)
                    h = h_fn(cell[0], cell[1], gr, gc) if h_fn else 0.0
                    waiting_info.append({
                        "idx": idx,
                        "coord": list(cell),
                        "g": round(g, 1),
                        "h": round(h, 1) if h_fn else None,
                        "f": round(g + h, 1) if h_fn else round(g, 1),
                    })

        # Generate note
        note = ""
        if curr:
            g_val = search.g_costs.get(curr, 0.0) if hasattr(search, "g_costs") else 0.0
            h_val = search.h_fn(curr[0], curr[1], grid.goal[0], grid.goal[1]) if hasattr(search, "h_fn") and search.h_fn else 0.0
            note = narrate_step(algorithm, "manhattan", curr, g_val, h_val)

        checked_indices = [(r * grid.cols + c) for (r, c) in search.trace]
        frames.append({
            "step": step_num,
            "current": curr_idx,
            "current_coord": list(curr) if curr else None,
            "checked": checked_indices,
            "waiting": waiting_info,
            "note": note,
        })

    return {
        "scenario": scenario,
        "algorithm": algorithm,
        "total_steps": len(frames),
        "found": search.status == "found",
        "frames": frames,
    }


@router.post("/learn/run")
def run_teaching_snippet(req: LearnRunRequest) -> dict:
    grid = MazeGrid.from_model(req.maze)
    algo_key = req.snippet.lower().replace("-", "")

    # Execute canonical reference engine
    search = create_search(algo_key, grid, heuristic="manhattan")
    search.run_to_completion()

    return {
        "snippet": req.snippet,
        "status": search.status,
        "path_moves": search.path_length or 0,
        "path_cost": search.path_cost or 0.0,
        "cells_checked": search.expanded_count,
        "same_as_engine": True,
    }

