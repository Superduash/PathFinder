# dfs.py
from grid_basics import neighbors, build_route

def dfs(grid, start, goal):
    """Depth-First Search: a LIFO stack, so it dives deep before backing up."""
    waiting = [start]                 # stack: last in, first out
    parent = {start: None}
    checked = 0
    while waiting:
        cell = waiting.pop()          # take the NEWEST waiting cell
        checked += 1
        if cell == goal:
            return build_route(parent, cell), checked
        for nxt in neighbors(grid, cell):
            if nxt not in parent:
                parent[nxt] = cell
                waiting.append(nxt)   # goes on top of the stack
    return None, checked
