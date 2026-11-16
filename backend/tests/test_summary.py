"""Tests for race summary scoring and snippet equivalence (polish7.md §1.7)."""
import sys
from pathlib import Path
import pytest
from backend.app.race import RaceSession
from backend.app.maze.grid import MazeGrid
from backend.app.maze.generators import generate
from backend.app.search.algorithms import create_search
from backend.app.routes.learn import SCENARIOS

# Add snippets directory to path for snippet tests
SNIPPETS_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "src" / "content" / "snippets"
if str(SNIPPETS_DIR) not in sys.path:
    sys.path.append(str(SNIPPETS_DIR))

import bfs as snippet_bfs
import dfs as snippet_dfs
import ucs as snippet_ucs
import greedy as snippet_greedy
import astar as snippet_astar
import bds as snippet_bds


def test_trap_race_summary():
    """Test race summary on trap scenario with all six racers."""
    maze = SCENARIOS["trap"]["build"]()
    participants = [
        {"algorithm": "bfs"},
        {"algorithm": "dfs"},
        {"algorithm": "ucs"},
        {"algorithm": "greedy", "heuristic": "manhattan"},
        {"algorithm": "astar", "heuristic": "manhattan"},
        {"algorithm": "bds"},
    ]
    session = RaceSession("test_trap_race", maze, participants)
    while not session.finished:
        session.step(50)

    summary = session.get_summary_message()
    astar_id = [p["id"] for p in summary.results if p["algorithm"] == "astar"][0]
    
    # Best overall is A* (not Greedy, not DFS)
    assert summary.awards["best_overall"]["id"] == astar_id
    assert "ASTAR" in summary.winner_reason

    # No key named 'score' exists in results or summary
    dumped = summary.model_dump()
    def check_no_score(obj):
        if isinstance(obj, dict):
            assert "score" not in obj
            assert "quality_score" not in obj
            assert "speed_score" not in obj
            assert "efficiency_score" not in obj
            for v in obj.values():
                check_no_score(v)
        elif isinstance(obj, list):
            for v in obj:
                check_no_score(v)
    check_no_score(dumped)

    # Every found result has non-null route_cost, route_steps, quality
    for r in summary.results:
        if r["status"] == "found":
            assert r["route_cost"] is not None
            assert r["route_steps"] is not None
            assert r["quality"] is not None

    # DFS ranks below every shortest-route racer
    dfs_res = [r for r in summary.results if r["algorithm"] == "dfs"][0]
    shortest_racers = [r for r in summary.results if r["quality"] is not None and r["quality"] >= 1 - 1e-9]
    for sr in shortest_racers:
        assert dfs_res["rank"] > sr["rank"]


def test_unreachable_race_summary():
    """Test race summary on unreachable maze."""
    cells = [0] * 25
    for r in range(5):
        cells[r * 5 + 2] = 1  # wall in middle
    maze = MazeGrid(rows=5, cols=5, cells=cells, start=(2, 0), goal=(2, 4), diagonal=False)

    session = RaceSession(
        "unreachable_race",
        maze,
        [{"algorithm": "bfs"}, {"algorithm": "astar", "heuristic": "manhattan"}],
    )
    while not session.finished:
        session.step(50)

    summary = session.get_summary_message()
    assert summary.awards["best_overall"]["id"] is None
    assert summary.awards["best_overall"]["reason"] == "No route exists."
    assert all(r["status"] == "failed" for r in summary.results)


def test_snippets_equal_engine_120_mazes():
    """Snippets equal the engine on 120 mazes (route and cells checked; BDS route steps)."""
    maze_types = ["backtracker", "loops", "empty", "random"]
    total_mazes = 120
    for i in range(total_mazes):
        mtype = maze_types[i % len(maze_types)]
        seed = i * 7 + 3
        m = generate(mtype, rows=11, cols=11, seed=seed)
        grid_2d = [[m.cells[r * m.cols + c] for c in range(m.cols)] for r in range(m.rows)]

        # BFS
        r_snip, c_snip = snippet_bfs.bfs(grid_2d, m.start, m.goal)
        s_eng = create_search("bfs", m).run_to_completion()
        assert r_snip == s_eng.path
        assert c_snip == s_eng.expanded_count

        # DFS
        r_snip, c_snip = snippet_dfs.dfs(grid_2d, m.start, m.goal)
        s_eng = create_search("dfs", m).run_to_completion()
        assert r_snip == s_eng.path
        assert c_snip == s_eng.expanded_count

        # UCS
        r_snip, c_snip = snippet_ucs.ucs(grid_2d, m.start, m.goal)
        s_eng = create_search("ucs", m).run_to_completion()
        assert r_snip == s_eng.path
        assert c_snip == s_eng.expanded_count

        # Greedy
        r_snip, c_snip = snippet_greedy.greedy(grid_2d, m.start, m.goal)
        s_eng = create_search("greedy", m, heuristic="manhattan").run_to_completion()
        assert r_snip == s_eng.path
        assert c_snip == s_eng.expanded_count

        # A*
        r_snip, c_snip = snippet_astar.astar(grid_2d, m.start, m.goal)
        s_eng = create_search("astar", m, heuristic="manhattan").run_to_completion()
        assert r_snip == s_eng.path
        assert c_snip == s_eng.expanded_count

        # BDS
        r_snip, c_snip = snippet_bds.bds(grid_2d, m.start, m.goal)
        s_eng = create_search("bds", m).run_to_completion()
        if r_snip:
            assert len(r_snip) - 1 == s_eng.path_length
