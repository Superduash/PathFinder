import pytest
from backend.app.maze.generators import generate
from backend.app.race import ParticipantSession


@pytest.mark.parametrize("algorithm, heuristic", [("bfs", None), ("dfs", None), ("ucs", None), ("greedy", "manhattan"), ("astar", "manhattan"), ("bds", None)])
@pytest.mark.parametrize("k", [1, 2, 3, 5, 21, 55])
def test_deltas_replay_exact(algorithm, heuristic, k):
    maze = generate(type="loops", rows=21, cols=21, seed=11, weighted=True)
    participant = ParticipantSession({"algorithm": algorithm, "heuristic": heuristic}, maze)
    seen = []
    while participant.search.status in ("init", "running"):
        participant.step_k(k)
        seen.extend(participant.tick_expanded)
    assert seen == participant.search.trace


def test_bds_first_tick_has_both_waves():
    maze = generate(type="loops", rows=21, cols=21, seed=11, weighted=True)
    participant = ParticipantSession({"algorithm": "bds"}, maze)
    participant.step_k(2)
    assert participant.tick_expanded[:2] == [maze.start, maze.goal]
