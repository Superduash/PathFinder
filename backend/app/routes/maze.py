"""Maze manipulation routes."""
import random
from fastapi import APIRouter
from backend.app.models import (
    Maze, GenerateMazeRequest, PresetMazeRequest,
    RandomizeEndpointsRequest, ValidateMazeRequest
)
from backend.app.maze.grid import MazeGrid
from backend.app.maze.generators import generate, randomize_endpoints as rand_ep
from backend.app.maze.presets import load_preset

router = APIRouter()


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

