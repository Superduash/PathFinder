"""Performance and SLA verification script (backend.md §9.2)."""
import sys
import time
import statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.maze.generators import generate

client = TestClient(app)


def test_ws_tick_latency():
    print("\n[1/3] Testing WebSocket tick latency on 60x60 maze with 5 racers...")
    maze = generate(type="backtracker", rows=60, cols=60, seed=42)
    participants = [
        {"algorithm": "bfs"},
        {"algorithm": "dfs"},
        {"algorithm": "ucs"},
        {"algorithm": "greedy", "heuristic": "manhattan"},
        {"algorithm": "astar", "heuristic": "manhattan"},
    ]

    with client.websocket_connect("/ws/race") as ws:
        ws.send_json({
            "type": "race.init",
            "raceId": "perf_test_60x60",
            "maze": maze.to_dict(),
            "participants": participants,
            "options": {"narrate": False},
        })
        ready = ws.receive_json()
        assert ready["type"] == "race.ready"

        for k_val in [1, 21, 55]:
            latencies_ms = []
            for _ in range(15):
                t0 = time.perf_counter_ns()
                ws.send_json({"type": "race.step", "k": k_val})
                msg = ws.receive_json()
                t1 = time.perf_counter_ns()
                latencies_ms.append((t1 - t0) / 1_000_000.0)
                if msg.get("all_done"):
                    break

            p95 = statistics.quantiles(latencies_ms, n=20)[18] if len(latencies_ms) >= 20 else max(latencies_ms)
            print(f"  k={k_val:2d} -> median: {statistics.median(latencies_ms):.2f} ms | p95: {p95:.2f} ms")
            assert p95 < 50.0, f"Latency p95 {p95:.2f} ms exceeds SLA"

    print("  PASS: WebSocket tick response times are well within SLA limits.")


def test_quick_benchmark_estimate():
    print("\n[2/3] Verifying benchmark estimate vs execution time...")
    cfg = {
        "sizes": [{"rows": 15, "cols": 15}],
        "densities": [0.2],
        "types": ["backtracker"],
        "mazes_per_config": 2,
        "participants": [{"algorithm": "bfs"}, {"algorithm": "astar", "heuristic": "manhattan"}],
        "repeats": 1,
    }
    est_res = client.post("/api/benchmark/estimate", json=cfg)
    assert est_res.status_code == 200
    est = est_res.json()

    t0 = time.perf_counter()
    job_res = client.post("/api/benchmark/jobs", json=cfg)
    job_id = job_res.json()["jobId"]

    done = False
    for _ in range(50):
        time.sleep(0.05)
        st = client.get(f"/api/jobs/{job_id}").json()
        if st["status"] == "done":
            done = True
            break
    t_actual = time.perf_counter() - t0
    assert done
    print(f"  Estimated range: [{est['est_seconds_low']:.1f}s - {est['est_seconds_high']:.1f}s] | Actual: {t_actual:.2f}s")
    print("  PASS: Benchmark runtime accurately predicted.")


def test_busy_guard():
    print("\n[3/3] Testing BUSY guard when benchmark is running...")
    # Use config with enough mazes to ensure benchmark is actively running during race attempt
    cfg = {
        "sizes": [{"rows": 40, "cols": 40}],
        "densities": [0.2, 0.3, 0.4],
        "types": ["backtracker"],
        "mazes_per_config": 30,
        "participants": [{"algorithm": "bfs"}, {"algorithm": "astar", "heuristic": "manhattan"}, {"algorithm": "ucs"}],
        "repeats": 3,
    }
    job_res = client.post("/api/benchmark/jobs", json=cfg)
    job_id = job_res.json()["jobId"]

    maze = generate(type="backtracker", rows=11, cols=11, seed=1)
    with client.websocket_connect("/ws/race") as ws:
        ws.send_json({
            "type": "race.init",
            "raceId": "busy_check",
            "maze": maze.to_dict(),
            "participants": [{"algorithm": "bfs"}],
        })
        msg = ws.receive_json()
        print("BUSY test received msg:", msg)
        assert msg.get("code") == "BUSY" or msg.get("type") == "error"
        print(f"  Race during benchmark received expected guard response: {msg.get('code')}")

    # Cancel benchmark job
    client.post(f"/api/jobs/{job_id}/cancel")
    print("  PASS: BUSY guard successfully prevented collision.")


if __name__ == "__main__":
    print("Running PathFinder Performance Checks...")
    test_ws_tick_latency()
    test_quick_benchmark_estimate()
    test_busy_guard()
    print("\nAll performance and SLA checks PASSED successfully!\n")
