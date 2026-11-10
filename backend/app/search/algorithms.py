"""Stepwise search algorithms: BFS, DFS, UCS, Greedy Best-First, A*.

All implement the BaseSearch interface with step() -> bool:
  step() performs exactly one node expansion.
  Returns True if the search has terminated (found or failed), False if still running.

Exposes:
  - expanded_count: int
  - frontier_count: int
  - peak_frontier: int
  - peak_open_entries: int
  - status: "running" | "found" | "failed" | "init"
  - reason: "no_path" | "budget_exceeded" | None
  - path: list[tuple[int, int]] | None
  - path_cost: float | None
  - path_length: int | None
  - delta_expanded: list[tuple[int, int]]
  - delta_discovered: list[tuple[int, int]]
"""
from __future__ import annotations
import heapq
import math
from collections import deque
from typing import Optional, Callable
from backend.app.maze.grid import MazeGrid
from backend.app.search.heuristics import get_heuristic
from backend.app.errors import ApiError, UNKNOWN_ALGORITHM


class BaseSearch:
    def __init__(self, maze: MazeGrid) -> None:
        self.maze = maze
        self.start = maze.start
        self.goal = maze.goal
        self.status: str = "init"        # "init" | "running" | "found" | "failed"
        self.reason: Optional[str] = None
        self.expanded_count: int = 0
        self.peak_frontier: int = 0
        self.peak_open_entries: int = 0
        self.path: Optional[list[tuple[int, int]]] = None
        self.path_cost: Optional[float] = None
        self.path_length: Optional[int] = None

        # Trace
        self.explored_set: set[tuple[int, int]] = set()
        self.trace: list[tuple[int, int]] = []   # ordered expansions

        # Per-step deltas
        self.delta_expanded: list[tuple[int, int]] = []
        self.delta_discovered: list[tuple[int, int]] = []

    def step(self) -> bool:
        """Perform one expansion step. Return True if done."""
        raise NotImplementedError

    def run_to_completion(self, max_expansions: Optional[int] = None) -> None:
        while self.status in ("init", "running"):
            if max_expansions and self.expanded_count >= max_expansions:
                self.status = "failed"
                self.reason = "budget_exceeded"
                break
            self.step()

    def _reconstruct_path(self, parent: dict[tuple[int, int], Optional[tuple[int, int]]]) -> None:
        curr: Optional[tuple[int, int]] = self.goal
        path = []
        while curr is not None:
            path.append(curr)
            curr = parent.get(curr)
        path.reverse()
        self.path = path
        self.path_length = len(path)
        # Compute cost
        cost = 0.0
        for i in range(1, len(path)):
            r1, c1 = path[i - 1]
            r2, c2 = path[i]
            entry_cost = self.maze.cost_of(r2, c2)
            is_diag = (r1 != r2) and (c1 != c2)
            cost += math.sqrt(2) * entry_cost if is_diag else entry_cost
        self.path_cost = round(cost, 4)

    @property
    def frontier_count(self) -> int:
        return 0


# ---------------------------------------------------------------------------
# Breadth-First Search
# ---------------------------------------------------------------------------

class BFS(BaseSearch):
    def __init__(self, maze: MazeGrid) -> None:
        super().__init__(maze)
        self.queue: deque[tuple[int, int]] = deque([self.start])
        self.parent: dict[tuple[int, int], Optional[tuple[int, int]]] = {self.start: None}
        self.discovered: set[tuple[int, int]] = {self.start}
        self.peak_frontier = 1
        self.peak_open_entries = 1

    @property
    def frontier_count(self) -> int:
        return len(self.queue)

    def step(self) -> bool:
        self.delta_expanded = []
        self.delta_discovered = []

        if self.status == "init":
            self.status = "running"
            if self.start == self.goal:
                self.status = "found"
                self.path = [self.start]
                self.path_length = 1
                self.path_cost = 0.0
                return True

        if not self.queue:
            self.status = "failed"
            self.reason = "no_path"
            return True

        curr = self.queue.popleft()
        self.expanded_count += 1
        self.explored_set.add(curr)
        self.trace.append(curr)
        self.delta_expanded.append(curr)

        if curr == self.goal:
            self.status = "found"
            self._reconstruct_path(self.parent)
            return True

        new_discovered = []
        for nr, nc, _ in self.maze.neighbours(*curr):
            nb = (nr, nc)
            if nb not in self.discovered:
                self.discovered.add(nb)
                self.parent[nb] = curr
                self.queue.append(nb)
                new_discovered.append(nb)

        self.delta_discovered = new_discovered
        self.peak_frontier = max(self.peak_frontier, len(self.queue))
        self.peak_open_entries = max(self.peak_open_entries, len(self.queue))
        return False


# ---------------------------------------------------------------------------
# Depth-First Search
# ---------------------------------------------------------------------------

