# ucs.py
import heapq
from grid_basics import neighbors, step_cost, build_route

def ucs(grid, start, goal):
    """Uniform-Cost Search (Dijkstra): always check the cheapest cell first, g(n)."""
    g = {start: 0}                    # cheapest known cost to reach each cell
    parent = {start: None}
    waiting = [(0, 0, start)]         # (g, tie-breaker, cell): a priority queue
    done, checked, tie = set(), 0, 0
    while waiting:
        _, _, cell = heapq.heappop(waiting)
        if cell in done:
            continue                  # old entry, a cheaper one was already used
        done.add(cell)
        checked += 1
        if cell == goal:
            return build_route(parent, cell), checked
        for nxt in neighbors(grid, cell):
            new_g = g[cell] + step_cost(grid, nxt)
            if nxt not in done and new_g < g.get(nxt, float("inf")):
                g[nxt], parent[nxt] = new_g, cell
                tie += 1
                heapq.heappush(waiting, (new_g, tie, nxt))
    return None, checked
