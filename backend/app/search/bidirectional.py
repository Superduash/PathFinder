"""Bidirectional Search (BDS) implementation (polish2.md §2.3).

Executes simultaneous BFS waves from start and goal, meeting in the middle.
Guarantees shortest path in number of moves.
"""
from __future__ import annotations
from collections import deque
from typing import Optional
from backend.app.maze.grid import MazeGrid
from backend.app.search.engine import route_stats


class BidirectionalSearch:
    def __init__(self, maze: MazeGrid) -> None:
        self.maze = maze
        self.kind = "bds"
        self.start = maze.start
        self.goal = maze.goal

        # Forward BFS from start
        self.queue_f: deque[tuple[int, int]] = deque([self.start])
        self.parent_f: dict[tuple[int, int], Optional[tuple[int, int]]] = {self.start: None}
        self.dist_f: dict[tuple[int, int], int] = {self.start: 0}
        self.closed_f: set[tuple[int, int]] = set()

        # Backward BFS from goal
        self.queue_b: deque[tuple[int, int]] = deque([self.goal])
        self.parent_b: dict[tuple[int, int], Optional[tuple[int, int]]] = {self.goal: None}
        self.dist_b: dict[tuple[int, int], int] = {self.goal: 0}
        self.closed_b: set[tuple[int, int]] = set()

        self.current_side: str = "forward"  # alternates: "forward" | "backward"
        self.best_moves: float = float("inf")
        self.meeting_cell: Optional[tuple[int, int]] = None

        # Tracking metrics
        self.status: str = "init"
        self.reason: Optional[str] = None
        self.expanded_count: int = 0
        self.peak_frontier: int = 2
        self.peak_open_entries: int = 2

        self.path: Optional[list[tuple[int, int]]] = None
        self.path_cost: Optional[float] = None
        self.path_length: Optional[int] = None

        self.trace: list[tuple[int, int]] = []
        self.delta_expanded: list[tuple[int, int]] = []
        self.delta_discovered: list[tuple[int, int]] = []
        self.cell_sides: dict[tuple[int, int], str] = {}

    @property
    def frontier_count(self) -> int:
        return len(self.queue_f) + len(self.queue_b)

    def step(self) -> bool:
        if self.status == "init":
            self.status = "running"
            if self.start == self.goal:
                self.status = "found"
                self.path = [self.start]
                self.path_length = 0
                self.path_cost = 0.0
                return True

        if self.status in ("found", "failed"):
            return True

        self.delta_expanded = []
        self.delta_discovered = []

        # Alternate side: if forward empty, try backward; if backward empty, try forward
        if self.current_side == "forward":
            if not self.queue_f and self.queue_b:
                self.current_side = "backward"
        else:
            if not self.queue_b and self.queue_f:
                self.current_side = "forward"

        is_forward = (self.current_side == "forward")
        q = self.queue_f if is_forward else self.queue_b
        closed_this = self.closed_f if is_forward else self.closed_b
        parent_this = self.parent_f if is_forward else self.parent_b
        parent_other = self.parent_b if is_forward else self.parent_f
        dist_this = self.dist_f if is_forward else self.dist_b
        dist_other = self.dist_b if is_forward else self.dist_f

        if not q:
            # Both frontiers exhausted without connecting
            if self.meeting_cell is not None:
                self._reconstruct_bds_path()
                self.status = "found"
                return True
            self.status = "failed"
            self.reason = "no_path"
            return True

        curr = q.popleft()
        closed_this.add(curr)
        self.expanded_count += 1
        self.trace.append(curr)
        self.delta_expanded.append(curr)
        self.cell_sides[curr] = "forward" if is_forward else "backward"

        curr_dist = dist_this[curr]

        # Check termination condition: if both frontiers have advanced past the best connection
        front_f = self.dist_f.get(self.queue_f[0], curr_dist) if self.queue_f else curr_dist
        front_b = self.dist_b.get(self.queue_b[0], curr_dist) if self.queue_b else curr_dist
        if self.meeting_cell is not None and (front_f + front_b >= self.best_moves):
            self._reconstruct_bds_path()
            self.status = "found"
            return True

        # Check neighbours
        for nr, nc, _ in self.maze.neighbours(curr[0], curr[1]):
            nb = (nr, nc)
            if nb in closed_this:
                continue

            if nb not in parent_this:
                parent_this[nb] = curr
                dist_this[nb] = curr_dist + 1
                q.append(nb)
                self.delta_discovered.append(nb)
                self.cell_sides[nb] = "forward" if is_forward else "backward"

                # If discovered by opposite side as well, record connection
                if nb in parent_other:
                    total_m = dist_this[nb] + dist_other[nb]
                    if total_m < self.best_moves:
                        self.best_moves = total_m
                        self.meeting_cell = nb

        # Alternate side for next tick
        self.current_side = "backward" if is_forward else "forward"

        fc = self.frontier_count
        if fc > self.peak_frontier:
            self.peak_frontier = fc
        if fc > self.peak_open_entries:
            self.peak_open_entries = fc

        # Immediate stop if meeting reached optimal threshold
        if self.meeting_cell is not None and q:
            min_next = dist_this[q[0]] if q else curr_dist
            other_q = self.queue_b if is_forward else self.queue_f
            other_min = dist_other[other_q[0]] if other_q else 0
            if min_next + other_min >= self.best_moves:
                self._reconstruct_bds_path()
                self.status = "found"
                return True

        return False

    @property
    def expanded(self) -> int:
        """Total number of nodes expanded (popped from frontier)."""
        return self.expanded_count

    def run_to_completion(self, max_expansions: Optional[int] = None) -> "BidirectionalSearch":
        while self.status in ("init", "running"):
            if max_expansions and self.expanded_count >= max_expansions:
                self.status = "failed"
                self.reason = "budget_exceeded"
                break
            self.step()
        return self

    def _reconstruct_bds_path(self) -> None:
        if not self.meeting_cell:
            return
        m = self.meeting_cell

        # Start to meeting
        path_f = []
        curr = m
        while curr is not None:
            path_f.append(curr)
            curr = self.parent_f.get(curr)
        path_f.reverse()

        # Meeting to goal
        path_b = []
        curr = self.parent_b.get(m)
        while curr is not None:
            path_b.append(curr)
            curr = self.parent_b.get(curr)

        full_path = path_f + path_b
        self.path = full_path
        moves, cost = route_stats(self.maze, full_path)
        self.path_length = moves
        self.path_cost = cost

