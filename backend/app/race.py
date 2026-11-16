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
        # Build results array with all metrics
        results = []
        for i, p in enumerate(self.participants):
            s = p.search
            found = s.status == "found"
            # Generate label from algorithm and heuristic
            label = p.algorithm.upper()
            if p.heuristic:
                label += f" ({p.heuristic})"
            
            results.append({
                "id": i,
                "algorithm": p.algorithm,
                "heuristic": p.heuristic,
                "label": label,
                "status": s.status,
                "reason": s.reason,
                "checked": s.expanded_count,
                "route_steps": s.path_length if found else None,
                "route_cost": s.path_cost if found else None,
                "quality": compute_optimality(self.c_star, s.path_cost) if found else None,
                "search_ms": round(p.accumulated_compute_s * 1000, 3),
            })

        # Ranking rule: shortest route first, then fewest cells checked, then cheapest route
        def rank_key(r):
            if r["status"] != "found":
                return (1, 1, 0, 0)
            shortest = (r["quality"] or 0) >= 1 - 1e-9
            return (0, 0 if shortest else 1, r["checked"], r["route_cost"])

        ranking = sorted(range(len(results)), key=lambda i: rank_key(results[i]))
        
        # Assign rank to each result
        for rank, i in enumerate(ranking, 1):
            results[i]["rank"] = rank

        # Award categories
        found_list = [r for r in results if r["status"] == "found"]
        shortest_route_racers = [r["id"] for r in found_list if (r["quality"] or 0) >= 1 - 1e-9]
        fewest = min(found_list, key=lambda r: r["checked"]) if found_list else None
        fastest = min(found_list, key=lambda r: r["search_ms"]) if found_list else None
        best = results[ranking[0]] if found_list else None

        # Generate best_overall reason
        best_reason = ""
        if best:
            name = best["algorithm"].upper()
            is_shortest = best["id"] in shortest_route_racers
            if is_shortest:
                # Among shortest-route racers, explain why this one won
                shortest_racers_checked = [r["checked"] for r in found_list if r["id"] in shortest_route_racers]
                if len(shortest_route_racers) == 1:
                    best_reason = f"{name} found a shortest route (cost {best['route_cost']:.4g}) and was the only one to do so."
                elif best["checked"] == min(shortest_racers_checked):
                    best_reason = f"{name} found a shortest route (cost {best['route_cost']:.4g}) and checked the fewest cells among the shortest-route racers ({best['checked']})."
                else:
                    best_reason = f"{name} found a shortest route (cost {best['route_cost']:.4g})."
            else:
                # Nobody found shortest route
                best_reason = f"No racer found a shortest route; {name} had the cheapest route (cost {best['route_cost']:.4g})."

        awards = {
            "best_overall": {
                "id": best["id"] if best else None,
                "reason": best_reason if best else "No route exists.",
            },
            "fewest_checked": {
                "id": fewest["id"] if fewest else None,
                "value": fewest["checked"] if fewest else None,
            },
            "shortest_route": {
                "ids": shortest_route_racers,
                "cost": self.c_star if shortest_route_racers else None,
            },
            "fastest_search": {
                "id": fastest["id"] if fastest else None,
                "ms": fastest["search_ms"] if fastest else None,
                "within_noise": self._fastest_is_within_noise(found_list, fastest),
            },
        }

        # Generate insights
        insights = self._insights(results)
        
        # Route groups and explanations
        found_indices = [r["id"] for r in results if r["status"] == "found"]
        route_groups = self._route_groups(found_indices)
        explanations = self._explanations(found_indices, shortest_route_racers, route_groups)

        # Build participant states for response
        states = [p.to_state(self.c_star, is_update=False, narrate=False) for p in self.participants]

        return RaceSummaryMessage(
            raceId=self.race_id,
            participants=states,
            results=results,
            ranking=ranking,
            insights=insights,
            winner_reason=best_reason if best else "No route exists.",
            reachable=(self.c_star is not None),
            optimal_cost=self.c_star,
            awards=awards,
            route_groups=route_groups,
            explanations=explanations,
        )

    def _insights(self, results: list[dict]) -> list[dict]:
        """Generate 3-5 factual insights about the race."""
        insights = []
        
        found_list = [r for r in results if r["status"] == "found"]
        
        if not found_list:
            insights.append({
                "id": "no_route",
                "tone": "warn",
                "title": "Unreachable Goal",
                "text": "No route exists between start and goal in this maze.",
            })
            return insights
        
        # Effort comparison
        if len(found_list) >= 2:
            least = min(found_list, key=lambda r: r["checked"])
            most = max(found_list, key=lambda r: r["checked"])
            if least["id"] != most["id"]:
                pct = round((1 - least["checked"] / most["checked"]) * 100)
                insights.append({
                    "id": "effort",
                    "tone": "info",
                    "title": "Effort",
                    "text": f"{least['algorithm'].upper()} checked {pct}% fewer cells than {most['algorithm'].upper()} ({least['checked']} vs {most['checked']}).",
                })
        
        # Route quality comparison
        shortest_racers = [r for r in found_list if (r["quality"] or 0) >= 1 - 1e-9]
        if len(shortest_racers) == len(found_list):
            insights.append({
                "id": "quality",
                "tone": "good",
                "title": "Route quality",
                "text": "All racers found a shortest route.",
            })
        elif shortest_racers:
            non_shortest = [r for r in found_list if r not in shortest_racers]
            worst = max(non_shortest, key=lambda r: r["route_cost"])
            pct = round(((worst["route_cost"] / self.c_star) - 1) * 100)
            names = ", ".join(r["algorithm"].upper() for r in non_shortest[:2])
            if len(non_shortest) > 2:
                names += f" and {len(non_shortest) - 2} other{'s' if len(non_shortest) > 3 else ''}"
            insights.append({
                "id": "quality",
                "tone": "warn",
                "title": "Route quality",
                "text": f"{names} did not find a shortest route. Worst: {worst['algorithm'].upper()} cost {worst['route_cost']:.4g} vs shortest {self.c_star:.4g} (+{pct}%).",
            })
        
        # Time comparison
        max_time = max(r["search_ms"] for r in found_list)
        if max_time < 5:
            insights.append({
                "id": "time",
                "tone": "info",
                "title": "Time",
                "text": f"Search times differ by less than {max_time:.2f} ms — too small to rank. Use the Benchmark page for timing.",
            })
        else:
            fastest = min(found_list, key=lambda r: r["search_ms"])
            slowest = max(found_list, key=lambda r: r["search_ms"])
            if fastest["id"] != slowest["id"]:
                insights.append({
                    "id": "time",
                    "tone": "info",
                    "title": "Time",
                    "text": f"{fastest['algorithm'].upper()} was fastest at {fastest['search_ms']:.2f} ms; {slowest['algorithm'].upper()} took {slowest['search_ms']:.2f} ms.",
                })
        
        return insights[:5]

    def _fastest_is_within_noise(self, found_list: list[dict], fastest: Optional[dict]) -> bool:
        """Check if timing differences are too small to be meaningful."""
        if fastest is None or len(found_list) < 2:
            return True
        max_time = max(r["search_ms"] for r in found_list)
        return max_time < 5

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
