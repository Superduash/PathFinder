"""Phase 10 behavior acceptance checks for the six search algorithms."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.app.maze.generators import generate
from backend.app.maze.presets import load_preset
from backend.app.search.algorithms import create_search
from backend.app.search.engine import route_stats
from backend.app.search.reference import dijkstra_optimal_cost

ALGORITHMS = ("bfs", "dfs", "ucs", "greedy", "astar", "bds")


def run(maze):
    results = {}
    for algorithm in ALGORITHMS:
        heuristic = "manhattan" if algorithm in ("greedy", "astar") else None
        search = create_search(algorithm, maze, heuristic=heuristic).run_to_completion()
        moves, cost = route_stats(maze, search.path)
        results[algorithm] = {
            "status": search.status,
            "checked": search.expanded,
            "moves": moves,
            "cost": cost,
            "path": tuple(search.path or ()),
        }
    return results


def report(name: str, maze, results) -> None:
    c_star = dijkstra_optimal_cost(maze)
    routes = len({result["path"] for result in results.values() if result["status"] == "found"})
    print(f"{name}: C*={c_star} distinct_routes={routes}")
    for algorithm in ALGORITHMS:
        result = results[algorithm]
        print(f"  {algorithm:7} {result['status']:6} checked={result['checked']:4} moves={result['moves']:3} cost={result['cost']:.2f}")


def main() -> None:
    preset_results = {}
    for name in ("open_field", "wall_with_gap", "greedy_trap", "weighted_river", "two_routes", "loops_arena", "corridor_maze", "unreachable_goal", "perfect_maze"):
        maze = load_preset(name)
        results = run(maze)
        preset_results[name] = results
        report(name, maze, results)

    assert preset_results["open_field"]["astar"]["checked"] <= 40
    assert preset_results["open_field"]["bfs"]["checked"] >= 200
    trap = preset_results["greedy_trap"]
    assert trap["greedy"]["cost"] > 1.4 * dijkstra_optimal_cost(load_preset("greedy_trap"))
    assert preset_results["weighted_river"]["bfs"]["cost"] > preset_results["weighted_river"]["ucs"]["cost"]
    assert preset_results["two_routes"]["ucs"]["cost"] < preset_results["two_routes"]["bfs"]["cost"]
    assert preset_results["loops_arena"]["bfs"]["status"] == "found"
    assert len({result["path"] for result in preset_results["loops_arena"].values() if result["status"] == "found"}) >= 3
    assert len({result["path"] for result in preset_results["perfect_maze"].values() if result["status"] == "found"}) == 1
    assert all(result["status"] == "failed" for result in preset_results["unreachable_goal"].values())

    for seed in range(10):
        maze = generate(type="loops", rows=21, cols=21, weighted=True, loop_fraction=0.25, seed=seed, ensure_solvable_flag=True)
        results = run(maze)
        assert all(result["status"] == "found" for result in results.values())
        assert maze.meta.get("cycles", 0) >= 8
        report(f"loops seed={seed}", maze, results)

    print("Behavior acceptance: PASS")


if __name__ == "__main__":
    main()
