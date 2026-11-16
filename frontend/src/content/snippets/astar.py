# astar.py
import heapq
from grid_basics import neighbors, step_cost, hint, build_route

def astar(grid, start, goal):
    """A* Search: check the cell with the smallest f(n) = g(n) + h(n)."""
    g = {start: 0}                               # g(n): real cost so far
    parent = {start: None}
    h0 = hint(start, goal)
    waiting = [(h0, h0, 0, start)]               # (f, h, tie-breaker, cell)
    done, checked, tie = set(), 0, 0
    while waiting:
        _, _, _, cell = heapq.heappop(waiting)
        if cell in done:
            continue
        done.add(cell)
        checked += 1
        if cell == goal:
            return build_route(parent, cell), checked
        for nxt in neighbors(grid, cell):
            new_g = g[cell] + step_cost(grid, nxt)
            if nxt not in done and new_g < g.get(nxt, float("inf")):
                g[nxt], parent[nxt] = new_g, cell
                h = hint(nxt, goal)              # h(n): guess of the cost still to go
                tie += 1
                heapq.heappush(waiting, (new_g + h, h, tie, nxt))   # f = g + h
    return None, checked
