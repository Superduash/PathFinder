"""Tests for Learn lab endpoints and snippet equivalence (polish2.md Phase 9)."""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_walkthrough_all_algorithms():
    for algo in ["bfs", "dfs", "ucs", "greedy", "astar", "bds"]:
        res = client.get(f"/api/learn/walkthrough?algorithm={algo}&scenario=tiny")
        assert res.status_code == 200
        data = res.json()
        assert data["algorithm"] == algo
        assert data["scenario"] == "tiny"
        assert data["total_steps"] > 0
        assert len(data["frames"]) > 0

        first_frame = data["frames"][0]
        assert "step" in first_frame
        assert "checked" in first_frame
        assert "waiting" in first_frame
        assert "note" in first_frame


def test_walkthrough_trap_scenario():
    res = client.get("/api/learn/walkthrough?algorithm=greedy&scenario=trap")
    assert res.status_code == 200
    data = res.json()
    assert data["scenario"] == "trap"
    assert len(data["frames"]) > 0


def test_learn_run_endpoint():
    maze_payload = {
        "rows": 7,
        "cols": 7,
        "cells": [
            1, 1, 1, 1, 1, 1, 1,
            1, 0, 0, 0, 1, 0, 1,
            1, 0, 1, 0, 1, 0, 1,
            1, 0, 1, 0, 0, 0, 1,
            1, 0, 1, 1, 1, 0, 1,
            1, 0, 0, 0, 0, 0, 1,
            1, 1, 1, 1, 1, 1, 1,
        ],
        "start": [1, 1],
        "goal": [5, 5],
        "diagonal": False,
        "weighted": False,
    }

    for algo in ["bfs", "dfs", "ucs", "greedy", "astar", "bds"]:
        res = client.post(
            "/api/learn/run",
            json={
                "snippet": algo,
                "maze": maze_payload,
            },
        )
        assert res.status_code == 200
        body = res.json()
        assert body["same_as_engine"] is True
        assert body["cells_checked"] > 0
        assert body["status"] in ("found", "running", "failed")
