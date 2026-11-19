"""The classifier label and the live /predict 'actual winner' must use the same rule."""
import time
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.maze.generators import generate
from backend.app.ml.classification import pick_winner, CANDIDATES
from backend.app.search.algorithms import create_search
from backend.app.search.reference import dijkstra_optimal_cost


def test_winner_path_is_within_tolerance_of_optimal():
    for seed in range(30):
        maze = generate(type="loops", rows=21, cols=21, weighted=True, seed=seed)
        name = pick_winner(maze, 0.05)
        assert name in {c["name"] for c in CANDIDATES}
        cand = next(c for c in CANDIDATES if c["name"] == name)
        s = create_search(cand["algorithm"], maze, heuristic=cand["heuristic"])
        s.run_to_completion()
        assert s.path_cost <= dijkstra_optimal_cost(maze) * 1.05 + 1e-9


def test_predict_route_uses_same_winner_rule():
    with TestClient(app) as c:
        job = c.post("/api/ml/classification/train", json={"n_mazes": 100, "seed": 1}).json()
        for _ in range(100):
            st = c.get(f"/api/jobs/{job['jobId']}").json()
            if st["status"] in ("done", "error", "cancelled"):
                break
            time.sleep(0.1)
        assert st["status"] == "done"
        maze = c.post("/api/maze/generate", json={"seed": 9}).json()
        res = c.post("/api/ml/classification/predict", json={"maze": maze, "run_actual": True}).json()
        from backend.app.maze.grid import MazeGrid
        from backend.app.models import Maze
        grid = MazeGrid.from_model(Maze(**maze))
        assert res["actual_winner"] == pick_winner(grid, 0.05)
