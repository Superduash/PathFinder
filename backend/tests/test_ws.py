import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_websocket_race_session():
    maze_req = client.post("/api/maze/generate", json={
        "rows": 9,
        "cols": 9,
        "type": "empty",
        "randomize_endpoints": False
    })
    maze_data = maze_req.json()

    with client.websocket_connect("/ws/race") as websocket:
        # 1. Ping
        websocket.send_json({"type": "ping"})
        msg = websocket.receive_json()
        assert msg["type"] == "pong"

        # 2. Race init
        websocket.send_json({
            "type": "race.init",
            "raceId": "test_race_1",
            "maze": maze_data,
            "participants": [
                {"algorithm": "bfs"},
                {"algorithm": "astar", "heuristic": "manhattan"}
            ]
        })
        ready_msg = websocket.receive_json()
        assert ready_msg["type"] == "race.ready"
        assert len(ready_msg["participants"]) == 2

        # 3. Race step loop
        done = False
        updates = 0
        while not done and updates < 50:
            websocket.send_json({"type": "race.step", "k": 5})
            update_msg = websocket.receive_json()
            assert update_msg["type"] == "race.update"
            done = update_msg["all_done"]
            updates += 1

        assert done is True
        summary_msg = websocket.receive_json()
        assert summary_msg["type"] == "race.summary"
        assert len(summary_msg["ranking"]) == 2


def test_benchmark_job_lifecycle():
    res = client.post("/api/benchmark/jobs", json={
        "sizes": [{"rows": 10, "cols": 10}],
        "densities": [0.2],
        "types": ["empty"],
        "mazes_per_config": 2,
        "participants": [{"algorithm": "bfs"}],
        "repeats": 1,
    })
    assert res.status_code == 200
    job_info = res.json()
    job_id = job_info["jobId"]

    # Poll until done
    import time
    for _ in range(50):
        time.sleep(0.1)
        status_res = client.get(f"/api/jobs/{job_id}")
        data = status_res.json()
        if data["status"] in ("done", "error"):
            break

    assert data["status"] == "done"
    assert "summary" in data["result"]
    assert len(data["result"]["rows"]) == 2


def test_ml_status_endpoint():
    res = client.get("/api/ml/status")
    assert res.status_code == 200
    data = res.json()
    assert "regression" in data
    assert "classification" in data

