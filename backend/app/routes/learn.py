"""Educational walkthrough endpoints (polish7.md §1.2-1.3)."""
from __future__ import annotations
from functools import lru_cache
from typing import Optional
from fastapi import APIRouter, Response
from backend.app.maze.grid import MazeGrid
from backend.app.maze.generators import generate
from backend.app.search.algorithms import create_search
from backend.app.search.engine import Search
from backend.app.search.bidirectional import BidirectionalSearch
from backend.app.search.reference import dijkstra_optimal_cost
from backend.app.services.narration import narrate_step
from backend.app.errors import ApiError

router = APIRouter()

N = 21


def _blank():
    return [0] * (N * N)


def _grid(cells, s, g):
    return MazeGrid(rows=N, cols=N, cells=cells, start=s, goal=g, diagonal=False)


def _open():
    return _grid(_blank(), (18, 2), (2, 18))


def _maze():
    return generate(type="loops", rows=N, cols=N, seed=7, weighted=False)


def _trap():
    cells = _blank()
    for col in (5, 11, 16):  # three walls; doors only in the bottom rows
        for r in range(18):
            cells[r * N + col] = 1
    return _grid(cells, (9, 1), (9, 19))


def _river():
    cells = _blank()
    for r in range(N):
        for c in range(9, 13):
            cells[r * N + c] = 3  # water band: cost 5
    for r in (13, 14):
        for c in range(9, 13):
            cells[r * N + c] = 2  # sand bridge: cost 3
    return _grid(cells, (16, 2), (16, 18))


SCENARIOS = {
    "open": {
        "title": "Open field",
        "blurb": "No walls. Hints shine: A* and Greedy walk straight, BFS floods the map.",
        "build": _open,
    },
    "maze": {
        "title": "Twisty maze",
        "blurb": "Several routes exist. Watch each algorithm choose one.",
        "build": _maze,
    },
    "trap": {
        "title": "Greedy trap",
        "blurb": "Walls with doors at the bottom. Greedy follows the hint into dead ends.",
        "build": _trap,
    },
    "river": {
        "title": "River crossing",
        "blurb": "Water costs 5, sand 3. BFS counts steps; UCS and A* count cost.",
        "build": _river,
    },
}


@router.get("/learn/scenarios")
def get_scenarios(response: Response) -> list[dict]:
    """List all available scenarios."""
    response.headers["Cache-Control"] = "public, max-age=3600"
    return [{"key": k, "title": v["title"], "blurb": v["blurb"]} for k, v in SCENARIOS.items()]


