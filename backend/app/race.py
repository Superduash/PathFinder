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
        self.tick_expanded: list[tuple[int, int]] = []
        self.tick_discovered: list[tuple[int, int]] = []

    def step_k(self, k: int) -> bool:
        """Run up to k expansions, accumulating search compute time."""
        t0 = time.perf_counter()
        steps = 0
        self.tick_expanded = []
        self.tick_discovered = []
        while steps < k and self.search.status in ("init", "running"):
            done = self.search.step()
            self.tick_expanded.extend(self.search.delta_expanded)
            self.tick_discovered.extend(self.search.delta_discovered)
            steps += 1
            if done:
                break
        self.accumulated_compute_s += (time.perf_counter() - t0)

        # Phase 3.2: Handle BDS two-sided currents properly
        if hasattr(self.search, 'currents'):
            # BDS: use forward side as primary current for compatibility
            self.last_cell = self.search.currents.get("forward")
        elif self.tick_expanded:
            self.last_cell = self.tick_expanded[-1]

        return self.search.status in ("found", "failed")

    def to_state(self, c_star: Optional[float], is_update: bool = True, narrate: bool = False, show_values: bool = False, steps: int = 0) -> ParticipantState:
        s = self.search
        opt = compute_optimality(c_star, s.path_cost) if s.path_cost is not None else None
        path_list = [list(pt) for pt in s.path] if s.path else None

        delta_exp = [list(pt) for pt in self.tick_expanded] if is_update else None
        delta_disc = [list(pt) for pt in self.tick_discovered] if is_update else None
        curr = list(self.last_cell) if (is_update and self.last_cell and s.status in ("init", "running")) else None

        # Phase 3.2: Build currents array for BDS two-sided visualization
        currents_list = None
        if is_update and hasattr(s, 'currents'):
            currents_list = []
            for side in ["forward", "backward"]:
                cell = s.currents.get(side)
                if cell is not None:
                    currents_list.append({"side": side, "cell": list(cell)})
        elif is_update and curr:
            # Non-BDS: single current with no side
            currents_list = [{"side": None, "cell": curr}]

        note = None
        if narrate and is_update and s.status in ("init", "running"):
            # Phase 3.2: BDS needs per-side narration
            if hasattr(s, 'currents') and hasattr(s, 'last_side'):
                side = s.last_side
                cell = s.currents.get(side)
                if cell:
                    dist = None
                    if side == "forward" and hasattr(s, 'dist_f'):
                        dist = s.dist_f.get(cell, 0)
                    elif side == "backward" and hasattr(s, 'dist_b'):
                        dist = s.dist_b.get(cell, 0)
                    ref = "Start" if side == "forward" else "Goal"
                    note = f"{side.capitalize()} wave checks {cell} — {dist} steps from {ref}"
            elif self.last_cell:
                g_cost = s.g_costs.get(self.last_cell, 0.0) if hasattr(s, "g_costs") else None
                h_cost = 0.0
                if hasattr(s, "h_fn") and s.h_fn:
                    gr, gc = s.maze.goal
                    h_cost = s.h_fn(self.last_cell[0], self.last_cell[1], gr, gc)
                note = narrate_step(self.algorithm, self.heuristic, self.last_cell, g_cost, h_cost)

        info = None
        if show_values and is_update:
            info = []
            cols = s.maze.cols
            # Phase 1.3/1.4: Build info from ordered lists (B4) with per-cell order (B1)
            reported = list(self.tick_discovered) + list(self.tick_expanded)
            for cell in reported:
                idx = cell[0] * cols + cell[1]
                g_val = s.g_costs.get(cell, 0.0) if hasattr(s, "g_costs") else 0.0
                h_val = None
                if hasattr(s, "h_fn") and s.h_fn:
                    gr, gc = s.maze.goal
                    h_val = round(s.h_fn(cell[0], cell[1], gr, gc), 1)
                # Phase 1.4: Use per-cell order (B1) - null for merely discovered cells
                order_val = getattr(s, "order", {}).get(cell)
                side_val = getattr(s, "cell_sides", {}).get(cell)
                info.append([idx, g_val, h_val, order_val, side_val])

        # Phase 3.3: Derive phase from status
        phase_map = {
            "init": "waiting",
            "running": "searching",
            "found": "done",
            "failed": "no_route"
        }
        phase = phase_map.get(s.status, "waiting")

        compute_ms = round(self.accumulated_compute_s * 1000, 3)

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
            compute_ms=compute_ms,
            delta_expanded=delta_exp,
            delta_discovered=delta_disc,
            current=curr,
            currents=currents_list,
            note=note,
            info=info,
            time={"compute_ms": compute_ms},
            steps=steps,
            phase=phase,
        )


