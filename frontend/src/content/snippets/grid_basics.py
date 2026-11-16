# grid_basics.py — shared helpers
FLOOR, WALL, SAND, WATER = 0, 1, 2, 3
COST = {FLOOR: 1, SAND: 3, WATER: 5}               # cost of stepping ONTO a cell
MOVES = [(-1, 0), (1, 0), (0, -1), (0, 1)]         # up, down, left, right

def neighbors(grid, cell):
    """Cells you can step to from `cell` (4 directions, never through walls)."""
    row, col = cell
    for d_row, d_col in MOVES:
        r, c = row + d_row, col + d_col
        if 0 <= r < len(grid) and 0 <= c < len(grid[0]) and grid[r][c] != WALL:
            yield (r, c)

def step_cost(grid, cell):
    return COST[grid[cell[0]][cell[1]]]

def hint(cell, goal):
    """h(n): Manhattan distance, our guess of how far the goal still is."""
    return abs(cell[0] - goal[0]) + abs(cell[1] - goal[1])

def build_route(parent, cell):
    """Walk back from `cell` to the start using the `parent` dictionary."""
    route = []
    while cell is not None:
        route.append(cell)
        cell = parent[cell]
    return route[::-1]
