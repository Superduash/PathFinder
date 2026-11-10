"""Feature extraction for ML experiments."""
from __future__ import annotations
import math
import numpy as np
from backend.app.maze.grid import MazeGrid

FEATURE_NAMES = [
    "manhattan_dist",
    "euclidean_dist",
    "chebyshev_dist",
    "start_wall_density_3x3",
    "goal_wall_density_3x3",
    "overall_wall_density",
    "overall_weighted_density",
    "dr_abs",
    "dc_abs",
]


def extract_pair_features(maze: MazeGrid, r: int, c: int, gr: int, gc: int) -> np.ndarray:
    dr = abs(r - gr)
    dc = abs(c - gc)
    manhattan = float(dr + dc)
    euclidean = math.hypot(dr, dc)
    chebyshev = float(max(dr, dc))

    # Local 3x3 wall density around current cell
    walls_start = 0
    total_start = 0
    for nr in range(r - 1, r + 2):
        for nc in range(c - 1, c + 2):
            if maze.in_bounds(nr, nc):
                total_start += 1
                if maze.cell(nr, nc) == 1:
                    walls_start += 1
    start_density = walls_start / max(1, total_start)

    # Local 3x3 wall density around goal
    walls_goal = 0
    total_goal = 0
    for nr in range(gr - 1, gr + 2):
        for nc in range(gc - 1, gc + 2):
            if maze.in_bounds(nr, nc):
                total_goal += 1
                if maze.cell(nr, nc) == 1:
                    walls_goal += 1
    goal_density = walls_goal / max(1, total_goal)

    # Overall maze statistics
    total_cells = maze.rows * maze.cols
    wall_count = sum(1 for x in maze.cells if x == 1)
    weighted_count = sum(1 for x in maze.cells if x in (2, 3))

    overall_wall = wall_count / total_cells
    overall_weighted = weighted_count / total_cells

    return np.array([
        manhattan,
        euclidean,
        chebyshev,
        start_density,
        goal_density,
        overall_wall,
        overall_weighted,
        float(dr),
        float(dc),
    ], dtype=np.float32)


def extract_maze_features(maze: MazeGrid) -> np.ndarray:
    """Maze-level features for classification of fastest algorithm."""
    sr, sc = maze.start
    gr, gc = maze.goal
    dr = abs(sr - gr)
    dc = abs(sc - gc)
    manhattan = float(dr + dc)
    euclidean = math.hypot(dr, dc)

    total_cells = maze.rows * maze.cols
    wall_count = sum(1 for x in maze.cells if x == 1)
    sand_count = sum(1 for x in maze.cells if x == 2)
    water_count = sum(1 for x in maze.cells if x == 3)

    return np.array([
        float(maze.rows),
        float(maze.cols),
        manhattan,
        euclidean,
        wall_count / total_cells,
        sand_count / total_cells,
        water_count / total_cells,
        1.0 if maze.diagonal else 0.0,
    ], dtype=np.float32)


CLASSIFICATION_FEATURE_NAMES = [
    "rows",
    "cols",
    "manhattan_dist",
    "euclidean_dist",
    "wall_density",
    "sand_density",
    "water_density",
    "diagonal",
]