class DFS(BaseSearch):
    def __init__(self, maze: MazeGrid) -> None:
        super().__init__(maze)
        self.stack: list[tuple[int, int]] = [self.start]
        self.parent: dict[tuple[int, int], Optional[tuple[int, int]]] = {self.start: None}
        self.discovered: set[tuple[int, int]] = {self.start}
        self.peak_frontier = 1
        self.peak_open_entries = 1

    @property
    def frontier_count(self) -> int:
        return len(self.stack)

    def step(self) -> bool:
        self.delta_expanded = []
        self.delta_discovered = []

        if self.status == "init":
            self.status = "running"
            if self.start == self.goal:
                self.status = "found"
                self.path = [self.start]
                self.path_length = 1
                self.path_cost = 0.0
                return True

        if not self.stack:
            self.status = "failed"
            self.reason = "no_path"
            return True

        curr = self.stack.pop()
        self.expanded_count += 1
        self.explored_set.add(curr)
        self.trace.append(curr)
        self.delta_expanded.append(curr)

        if curr == self.goal:
            self.status = "found"
            self._reconstruct_path(self.parent)
            return True

        new_discovered = []
        for nr, nc, _ in self.maze.neighbours(*curr):
            nb = (nr, nc)
            if nb not in self.discovered:
                self.discovered.add(nb)
                self.parent[nb] = curr
                self.stack.append(nb)
                new_discovered.append(nb)

        self.delta_discovered = new_discovered
        self.peak_frontier = max(self.peak_frontier, len(self.stack))
        self.peak_open_entries = max(self.peak_open_entries, len(self.stack))
        return False


# ---------------------------------------------------------------------------
# Uniform-Cost Search (Dijkstra)
# ---------------------------------------------------------------------------

class UCS(BaseSearch):
    def __init__(self, maze: MazeGrid) -> None:
        super().__init__(maze)
        self._counter: int = 0
        # heap entry: (g_cost, tie_break_counter, cell)
        self.pq: list[tuple[float, int, tuple[int, int]]] = [(0.0, 0, self.start)]
        self.g_cost: dict[tuple[int, int], float] = {self.start: 0.0}
        self.parent: dict[tuple[int, int], Optional[tuple[int, int]]] = {self.start: None}
        self.in_open: set[tuple[int, int]] = {self.start}
        self.peak_frontier = 1
        self.peak_open_entries = 1

    @property
    def frontier_count(self) -> int:
        return len(self.in_open)

    def step(self) -> bool:
        self.delta_expanded = []
        self.delta_discovered = []

        if self.status == "init":
            self.status = "running"
            if self.start == self.goal:
                self.status = "found"
                self.path = [self.start]
                self.path_length = 1
                self.path_cost = 0.0
                return True

        while self.pq:
            cost, _, curr = heapq.heappop(self.pq)
            if curr in self.explored_set:
                continue  # stale entry

            self.in_open.discard(curr)
            self.expanded_count += 1
            self.explored_set.add(curr)
            self.trace.append(curr)
            self.delta_expanded.append(curr)

            if curr == self.goal:
                self.status = "found"
                self._reconstruct_path(self.parent)
                return True

            new_discovered = []
            for nr, nc, edge_cost in self.maze.neighbours(*curr):
                nb = (nr, nc)
                new_g = cost + edge_cost
                if nb not in self.g_cost or new_g < self.g_cost[nb]:
                    self.g_cost[nb] = new_g
                    self.parent[nb] = curr
                    self._counter += 1
                    heapq.heappush(self.pq, (new_g, self._counter, nb))
                    if nb not in self.explored_set:
                        self.in_open.add(nb)
                        new_discovered.append(nb)

            self.delta_discovered = new_discovered
            self.peak_frontier = max(self.peak_frontier, len(self.in_open))
            self.peak_open_entries = max(self.peak_open_entries, len(self.pq))
            return False

        self.status = "failed"
        self.reason = "no_path"
        return True


# ---------------------------------------------------------------------------
# Greedy Best-First Search
# ---------------------------------------------------------------------------

