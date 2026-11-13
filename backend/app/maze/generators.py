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
    """Phase 2.4: Move start/goal to open cells, avoiding same row/col and terrain."""
    min_dist = int(min_dist_ratio * (maze.rows + maze.cols))
    open_cells = [
        (r, c)
        for r in range(maze.rows)
        for c in range(maze.cols)
        if maze.cell(r, c) == 0  # Plain open, not walls or terrain
    ]
    if len(open_cells) < 2:
        return maze

    # Phase 2.4: Prefer different rows AND columns
    for _ in range(200):
        s = rng.choice(open_cells)
        g = rng.choice(open_cells)
        if (s != g and 
            s[0] != g[0] and s[1] != g[1] and  # Different row AND column
            abs(s[0] - g[0]) + abs(s[1] - g[1]) >= min_dist):
            maze.start = s
            maze.goal = g
            return maze
    
    # Fallback: just ensure minimum distance
    for _ in range(100):
        s = rng.choice(open_cells)
        g = rng.choice(open_cells)
        if s != g and abs(s[0] - g[0]) + abs(s[1] - g[1]) >= min_dist:
            maze.start = s
            maze.goal = g
            return maze
            
    # Final fallback: just pick any two distinct open cells
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
# Generator: loops (Phase 2.2 - real loops by removing interior walls)
# ---------------------------------------------------------------------------

def loops(rows: int = 21, cols: int = 21, loop_fraction: float = 0.25,
          weighted: bool = False, weight_fraction: float = 0.25,
          diagonal: bool = False, seed: Optional[int] = None,
          randomize_ep: bool = True, terrain_style: str = "blobs",
          **kwargs) -> MazeGrid:
    """Phase 2.2: Create loops by removing interior walls from perfect maze.
    
    Algorithm:
    1. Generate perfect maze (backtracker)
    2. Find interior walls (open-wall-open, not on border)
    3. Shuffle and remove loop_fraction of them
    4. Count independent cycles
    """
    seed, rng = _resolve_seed(seed)
    # Start from perfect maze
    maze = backtracker(rows=rows, cols=cols, weighted=False,
                       diagonal=diagonal, seed=seed, randomize_ep=False)
    maze.seed = seed
    maze.meta = {"generator": "loops", "loop_fraction": loop_fraction}

    # Find interior walls that separate two open cells
    candidates = []
    for r in range(1, maze.rows - 1):
        for c in range(1, maze.cols - 1):
            if maze.cell(r, c) == 1:
                # Check horizontal (left-wall-right)
                if (c > 0 and c < maze.cols - 1 and
                    maze.cell(r, c-1) == 0 and maze.cell(r, c+1) == 0):
                    candidates.append((r, c))
                # Check vertical (up-wall-down)
                elif (r > 0 and r < maze.rows - 1 and
                      maze.cell(r-1, c) == 0 and maze.cell(r+1, c) == 0):
                    candidates.append((r, c))

    # Shuffle and remove loop_fraction
    rng.shuffle(candidates)
    to_remove = round(loop_fraction * len(candidates))
    for r, c in candidates[:to_remove]:
        maze.cells[maze.index(r, c)] = 0

    # Count cycles (edges - nodes + 1 over connected open cells)
    open_cells = [(r, c) for r in range(maze.rows) for c in range(maze.cols) if maze.cell(r, c) != 1]
    edges = 0
    for r, c in open_cells:
        for dr, dc in [(-1,0), (1,0), (0,-1), (0,1)]:
            nr, nc = r + dr, c + dc
            if maze.in_bounds(nr, nc) and maze.cell(nr, nc) != 1:
                edges += 1
    edges //= 2  # Each edge counted twice
    cycles = max(0, edges - len(open_cells) + 1)
    maze.meta["cycles"] = cycles

    # Apply terrain
    if weighted and weight_fraction > 0:
        if terrain_style == "blobs":
            _apply_terrain_blobs(maze, rng, weight_fraction)
        else:  # scatter
            _apply_terrain_scatter(maze, rng, weight_fraction)

    if randomize_ep:
        maze = randomize_endpoints(maze, rng, min_dist_ratio=0.5)
        # Phase 2.4: Reject endpoints on same row/column and inside terrain
        _fix_endpoints_constraints(maze, rng)

    return maze


