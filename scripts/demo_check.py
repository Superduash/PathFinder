"""Local demo preflight for API defaults and WebSocket delta fidelity."""
from __future__ import annotations
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from backend.app.main import app

ALGORITHMS = [
    {"algorithm": "bfs"},
    {"algorithm": "dfs"},
    {"algorithm": "ucs"},
    {"algorithm": "greedy", "heuristic": "manhattan"},
    {"algorithm": "astar", "heuristic": "manhattan"},
    {"algorithm": "bds"},
]


def main() -> None:
    client = TestClient(app)
    assert client.get("/api/health").status_code == 200
    meta = client.get("/api/meta").json()
    assert meta["defaults"]["generator"] == "loops"
    maze = client.post("/api/maze/generate", json={"seed": 11}).json()
    assert maze["meta"].get("cycles", 0) >= 8
    for k in (1, 2, 5, 55):
        with client.websocket_connect("/ws/race") as websocket:
            websocket.send_json({"type": "race.init", "raceId": f"demo-{k}", "maze": maze, "participants": ALGORITHMS})
            assert websocket.receive_json()["type"] == "race.ready"
            seen = [[] for _ in ALGORITHMS]
            done = False
            while not done:
                websocket.send_json({"type": "race.step", "k": k})
                update = websocket.receive_json()
                for index, participant in enumerate(update["participants"]):
                    seen[index].extend(tuple(cell) for cell in participant.get("delta_expanded", []))
                done = update["all_done"]
            summary = websocket.receive_json()
            assert summary["type"] == "race.summary"
            for index, participant in enumerate(summary["participants"]):
                assert len(seen[index]) == participant["expanded"]
    print("DEMO READY")


if __name__ == "__main__":
    main()
