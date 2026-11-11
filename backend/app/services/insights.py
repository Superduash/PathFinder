"""Plain-language benchmark insight generation (backend.md §4.4)."""
from __future__ import annotations
from typing import Any


def benchmark_insights(summary_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Generates 3 to 5 plain-language insights from benchmark summary rows."""
    if not summary_rows:
        return []

    insights: list[dict[str, Any]] = []

    # Map summary by algorithm name
    by_algo: dict[str, dict[str, Any]] = {}
    for row in summary_rows:
        algo = row.get("algorithm", "").lower()
        if algo not in by_algo:
            by_algo[algo] = row

    # 1. Fewest cells checked (Exploration efficiency)
    astar_row = by_algo.get("astar")
    bfs_row = by_algo.get("bfs")
    if astar_row and bfs_row and bfs_row.get("mean_expanded", 0) > 0:
        astar_exp = astar_row.get("mean_expanded", 0)
        bfs_exp = bfs_row.get("mean_expanded", 0)
        if astar_exp < bfs_exp:
            pct = round((1.0 - astar_exp / bfs_exp) * 100)
            insights.append({
                "id": "cells_checked",
                "tone": "good",
                "title": "Fewest Cells Checked",
                "text": f"A* checked on average {pct}% fewer cells than BFS.",
            })
        elif astar_exp == bfs_exp:
            insights.append({
                "id": "cells_checked",
                "tone": "neutral",
                "title": "Equal Exploration",
                "text": "A* and BFS expanded a similar number of cells.",
            })

    # 2. Route quality (Optimality)
    dfs_row = by_algo.get("dfs")
    optimal_racers = [a for a in ["bfs", "ucs", "astar"] if a in by_algo]
    if dfs_row and optimal_racers:
        dfs_opt = dfs_row.get("mean_optimality")
        if dfs_opt is not None and dfs_opt > 0 and dfs_opt < 0.95:
            ratio = round(1.0 / dfs_opt, 1)
            racer_names = ", ".join(r.upper() for r in optimal_racers[:-1])
            if racer_names:
                racer_names += f" and {optimal_racers[-1].upper()}"
            else:
                racer_names = optimal_racers[0].upper()
            insights.append({
                "id": "route_quality",
                "tone": "warn",
                "title": "Route Quality",
                "text": f"{racer_names} found shortest routes. DFS found routes on average {ratio}x longer.",
            })
        else:
            insights.append({
                "id": "route_quality",
                "tone": "good",
                "title": "Route Quality",
                "text": "All completed racers consistently discovered viable paths.",
            })

    # 3. Speed & noise analysis
    noise_count = sum(1 for r in summary_rows if r.get("within_noise_of_best"))
    if noise_count > 1:
        insights.append({
            "id": "speed_noise",
            "tone": "neutral",
            "title": "Execution Timing",
            "text": "Timing differences among top performers were within measurement noise (±1 std).",
        })
    elif summary_rows:
        fastest = min(summary_rows, key=lambda r: r.get("mean_time_ms", float("inf")))
        insights.append({
            "id": "speed_fastest",
            "tone": "good",
            "title": "Fastest Compute",
            "text": f"{fastest.get('algorithm', '').upper()} recorded the lowest average CPU execution time ({fastest.get('mean_time_ms', 0):.2f} ms).",
        })

    # 4. Reliability & Success rate
    total_mazes = sum(r.get("n_mazes", 0) for r in summary_rows)
    total_found = sum(r.get("n_found", 0) for r in summary_rows)
    if total_mazes > 0 and total_found == total_mazes:
        insights.append({
            "id": "reliability",
            "tone": "good",
            "title": "Reliability",
            "text": "Success rate was 100% across all evaluated mazes.",
        })
    elif total_mazes > 0:
        pct_fail = round((1.0 - total_found / total_mazes) * 100, 1)
        insights.append({
            "id": "reliability",
            "tone": "warn",
            "title": "Search Failures",
            "text": f"{pct_fail}% of search attempts exceeded expansion budgets or encountered unreachable goals.",
        })

    return insights
