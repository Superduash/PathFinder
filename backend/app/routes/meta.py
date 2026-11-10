"""Metadata route returning algorithms, heuristics, generators, presets, and constants."""
from __future__ import annotations
from fastapi import APIRouter
from backend.app.models import MetaResponse, AlgorithmMeta
from backend.app.maze.presets import PRESETS
from backend.app.maze.generators import GENERATORS
from backend.app.search.heuristics import HEURISTICS

router = APIRouter()

ALGORITHMS_INFO: list[AlgorithmMeta] = [
    AlgorithmMeta(
        id="bfs",
        name="Breadth-First Search",
        description="Explores level-by-level using a FIFO queue. Unweighted shortest path guaranteed.",
        pros=["Optimal for unweighted grids", "Complete", "Predictable exploration ring"],
        cons=["High memory consumption O(V)", "Blind to edge weights/costs", "Explores all directions equally"],
        time_complexity="O(V + E)",
        space_complexity="O(V)",
        optimal=True,
        complete=True,
        color="#4C9AFF",
    ),
    AlgorithmMeta(
        id="dfs",
        name="Depth-First Search",
        description="Explores as deep as possible along each branch before backtracking using a LIFO stack.",
        pros=["Low space complexity on corridors", "Can find target quickly if lucky", "Very simple implementation"],
        cons=["Not optimal", "Can get trapped exploring useless subtrees", "High variance in path length"],
        time_complexity="O(V + E)",
        space_complexity="O(V)",
        optimal=False,
        complete=True,
        color="#FF9F43",
    ),
    AlgorithmMeta(
        id="ucs",
        name="Uniform-Cost Search (Dijkstra)",
        description="Expands the lowest cumulative path cost node first using a priority queue.",
        pros=["Optimal for arbitrary non-negative edge costs", "Complete", "Sound mathematical foundation"],
        cons=["Blind to goal direction (exhausts contours)", "Can be slow on large uniform grids"],
        time_complexity="O((V + E) log V)",
        space_complexity="O(V)",
        optimal=True,
        complete=True,
        color="#F2C94C",
    ),
    AlgorithmMeta(
        id="greedy",
        name="Greedy Best-First Search",
        description="Expands the node estimated to be closest to the goal using a heuristic function h(n).",
        pros=["Extremely fast in open areas", "Direct path towards goal", "Expands minimal nodes if unobstructed"],
        cons=["Not optimal", "Vulnerable to obstacles and local minima (U-traps)", "Incomplete in infinite spaces"],
        time_complexity="O(b^m)",
        space_complexity="O(b^m)",
        optimal=False,
        complete=False,
        color="#E86AB8",
    ),
    AlgorithmMeta(
        id="astar",
        name="A* Search",
        description="Combines actual cost g(n) with estimated remaining cost h(n) via evaluation function f(n) = g(n) + h(n).",
        pros=["Optimal with admissible & consistent heuristics", "Optimally efficient among all informed searches", "Handles weighted terrain"],
        cons=["Memory bounded: stores all generated nodes in memory", "Performance depends strongly on heuristic quality"],
        time_complexity="O(b^d)",
        space_complexity="O(b^d)",
        optimal=True,
        complete=True,
        color="#5BD68A",
    ),
]


@router.get("/meta", response_model=MetaResponse)
def get_meta() -> MetaResponse:
    return MetaResponse(
        algorithms=ALGORITHMS_INFO,
        heuristics=list(HEURISTICS.keys()),
        generators=list(GENERATORS.keys()),
        presets=list(PRESETS.keys()),
        cell_types={
            "0": {"name": "open", "cost": 1.0, "color": "#0E1116"},
            "1": {"name": "wall", "cost": None, "color": "#2A323D"},
            "2": {"name": "sand", "cost": 3.0, "color": "#D4A373"},
            "3": {"name": "water", "cost": 5.0, "color": "#457B9D"},
        },
        limits={
            "min_rows": 5,
            "max_rows": 60,
            "min_cols": 5,
            "max_cols": 60,
            "max_participants": 5,
            "max_repeats": 20,
            "max_benchmark_mazes": 3000,
        },
        defaults={
            "rows": 20,
            "cols": 20,
            "generator": "backtracker",
            "density": 0.3,
            "weighted": False,
            "weight_fraction": 0.3,
            "diagonal": False,
            "repeats": 5,
        },
    )

