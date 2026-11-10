"""Compare route: runs multiple participants on the same maze with timing repetitions."""
from __future__ import annotations
import gc
import os
import platform
import statistics
import time
from fastapi import APIRouter
from backend.app.models import (
    CompareRequest, CompareResult, CompareEntry, TimingStats, EnvironmentMeta
)
from backend.app.maze.grid import MazeGrid
from backend.app.search.algorithms import create_search
from backend.app.search.reference import dijkstra_optimal_cost, compute_optimality

router = APIRouter()


@router.post("/compare", response_model=CompareResult)
def api_compare(req: CompareRequest) -> CompareResult:
    grid = MazeGrid.from_model(req.maze)
    grid.validate()

    c_star = dijkstra_optimal_cost(grid)
    repeats = max(1, min(req.repeats, 20))

    results: list[CompareEntry] = []

    for p in req.participants:
        alg = p.get("algorithm")
        heur = p.get("heuristic")

        # 1 warm-up run (not timed in statistics)
        warmup = create_search(alg, grid, heuristic=heur)
        warmup.run_to_completion()

        timings_ms: list[float] = []
        last_search = warmup

        # Perform timed repeats
        for _ in range(repeats):
            search = create_search(alg, grid, heuristic=heur)
            gc_was_enabled = gc.isenabled()
            try:
                gc.disable()
                t0 = time.perf_counter_ns()
                search.run_to_completion()
                t1 = time.perf_counter_ns()
            finally:
                if gc_was_enabled:
                    gc.enable()

            dt_ms = (t1 - t0) / 1_000_000.0
            timings_ms.append(dt_ms)
            last_search = search

        # Compute stats
        med_ms = statistics.median(timings_ms)
        mean_ms = statistics.mean(timings_ms)
        std_ms = statistics.stdev(timings_ms) if len(timings_ms) > 1 else 0.0
        min_ms = min(timings_ms)
        max_ms = max(timings_ms)

        timing_stats = TimingStats(
            median_ms=round(med_ms, 3),
            mean_ms=round(mean_ms, 3),
            std_ms=round(std_ms, 3),
            min_ms=round(min_ms, 3),
            max_ms=round(max_ms, 3),
        )

        optimality = compute_optimality(c_star, last_search.path_cost)

        results.append(
            CompareEntry(
                algorithm=alg,
                heuristic=heur,
                status=last_search.status,
                path_length=last_search.path_length,
                path_cost=last_search.path_cost,
                optimality=optimality,
                expanded_count=last_search.expanded_count,
                timing=timing_stats,
                compute_ms=timing_stats.mean_ms,
            )
        )

    env = EnvironmentMeta(
        platform=platform.platform(),
        python_version=platform.python_version(),
        cpu_count=os.cpu_count(),
        repeats=repeats,
    )

    return CompareResult(results=results, environment=env)

