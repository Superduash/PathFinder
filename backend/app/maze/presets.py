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
    """A maze where greedy search gets trapped — long detour required."""
    rows, cols = 15, 20
    cells = [0] * (rows * cols)
    # Vertical wall near goal with one gap at the bottom
    wall_col = cols - 4
    for r in range(rows - 2):
        cells[r * cols + wall_col] = 1
    # Horizontal wall creating a U-trap near goal
    trap_row = 2
    for c in range(wall_col + 1, cols - 1):
        cells[trap_row * cols + c] = 1
    return MazeGrid(rows=rows, cols=cols, cells=cells,
                    start=(0, 0), goal=(0, cols-1),
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


PRESETS: dict[str, callable] = {
    "open_field": open_field,
    "wall_with_gap": wall_with_gap,
    "greedy_trap": greedy_trap,
    "weighted_river": weighted_river,
    "corridor_maze": corridor_maze,
    "unreachable_goal": unreachable_goal,
}


def load_preset(name: str, diagonal: bool = False) -> MazeGrid:
    if name not in PRESETS:
        raise ApiError(UNKNOWN_PRESET,
                       f"Unknown preset '{name}'. Available: {list(PRESETS.keys())}")
    return PRESETS[name](diagonal=diagonal)

