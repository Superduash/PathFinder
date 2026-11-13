"""Maze manipulation routes."""
import random
from fastapi import APIRouter
from backend.app.models import (
    Maze, GenerateMazeRequest, PresetMazeRequest,
    RandomizeEndpointsRequest, ValidateMazeRequest
)
from pydantic import BaseModel
from backend.app.maze.grid import MazeGrid
from backend.app.maze.generators import generate, randomize_endpoints as rand_ep
from backend.app.maze.presets import load_preset
from backend.app.search.heuristics import get_heuristic

router = APIRouter()


class HeuristicMapRequest(BaseModel):
    maze: Maze
    heuristic: str = "manhattan"


@router.post("/maze/generate", response_model=Maze)
def api_generate_maze(req: GenerateMazeRequest) -> Maze:
    from backend.app.maze.generators import ensure_solvable
    
    grid = generate(
        type=req.type,
        rows=req.rows,
        cols=req.cols,
        density=req.density,
        weighted=req.weighted,
        weight_fraction=req.weight_fraction,
        diagonal=req.diagonal,
        seed=req.seed,
        randomize_endpoints_flag=req.randomize_endpoints,
    )
    
    # Auto-ensure solvability for high-density random mazes
    # Random mazes with density > 0.4 are often unsolvable
    if req.type == "random" and req.density > 0.4:
        from backend.app.search.reference import is_reachable
        if not is_reachable(grid):
            grid = ensure_solvable(
                maze=grid,
                base_seed=req.seed or 42,
                gen_fn=generate,
                gen_kwargs={
                    "type": req.type,
                    "rows": req.rows,
                    "cols": req.cols,
                    "density": req.density,
                    "weighted": req.weighted,
                    "weight_fraction": req.weight_fraction,
                    "diagonal": req.diagonal,
                    "randomize_endpoints_flag": req.randomize_endpoints,
                },
            )
    
    return Maze(**grid.to_dict())


_PRESET_CACHE: dict[tuple[str, bool], Maze] = {}


@router.post("/maze/preset", response_model=Maze)
def api_preset_maze(req: PresetMazeRequest) -> Maze:
    key = (req.name, req.diagonal)
    if key in _PRESET_CACHE:
        return _PRESET_CACHE[key]
    grid = load_preset(req.name, diagonal=req.diagonal)
    res = Maze(**grid.to_dict())
    _PRESET_CACHE[key] = res
    return res


@router.post("/maze/randomize-endpoints", response_model=Maze)
def api_randomize_endpoints(req: RandomizeEndpointsRequest) -> Maze:
    grid = MazeGrid.from_model(req.maze)
    grid.validate()
    rng = random.Random()
    grid = rand_ep(grid, rng)
    return Maze(**grid.to_dict())


@router.post("/maze/validate")
def api_validate_maze(req: ValidateMazeRequest) -> dict:
    grid = MazeGrid.from_model(req.maze)
    grid.validate()
    from backend.app.search.reference import is_reachable
    solvable = is_reachable(grid)
    return {"valid": True, "solvable": solvable}


@router.post("/maze/heuristic-map")
def api_heuristic_map(req: HeuristicMapRequest) -> dict:
    grid = MazeGrid.from_model(req.maze)
    h_fn = get_heuristic(req.heuristic, grid.diagonal)
    gr, gc = grid.goal
    values = []
    max_h = 0.0
    for r in range(grid.rows):
        for c in range(grid.cols):
            if grid.cell(r, c) == 1:
                values.append(None)
            else:
                h = h_fn(r, c, gr, gc)
                values.append(round(h, 2))
                if h > max_h:
                    max_h = h
    return {
        "values": values,
        "max": round(max_h, 2),
        "heuristic": req.heuristic,
    }




@router.post("/maze/analyze")
def api_analyze_maze(payload: dict) -> dict:
    """Phase 2.7: Analyze maze structure and return hints."""
    maze_data = payload.get("maze")
    if not maze_data:
        raise ApiError("INVALID_PARAMS", "Missing maze")
    
    from backend.app.maze.grid import MazeGrid
    from backend.app.search.reference import is_reachable
    
    maze = MazeGrid.from_dict(maze_data)
    
    # Count open cells and terrain
    open_cells = sum(1 for c in maze.cells if c == 0)
    terrain_cells = sum(1 for c in maze.cells if c in (2, 3))
    walls = sum(1 for c in maze.cells if c == 1)
    
    # Check reachability
    reachable = is_reachable(maze)
    
    # Count cycles (edges - nodes + 1)
    if reachable:
        edges = 0
        open_coords = [(r, c) for r in range(maze.rows) for c in range(maze.cols) if maze.cell(r, c) != 1]
        for r, c in open_coords:
            for dr, dc in [(-1,0), (1,0), (0,-1), (0,1)]:
                nr, nc = r + dr, c + dc
                if maze.in_bounds(nr, nc) and maze.cell(nr, nc) != 1:
                    edges += 1
        edges //= 2
        cycles = max(0, edges - len(open_coords) + 1)
    else:
        cycles = 0
    
    # Determine if perfect maze (0 cycles among reachable cells)
    is_perfect = cycles == 0 and reachable
    
    # Route diversity hint
    if cycles == 0:
        route_diversity_hint = "single_route"
    elif cycles <= 4:
        route_diversity_hint = "few_routes"
    else:
        route_diversity_hint = "many_routes"
    
    return {
        "reachable": reachable,
        "open_cells": open_cells,
        "terrain_cells": terrain_cells,
        "walls": walls,
        "cycles": cycles,
        "is_perfect": is_perfect,
        "route_diversity_hint": route_diversity_hint,
    }
