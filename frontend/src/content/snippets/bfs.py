# bfs.py
from collections import deque
from grid_basics import neighbors, build_route

def bfs(grid, start, goal):
    """Breadth-First Search: a FIFO queue, so cells are checked ring by ring."""
    waiting = deque([start])          # queue: first in, first out
    parent = {start: None}            # who discovered each cell
    checked = 0
    while waiting:
        cell = waiting.popleft()      # take the OLDEST waiting cell
        checked += 1
        if cell == goal:
            return build_route(parent, cell), checked
        for nxt in neighbors(grid, cell):
            if nxt not in parent:     # never seen before
                parent[nxt] = cell
                waiting.append(nxt)   # join the back of the queue
    return None, checked              # queue empty: no route exists
