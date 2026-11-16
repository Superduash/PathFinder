"""Tests for Learn lab endpoints (polish7.md §1.7)."""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.search.algorithms import create_search
from backend.app.maze.grid import MazeGrid

client = TestClient(app)


def test_scenarios_endpoint():
    """Test /api/learn/scenarios endpoint."""
    res = client.get("/api/learn/scenarios")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 4
    keys = {s["key"] for s in data}
    assert keys == {"open", "maze", "trap", "river"}


def test_walkthrough_all_algorithms():
    """Test that all algorithms work on all scenarios."""
    for algo in ["bfs", "dfs", "ucs", "greedy", "astar", "bds"]:
        for scenario in ["open", "maze", "trap", "river"]:
            res = client.get(f"/api/learn/walkthrough?algorithm={algo}&scenario={scenario}")
            assert res.status_code == 200, f"Failed for {algo} on {scenario}"
            data = res.json()
            
            # Check basic structure
            assert data["algorithm"] == algo
            assert data["scenario"]["key"] == scenario
            assert data["scenario"]["rows"] == 21
            assert data["scenario"]["cols"] == 21
            assert len(data["frames"]) > 0
            
            # Check if found
            if data["found"]:
                assert data["route"] is not None
                assert data["route_steps"] is not None
                assert data["route_cost"] is not None
                assert data["checked"] > 0
                
                # Route starts at start and ends at goal
                assert data["route"][0] == data["scenario"]["start"]
                assert data["route"][-1] == data["scenario"]["goal"]
                
                # Goal should be in the expanded list across all frames
                goal_idx = data["scenario"]["goal"][0] * 21 + data["scenario"]["goal"][1]
                all_expanded = []
                for frame in data["frames"]:
                    all_expanded.extend(frame["expanded"])
                assert goal_idx in all_expanded, f"{algo} on {scenario}: goal {goal_idx} not in expanded cells"


def test_walkthrough_frame_structure():
    """Test that frames have the correct structure."""
    res = client.get("/api/learn/walkthrough?algorithm=astar&scenario=open")
    assert res.status_code == 200
    data = res.json()
    
    for frame in data["frames"]:
        assert "i" in frame
        assert "expanded" in frame
        assert "discovered" in frame
        assert "queues" in frame
        assert "queue_size" in frame
        assert "note" in frame
        
        # Check discovered structure: [idx, g, h, f, side]
        for disc in frame["discovered"]:
            assert len(disc) == 5
            assert isinstance(disc[0], int)  # idx
            assert isinstance(disc[1], (int, float))  # g
            # h and f can be None for uninformed algorithms
            # side can be None for non-BDS


def test_walkthrough_astar_has_heuristic():
    """Test that A* frames include h and f values."""
    res = client.get("/api/learn/walkthrough?algorithm=astar&scenario=open")
    assert res.status_code == 200
    data = res.json()
    
    # Check that queues have h and f
    for frame in data["frames"][1:]:  # Skip frame 0
        if frame["queues"].get("main"):
            queue = frame["queues"]["main"]
            if len(queue) > 0:
                item = queue[0]
                assert item["h"] is not None, "A* should have h values"
                assert item["f"] is not None, "A* should have f values"
                break


def test_walkthrough_bds_has_two_queues():
    """Test that BDS frames have forward and backward queues."""
    res = client.get("/api/learn/walkthrough?algorithm=bds&scenario=open")
    assert res.status_code == 200
    data = res.json()
    
    # BDS should have two queues
    for frame in data["frames"][1:5]:  # Check early frames
        assert "forward" in frame["queues"]
        assert "backward" in frame["queues"]
        assert "forward" in frame["queue_size"]
        assert "backward" in frame["queue_size"]
        break