def _frame(i: int, s, maze: MazeGrid, expanded: list, discovered: list) -> dict:
    """Build a single walkthrough frame."""
    cols = maze.cols
    is_bds = isinstance(s, BidirectionalSearch)

    # Current cell and side
    current_cell = None
    current_side = None
    if expanded:
        current_cell = expanded[-1]
        if is_bds:
            current_side = s.cell_sides.get(current_cell)

    # Expanded indices
    expanded_indices = [r * cols + c for r, c in expanded]

    # Discovered cells with g, h, f, side
    discovered_data = []
    for cell in discovered:
        r, c = cell
        idx = r * cols + c
        
        if is_bds:
            # BDS: use dist_f/dist_b for g, no heuristic
            side = s.cell_sides.get(cell)
            if side == "forward":
                g = s.dist_f.get(cell, 0)
            elif side == "backward":
                g = s.dist_b.get(cell, 0)
            else:
                g = 0
            h = None
            f = None
        else:
            # Search: use g_costs
            g = s.g_costs.get(cell, 0.0)
            h = None
            f = None
            
            # Compute h for informed algorithms
            if s.h_fn and s.kind in ("greedy", "astar"):
                h = s.h_fn(r, c, maze.goal[0], maze.goal[1])
            
            # Compute f for A*
            if s.kind == "astar" and h is not None:
                f = g + h
            elif s.kind == "greedy" and h is not None:
                f = h
            elif s.kind == "ucs":
                f = g

        discovered_data.append([idx, round(g, 2), round(h, 2) if h is not None else None, round(f, 2) if f is not None else None, current_side if is_bds else None])

    # Waiting queues
    waiting_view = s.waiting_view(8)
    queues = {}
    queue_sizes = {}
    
    for queue_name, cells in waiting_view.items():
        queue_list = []
        for cell in cells:
            r, c = cell
            idx = r * cols + c
            
            if is_bds:
                if queue_name == "forward":
                    g = s.dist_f.get(cell, 0)
                else:
                    g = s.dist_b.get(cell, 0)
                h = None
                f = None
            else:
                g = s.g_costs.get(cell, 0.0)
                h = None
                f = None
                
                if s.h_fn and s.kind in ("greedy", "astar"):
                    h = s.h_fn(r, c, maze.goal[0], maze.goal[1])
                
                if s.kind == "astar" and h is not None:
                    f = g + h
                elif s.kind == "greedy" and h is not None:
                    f = h
                elif s.kind == "ucs":
                    f = g
            
            queue_list.append({
                "idx": idx,
                "g": round(g, 2),
                "h": round(h, 2) if h is not None else None,
                "f": round(f, 2) if f is not None else None,
            })
        
        queues[queue_name] = queue_list
        
        # Full queue size
        if is_bds:
            if queue_name == "forward":
                queue_sizes[queue_name] = len(s.queue_f)
            else:
                queue_sizes[queue_name] = len(s.queue_b)
        else:
            queue_sizes[queue_name] = len(s.open_cells)

    # Generate note
    note = ""
    if current_cell:
        if is_bds:
            g_val = s.dist_f.get(current_cell, 0) if current_side == "forward" else s.dist_b.get(current_cell, 0)
            note = narrate_step("bds", None, current_cell, g_val, 0.0)
            # Add meeting note if this is the meeting cell
            if s.meeting_cell == current_cell:
                note += f" The waves met at ({current_cell[0]}, {current_cell[1]})."
        else:
            g_val = s.g_costs.get(current_cell, 0.0)
            h_val = 0.0
            if s.h_fn:
                h_val = s.h_fn(current_cell[0], current_cell[1], maze.goal[0], maze.goal[1])
            note = narrate_step(s.kind, s.heuristic_name if hasattr(s, 'heuristic_name') else None, current_cell, g_val, h_val)

    return {
        "i": i,
        "expanded": expanded_indices,
        "current": (current_cell[0] * cols + current_cell[1]) if current_cell else None,
        "side": current_side,
        "discovered": discovered_data,
        "queues": queues,
        "queue_size": queue_sizes,
        "note": note,
    }


@lru_cache(maxsize=64)
def _build_walkthrough(algorithm: str, scenario: str) -> dict:
    """Build a complete walkthrough for an algorithm on a scenario."""
    if scenario not in SCENARIOS:
        raise ApiError("UNKNOWN_SCENARIO", f"Scenario '{scenario}' not found")
    
    if algorithm not in ("bfs", "dfs", "ucs", "greedy", "astar", "bds"):
        raise ApiError("UNKNOWN_ALGORITHM", f"Algorithm '{algorithm}' not supported")
    
    maze = SCENARIOS[scenario]["build"]()
    
    # Create search with heuristic for informed algorithms
    heuristic = "manhattan" if algorithm in ("greedy", "astar") else None
    s = create_search(algorithm, maze, heuristic=heuristic)
    
    # Compute optimal cost
    c_star = dijkstra_optimal_cost(maze)
    
    # Initial frame (start + goal for BDS)
    initial_discovered = [maze.start]
    if algorithm == "bds":
        initial_discovered.append(maze.goal)
    
    frames = [_frame(0, s, maze, [], initial_discovered)]
    
    # Run search
    while s.status in ("init", "running") and len(frames) <= 700:
        s.step()
        frames.append(_frame(len(frames), s, maze, s.delta_expanded, s.delta_discovered))
    
    # Build response
    result = {
        "scenario": {
            "key": scenario,
            "title": SCENARIOS[scenario]["title"],
            "rows": maze.rows,
            "cols": maze.cols,
            "cells": list(maze.cells),
            "start": list(maze.start),
            "goal": list(maze.goal),
        },
        "algorithm": algorithm,
        "heuristic": heuristic,
        "found": s.status == "found",
        "route": [list(cell) for cell in s.path] if s.path else None,
        "route_steps": s.path_length if s.path else None,
        "route_cost": s.path_cost if s.path else None,
        "c_star": c_star,
        "checked": s.expanded_count,
        "frames": frames,
    }
    
    return result


@router.get("/learn/walkthrough")
def get_walkthrough(algorithm: str = "bfs", scenario: str = "open", response: Response = None) -> dict:
    """Get a complete walkthrough for an algorithm on a scenario."""
    if response:
        response.headers["Cache-Control"] = "public, max-age=3600"
    
    return _build_walkthrough(algorithm.lower(), scenario.lower())