class RaceSession:
    def __init__(self, race_id: str, maze: MazeGrid, participants: list[dict], narrate: bool = True, show_values: bool = False) -> None:
        if not participants or len(participants) > 6:
            raise ApiError("INVALID_PARAMS", "A race requires between 1 and 6 participants.")
        participant_ids = [str(p.get("id", i)) for i, p in enumerate(participants)]
        if len(set(participant_ids)) != len(participant_ids):
            raise ApiError("INVALID_PARAMS", "Race participants must have unique ids.")
        self.race_id = race_id
        self.maze = maze
        self.c_star = dijkstra_optimal_cost(maze)
        self.participants: list[ParticipantSession] = [
            ParticipantSession(p, maze) for p in participants
        ]
        self.narrate = narrate
        self.show_values = show_values
        self.tick = 0
        self.finished = False
        self.start_time = time.time()

    def get_ready_message(self) -> RaceReadyMessage:
        # Phase 3.1: Build per-racer initial_waiting 
        participants_with_initial = []
        for i, p in enumerate(self.participants):
            state = p.to_state(self.c_star, is_update=False, narrate=False, show_values=False, steps=0)
            # BDS: start and goal; others: start only
            if p.algorithm == "bds":
                state.initial_waiting = [list(self.maze.start), list(self.maze.goal)]
            else:
                state.initial_waiting = [list(self.maze.start)]
            participants_with_initial.append(state)
        
        # Keep deprecated 'initial' field for compatibility (start only)
        initial_cells = [list(self.maze.start)]

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
            participants=participants_with_initial,
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
            else:
                # Do not resend the previous tick's deltas after this racer finishes.
                p.tick_expanded = []
                p.tick_discovered = []
            if p.search.status in ("init", "running"):
                all_done = False

        self.finished = all_done
        states = [p.to_state(self.c_star, is_update=True, narrate=self.narrate, show_values=self.show_values, steps=self.tick) for p in self.participants]
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
        
        found = [i for i, p in enumerate(self.participants) if p.search.status == "found"]
        
        # Balanced scoring system: 40% path quality, 35% efficiency, 25% speed
        scores = {}
        
        if found:
            # Find best values for normalization
            min_cost = min(self.participants[i].search.path_cost or float("inf") for i in found)
            min_expanded = min(self.participants[i].search.expanded_count for i in found)
            min_time = min(self.participants[i].accumulated_compute_s for i in found)
            
            # Prevent division by zero
            min_time = max(min_time, 1e-9)
            
            # Calculate weighted scores for each successful algorithm
            for i in found:
                p = self.participants[i]
                cost = p.search.path_cost or float("inf")
                expanded = p.search.expanded_count
                time_s = max(p.accumulated_compute_s, 1e-9)
                
                # Normalize each metric (100 = best)
                quality_score = 100.0 * (min_cost / cost)
                efficiency_score = 100.0 * (min_expanded / expanded)
                speed_score = 100.0 * (min_time / time_s)
                
                # Weighted combination: 40% quality, 35% efficiency, 25% speed
                total_score = (0.40 * quality_score + 
                              0.35 * efficiency_score + 
                              0.25 * speed_score)
                
                scores[i] = {
                    "total": total_score,
                    "quality": quality_score,
                    "efficiency": efficiency_score,
                    "speed": speed_score,
                }
        
        # Determine winner based on highest total score
        best_id = max(found, key=lambda i: scores[i]["total"]) if found else None
        
        # Sort by score for ranking
        def rank_key(idx: int):
            if idx not in found:
                return (1, 0)  # Failed searches at the end
            return (0, -scores[idx]["total"])  # Successful, sorted by score descending
        
        indices.sort(key=rank_key)
        states = [p.to_state(self.c_star, is_update=False, narrate=False) for p in self.participants]

        # Individual category awards
        optimal = [i for i in found if compute_optimality(self.c_star, self.participants[i].search.path_cost) == 1.0]
        fewest = min(found, key=lambda i: self.participants[i].search.expanded_count) if found else None
        fastest = min(found, key=lambda i: self.participants[i].accumulated_compute_s) if found else None

        awards = {
            "fewest_checked": {
                "id": fewest,
                "value": self.participants[fewest].search.expanded_count if fewest is not None else None,
            },
            "shortest_route": {
                "ids": optimal,
                "cost": self.c_star if optimal else None,
            },
            "fastest_search": {
                "id": fastest,
                "ms": round(self.participants[fastest].accumulated_compute_s * 1000, 3) if fastest is not None else None,
                "within_noise": self._fastest_is_within_noise(found, fastest),
            },
        }
        
        # Generate winner explanation
        winner_reason = ""
        if best_id is not None:
            winner = self.participants[best_id]
            score_data = scores[best_id]
            name = winner.algorithm.upper()
            
            # Determine what made this algorithm win
            contributions = []
            if score_data["quality"] > 95:
                contributions.append("optimal path")
            if score_data["efficiency"] > 95:
                contributions.append("fewest cells checked")
            if score_data["speed"] > 95:
                contributions.append("fastest execution")
            
            if len(contributions) == 3:
                winner_reason = f"{name} dominated all three metrics with a perfect score of {score_data['total']:.1f}/100."
            elif len(contributions) >= 1:
                winner_reason = f"{name} won with {score_data['total']:.1f}/100 points (best at {', '.join(contributions)})."
            else:
                winner_reason = f"{name} won with {score_data['total']:.1f}/100 points through balanced performance across all metrics."
        
        awards["best_overall"] = {
            "id": best_id,
            "reason": winner_reason,
            "score": scores.get(best_id, {}).get("total"),
        }

        route_groups = self._route_groups(found)
        explanations = self._explanations(found, optimal, route_groups)

        # Generate insights
        insights = []

        if self.c_star is None:
            insights.append({
                "id": "no_route",
                "tone": "warn",
                "title": "Unreachable Goal",
                "text": "No route exists between start and goal in this maze.",
            })
            winner_reason = "No path exists between start and goal."
        elif best_id is not None:
            insights.append({
                "id": "best_overall",
                "tone": "good",
                "title": "Winner",
                "text": winner_reason,
            })
        elif found:
            winner_reason = "No successful searches."

        return RaceSummaryMessage(
            raceId=self.race_id,
            participants=states,
            ranking=indices,
            insights=insights,
            winner_reason=winner_reason,
            reachable=(self.c_star is not None),
            optimal_cost=self.c_star,
            awards=awards,
            route_groups=route_groups,
            explanations=explanations,
        )

    def _fastest_is_within_noise(self, found: list[int], fastest: Optional[int]) -> bool:
        if fastest is None or len(found) < 2:
            return False
        fastest_ms = self.participants[fastest].accumulated_compute_s * 1000
        others = [self.participants[i].accumulated_compute_s * 1000 for i in found if i != fastest]
        gap = min(others) - fastest_ms
        return gap < 1.0 or gap / max(min(others), 1e-9) < 0.2

    def _route_groups(self, found: list[int]) -> list[dict]:
        groups: dict[tuple, list[int]] = {}
        for idx in found:
            path = tuple(tuple(cell) for cell in (self.participants[idx].search.path or []))
            groups.setdefault(path, []).append(idx)
        result = []
        for ids in groups.values():
            names = " and ".join(self.participants[i].algorithm.upper() for i in ids)
            result.append({"ids": ids, "same_route": len(ids) > 1, "label": names})
        return result

    def _explanations(self, found: list[int], optimal: list[int], route_groups: list[dict]) -> list[str]:
        explanations: list[str] = []
        cycles = self.maze.meta.get("cycles")
        if cycles == 0:
            explanations.append("This maze has exactly one route (a 'perfect maze'), so every algorithm found the same one. They differ only in how many cells they checked.")
        has_terrain = any(cell in (2, 3) for cell in self.maze.cells)
        bfs = next((i for i in found if self.participants[i].algorithm == "bfs"), None)
        ucs = next((i for i in found if self.participants[i].algorithm == "ucs"), None)
        if bfs is not None and ucs is not None:
            if not has_terrain:
                explanations.append("BFS and UCS behave the same when every step costs 1. Add sand or water to see UCS choose cheaper routes.")
            elif self.participants[bfs].search.path_cost != self.participants[ucs].search.path_cost:
                delta = abs((self.participants[bfs].search.path_cost or 0) - (self.participants[ucs].search.path_cost or 0))
                explanations.append(f"BFS minimises steps; UCS minimises cost — UCS's route is {delta:g} cost cheaper.")
        greedy = next((i for i in found if self.participants[i].algorithm == "greedy"), None)
        if greedy is not None and self.c_star and (self.participants[greedy].search.path_cost or 0) > self.c_star:
            pct = round(((self.participants[greedy].search.path_cost / self.c_star) - 1) * 100)
            explanations.append(f"Greedy followed the hint into a dead end; its route is {pct}% longer.")
        if any(self.participants[i].algorithm == "bds" for i in found):
            explanations.append("The two waves met in the middle; BDS ignores terrain, so its route cost may be higher than UCS.")
        return explanations[:3]
