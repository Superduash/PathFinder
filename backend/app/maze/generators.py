"""Maze generators.

All generators accept a seed (int | None) and return a MazeGrid.
If seed is None a random one is chosen and stored in MazeGrid.seed.
"""
from __future__ import annotations
import random
import math
from typing import Optional

from backend.app.maze.grid import MazeGrid


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _new_grid(rows: int, cols: int, fill: int, rng: random.Random,
              seed: int, diagonal: bool = False) -> MazeGrid:
    return MazeGrid(
        rows=rows,
        cols=cols,
        cells=[fill] * (rows * cols),
        start=(0, 0),
        goal=(rows - 1, cols - 1),
        diagonal=diagonal,
        seed=seed,
        meta={},
    )


def _resolve_seed(seed: Optional[int]) -> tuple[int, random.Random]:
    if seed is None:
        seed = random.randint(0, 2**31 - 1)
    return seed, random.Random(seed)


def randomize_endpoints(maze: MazeGrid, rng: random.Random,
                        min_dist_ratio: float = 0.5) -> MazeGrid:
    """Move start/goal to open cells with Manhattan ≥ 0.5*(rows+cols)."""
    min_dist = int(min_dist_ratio * (maze.rows + maze.cols))
    open_cells = [
        (r, c)
        for r in range(maze.rows)
        for c in range(maze.cols)
        if maze.cell(r, c) != 1
    ]
    if len(open_cells) < 2:
        return maze

    for _ in range(200):
        s = rng.choice(open_cells)
        g = rng.choice(open_cells)
        if s != g and abs(s[0] - g[0]) + abs(s[1] - g[1]) >= min_dist:
            maze.start = s
            maze.goal = g
            return maze
    # Fallback: just pick any two distinct open cells
    if len(open_cells) >= 2:
        s, g = open_cells[0], open_cells[-1]
        maze.start, maze.goal = s, g
    return maze


def ensure_solvable(maze: MazeGrid, base_seed: int,
                    gen_fn, gen_kwargs: dict,
                    max_retries: int = 50) -> MazeGrid:
    """Retry generation with derived seeds until solvable or retries exhausted."""
    from backend.app.search.reference import is_reachable
    if is_reachable(maze):
        return maze
    for k in range(1, max_retries + 1):
        derived = (base_seed * 1_000_003 + k) % (2**31)
        candidate = gen_fn(seed=derived, **gen_kwargs)
        if is_reachable(candidate):
            return candidate
    return maze  # Return last attempt even if unsolvable


# ---------------------------------------------------------------------------
# Generator: empty
# ---------------------------------------------------------------------------

def empty(rows: int = 20, cols: int = 20, diagonal: bool = False,
          seed: Optional[int] = None, **kwargs) -> MazeGrid:
    seed, rng = _resolve_seed(seed)
    maze = _new_grid(rows, cols, 0, rng, seed, diagonal)
    maze.meta = {"generator": "empty"}
    maze.start = (0, 0)
    maze.goal = (rows - 1, cols - 1)
    return maze


# ---------------------------------------------------------------------------
# Generator: random (density)
# ---------------------------------------------------------------------------

def random_maze(rows: int = 20, cols: int = 20, density: float = 0.3,
                weighted: bool = False, weight_fraction: float = 0.3,
                diagonal: bool = False, seed: Optional[int] = None,
                randomize_ep: bool = True, **kwargs) -> MazeGrid:
    seed, rng = _resolve_seed(seed)
    maze = _new_grid(rows, cols, 0, rng, seed, diagonal)
    maze.meta = {"generator": "random", "density": density}

    for i in range(rows * cols):
        if rng.random() < density:
            maze.cells[i] = 1

    if weighted:
        for i in range(rows * cols):
            if maze.cells[i] == 0 and rng.random() < weight_fraction:
                maze.cells[i] = rng.choice([2, 3])

    # Clear start/goal
    maze.start = (0, 0)
    maze.goal = (rows - 1, cols - 1)
    maze.cells[maze.index(*maze.start)] = 0
    maze.cells[maze.index(*maze.goal)] = 0

    if randomize_ep:
        maze = randomize_endpoints(maze, rng)

    return maze


# ---------------------------------------------------------------------------
# Generator: backtracker (recursive DFS perfect maze)
# ---------------------------------------------------------------------------

