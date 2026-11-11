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
    return Maze(**grid.to_dict())


@router.post("/maze/preset", response_model=Maze)
def api_preset_maze(req: PresetMazeRequest) -> Maze:
    grid = load_preset(req.name, diagonal=req.diagonal)
    return Maze(**grid.to_dict())


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

