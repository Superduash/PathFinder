# bds.py
from collections import deque
from grid_basics import neighbors

def bds(grid, start, goal):
    """Bidirectional Search: two BFS waves, one from Start and one from Goal."""
    if start == goal:
        return [start], 0
    parent = {"fwd": {start: None}, "bwd": {goal: None}}
    dist = {"fwd": {start: 0}, "bwd": {goal: 0}}
    queue = {"fwd": deque([start]), "bwd": deque([goal])}
    best, meet, checked, side = float("inf"), None, 0, "fwd"
    while queue["fwd"] or queue["bwd"]:
        if not queue[side]:                       # this side ran out: use the other
            side = "bwd" if side == "fwd" else "fwd"
        other = "bwd" if side == "fwd" else "fwd"
        cell = queue[side].popleft()
        checked += 1
        for nxt in neighbors(grid, cell):
            if nxt not in parent[side]:
                parent[side][nxt] = cell
                dist[side][nxt] = dist[side][cell] + 1
                queue[side].append(nxt)
                if nxt in parent[other]:          # the two waves touch here
                    total = dist["fwd"][nxt] + dist["bwd"][nxt]
                    if total < best:
                        best, meet = total, nxt
        front = sum(dist[s][queue[s][0]] for s in ("fwd", "bwd") if queue[s])
        if meet is not None and front >= best:    # no shorter meeting is possible
            break
        side = other                              # take turns
    if meet is None:
        return None, checked
    route, cell = [], meet
    while cell is not None:                       # Start -> meeting cell
        route.append(cell)
        cell = parent["fwd"][cell]
    route.reverse()
    cell = parent["bwd"][meet]
    while cell is not None:                       # meeting cell -> Goal
        route.append(cell)
        cell = parent["bwd"][cell]
    return route, checked