def backtracker(rows: int = 21, cols: int = 21, weighted: bool = False,
                weight_fraction: float = 0.15, diagonal: bool = False,
                seed: Optional[int] = None, randomize_ep: bool = True,
                **kwargs) -> MazeGrid:
    # Backtracker works best with odd dimensions
    rows = rows if rows % 2 == 1 else rows + 1
    cols = cols if cols % 2 == 1 else cols + 1
    seed, rng = _resolve_seed(seed)
    maze = _new_grid(rows, cols, 1, rng, seed, diagonal)  # start all walls
    maze.meta = {"generator": "backtracker"}

    def carve(r: int, c: int) -> None:
        dirs = [(-2, 0), (2, 0), (0, -2), (0, 2)]
        rng.shuffle(dirs)
        for dr, dc in dirs:
            nr, nc = r + dr, c + dc
            if maze.in_bounds(nr, nc) and maze.cells[maze.index(nr, nc)] == 1:
                # Carve wall between
                maze.cells[maze.index(r + dr // 2, c + dc // 2)] = 0
                maze.cells[maze.index(nr, nc)] = 0
                carve(nr, nc)

    # Iterative DFS to avoid recursion limit on large mazes
    stack = [(1, 1)]
    maze.cells[maze.index(1, 1)] = 0
    visited = {(1, 1)}
    while stack:
        r, c = stack[-1]
        dirs = [(-2, 0), (2, 0), (0, -2), (0, 2)]
        rng.shuffle(dirs)
        moved = False
        for dr, dc in dirs:
            nr, nc = r + dr, c + dc
            if maze.in_bounds(nr, nc) and (nr, nc) not in visited:
                maze.cells[maze.index(r + dr // 2, c + dc // 2)] = 0
                maze.cells[maze.index(nr, nc)] = 0
                visited.add((nr, nc))
                stack.append((nr, nc))
                moved = True
                break
        if not moved:
            stack.pop()

    if weighted:
        for i in range(rows * cols):
            if maze.cells[i] == 0 and rng.random() < weight_fraction:
                maze.cells[i] = rng.choice([2, 3])

    maze.start = (1, 1)
    maze.goal = (rows - 2, cols - 2)

    if randomize_ep:
        maze = randomize_endpoints(maze, rng)

    return maze


# ---------------------------------------------------------------------------
# Generator: braided (loop maze - remove dead ends)
# ---------------------------------------------------------------------------

def braided(rows: int = 21, cols: int = 21, loop_fraction: float = 0.08,
            weighted: bool = False, weight_fraction: float = 0.15,
            diagonal: bool = False, seed: Optional[int] = None,
            randomize_ep: bool = True, **kwargs) -> MazeGrid:
    seed, rng = _resolve_seed(seed)
    # Start from a backtracker maze
    maze = backtracker(rows=rows, cols=cols, weighted=weighted,
                       weight_fraction=weight_fraction,
                       diagonal=diagonal, seed=seed, randomize_ep=False)
    maze.seed = seed
    maze.meta = {"generator": "braided", "loop_fraction": loop_fraction}

    # Find dead ends and remove some walls
    dead_ends = []
    for r in range(maze.rows):
        for c in range(maze.cols):
            if maze.cell(r, c) != 1:
                open_nb = sum(1 for dr, dc in [(-1,0),(1,0),(0,-1),(0,1)]
                              if maze.in_bounds(r+dr, c+dc)
                              and maze.cell(r+dr, c+dc) != 1)
                if open_nb == 1:
                    dead_ends.append((r, c))

    rng.shuffle(dead_ends)
    to_remove = int(len(dead_ends) * loop_fraction)
    for r, c in dead_ends[:to_remove]:
        walls = [(r+dr, c+dc) for dr, dc in [(-1,0),(1,0),(0,-1),(0,1)]
                 if maze.in_bounds(r+dr, c+dc)
                 and maze.cell(r+dr, c+dc) == 1]
        if walls:
            wr, wc = rng.choice(walls)
            maze.cells[maze.index(wr, wc)] = 0

    if randomize_ep:
        maze = randomize_endpoints(maze, rng)

    return maze


# ---------------------------------------------------------------------------
# Generator: weighted terrain blobs
# ---------------------------------------------------------------------------

def weighted_blobs(rows: int = 20, cols: int = 20, density: float = 0.2,
                   weight_fraction: float = 0.4, diagonal: bool = False,
                   seed: Optional[int] = None, randomize_ep: bool = True,
                   **kwargs) -> MazeGrid:
    seed, rng = _resolve_seed(seed)
    maze = _new_grid(rows, cols, 0, rng, seed, diagonal)
    maze.meta = {"generator": "weighted"}

    # Sparse walls
    for i in range(rows * cols):
        if rng.random() < density:
            maze.cells[i] = 1

    # Terrain blobs
    n_blobs = max(1, int(rows * cols * weight_fraction / 20))
    for _ in range(n_blobs):
        cr, cc = rng.randint(0, rows-1), rng.randint(0, cols-1)
        blob_type = rng.choice([2, 3])
        size = rng.randint(3, max(4, int((rows+cols)/4)))
        for _ in range(size * 3):
            r = max(0, min(rows-1, cr + rng.randint(-size, size)))
            c = max(0, min(cols-1, cc + rng.randint(-size, size)))
            if maze.cell(r, c) != 1:
                maze.cells[maze.index(r, c)] = blob_type

    maze.start = (0, 0)
    maze.goal = (rows - 1, cols - 1)
    maze.cells[maze.index(*maze.start)] = 0
    maze.cells[maze.index(*maze.goal)] = 0

    if randomize_ep:
        maze = randomize_endpoints(maze, rng)

    return maze


# ---------------------------------------------------------------------------
# Public registry
# ---------------------------------------------------------------------------

GENERATORS = {
    "empty": empty,
    "random": random_maze,
    "backtracker": backtracker,
    "braided": braided,
    "weighted": weighted_blobs,
}


def generate(type: str = "backtracker", rows: int = 20, cols: int = 20,
             density: float = 0.3, weighted: bool = False,
             weight_fraction: float = 0.3, diagonal: bool = False,
             seed: Optional[int] = None, randomize_endpoints_flag: bool = True,
             ensure_solvable_flag: bool = False) -> MazeGrid:
    from backend.app.errors import ApiError, UNKNOWN_GENERATOR
    if type not in GENERATORS:
        raise ApiError(UNKNOWN_GENERATOR, f"Unknown generator '{type}'. "
                       f"Available: {list(GENERATORS.keys())}")
    fn = GENERATORS[type]
    kwargs = dict(
        rows=rows, cols=cols, density=density, weighted=weighted,
        weight_fraction=weight_fraction, diagonal=diagonal, seed=seed,
        randomize_ep=randomize_endpoints_flag,
    )
    maze = fn(**kwargs)
    return maze

