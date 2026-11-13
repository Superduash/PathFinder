"""Metadata route returning algorithms, heuristics, generators, presets, glossary, and presets (backend.md Phase 7)."""
from __future__ import annotations
from fastapi import APIRouter, Response
from backend.app.models import MetaResponse, AlgorithmMeta
from backend.app.maze.presets import PRESETS, get_preset_list
from backend.app.maze.generators import GENERATORS

router = APIRouter()

ALGORITHMS_INFO: list[AlgorithmMeta] = [
    AlgorithmMeta(
        id="bfs",
        name="Breadth-First Search",
        description="Explores level-by-level using a FIFO queue. Unweighted shortest path guaranteed.",
        plain="Checks cells in the exact order they were discovered, radiating outward in concentric ripples.",
        pros=["Optimal for unweighted grids", "Complete", "Predictable exploration ring"],
        cons=["High memory consumption O(V)", "Blind to edge weights/costs", "Explores all directions equally"],
        time_complexity="O(V + E)",
        space_complexity="O(V)",
        optimal=True,
        complete=True,
        color="#4C9AFF",
        color_key="bfs",
        shape="circle",
    ),
    AlgorithmMeta(
        id="dfs",
        name="Depth-First Search",
        description="Explores as deep as possible along each branch before backtracking using a LIFO stack.",
        plain="Dives aggressively down one corridor until hitting a dead end before backtracking.",
        pros=["Low space complexity on corridors", "Can find target quickly if lucky", "Very simple implementation"],
        cons=["Not optimal", "Can get trapped exploring useless subtrees", "High variance in path length"],
        time_complexity="O(V + E)",
        space_complexity="O(V)",
        optimal=False,
        complete=True,
        color="#FF9F43",
        color_key="dfs",
        shape="triangle",
    ),
    AlgorithmMeta(
        id="ucs",
        name="Uniform-Cost Search (Dijkstra)",
        description="Expands the lowest cumulative path cost node first using a priority queue.",
        plain="Always picks the cheapest route so far, navigating around expensive sand and water terrain.",
        pros=["Optimal for arbitrary non-negative edge costs", "Complete", "Sound mathematical foundation"],
        cons=["Blind to goal direction (exhausts contours)", "Can be slow on large uniform grids"],
        time_complexity="O((V + E) log V)",
        space_complexity="O(V)",
        optimal=True,
        complete=True,
        color="#F2C94C",
        color_key="ucs",
        shape="square",
    ),
    AlgorithmMeta(
        id="greedy",
        name="Greedy Best-First Search",
        description="Expands the node estimated to be closest to the goal using a heuristic function h(n).",
        plain="Beelines straight towards the goal coordinate, ignoring cumulative journey cost.",
        pros=["Extremely fast in open areas", "Direct path towards goal", "Expands minimal nodes if unobstructed"],
        cons=["Not optimal", "Vulnerable to obstacles and local minima (U-traps)", "Incomplete in infinite spaces"],
        time_complexity="O(b^m)",
        space_complexity="O(b^m)",
        optimal=False,
        complete=False,
        color="#E86AB8",
        color_key="greedy",
        shape="diamond",
    ),
    AlgorithmMeta(
        id="astar",
        name="A* Search",
        description="Combines actual cost g(n) with estimated remaining cost h(n) via evaluation function f(n) = g(n) + h(n).",
        plain="Balances distance traveled with distance remaining to find the shortest path with minimum wasted effort.",
        pros=["Optimal with admissible & consistent heuristics", "Optimally efficient among all informed searches", "Handles weighted terrain"],
        cons=["Memory bounded: stores all generated nodes in memory", "Performance depends strongly on heuristic quality"],
        time_complexity="O(b^d)",
        space_complexity="O(b^d)",
        optimal=True,
        complete=True,
        color="#5BD68A",
        color_key="astar",
        shape="star",
    ),
    AlgorithmMeta(
        id="bds",
        name="Bidirectional Search",
        description="Searches simultaneously forward from start and backward from goal until the frontiers meet.",
        plain="Launches two search waves that meet in the middle, finding the route with the fewest steps.",
        pros=["Dramatically reduces explored space O(b^(d/2))", "Finds route with minimum moves", "Predictable symmetry"],
        cons=["Maintains two frontiers and parent maps in memory", "Ignores edge weights like BFS", "Requires explicit goal coordinate"],
        time_complexity="O(b^(d/2))",
        space_complexity="O(b^(d/2))",
        optimal=True,
        complete=True,
        color="#FACC15",
        color_key="bds",
        shape="hexagon",
    ),
]

