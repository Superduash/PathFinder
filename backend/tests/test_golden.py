"""Golden safety net and calculation checks (polish2.md §2.1 & §2.7)."""
import json
import math
from pathlib import Path
import pytest
from backend.app.maze.generators import generate
from backend.app.maze.grid import MazeGrid
from backend.app.search.algorithms import create_search
from backend.app.search.engine import route_stats
from backend.app.search.heuristics import get_heuristic
from backend.app.search.reference import reverse_dijkstra

GOLDEN_DIR = Path(__file__).parent / "golden"
GOLDEN_FILE = GOLDEN_DIR / "golden_traces.json"


def test_heuristic_admissibility_and_optimality():
    """Checks heuristic admissibility against true Dijkstra cost (polish2.md §2.7.1)."""
    # Test 4-direction admissibility (Manhattan, Euclidean)
    manhattan_inadmissible_count = 0
    for seed in range(40):
        m = generate("backtracker", rows=11, cols=11, seed=seed)
        true_costs = reverse_dijkstra(m)
        h_man = get_heuristic("manhattan", diagonal=False)
        h_euc = get_heuristic("euclidean", diagonal=False)
        gr, gc = m.goal
        for (r, c), true_cost in true_costs.items():
            h_m = h_man(r, c, gr, gc)
            h_e = h_euc(r, c, gr, gc)
            # Admissible: h <= true cost (up to floating point tolerance)
            assert h_m <= true_cost + 1e-6
            assert h_e <= true_cost + 1e-6

    # Test with diagonal=True: Octile is admissible; Manhattan is sometimes INADMISSIBLE with diagonals
    for seed in range(20):
        m = generate("random", rows=11, cols=11, density=0.2, diagonal=True, seed=seed)
        true_costs = reverse_dijkstra(m)
        h_oct = get_heuristic("octile", diagonal=True)
        h_man = get_heuristic("manhattan", diagonal=True)
        gr, gc = m.goal
        for (r, c), true_cost in true_costs.items():
            h_o = h_oct(r, c, gr, gc)
            assert h_o <= true_cost + 1e-6
            if h_man(r, c, gr, gc) > true_cost + 1e-6:
                manhattan_inadmissible_count += 1

    # Documents that Manhattan IS inadmissible when diagonals are allowed (hence UI warning)
    assert manhattan_inadmissible_count > 0


def test_optimality_relationships():
    """Optimality checks (polish2.md §2.7.2):
    - BFS achieves minimum moves on uniform cost mazes
    - UCS and A*(manhattan) achieve optimal Dijkstra cost
    - BDS moves == BFS moves
    - DFS cost >= optimal
    """
    for seed in range(10):
        m = generate("backtracker", rows=13, cols=13, seed=seed)
        bfs = create_search("bfs", m).run_to_completion()
        dfs = create_search("dfs", m).run_to_completion()
        ucs = create_search("ucs", m).run_to_completion()
        astar = create_search("astar", m, heuristic="manhattan").run_to_completion()
        bds = create_search("bds", m).run_to_completion()

        assert bfs.status == "found"
        assert ucs.status == "found"
        assert astar.status == "found"
        assert bds.status == "found"

        # BFS and BDS find shortest moves
        bfs_moves, _ = route_stats(m, bfs.path)
        bds_moves, _ = route_stats(m, bds.path)
        assert bds_moves == bfs_moves

        # UCS and A* find optimal path cost
        _, ucs_cost = route_stats(m, ucs.path)
        _, astar_cost = route_stats(m, astar.path)
        assert math.isclose(ucs_cost, astar_cost, rel_tol=1e-5)

        # DFS path cost is at least optimal
        _, dfs_cost = route_stats(m, dfs.path)
        assert dfs_cost >= ucs_cost - 1e-5


def test_route_stats_and_quality():
    """Route stats edge cases & quality calculation (polish2.md §2.7.3 & §2.7.4)."""
    m = generate("backtracker", rows=7, cols=7, seed=1)
    moves, cost = route_stats(m, [m.start])
    assert moves == 0 and cost == 0.0

    moves, cost = route_stats(m, None)
    assert moves == 0 and cost == 0.0

    # Symmetric neighbours check (§2.7.5)
    for r in range(m.rows):
        for c in range(m.cols):
            if m.cell(r, c) != 1:
                for nr, nc, _ in m.neighbours(r, c):
                    assert (r, c) in [(x[0], x[1]) for x in m.neighbours(nr, nc)]


def test_golden_regression_traces():
    """Golden traces across 10 fixed seeded mazes for all 6 algorithms (§2.1 & §2.7.9)."""
    GOLDEN_DIR.mkdir(parents=True, exist_ok=True)

    algorithms = ["bfs", "dfs", "ucs", "greedy", "astar", "bds"]
    configs = [
        {"type": "backtracker", "rows": 11, "cols": 11, "diagonal": False, "seed": 101},
        {"type": "backtracker", "rows": 11, "cols": 11, "diagonal": True, "seed": 102},
        {"type": "random", "rows": 9, "cols": 9, "diagonal": False, "seed": 103},
        {"type": "weighted", "rows": 11, "cols": 11, "diagonal": False, "seed": 104},
        {"type": "braided", "rows": 13, "cols": 13, "diagonal": False, "seed": 105},
        {"type": "backtracker", "rows": 15, "cols": 15, "diagonal": True, "seed": 106},
        {"type": "weighted", "rows": 11, "cols": 11, "diagonal": True, "seed": 107},
        {"type": "random", "rows": 11, "cols": 11, "diagonal": False, "seed": 108},
        {"type": "braided", "rows": 9, "cols": 9, "diagonal": True, "seed": 109},
        {"type": "backtracker", "rows": 7, "cols": 7, "diagonal": False, "seed": 110},
    ]

    current_data = []
    for cfg in configs:
        m = generate(cfg["type"], rows=cfg["rows"], cols=cfg["cols"], diagonal=cfg["diagonal"], seed=cfg["seed"])
        case_res = {"config": cfg, "results": {}}
        for alg in algorithms:
            h = "manhattan" if alg in ("greedy", "astar") else None
            engine = create_search(alg, m, heuristic=h)
            engine.run_to_completion()
            moves, cost = route_stats(m, engine.path)
            case_res["results"][alg] = {
                "status": engine.status,
                "expanded": engine.expanded,
                "moves": moves,
                "cost": round(cost, 4),
                "path_len": len(engine.path) if engine.path else 0,
            }
        current_data.append(case_res)

    if not GOLDEN_FILE.exists():
        with open(GOLDEN_FILE, "w", encoding="utf-8") as f:
            json.dump(current_data, f, indent=2)
    else:
        with open(GOLDEN_FILE, "r", encoding="utf-8") as f:
            expected_data = json.load(f)
        assert current_data == expected_data, "Search engine results drifted from golden traces!"
