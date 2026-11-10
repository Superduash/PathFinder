import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "bfs" in data["algorithms"]


def test_api_meta():
    res = client.get("/api/meta")
    assert res.status_code == 200
    data = res.json()
    assert len(data["algorithms"]) == 5
    assert "manhattan" in data["heuristics"]
    assert "backtracker" in data["generators"]


def test_api_generate_and_solve():
    # 1. Generate
    gen_res = client.post("/api/maze/generate", json={
        "rows": 10,
        "cols": 10,
        "type": "empty",
        "randomize_endpoints": False
    })
    assert gen_res.status_code == 200
    maze_data = gen_res.json()

    # 2. Solve with BFS
    solve_res = client.post("/api/solve", json={
        "maze": maze_data,
        "algorithm": "bfs",
        "include_trace": True
    })
    assert solve_res.status_code == 200
    result = solve_res.json()
    assert result["status"] == "found"
    assert result["path_cost"] == 18.0  # (0,0) to (9,9) in 10x10 empty grid: 9 down + 9 right = 18 steps
    assert result["optimality"] == 1.0
    assert len(result["trace"]) > 0


def test_api_compare():
    gen_res = client.post("/api/maze/generate", json={
        "rows": 10,
        "cols": 10,
        "type": "empty",
        "randomize_endpoints": False
    })
    maze_data = gen_res.json()

    compare_res = client.post("/api/compare", json={
        "maze": maze_data,
        "participants": [
            {"algorithm": "bfs"},
            {"algorithm": "astar", "heuristic": "manhattan"}
        ],
        "repeats": 2
    })
    assert compare_res.status_code == 200
    data = compare_res.json()
    assert len(data["results"]) == 2
    assert "environment" in data
    assert data["results"][0]["timing"]["median_ms"] >= 0.0


def test_api_error_envelope():
    # Out of bounds request should return ApiError envelope
    res = client.post("/api/solve", json={
        "maze": {
            "rows": 5,
            "cols": 5,
            "cells": [0]*25,
            "start": [10, 10],  # Out of bounds
            "goal": [0, 0],
            "diagonal": False
        },
        "algorithm": "bfs"
    })
    assert res.status_code == 400
    data = res.json()
    assert "error" in data
    assert data["error"]["code"] == "OUT_OF_BOUNDS"