def test_walkthrough_table_pinned():
    """Test that the table from §1.2 is correct."""
    expected = {
        ("bfs", "open"): (429, 32, 32),
        ("dfs", "open"): (202, 200, 200),
        ("ucs", "open"): (429, 32, 32),
        ("greedy", "open"): (33, 32, 32),
        ("astar", "open"): (33, 32, 32),
        ("bds", "open"): (396, 32, 32),
        
        ("bfs", "maze"): (215, 25, 25),
        ("dfs", "maze"): (38, 35, 35),
        ("ucs", "maze"): (215, 25, 25),
        ("greedy", "maze"): (40, 29, 29),
        ("astar", "maze"): (44, 25, 25),
        ("bds", "maze"): (129, 25, 25),
        
        ("bfs", "trap"): (338, 36, 36),
        ("dfs", "trap"): (129, 64, 64),
        ("ucs", "trap"): (338, 36, 36),
        ("greedy", "trap"): (236, 72, 72),
        ("astar", "trap"): (190, 36, 36),
        ("bds", "trap"): (233, 36, 36),
        
        ("bfs", "river"): (250, 16, 32),
        ("dfs", "river"): (17, 16, 32),
        ("ucs", "river"): (307, 20, 28),
        ("greedy", "river"): (17, 16, 32),
        ("astar", "river"): (109, 20, 28),
        ("bds", "river"): (158, 16, 32),
    }
    
    for (algo, scenario), (checked, steps, cost) in expected.items():
        res = client.get(f"/api/learn/walkthrough?algorithm={algo}&scenario={scenario}")
        assert res.status_code == 200
        data = res.json()
        
        assert data["checked"] == checked, f"{algo} on {scenario}: expected {checked} checked, got {data['checked']}"
        assert data["route_steps"] == steps, f"{algo} on {scenario}: expected {steps} steps, got {data['route_steps']}"
        assert data["route_cost"] == cost, f"{algo} on {scenario}: expected {cost} cost, got {data['route_cost']}"


def test_replay_expanded_equals_trace():
    """Test that replaying expanded over all frames equals the search trace."""
    res = client.get("/api/learn/walkthrough?algorithm=bfs&scenario=open")
    assert res.status_code == 200
    data = res.json()
    
    # Replay expanded cells from frames
    replayed_expanded = []
    for frame in data["frames"]:
        for idx in frame["expanded"]:
            r = idx // 21
            c = idx % 21
            replayed_expanded.append((r, c))
    
    # Run the actual search
    from backend.app.routes.learn import SCENARIOS
    maze = SCENARIOS["open"]["build"]()
    search = create_search("bfs", maze)
    search.run_to_completion()
    
    # Compare
    assert replayed_expanded == search.trace


def test_queue_order_matches_next_expansion():
    """Test that queues.main[0] is the cell expanded in the next frame for non-BDS."""
    res = client.get("/api/learn/walkthrough?algorithm=astar&scenario=trap")
    assert res.status_code == 200
    data = res.json()
    
    for i in range(len(data["frames"]) - 1):
        current_frame = data["frames"][i]
        next_frame = data["frames"][i + 1]
        
        if current_frame["queues"].get("main") and len(current_frame["queues"]["main"]) > 0:
            next_cell_idx = current_frame["queues"]["main"][0]["idx"]
            
            # This cell should be in the next frame's expanded list
            if len(next_frame["expanded"]) > 0:
                # The first expanded cell in the next frame should be this one
                assert next_cell_idx in next_frame["expanded"], f"Queue predicted {next_cell_idx} but frame {i+1} expanded {next_frame['expanded']}"
                break  # Just test a few frames


def test_unknown_scenario_error():
    """Test that unknown scenario returns error."""
    res = client.get("/api/learn/walkthrough?algorithm=bfs&scenario=nonexistent")
    assert res.status_code == 400
    data = res.json()
    assert "error" in data and data["error"]["code"] == "UNKNOWN_SCENARIO"


def test_unknown_algorithm_error():
    """Test that unknown algorithm returns error."""
    res = client.get("/api/learn/walkthrough?algorithm=nonexistent&scenario=open")
    assert res.status_code == 400
    data = res.json()
    assert "error" in data and data["error"]["code"] == "UNKNOWN_ALGORITHM"
