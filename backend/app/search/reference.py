"""Reference Dijkstra implementation for optimal cost C* and path validation."""
from __future__ import annotations
import heapq
import math
from typing import Optional
from backend.app.maze.grid import MazeGrid


def dijkstra_optimal_cost(maze: MazeGrid) -> Optional[float]:
    """Compute optimal cost C* from start to goal. Returns None if unreachable."""
    if maze.start == maze.goal:
        return 0.0

    pq: list[tuple[float, int, tuple[int, int]]] = [(0.0, 0, maze.start)]
    dist: dict[tuple[int, int], float] = {maze.start: 0.0}
    visited: set[tuple[int, int]] = set()
    counter = 0

    while pq:
        d, _, u = heapq.heappop(pq)
        if u in visited:
            continue
        visited.add(u)

        if u == maze.goal:
            return round(d, 4)

        for nr, nc, edge_cost in maze.neighbours(*u):
            nb = (nr, nc)
            if nb in visited:
                continue
            new_d = d + edge_cost
            if nb not in dist or new_d < dist[nb]:
                dist[nb] = new_d
                counter += 1
                heapq.heappush(pq, (new_d, counter, nb))

    return None


def is_reachable(maze: MazeGrid) -> bool:
    """Quick BFS reachability check."""
    from collections import deque
    if maze.start == maze.goal:
        return True
    q = deque([maze.start])
    seen = {maze.start}
    while q:
        curr = q.popleft()
        if curr == maze.goal:
            return True
        for nr, nc, _ in maze.neighbours(*curr):
            nb = (nr, nc)
            if nb not in seen:
                seen.add(nb)
                q.append(nb)
    return False


def validate_path(maze: MazeGrid, path: list[tuple[int, int]]) -> tuple[bool, float]:
    """Validate that path is continuous and passable; return (is_valid, cost)."""
    if not path:
        return False, 0.0
    if path[0] != maze.start or path[-1] != maze.goal:
        return False, 0.0

    cost = 0.0
    for i in range(len(path) - 1):
        r1, c1 = path[i]
        r2, c2 = path[i + 1]
        dr, dc = abs(r2 - r1), abs(c2 - c1)
        # Check step size
        if dr > 1 or dc > 1 or (dr == 0 and dc == 0):
            return False, 0.0
        # If diagonal, verify diagonal is allowed and no corner-cutting
        if dr == 1 and dc == 1:
            if not maze.diagonal:
                return False, 0.0
            if maze.cell(r1, c2) == 1 or maze.cell(r2, c1) == 1:
                return False, 0.0
            entry_cost = maze.cost_of(r2, c2)
            cost += math.sqrt(2) * entry_cost
        else:
            entry_cost = maze.cost_of(r2, c2)
            cost += entry_cost

        # Destination must not be a wall
        if maze.cell(r2, c2) == 1:
            return False, 0.0

    return True, round(cost, 4)


def compute_optimality(c_star: Optional[float], path_cost: Optional[float]) -> Optional[float]:
    """Compute C* / C according to plan.md §6.2:

    - If no path exists (C* is None): return None
    - If search failed (path_cost is None): return 0.0
    - If C* == 0 and C == 0: return 1.0
    - Else C* / C, capped at 1.0 (float rounding safety)
    """
    if c_star is None:
        return None
    if path_cost is None:
        return 0.0
    if c_star == 0.0 and path_cost == 0.0:
        return 1.0
    if path_cost == 0.0:
        return 0.0
    ratio = c_star / path_cost
    return round(min(1.0, ratio), 4)