class Greedy(BaseSearch):
    def __init__(self, maze: MazeGrid, heuristic: str = "manhattan") -> None:
        super().__init__(maze)
        self.heuristic_name = heuristic or "manhattan"
        self.h_fn = get_heuristic(self.heuristic_name, maze.diagonal)
        self._counter: int = 0
        h_start = self.h_fn(self.start[0], self.start[1], self.goal[0], self.goal[1])
        # heap entry: (h_cost, counter, cell)
        self.pq: list[tuple[float, int, tuple[int, int]]] = [(h_start, 0, self.start)]
        self.parent: dict[tuple[int, int], Optional[tuple[int, int]]] = {self.start: None}
        self.in_open: set[tuple[int, int]] = {self.start}
        self.peak_frontier = 1
        self.peak_open_entries = 1

    @property
    def frontier_count(self) -> int:
        return len(self.in_open)

    def step(self) -> bool:
        self.delta_expanded = []
        self.delta_discovered = []

        if self.status == "init":
            self.status = "running"
            if self.start == self.goal:
                self.status = "found"
                self.path = [self.start]
                self.path_length = 1
                self.path_cost = 0.0
                return True

        while self.pq:
            _, _, curr = heapq.heappop(self.pq)
            if curr in self.explored_set:
                continue

            self.in_open.discard(curr)
            self.expanded_count += 1
            self.explored_set.add(curr)
            self.trace.append(curr)
            self.delta_expanded.append(curr)

            if curr == self.goal:
                self.status = "found"
                self._reconstruct_path(self.parent)
                return True

            new_discovered = []
            for nr, nc, _ in self.maze.neighbours(*curr):
                nb = (nr, nc)
                if nb not in self.explored_set and nb not in self.in_open:
                    self.parent[nb] = curr
                    h = self.h_fn(nr, nc, self.goal[0], self.goal[1])
                    self._counter += 1
                    heapq.heappush(self.pq, (h, self._counter, nb))
                    self.in_open.add(nb)
                    new_discovered.append(nb)

            self.delta_discovered = new_discovered
            self.peak_frontier = max(self.peak_frontier, len(self.in_open))
            self.peak_open_entries = max(self.peak_open_entries, len(self.pq))
            return False

        self.status = "failed"
        self.reason = "no_path"
        return True


# ---------------------------------------------------------------------------
# A* Search
# ---------------------------------------------------------------------------

class AStar(BaseSearch):
    def __init__(self, maze: MazeGrid, heuristic: str = "manhattan") -> None:
        super().__init__(maze)
        self.heuristic_name = heuristic or "manhattan"
        self.h_fn = get_heuristic(self.heuristic_name, maze.diagonal)
        self._counter: int = 0
        h_start = self.h_fn(self.start[0], self.start[1], self.goal[0], self.goal[1])
        # heap entry: (f_cost, h_cost, counter, cell)
        self.pq: list[tuple[float, float, int, tuple[int, int]]] = [
            (h_start, h_start, 0, self.start)
        ]
        self.g_cost: dict[tuple[int, int], float] = {self.start: 0.0}
        self.parent: dict[tuple[int, int], Optional[tuple[int, int]]] = {self.start: None}
        self.in_open: set[tuple[int, int]] = {self.start}
        self.peak_frontier = 1
        self.peak_open_entries = 1

    @property
    def frontier_count(self) -> int:
        return len(self.in_open)

    def step(self) -> bool:
        self.delta_expanded = []
        self.delta_discovered = []

        if self.status == "init":
            self.status = "running"
            if self.start == self.goal:
                self.status = "found"
                self.path = [self.start]
                self.path_length = 1
                self.path_cost = 0.0
                return True

        while self.pq:
            f, h, _, curr = heapq.heappop(self.pq)
            if curr in self.explored_set:
                continue

            self.in_open.discard(curr)
            self.expanded_count += 1
            self.explored_set.add(curr)
            self.trace.append(curr)
            self.delta_expanded.append(curr)

            if curr == self.goal:
                self.status = "found"
                self._reconstruct_path(self.parent)
                return True

            new_discovered = []
            curr_g = self.g_cost[curr]
            for nr, nc, edge_cost in self.maze.neighbours(*curr):
                nb = (nr, nc)
                new_g = curr_g + edge_cost
                if nb not in self.g_cost or new_g < self.g_cost[nb]:
                    self.g_cost[nb] = new_g
                    self.parent[nb] = curr
                    h_val = self.h_fn(nr, nc, self.goal[0], self.goal[1])
                    f_val = new_g + h_val
                    self._counter += 1
                    heapq.heappush(self.pq, (f_val, h_val, self._counter, nb))
                    if nb not in self.explored_set:
                        self.in_open.add(nb)
                        new_discovered.append(nb)

            self.delta_discovered = new_discovered
            self.peak_frontier = max(self.peak_frontier, len(self.in_open))
            self.peak_open_entries = max(self.peak_open_entries, len(self.pq))
            return False

        self.status = "failed"
        self.reason = "no_path"
        return True


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

ALGORITHM_MAP = {
    "bfs": BFS,
    "dfs": DFS,
    "ucs": UCS,
    "greedy": Greedy,
    "astar": AStar,
}


def create_search(algorithm: str, maze: MazeGrid, heuristic: Optional[str] = None) -> BaseSearch:
    alg_key = algorithm.lower().replace("*", "star").replace("-", "").replace("_", "")
    if alg_key not in ALGORITHM_MAP:
        raise ApiError(UNKNOWN_ALGORITHM,
                       f"Unknown algorithm '{algorithm}'. Available: bfs, dfs, ucs, greedy, astar")
    cls = ALGORITHM_MAP[alg_key]
    if alg_key in ("greedy", "astar"):
        return cls(maze, heuristic=heuristic or "manhattan")
    return cls(maze)

