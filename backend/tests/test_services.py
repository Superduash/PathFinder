"""Comprehensive tests for Phases 4 to 7: Benchmark persistence, ML registry, WS narration/current/insights, and Meta glossary/presets."""
import time
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.base import init_db
from backend.app.maze.generators import generate

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


# ---------------------------------------------------------------------------
# Phase 4 Tests
# ---------------------------------------------------------------------------

def test_benchmark_estimate():
    cfg = {
        "sizes": [{"rows": 15, "cols": 15}, {"rows": 25, "cols": 25}],
        "densities": [0.2, 0.3],
        "types": ["backtracker"],
        "mazes_per_config": 3,
        "participants": [{"algorithm": "bfs"}, {"algorithm": "astar", "heuristic": "manhattan"}],
        "repeats": 2,
    }
    res = client.post("/api/benchmark/estimate", json=cfg)
    assert res.status_code == 200
    data = res.json()
    assert data["mazes_total"] == 2 * 2 * 1 * 3  # 12
    assert data["runs_total"] == 12 * 2 * 2  # 48
    assert data["est_seconds_low"] > 0
    assert data["est_seconds_high"] >= data["est_seconds_low"]
    assert data["too_large"] is False


def test_benchmark_persistence_and_paging():
    cfg = {
        "sizes": [{"rows": 10, "cols": 10}],
        "densities": [0.2],
        "types": ["backtracker"],
        "mazes_per_config": 2,
        "participants": [{"algorithm": "bfs"}, {"algorithm": "astar", "heuristic": "manhattan"}],
        "repeats": 1,
        "base_seed": 42,
    }

    # 1. Start benchmark job
    start_res = client.post("/api/benchmark/jobs", json=cfg)
    assert start_res.status_code == 200
    job_id = start_res.json()["jobId"]

    # 2. Poll until completed
    done = False
    for _ in range(50):
        time.sleep(0.1)
        st = client.get(f"/api/jobs/{job_id}").json()
        if st["status"] in ("done", "error", "cancelled"):
            done = True
            assert st["status"] == "done"
            break
    assert done, "Benchmark job did not finish in time"

    # 3. Check benchmark runs list
    runs_res = client.get("/api/benchmark/runs")
    assert runs_res.status_code == 200
    runs = runs_res.json()["runs"]
    assert len(runs) > 0
    latest_run = runs[0]
    run_id = latest_run["id"]

    # 4. Check benchmark run details and insights
    detail_res = client.get(f"/api/benchmark/runs/{run_id}")
    assert detail_res.status_code == 200
    run_detail = detail_res.json()
    assert "summary" in run_detail
    assert "insights" in run_detail
    assert isinstance(run_detail["insights"], list)

    # 5. Check paged rows
    rows_res = client.get(f"/api/benchmark/runs/{run_id}/rows?page=1&page_size=10&sort=expanded&dir=asc")
    assert rows_res.status_code == 200
    rows_data = rows_res.json()
    assert "rows" in rows_data
    assert len(rows_data["rows"]) > 0

    # 6. Download summary CSV
    csv_res = client.get(f"/api/benchmark/runs/{run_id}/csv?table=summary")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "algorithm" in csv_res.text

    # 7. Delete run
    del_res = client.delete(f"/api/benchmark/runs/{run_id}")
    assert del_res.status_code == 200


# ---------------------------------------------------------------------------
# Phase 5 Tests: ML Registry & Explanations
# ---------------------------------------------------------------------------