def _apply_terrain_blobs(maze: MazeGrid, rng: random.Random, weight_fraction: float) -> None:
    """Phase 2.3: Apply terrain in blobs."""
    rows, cols = maze.rows, maze.cols
    n_blobs = max(1, int(rows * cols * weight_fraction / 20))
    for _ in range(n_blobs):
        cr, cc = rng.randint(0, rows-1), rng.randint(0, cols-1)
        blob_type = rng.choice([2, 3])
        size = rng.randint(3, max(4, int((rows+cols)/4)))
        for _ in range(size * 3):
            r = max(0, min(rows-1, cr + rng.randint(-size, size)))
            c = max(0, min(cols-1, cc + rng.randint(-size, size)))
            if maze.cell(r, c) == 0:  # Only apply to open cells
                maze.cells[maze.index(r, c)] = blob_type


def _apply_terrain_scatter(maze: MazeGrid, rng: random.Random, weight_fraction: float) -> None:
    """Phase 2.3: Apply terrain scattered."""
    for i in range(maze.rows * maze.cols):
        if maze.cells[i] == 0 and rng.random() < weight_fraction:
            maze.cells[i] = rng.choice([2, 3])


def _fix_endpoints_constraints(maze: MazeGrid, rng: random.Random) -> None:
    """Phase 2.4: Ensure endpoints are not on same row/col and not in terrain."""
    open_cells = [
        (r, c) for r in range(maze.rows) for c in range(maze.cols)
        if maze.cell(r, c) == 0  # Plain open, not terrain
    ]
    if len(open_cells) < 2:
        return
    
    # Try to find start/goal on different rows AND columns
    for _ in range(100):
        s = rng.choice(open_cells)
        g = rng.choice(open_cells)
        if s != g and s[0] != g[0] and s[1] != g[1]:
            dist = abs(s[0] - g[0]) + abs(s[1] - g[1])
            if dist >= int(0.5 * (maze.rows + maze.cols)):
                maze.start = s
                maze.goal = g
                return
    
    # Fallback: just ensure not same row/col
    for _ in range(50):
        s = rng.choice(open_cells)
        g = rng.choice(open_cells)
        if s != g and s[0] != g[0] and s[1] != g[1]:
            maze.start = s
            maze.goal = g
            return


# Make braided an alias for loops
braided = loops


# ---------------------------------------------------------------------------
# Generator: braided (Phase 2.2 - now alias for loops)
# ---------------------------------------------------------------------------


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
    "loops": loops,  # Phase 2.2: New real loops generator
    "braided": loops,  # Alias
    "weighted": weighted_blobs,
}


def generate(type: str = "backtracker", rows: int = 20, cols: int = 20,
             density: float = 0.3, weighted: bool = False,
             weight_fraction: float = 0.3, diagonal: bool = False,
             seed: Optional[int] = None, randomize_endpoints_flag: bool = True,
             ensure_solvable_flag: bool = False, loop_fraction: float = 0.25,
             terrain_style: str = "blobs") -> MazeGrid:
    """Phase 2.1: Pass ensure_solvable_flag through, Phase 2.2: add loop_fraction and terrain_style."""
    from backend.app.errors import ApiError, UNKNOWN_GENERATOR
    if type not in GENERATORS:
        raise ApiError(UNKNOWN_GENERATOR, f"Unknown generator '{type}'. "
                       f"Available: {list(GENERATORS.keys())}")
    fn = GENERATORS[type]
    kwargs = dict(
        rows=rows, cols=cols, density=density, weighted=weighted,
        weight_fraction=weight_fraction, diagonal=diagonal, seed=seed,
        randomize_ep=randomize_endpoints_flag, loop_fraction=loop_fraction,
        terrain_style=terrain_style,
    )
    
    base_seed = seed if seed is not None else random.randint(0, 2**31 - 1)
    maze = fn(**kwargs)
    
    # Phase 2.1: Apply ensure_solvable if requested (F3 fix)
    if ensure_solvable_flag:
        maze = ensure_solvable(maze, base_seed, fn, kwargs, max_retries=50)
        # Track retries in meta
        if maze.seed != base_seed:
            maze.meta["seed_used"] = maze.seed
            maze.meta["retries"] = maze.seed - base_seed
    
    return maze

