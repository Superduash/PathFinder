"""Tests for Phases 0 to 3: Error envelopes, DB persistence, Library, History, Settings, WS auto-record."""
import os
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.base import init_db, session_scope
from backend.app.db import repo
from backend.app.maze.generators import generate

client = TestClient(app)


@pytest.fixture(autouse=True)
def ensure_db():
    init_db()


def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["version"] == "1.0.0"
    assert data["db"] == "ok"
    assert "python" in data and len(data["python"]) > 0
    assert "uptime_s" in data


def test_error_envelope_validation():
    # Send invalid body to generate
    res = client.post("/api/maze/generate", json={"rows": "not-an-int"})
    assert res.status_code == 422
    data = res.json()
    assert "error" in data
    assert data["error"]["code"] == "INVALID_REQUEST"
    assert "details" in data["error"]


def test_library_crud_and_svg_thumbnail():
    maze = generate(type="backtracker", rows=11, cols=11, seed=42)

    # 1. Save maze
    res = client.post(
        "/api/library/mazes",
        json={"name": "Test Maze 11x11", "maze": maze.to_dict(), "tags": "demo,test"}
    )
    assert res.status_code == 201
    item = res.json()
    maze_id = item["id"]
    assert item["name"] == "Test Maze 11x11"
    assert item["rows"] == 11
    assert item["cols"] == 11
    assert item["thumb_url"] == f"/api/library/mazes/{maze_id}/thumb"

    # 2. List mazes
    list_res = client.get("/api/library/mazes")
    assert list_res.status_code == 200
    mazes = list_res.json()["mazes"]
    assert any(m["id"] == maze_id for m in mazes)

    # 3. Get maze by ID
    get_res = client.get(f"/api/library/mazes/{maze_id}")
    assert get_res.status_code == 200
    detail = get_res.json()
    assert detail["name"] == "Test Maze 11x11"
    assert detail["maze"]["rows"] == 11

    # 4. Get thumbnail SVG
    thumb_res = client.get(f"/api/library/mazes/{maze_id}/thumb")
    assert thumb_res.status_code == 200
    assert "image/svg+xml" in thumb_res.headers["content-type"]
    assert "<svg" in thumb_res.text and "</svg>" in thumb_res.text

    # 5. Patch maze
    patch_res = client.patch(
        f"/api/library/mazes/{maze_id}",
        json={"name": "Renamed Maze", "tags": "updated"}
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["name"] == "Renamed Maze"

    # 6. Delete maze
    del_res = client.delete(f"/api/library/mazes/{maze_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "ok"

    # Verify 404 after delete
    assert client.get(f"/api/library/mazes/{maze_id}").status_code == 404


def test_settings_endpoints():
    # 1. GET default settings
    get_res = client.get("/api/settings")
    assert get_res.status_code == 200
    data = get_res.json()
    assert "speed_level" in data
    assert "narrate" in data
    assert "theme" in data

    # 2. PUT update settings
    put_res = client.put(
        "/api/settings",
        json={"speed_level": 4, "narrate": False, "theme": "light"}
    )
    assert put_res.status_code == 200
    updated = put_res.json()
    assert updated["speed_level"] == 4
    assert updated["narrate"] is False
    assert updated["theme"] == "light"

    # 3. PUT invalid speed_level
    invalid_res = client.put("/api/settings", json={"speed_level": 99})
    assert invalid_res.status_code == 400
    assert invalid_res.json()["error"]["code"] == "INVALID_REQUEST"


def test_history_endpoints_and_auto_record():
    maze = generate(type="backtracker", rows=9, cols=9, seed=123)

    # Simulate race WebSocket completion
    with client.websocket_connect("/ws/race") as ws:
        ws.send_json({
            "type": "race.init",
            "raceId": "test_hist_race",
            "maze": maze.to_dict(),
            "participants": [{"algorithm": "bfs"}, {"algorithm": "astar", "heuristic": "manhattan"}],
            "k": 50,
        })
        ready = ws.receive_json()
        assert ready["type"] == "race.ready"

        # Step until done
        all_done = False
        while not all_done:
            ws.send_json({"type": "race.step", "k": 50})
            upd = ws.receive_json()
            if upd.get("all_done"):
                all_done = True
                summary = ws.receive_json()
                assert summary["type"] == "race.summary"

    # Now verify it was recorded in history
    hist_res = client.get("/api/history/races")
    assert hist_res.status_code == 200
    races = hist_res.json()["races"]
    assert len(races) > 0
    latest_id = races[0]["id"]

    # Verify detail
    detail_res = client.get(f"/api/history/races/{latest_id}")
    assert detail_res.status_code == 200
    assert "maze" in detail_res.json()
    assert "participants" in detail_res.json()

    # Clear history without confirm
    no_confirm_res = client.delete("/api/history/races")
    assert no_confirm_res.status_code == 400

    # Clear history with confirm
    confirm_res = client.delete("/api/history/races?confirm=true")
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "ok"


def test_openapi_endpoints_registered():
    res = client.get("/openapi.json")
    assert res.status_code == 200
    schema = res.json()
    paths = schema.get("paths", {})

    expected_paths = [
        "/api/health",
        "/api/meta",
        "/api/maze/generate",
        "/api/maze/preset",
        "/api/maze/randomize-endpoints",
        "/api/maze/validate",
        "/api/solve",
        "/api/compare",
        "/api/benchmark/jobs",
        "/api/jobs/{job_id}",
        "/api/jobs/{job_id}/cancel",
        "/api/ml/regression/jobs",
        "/api/ml/regression/astar-compare",
        "/api/ml/classification/jobs",
        "/api/ml/classification/predict",
        "/api/library/mazes",
        "/api/library/mazes/{maze_id}",
        "/api/library/mazes/{maze_id}/thumb",
        "/api/history/races",
        "/api/history/races/{history_id}",
        "/api/settings",
    ]

    for p in expected_paths:
        assert p in paths, f"Path '{p}' missing from OpenAPI schema"

