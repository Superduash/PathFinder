"""Race session management over WebSocket.

One RaceSession per connection. Supports stepwise execution of participants,
delta tracking, and ranking computation.
"""
from __future__ import annotations
import time
from typing import Optional
from backend.app.maze.grid import MazeGrid
from backend.app.search.algorithms import create_search, BaseSearch
from backend.app.search.reference import dijkstra_optimal_cost, compute_optimality
from backend.app.models import ParticipantState, RaceReadyMessage, RaceUpdateMessage, RaceSummaryMessage
from backend.app.errors import ApiError, BUSY


class ParticipantSession:
    def __init__(self, spec: dict, maze: MazeGrid) -> None:
        self.algorithm: str = spec.get("algorithm", "bfs")
        self.heuristic: Optional[str] = spec.get("heuristic")
        self.search: BaseSearch = create_search(self.algorithm, maze, heuristic=self.heuristic)
        self.accumulated_compute_s: float = 0.0

    def step_k(self, k: int) -> bool:
        """Run up to k expansions, accumulating search compute time."""
        t0 = time.perf_counter()
        steps = 0
        while steps < k and self.search.status in ("init", "running"):
            done = self.search.step()
            steps += 1
            if done:
                break
        self.accumulated_compute_s += (time.perf_counter() - t0)
        return self.search.status in ("found", "failed")

    def to_state(self, c_star: Optional[float], is_update: bool = True) -> ParticipantState:
        s = self.search
        opt = compute_optimality(c_star, s.path_cost) if s.path_cost is not None else None
        path_list = [list(pt) for pt in s.path] if s.path else None

        delta_exp = [list(pt) for pt in s.delta_expanded] if is_update else None
        delta_disc = [list(pt) for pt in s.delta_discovered] if is_update else None

        return ParticipantState(
            algorithm=self.algorithm,
            heuristic=self.heuristic,
            status=s.status,
            expanded=s.expanded_count,
            frontier=s.frontier_count,
            peak_frontier=s.peak_frontier,
            peak_open_entries=s.peak_open_entries,
            path=path_list,
            path_length=s.path_length,
            path_cost=s.path_cost,
            optimality=opt,
            compute_ms=round(self.accumulated_compute_s * 1000, 3),
            delta_expanded=delta_exp,
            delta_discovered=delta_disc,
        )


class RaceSession:
    def __init__(self, race_id: str, maze: MazeGrid, participants: list[dict]) -> None:
        self.race_id = race_id
        self.maze = maze
        self.c_star = dijkstra_optimal_cost(maze)
        self.participants: list[ParticipantSession] = [
            ParticipantSession(p, maze) for p in participants
        ]
        self.tick = 0
        self.finished = False

    def get_ready_message(self) -> RaceReadyMessage:
        states = [p.to_state(self.c_star, is_update=False) for p in self.participants]
        initial_cells = [list(self.maze.start), list(self.maze.goal)]
        return RaceReadyMessage(
            raceId=self.race_id,
            participants=states,
            initial=initial_cells,
        )

    def step(self, k: int) -> RaceUpdateMessage:
        self.tick += 1
        k = max(1, min(k, 500))

        all_done = True
        for p in self.participants:
            if p.search.status in ("init", "running"):
                p.step_k(k)
            if p.search.status in ("init", "running"):
                all_done = False

        self.finished = all_done
        states = [p.to_state(self.c_star, is_update=True) for p in self.participants]

        return RaceUpdateMessage(
            raceId=self.race_id,
            tick=self.tick,
            participants=states,
            all_done=all_done,
        )

    def get_summary_message(self) -> RaceSummaryMessage:
        # Ranking rules:
        # 1. status == "found" before "failed"
        # 2. fewer expanded_count
        # 3. lower path_cost
        indices = list(range(len(self.participants)))

        def rank_key(idx: int):
            p = self.participants[idx].search
            status_order = 0 if p.status == "found" else 1
            cost = p.path_cost if p.path_cost is not None else float("inf")
            return (status_order, p.expanded_count, cost)

        indices.sort(key=rank_key)
        states = [p.to_state(self.c_star, is_update=False) for p in self.participants]

        return RaceSummaryMessage(
            raceId=self.race_id,
            participants=states,
            ranking=indices,
        )

