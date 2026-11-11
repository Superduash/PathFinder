"""Unified Search engine for classical graph algorithms (polish2.md §2.2).

Replaces separate algorithm classes with a single unified formulation:
BFS, DFS, UCS, Greedy, and A* differ only in:
  1. Frontier data structure / queuing discipline (FIFO, LIFO, Min-Heap)
  2. Scoring function: f(n) = g(n) + weight * h(n)
"""
from __future__ import annotations
import heapq
import math
from collections import deque
from itertools import count
from typing import Optional, Callable
from backend.app.maze.grid import MazeGrid
from backend.app.search.heuristics import get_heuristic
from backend.app.errors import ApiError, UNKNOWN_ALGORITHM


def route_stats(maze: MazeGrid, path: Optional[list[tuple[int, int]]]) -> tuple[int, float]:
    """Computes (moves, cost) for a given path (fixes B2).
    moves = len(path) - 1 (or 0 if start == goal or empty)
    cost = sum of entry costs along the path (diagonal * sqrt(2))
    """
    if not path or len(path) <= 1:
        return (0, 0.0)
    moves = len(path) - 1
    cost = 0.0
    for i in range(1, len(path)):
        r1, c1 = path[i - 1]
        r2, c2 = path[i]
        entry_cost = maze.cost_of(r2, c2)
        is_diag = (r1 != r2) and (c1 != c2)
        cost += math.sqrt(2) * entry_cost if is_diag else entry_cost
    return (moves, round(cost, 4))


class Search:
    def __init__(self, maze: MazeGrid, kind: str, heuristic: Optional[str] = "manhattan", weight: float = 1.0) -> None:
        self.maze = maze
        self.kind = kind.lower()
        self.heuristic_name = heuristic
        self.weight = weight
        self.start = maze.start
        self.goal = maze.goal

        self.h_fn = get_heuristic(heuristic, maze.diagonal) if (self.kind in ("greedy", "astar") and heuristic) else None

        # Cost and path reconstruction
        self.g_costs: dict[tuple[int, int], float] = {self.start: 0.0}
        self.parent: dict[tuple[int, int], Optional[tuple[int, int]]] = {self.start: None}
        self.closed: set[tuple[int, int]] = set()
        self.tiebreak = count()

        # Frontier
        if self.kind in ("bfs", "dfs"):
            self.waiting = deque([self.start])
        else:
            self.waiting = [(self.score(self.start), next(self.tiebreak), self.start)]

        # Tracking metrics
        self.status: str = "init"        # "init" | "running" | "found" | "failed"
        self.reason: Optional[str] = None
        self.expanded_count: int = 0
        self.peak_frontier: int = 1
        self.peak_open_entries: int = 1

        self.path: Optional[list[tuple[int, int]]] = None
        self.path_cost: Optional[float] = None
        self.path_length: Optional[int] = None

        self.trace: list[tuple[int, int]] = []
        self.delta_expanded: list[tuple[int, int]] = []
        self.delta_discovered: list[tuple[int, int]] = []

    def score(self, cell: tuple[int, int]) -> float:
        g = self.g_costs.get(cell, 0.0)
        h = self.h_fn(cell[0], cell[1], self.goal[0], self.goal[1]) if self.h_fn else 0.0
        if self.kind == "ucs":
            return g
        elif self.kind == "greedy":
            return h
        elif self.kind == "astar":
            return g + self.weight * h
        return 0.0

    def push(self, cell: tuple[int, int]) -> None:
        if self.kind == "bfs":
            self.waiting.append(cell)
        elif self.kind == "dfs":
            self.waiting.append(cell)
        else:
            heapq.heappush(self.waiting, (self.score(cell), next(self.tiebreak), cell))

    def pop(self) -> Optional[tuple[int, int]]:
        if self.kind == "bfs":
            return self.waiting.popleft() if self.waiting else None
        elif self.kind == "dfs":
            return self.waiting.pop() if self.waiting else None
        else:
            while self.waiting:
                _, _, cell = heapq.heappop(self.waiting)
                # If cell is already expanded/closed, skip it (B3 fix)
                if cell not in self.closed:
                    return cell
            return None

    @property
    def frontier_count(self) -> int:
        if self.kind in ("bfs", "dfs"):
            return len(self.waiting)
        # Distinct unexpanded cells in priority queue
        return len(set(item[2] for item in self.waiting if item[2] not in self.closed))

    def step(self) -> bool:
        if self.status == "init":
            self.status = "running"

        if self.status in ("found", "failed"):
            return True

        self.delta_expanded = []
        self.delta_discovered = []

        curr = self.pop()
        if curr is None:
            self.status = "failed"
            self.reason = "no_path"
            return True

        # Expand current cell
        self.closed.add(curr)
        self.expanded_count += 1
        self.trace.append(curr)
        self.delta_expanded.append(curr)

        # Goal test upon expansion
        if curr == self.goal:
            self.status = "found"
            self._reconstruct_path()
            return True

        # Examine neighbours
        curr_g = self.g_costs[curr]
        for nr, nc, edge_cost in self.maze.neighbours(curr[0], curr[1]):
            nb = (nr, nc)
            # Closed-set guard: skip already-expanded nodes (B3 fix)
            if nb in self.closed:
                continue

            new_g = curr_g + edge_cost

            if self.kind in ("bfs", "dfs"):
                # BFS/DFS: only first discovery counts
                if nb not in self.parent:
                    self.parent[nb] = curr
                    self.g_costs[nb] = new_g
                    self.push(nb)
                    self.delta_discovered.append(nb)
            else:
                # UCS / Greedy / A*: update if new route is strictly cheaper
                if nb not in self.g_costs or new_g < self.g_costs[nb]:
                    is_new = nb not in self.g_costs
                    self.g_costs[nb] = new_g
                    self.parent[nb] = curr
                    self.push(nb)
                    if is_new:
                        self.delta_discovered.append(nb)

        # Update peak counters
        fc = self.frontier_count
        if fc > self.peak_frontier:
            self.peak_frontier = fc
        total_open = len(self.waiting)
        if total_open > self.peak_open_entries:
            self.peak_open_entries = total_open

        return False

    @property
    def expanded(self) -> int:
        """Total number of nodes expanded (popped from frontier)."""
        return self.expanded_count

    def run_to_completion(self, max_expansions: Optional[int] = None) -> "Search":
        while self.status in ("init", "running"):
            if max_expansions and self.expanded_count >= max_expansions:
                self.status = "failed"
                self.reason = "budget_exceeded"
                break
            self.step()
        return self

    def _reconstruct_path(self) -> None:
        curr: Optional[tuple[int, int]] = self.goal
        path = []
        while curr is not None:
            path.append(curr)
            curr = self.parent.get(curr)
        path.reverse()
        self.path = path
        moves, cost = route_stats(self.maze, path)
        self.path_length = moves
        self.path_cost = cost

