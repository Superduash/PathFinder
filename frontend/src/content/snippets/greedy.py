# greedy.py
import heapq
from grid_basics import neighbors, hint, build_route

def greedy(grid, start, goal):
    """Greedy Best-First Search: only looks at the hint h(n); ignores the cost so far."""
    parent = {start: None}
    waiting = [(hint(start, goal), 0, start)]    # (h, tie-breaker, cell)
    done, checked, tie = set(), 0, 0
    while waiting:
        _, _, cell = heapq.heappop(waiting)
        if cell in done:
            continue
        done.add(cell)
        checked += 1
        if cell == goal:
            return build_route(parent, cell), checked
        for nxt in neighbors(grid, cell):
            if nxt not in parent:                # first discovery wins
                parent[nxt] = cell
                tie += 1
                heapq.heappush(waiting, (hint(nxt, goal), tie, nxt))
    return None, checked