PRESET_CARDS = [
    {
        "key": "open_arena",
        "name": "Wide Open Arena",
        "description": "An empty perimeter grid. Watch Greedy beeline straight while BFS ripples outward.",
        "rows": 21,
        "cols": 21,
        "diagonal": False,
        "difficulty": "Easy",
    },
    {
        "key": "simple_corridor",
        "name": "Single Corridor",
        "description": "A snaking corridor. Demonstrates that DFS and BFS behave identically when no branching exists.",
        "rows": 15,
        "cols": 15,
        "diagonal": False,
        "difficulty": "Easy",
    },
    {
        "key": "classic_branching",
        "name": "Classic Branching Maze",
        "description": "A standard tree-like labyrinth with multiple forks, loops, and blind alleys.",
        "rows": 21,
        "cols": 21,
        "diagonal": False,
        "difficulty": "Medium",
    },
    {
        "key": "weighted_cross",
        "name": "Terrain Crossing",
        "description": "Patches of high-cost sand (3x) and deep water (5x). Highlights how UCS and A* find cheap detours.",
        "rows": 21,
        "cols": 21,
        "diagonal": False,
        "difficulty": "Medium",
    },
    {
        "key": "u_trap",
        "name": "U-Shaped Obstacle Trap",
        "description": "A concave wall facing the goal. Greedy gets deeply deceived inside the cul-de-sac while A* escapes.",
        "rows": 21,
        "cols": 21,
        "diagonal": False,
        "difficulty": "Hard",
    },
    {
        "key": "unreachable",
        "name": "Unreachable Deadlock",
        "description": "The goal is fully enclosed by solid walls. Verifies termination and complete search space exhaustion.",
        "rows": 15,
        "cols": 15,
        "diagonal": False,
        "difficulty": "Edge Case",
    },
]

HEURISTICS_INFO = [
    {
        "key": "manhattan",
        "label": "Straight blocks (Manhattan)",
        "description": "Grid distance along 4 cardinal directions (|dr| + |dc|). Admissible on 4-way grids.",
        "admissible": True,
        "requires_diagonal": False,
    },
    {
        "key": "euclidean",
        "label": "Direct line (Euclidean)",
        "description": "Straight-line geometric Euclidean distance sqrt(dr^2 + dc^2). Always admissible.",
        "admissible": True,
        "requires_diagonal": False,
    },
    {
        "key": "chebyshev",
        "label": "Diagonal steps (Chebyshev)",
        "description": "King-move distance max(|dr|, |dc|). Admissible when diagonal movement has cost 1.",
        "admissible": True,
        "requires_diagonal": True,
    },
    {
        "key": "octile",
        "label": "Octile distance",
        "description": "Exact shortest diagonal distance with sqrt(2) diagonal edge costs.",
        "admissible": True,
        "requires_diagonal": True,
    },
    {
        "key": "zero",
        "label": "Zero (Dijkstra equivalent)",
        "description": "h(n) = 0 everywhere. Turns A* into Uniform-Cost Search.",
        "admissible": True,
        "requires_diagonal": False,
    },
]

