import pytest
from backend.app.maze.grid import MazeGrid
from backend.app.maze.generators import generate, empty, random_maze, backtracker, braided
from backend.app.maze.presets import load_preset, PRESETS
from backend.app.search.algorithms import create_search, BFS, DFS, UCS, Greedy, AStar
from backend.app.search.reference import dijkstra_optimal_cost, validate_path, compute_optimality
from backend.app.errors import ApiError, START_IS_WALL, GOAL_IS_WALL, OUT_OF_BOUNDS


def test_maze_validation():
    # Valid empty maze
    m = empty(5, 5)
    m.validate()

    # Out of bounds start
    bad = MazeGrid(rows=5, cols=5, cells=[0]*25, start=(-1, 0), goal=(4, 4))
    with pytest.raises(ApiError) as exc:
        bad.validate()
    assert exc.value.code == OUT_OF_BOUNDS

    # Wall at start
    cells = [0]*25
    cells[0] = 1
    bad_wall = MazeGrid(rows=5, cols=5, cells=cells, start=(0, 0), goal=(4, 4))
    with pytest.raises(ApiError) as exc:
        bad_wall.validate()
    assert exc.value.code == START_IS_WALL


def test_generators_produce_valid_mazes():
    for gen_type in ["empty", "random", "backtracker", "braided", "weighted"]:
        m = generate(type=gen_type, rows=15, cols=15, seed=123, randomize_endpoints_flag=False)
        m.validate()
        assert m.cell(*m.start) != 1
        assert m.cell(*m.goal) != 1


def test_presets_produce_valid_mazes():
    for name in PRESETS.keys():
        m = load_preset(name)
        m.validate()
        assert m.cell(*m.start) != 1
        assert m.cell(*m.goal) != 1


def test_algorithm_agreement_on_unweighted_maze():
    """BFS, UCS, and A* with admissible heuristic should yield identical optimal cost on unweighted grid."""
    # Use backtracker or open maze to ensure reachability
    m = generate(type="empty", rows=12, cols=12, weighted=False, seed=42, randomize_endpoints_flag=False)
    m.start = (0, 0)
    m.goal = (11, 11)

    c_star = dijkstra_optimal_cost(m)
    assert c_star is not None

    bfs = create_search("bfs", m)
    bfs.run_to_completion()
    assert bfs.status == "found"
    assert bfs.path is not None
    valid_bfs, cost_bfs = validate_path(m, bfs.path)
    assert valid_bfs
    assert cost_bfs == c_star

    ucs = create_search("ucs", m)
    ucs.run_to_completion()
    assert ucs.status == "found"
    valid_ucs, cost_ucs = validate_path(m, ucs.path)
    assert valid_ucs
    assert cost_ucs == c_star

    astar = create_search("astar", m, heuristic="manhattan")
    astar.run_to_completion()
    assert astar.status == "found"
    valid_astar, cost_astar = validate_path(m, astar.path)
    assert valid_astar
    assert cost_astar == c_star


def test_dfs_non_optimality():
    """DFS cost must be >= optimal cost."""
    m = generate(type="empty", rows=10, cols=10, seed=1, randomize_endpoints_flag=False)
    m.start = (0, 0)
    m.goal = (9, 9)
    c_star = dijkstra_optimal_cost(m)

    dfs = create_search("dfs", m)
    dfs.run_to_completion()
    assert dfs.status == "found"
    valid, cost = validate_path(m, dfs.path)
    assert valid
    assert cost >= c_star


def test_unreachable_goal():
    m = load_preset("unreachable_goal")
    for alg in ["bfs", "dfs", "ucs", "greedy", "astar"]:
        s = create_search(alg, m)
        s.run_to_completion()
        assert s.status == "failed"
        assert s.reason == "no_path"
        assert s.path is None


def test_start_equals_goal():
    m = empty(5, 5)
    m.start = (2, 2)
    m.goal = (2, 2)
    c_star = dijkstra_optimal_cost(m)
    assert c_star == 0.0

    for alg in ["bfs", "dfs", "ucs", "greedy", "astar"]:
        s = create_search(alg, m)
        s.run_to_completion()
        assert s.status == "found"
        assert s.path == [(2, 2)]
        assert s.path_cost == 0.0
        assert compute_optimality(c_star, s.path_cost) == 1.0


def test_stepwise_incremental_expansion():
    """Verify that calling step() one by one matches run_to_completion."""
    m = generate(type="backtracker", rows=9, cols=9, seed=123, randomize_endpoints_flag=False)
    m.start = (1, 1)
    m.goal = (7, 7)

    s1 = create_search("astar", m, heuristic="manhattan")
    s1.run_to_completion()

    s2 = create_search("astar", m, heuristic="manhattan")
    steps = 0
    while not s2.step():
        steps += 1
        assert len(s2.delta_expanded) == 1
        if steps > 500:
            break

    assert s1.status == s2.status
    assert s1.path == s2.path
    assert s1.expanded_count == s2.expanded_count
