"""Plain-language search step narration generator (backend.md §6.1)."""
from __future__ import annotations
from typing import Optional


def narrate_step(
    algorithm: str,
    heuristic: Optional[str],
    cell: tuple[int, int],
    g_cost: Optional[float] = None,
    h_cost: Optional[float] = None,
) -> str:
    r, c = cell
    algo = algorithm.lower()

    if algo == "bfs":
        return f"BFS checks ({r}, {c}), next in line. Cells are checked in the order they were found."

    if algo == "dfs":
        return f"DFS dives into ({r}, {c}), the newest cell it found."

    if algo == "ucs":
        cost_str = f"{g_cost:.1f}" if g_cost is not None else "0"
        return f"UCS picks ({r}, {c}): cheapest route so far costs {cost_str}."

    if algo == "greedy":
        h_str = f"{h_cost:.1f}" if h_cost is not None else "0"
        return f"Greedy picks ({r}, {c}): it looks closest to the goal (hint {h_str})."

    if algo == "astar":
        g_val = g_cost if g_cost is not None else 0.0
        h_val = h_cost if h_cost is not None else 0.0
        f_val = g_val + h_val
        return f"A* picks ({r}, {c}): cost so far {g_val:.1f} + hint {h_val:.1f} = {f_val:.1f}, the lowest among waiting cells."

    if algo in ("bds", "bidirectional"):
        return f"Bidirectional Search checks ({r}, {c}), expanding toward the opposing search wave."

    return f"{algorithm.upper()} inspects cell ({r}, {c})."