GLOSSARY_ITEMS = [
    {
        "term": "Start Cell",
        "plain": "The coordinate where the race begins (green dot).",
        "technical": "Initial node s in the state space graph with cumulative path cost g(s) = 0.",
    },
    {
        "term": "Goal Cell",
        "plain": "The destination coordinate to find (red dot).",
        "technical": "Target state satisfying the goal test predicate IsGoal(n) == True.",
    },
    {
        "term": "Checked (Expanded)",
        "plain": "Cells the algorithm has fully visited and examined neighbors for.",
        "technical": "Nodes popped from the open frontier and added to the closed/explored set.",
    },
    {
        "term": "Waiting (Frontier)",
        "plain": "Cells discovered by search that are queued up waiting to be inspected.",
        "technical": "The open priority queue or FIFO/LIFO container of candidate frontier nodes.",
    },
    {
        "term": "Route (Path)",
        "plain": "The final continuous sequence of steps from start to goal.",
        "technical": "A sequence of contiguous graph vertices <v0, v1, ..., vk> where (vi, vi+1) in E.",
    },
    {
        "term": "Cost",
        "plain": "The total resistance of a path: open cells cost 1, sand costs 3, water costs 5.",
        "technical": "The sum of positive edge weights w(u, v) along the traversed trajectory.",
    },
    {
        "term": "Optimal",
        "plain": "No cheaper or shorter route is mathematically possible.",
        "technical": "A path whose total cost equals the infimum shortest-path distance C*.",
    },
    {
        "term": "Heuristic (Hint)",
        "plain": "An educated guess of how far a cell is from the goal without exploring.",
        "technical": "An estimated cost-to-go function h(n) mapping state coordinates to R+.",
    },
    {
        "term": "Admissible",
        "plain": "A heuristic that never overestimates the true remaining distance.",
        "technical": "h(n) <= h*(n) for all nodes n. Guarantees that A* finds the optimal path.",
    },
    {
        "term": "Benchmark",
        "plain": "Testing multiple algorithms over dozens or hundreds of mazes to measure average performance.",
        "technical": "Systematic empirical evaluation across randomized grid configurations and densities.",
    },
    {
        "term": "Regression",
        "plain": "Machine learning model trained to predict remaining distance from grid features.",
        "technical": "Supervised continuous function approximation predicting ground-truth shortest path cost.",
    },
    {
        "term": "Classification",
        "plain": "Machine learning model predicting which search algorithm will inspect the fewest cells on a given maze.",
        "technical": "Discrete categorical classifier predicting argmin(Expanded_Count) from structural maze features.",
    },
]

SPEED_LEVELS = [
    {"level": 1, "label": "Crawling", "k": 1, "interval_ms": 120},
    {"level": 2, "label": "Slow", "k": 2, "interval_ms": 90},
    {"level": 3, "label": "Relaxed", "k": 5, "interval_ms": 60},
    {"level": 4, "label": "Fast", "k": 15, "interval_ms": 30},
    {"level": 5, "label": "Instant", "k": 55, "interval_ms": 16},
]


@router.get("/meta", response_model=MetaResponse)
def get_meta(response: Response) -> MetaResponse:
    """Phase 2.5: Include preset metadata."""
    response.headers["Cache-Control"] = "public, max-age=300"
    return MetaResponse(
        algorithms=ALGORITHMS_INFO,
        heuristics=HEURISTICS_INFO,
        generators=list(GENERATORS.keys()),
        presets=get_preset_list(),  # Phase 2.5: Use new metadata
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
            "max_participants": 6,
            "max_repeats": 20,
            "max_benchmark_mazes": 3000,
            "max_saved_mazes": 200,
        },
        defaults={
            "rows": 21,
            "cols": 21,
            "generator": "backtracker",
            "density": 0.3,
            "weighted": False,
            "weight_fraction": 0.3,
            "diagonal": False,
            "repeats": 3,
            "speed_level": 3,
            "benchmark_presets": {
                "quick": {"mazes_per_config": 2, "sizes": [[15, 15]], "densities": [0.2, 0.3]},
                "standard": {"mazes_per_config": 5, "sizes": [[15, 15], [25, 25]], "densities": [0.2, 0.3, 0.4]},
                "thorough": {"mazes_per_config": 10, "sizes": [[15, 15], [25, 25], [35, 35]], "densities": [0.2, 0.3, 0.4]},
            },
            "ml_presets": {
                "fast": {"n_mazes": 40},
                "balanced": {"n_mazes": 150},
                "thorough": {"n_mazes": 400},
            },
            "speeds": [0.25, 0.5, 1, 2, 4, 8, "max"],
            "terrain": [
                {"key": "0", "name": "Floor", "cost": 1.0, "plain": "Normal open ground. Step cost 1."},
                {"key": "1", "name": "Wall", "cost": None, "plain": "Impassable solid obstacle."},
                {"key": "2", "name": "Sand", "cost": 3.0, "plain": "Slow ground. Traversal costs 3."},
                {"key": "3", "name": "Water", "cost": 5.0, "plain": "Deep liquid. Traversal costs 5."},
                {"key": "start", "name": "Start", "cost": None, "plain": "Starting origin coordinate."},
                {"key": "goal", "name": "Goal", "cost": None, "plain": "Target destination coordinate."},
            ],
        },
        glossary=GLOSSARY_ITEMS,
        speed_levels=SPEED_LEVELS,
    )
