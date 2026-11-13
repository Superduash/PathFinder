"""Deterministic preset mazes for demonstration."""
from __future__ import annotations
from backend.app.maze.grid import MazeGrid
from backend.app.errors import ApiError, UNKNOWN_PRESET


def _grid(rows: int, cols: int, pattern: list[str],
          start: tuple, goal: tuple, diagonal: bool = False) -> MazeGrid:
    cells = []
    for row in pattern:
        for ch in row:
            if ch == '#':
                cells.append(1)
            elif ch == 'S':
                cells.append(0)
            elif ch == 'G':
                cells.append(0)
            elif ch == '~':
                cells.append(3)   # water
            elif ch == '.':
                cells.append(2)   # sand
            else:
                cells.append(0)
    return MazeGrid(
        rows=rows, cols=cols, cells=cells,
        start=start, goal=goal, diagonal=diagonal,
        seed=None, meta={"preset": "custom"},
    )


def open_field(diagonal: bool = False) -> MazeGrid:
    rows, cols = 15, 15
    cells = [0] * (rows * cols)
    return MazeGrid(rows=rows, cols=cols, cells=cells,
                    start=(0, 0), goal=(rows-1, cols-1),
                    diagonal=diagonal, seed=None,
                    meta={"preset": "open_field"})


def wall_with_gap(diagonal: bool = False) -> MazeGrid:
    rows, cols = 15, 20
    cells = [0] * (rows * cols)
    wall_col = cols // 2
    gap_row = rows // 2
    for r in range(rows):
        if r != gap_row:
            cells[r * cols + wall_col] = 1
    return MazeGrid(rows=rows, cols=cols, cells=cells,
                    start=(0, 0), goal=(rows-1, cols-1),
                    diagonal=diagonal, seed=None,
                    meta={"preset": "wall_with_gap"})


def greedy_trap(diagonal: bool = False) -> MazeGrid:
    """A maze where greedy search gets trapped — verified trap layout (polish4.md §0.4).

    21 cols, 15 rows. Walls at col 5, 12, 16 for rows 0-11 and 14 (not rows 12-13 which are doors).
    Start=(7,1), Goal=(7,19). Greedy takes a suboptimal route; optimal path goes through the doors.
    """
    rows, cols = 15, 21
    cells = [0] * (rows * cols)
    wall_cols = [5, 12, 16]
    door_rows = {12, 13}  # open rows (no walls)
    for wc in wall_cols:
        for r in range(rows):
            if r not in door_rows:
                cells[r * cols + wc] = 1
    return MazeGrid(rows=rows, cols=cols, cells=cells,
                    start=(7, 1), goal=(7, 19),
                    diagonal=diagonal, seed=None,
                    meta={"preset": "greedy_trap"})


def weighted_river(diagonal: bool = False) -> MazeGrid:
    """A river of water cells cutting across the maze."""
    rows, cols = 15, 20
    cells = [0] * (rows * cols)
    river_row = rows // 2
    # Water band 2 rows wide
    for c in range(cols):
        cells[river_row * cols + c] = 3
        cells[(river_row + 1) * cols + c] = 3
    # Leave a narrow sand bridge
    bridge_c = cols // 3
    cells[river_row * cols + bridge_c] = 2
    cells[(river_row + 1) * cols + bridge_c] = 2
    return MazeGrid(rows=rows, cols=cols, cells=cells,
                    start=(0, 0), goal=(rows-1, cols-1),
                    diagonal=diagonal, seed=None,
                    meta={"preset": "weighted_river"})


def corridor_maze(diagonal: bool = False) -> MazeGrid:
    """Narrow corridors — DFS thrives; BFS/UCS spend many expansions."""
    rows, cols = 15, 15
    cells = [1] * (rows * cols)
    # Horizontal corridors connected by vertical passages
    for r in range(1, rows - 1, 4):
        for c in range(cols):
            cells[r * cols + c] = 0
    for c in range(1, cols - 1, 6):
        for r in range(rows):
            cells[r * cols + c] = 0
    return MazeGrid(rows=rows, cols=cols, cells=cells,
                    start=(1, 0), goal=(rows-2, cols-1),
                    diagonal=diagonal, seed=None,
                    meta={"preset": "corridor_maze"})


def unreachable_goal(diagonal: bool = False) -> MazeGrid:
    """Goal is completely enclosed by walls."""
    rows, cols = 10, 10
    cells = [0] * (rows * cols)
    gr, gc = rows - 2, cols - 2
    for dr in [-1, 0, 1]:
        for dc in [-1, 0, 1]:
            nr, nc = gr + dr, gc + dc
            if 0 <= nr < rows and 0 <= nc < cols and (dr != 0 or dc != 0):
                cells[nr * cols + nc] = 1
    return MazeGrid(rows=rows, cols=cols, cells=cells,
                    start=(0, 0), goal=(gr, gc),
                    diagonal=diagonal, seed=None,
                    meta={"preset": "unreachable_goal"})


