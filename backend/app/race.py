"""Race session management over WebSocket (backend.md Phase 6)."""
from __future__ import annotations
import time
from typing import Optional
from backend.app.maze.grid import MazeGrid
from backend.app.search.algorithms import create_search, BaseSearch
from backend.app.search.reference import dijkstra_optimal_cost, compute_optimality
from backend.app.models import ParticipantState, RaceReadyMessage, RaceUpdateMessage, RaceSummaryMessage
from backend.app.services.narration import narrate_step
from backend.app.errors import ApiError


class ParticipantSession:
    def __init__(self, spec: dict, maze: MazeGrid) -> None:
        self.spec = spec
        self.algorithm: str = spec.get("algorithm", "bfs")
        self.heuristic: Optional[str] = spec.get("heuristic")
        self.search: BaseSearch = create_search(self.algorithm, maze, heuristic=self.heuristic)
        self.accumulated_compute_s: float = 0.0
        self.last_cell: Optional[tuple[int, int]] = None

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

        if self.search.delta_expanded:
            self.last_cell = self.search.delta_expanded[-1]

        return self.search.status in ("found", "failed")

    def to_state(self, c_star: Optional[float], is_update: bool = True, narrate: bool = False) -> ParticipantState:
        s = self.search
        opt = compute_optimality(c_star, s.path_cost) if s.path_cost is not None else None
        path_list = [list(pt) for pt in s.path] if s.path else None

        delta_exp = [list(pt) for pt in s.delta_expanded] if is_update else None
        delta_disc = [list(pt) for pt in s.delta_discovered] if is_update else None
        curr = list(self.last_cell) if (is_update and self.last_cell and s.status in ("init", "running")) else None

        note = None
        if narrate and is_update and self.last_cell and s.status in ("init", "running"):
            g_cost = s.g_costs.get(self.last_cell, 0.0) if hasattr(s, "g_costs") else None
            h_cost = 0.0
            if hasattr(s, "h_fn"):
                gr, gc = s.maze.goal
                h_cost = s.h_fn(self.last_cell[0], self.last_cell[1], gr, gc)
            note = narrate_step(self.algorithm, self.heuristic, self.last_cell, g_cost, h_cost)

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
            current=curr,
            note=note,
        )


class RaceSession:
    def __init__(self, race_id: str, maze: MazeGrid, participants: list[dict], narrate: bool = True) -> None:
        self.race_id = race_id
        self.maze = maze
        self.c_star = dijkstra_optimal_cost(maze)
        self.participants: list[ParticipantSession] = [
            ParticipantSession(p, maze) for p in participants
        ]
        self.narrate = narrate
        self.tick = 0
        self.finished = False
        self.start_time = time.time()

    def get_ready_message(self) -> RaceReadyMessage:
        states = [p.to_state(self.c_star, is_update=False, narrate=False) for p in self.participants]
        initial_cells = [list(self.maze.start), list(self.maze.goal)]

        racers_meta = []
        for i, p in enumerate(self.participants):
            label = p.algorithm.upper()
            if p.heuristic:
                label += f" ({p.heuristic.capitalize()})"
            racers_meta.append({
                "id": str(i),
                "label": label,
                "color_key": p.algorithm.lower(),
            })

        return RaceReadyMessage(
            raceId=self.race_id,
            participants=states,
            initial=initial_cells,
            reachable=(self.c_star is not None),
            optimal_cost=self.c_star,
            racers_meta=racers_meta,
        )

    def step(self, k: int) -> RaceUpdateMessage:
        if self.finished:
            raise ApiError("ILLEGAL_STATE", "Race is already finished. Send race.reset to restart.")

        if k < 1 or k > 500:
            raise ApiError("INVALID_REQUEST", f"Expansions step 'k' ({k}) must be between 1 and 500.")

        self.tick += 1

        all_done = True
        for p in self.participants:
            if p.search.status in ("init", "running"):
                p.step_k(k)
            if p.search.status in ("init", "running"):
                all_done = False

        self.finished = all_done
        states = [p.to_state(self.c_star, is_update=True, narrate=self.narrate) for p in self.participants]
        elapsed_ms = round((time.time() - self.start_time) * 1000, 1)

        return RaceUpdateMessage(
            raceId=self.race_id,
            tick=self.tick,
            participants=states,
            all_done=all_done,
            ms_since_start=elapsed_ms,
        )

    def get_summary_message(self) -> RaceSummaryMessage:
        indices = list(range(len(self.participants)))

        def rank_key(idx: int):
            p = self.participants[idx].search
            status_order = 0 if p.status == "found" else 1
            cost = p.path_cost if p.path_cost is not None else float("inf")
            return (status_order, p.expanded_count, cost)

        indices.sort(key=rank_key)
        states = [p.to_state(self.c_star, is_update=False, narrate=False) for p in self.participants]

        # Generate insights and winner reason
        insights = []
        winner_reason = ""

        if self.c_star is None:
            insights.append({
                "id": "no_route",
                "tone": "warn",
                "title": "Unreachable Goal",
                "text": "No route exists between start and goal in this maze.",
            })
            winner_reason = "No path exists between start and goal."
        elif indices:
            winner_idx = indices[0]
            winner = self.participants[winner_idx]
            w_search = winner.search

            if w_search.status == "found":
                w_name = winner.algorithm.upper()
                if len(indices) > 1:
                    runner_up = self.participants[indices[1]].search
                    if runner_up.expanded_count > w_search.expanded_count:
                        pct = round((1.0 - w_search.expanded_count / max(1, runner_up.expanded_count)) * 100)
                        winner_reason = f"{w_name} won: checked {pct}% fewer cells than runner-up."
                        insights.append({
                            "id": "winner_efficiency",
                            "tone": "good",
                            "title": "Search Efficiency",
                            "text": f"{w_name} inspected {pct}% fewer cells to discover an optimal route.",
                        })
                    else:
                        winner_reason = f"{w_name} won with optimal path cost {w_search.path_cost:.1f}."
                else:
                    winner_reason = f"{w_name} found a valid route."

        return RaceSummaryMessage(
            raceId=self.race_id,
            participants=states,
            ranking=indices,
            insights=insights,
            winner_reason=winner_reason,
            reachable=(self.c_star is not None),
            optimal_cost=self.c_star,
        )