def test_ml_training_registry_and_persistence():
    # 1. Train quick regression model
    reg_cfg = {"name": "Test Regression Heuristic", "n_mazes": 15, "samples_per_maze": 4, "seed": 42}
    reg_job_res = client.post("/api/ml/regression/jobs", json=reg_cfg)
    assert reg_job_res.status_code == 200
    reg_job_id = reg_job_res.json()["jobId"]

    # Poll regression job
    done = False
    for _ in range(60):
        time.sleep(0.1)
        st = client.get(f"/api/jobs/{reg_job_id}").json()
        if st["status"] in ("done", "error", "cancelled"):
            done = True
            assert st["status"] == "done"
            break
    assert done, "Regression training did not finish in time"

    # 2. Check ML Status
    status_res = client.get("/api/ml/status")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["regression"] is not None
    assert status_data["regression"]["name"] == "Test Regression Heuristic"
    assert "explanations" in status_data["regression"]["metrics"]

    # 3. List ML models
    models_res = client.get("/api/ml/models?kind=regression")
    assert models_res.status_code == 200
    model_list = models_res.json()["models"]
    assert len(model_list) > 0
    model_id = model_list[0]["id"]

    # 4. Run A* compare on a test maze using active model
    test_maze = generate(type="backtracker", rows=11, cols=11, seed=99)
    compare_res = client.post(
        "/api/ml/regression/astar-compare",
        json={"maze": test_maze.to_dict(), "model": "linear"}
    )
    assert compare_res.status_code == 200
    comp_data = compare_res.json()
    assert "standard_astar" in comp_data
    assert "learned_astar" in comp_data
    assert "heatmap" in comp_data


# ---------------------------------------------------------------------------
# Phase 6 Tests: Race WebSocket (current, narration, insights, robustness)
# ---------------------------------------------------------------------------

def test_race_websocket_enhanced_features():
    maze = generate(type="backtracker", rows=9, cols=9, seed=77)

    with client.websocket_connect("/ws/race") as ws:
        # 1. race.init with narration option
        ws.send_json({
            "type": "race.init",
            "raceId": "enhanced_race_1",
            "maze": maze.to_dict(),
            "participants": [{"algorithm": "bfs"}, {"algorithm": "astar", "heuristic": "manhattan"}],
            "options": {"narrate": True},
        })
        ready = ws.receive_json()
        assert ready["type"] == "race.ready"
        assert ready["reachable"] is True
        assert "racers_meta" in ready
        assert len(ready["racers_meta"]) == 2

        # 2. Test invalid expansions step
        ws.send_json({"type": "race.step", "k": 9999})
        err = ws.receive_json()
        assert err["type"] == "error"
        assert err["code"] == "INVALID_REQUEST"

        # 3. Step forward and verify current, note, and ms_since_start
        ws.send_json({"type": "race.step", "k": 5})
        upd = ws.receive_json()
        assert upd["type"] == "race.update"
        assert "ms_since_start" in upd
        p0 = upd["participants"][0]
        assert "current" in p0
        assert "note" in p0

        # Step until finish
        all_done = False
        summary = None
        while not all_done:
            ws.send_json({"type": "race.step", "k": 50})
            msg = ws.receive_json()
            if msg.get("all_done"):
                all_done = True
                summary = ws.receive_json()

        assert summary is not None
        assert summary["type"] == "race.summary"
        assert "insights" in summary
        assert "winner_reason" in summary
        assert summary["reachable"] is True

        # 4. Stepping after finish returns ILLEGAL_STATE
        ws.send_json({"type": "race.step", "k": 5})
        finished_err = ws.receive_json()
        assert finished_err["type"] == "error"
        assert finished_err["code"] == "ILLEGAL_STATE"

        # 5. race.reset is idempotent
        ws.send_json({"type": "race.reset"})
        reset_res = ws.receive_json()
        assert reset_res["type"] == "race.reset_ok"


# ---------------------------------------------------------------------------
# Phase 7 Tests: Meta Route (Glossary, Presets, Speeds, Shapes)
# ---------------------------------------------------------------------------

def test_meta_route_enrichments():
    res = client.get("/api/meta")
    assert res.status_code == 200
    meta = res.json()

    # Presets
    assert len(meta["presets"]) >= 5
    assert "difficulty" in meta["presets"][0]
    assert "description" in meta["presets"][0]

    # Algorithms
    algos = meta["algorithms"]
    assert len(algos) == 6
    assert "plain" in algos[0]
    assert "shape" in algos[0]
    assert "color_key" in algos[0]

    # Glossary
    assert "glossary" in meta
    assert len(meta["glossary"]) >= 10
    assert "term" in meta["glossary"][0]
    assert "plain" in meta["glossary"][0]
    assert "technical" in meta["glossary"][0]

    # Speed levels
    assert "speed_levels" in meta
    assert len(meta["speed_levels"]) == 5
    assert meta["speed_levels"][2]["label"] == "Relaxed"
    assert meta["speed_levels"][2]["k"] == 5