def two_routes(diagonal: bool = False) -> MazeGrid:
    """Short water route vs long dry route — cost != steps."""
    rows, cols = 15, 20
    cells = [0] * (rows * cols)
    # Horizontal water barrier, full width
    mid = rows // 2
    for c in range(cols):
        cells[mid * cols + c] = 3  # water (cost 5)
    # Short crossing: narrow sand bridge at col 3 (cost 3)
    cells[mid * cols + 3] = 2  # sand
    # Long dry path: walls forcing detour around
    # Wall blocking direct path col 10 rows 0-mid-1
    for r in range(mid):
        cells[r * cols + 10] = 1
    return MazeGrid(rows=rows, cols=cols, cells=cells,
                    start=(0, 0), goal=(rows - 1, cols - 1),
                    diagonal=diagonal, seed=None,
                    meta={"preset": "two_routes"})


def loops_arena(diagonal: bool = False) -> MazeGrid:
    """21x21 loops maze with seed=42 — several valid routes."""
    from backend.app.maze.generators import loops as loops_gen
    maze = loops_gen(rows=21, cols=21, loop_fraction=0.25, weighted=True,
                     weight_fraction=0.2, diagonal=diagonal, seed=42, randomize_ep=True)
    maze.meta["preset"] = "loops_arena"
    return maze


def perfect_maze(diagonal: bool = False) -> MazeGrid:
    """Backtracker perfect maze — exactly one route."""
    from backend.app.maze.generators import backtracker
    maze = backtracker(rows=21, cols=21, weighted=False, diagonal=diagonal, seed=11, randomize_ep=True)
    maze.meta["preset"] = "perfect_maze"
    return maze


PRESETS: dict[str, callable] = {
    "open_field": open_field,
    "wall_with_gap": wall_with_gap,
    "greedy_trap": greedy_trap,
    "weighted_river": weighted_river,
    "corridor_maze": corridor_maze,
    "unreachable_goal": unreachable_goal,
    "two_routes": two_routes,
    "loops_arena": loops_arena,
    "perfect_maze": perfect_maze,
}

# Phase 2.5: Preset metadata with lessons
PRESET_METADATA = {
    "open_field": {
        "key": "open_field",
        "name": "Open Field",
        "description": "Empty 15×15 grid, start to goal diagonal",
        "lesson": "Hints shine: A* ≈ Greedy ≪ BFS=UCS",
        "expect": "A* checks ≤40 cells, BFS checks ≥200"
    },
    "wall_with_gap": {
        "key": "wall_with_gap",
        "name": "Wall with Gap",
        "description": "Long wall with single opening",
        "lesson": "A* needs fewer cells than UCS",
        "expect": "A* < 0.6 × UCS expansions"
    },
    "greedy_trap": {
        "key": "greedy_trap",
        "name": "Greedy Trap",
        "description": "Vertical walls with doors at bottom",
        "lesson": "Greedy gets fooled, A* doesn't",
        "expect": "Greedy cost > 1.4 × optimal, A* cost = optimal"
    },
    "weighted_river": {
        "key": "weighted_river",
        "name": "Weighted River",
        "description": "Water barrier with sand bridge",
        "lesson": "UCS/A* beat BFS on cost; BFS = fewest steps",
        "expect": "BFS cost > UCS cost, BFS moves ≤ UCS moves"
    },
    "two_routes": {
        "key": "two_routes",
        "name": "Two Routes",
        "description": "Short water route vs long dry route",
        "lesson": "Cost ≠ steps",
        "expect": "UCS cost < BFS cost and UCS moves > BFS moves"
    },
    "loops_arena": {
        "key": "loops_arena",
        "name": "Loops Arena",
        "description": "21×21 maze with multiple loops",
        "lesson": "Several valid routes; DFS wanders",
        "expect": "3+ distinct routes"
    },
    "corridor_maze": {
        "key": "corridor_maze",
        "name": "Corridor Maze",
        "description": "Long narrow corridors",
        "lesson": "Dead ends affect exploration patterns",
        "expect": "2+ distinct routes"
    },
    "unreachable_goal": {
        "key": "unreachable_goal",
        "name": "Unreachable Goal",
        "description": "Goal sealed by walls",
        "lesson": "All algorithms fail gracefully",
        "expect": "All status = failed with no_path"
    },
    "perfect_maze": {
        "key": "perfect_maze",
        "name": "Perfect Maze (One Route)",
        "description": "Backtracker with no loops",
        "lesson": "Every algorithm finds the same route; only effort differs",
        "expect": "Exactly 1 distinct route"
    },
}


def get_preset_list() -> list[dict]:
    """Phase 2.5: Return list of presets with metadata."""
    return [PRESET_METADATA[key] for key in PRESETS.keys()]


def load_preset(name: str, diagonal: bool = False) -> MazeGrid:
    if name not in PRESETS:
        raise ApiError(UNKNOWN_PRESET,
                       f"Unknown preset '{name}'. Available: {list(PRESETS.keys())}")
    return PRESETS[name](diagonal=diagonal)

