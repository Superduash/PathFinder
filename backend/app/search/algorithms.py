"""Factory and algorithm bridge (polish2.md §2.2).

Delegates to unified Search engine and BidirectionalSearch.
"""
from __future__ import annotations
from typing import Optional, Any
from backend.app.maze.grid import MazeGrid
from backend.app.search.engine import Search, route_stats
from backend.app.search.bidirectional import BidirectionalSearch
from backend.app.errors import ApiError, UNKNOWN_ALGORITHM

BaseSearch = Any

ALGORITHMS = ["bfs", "dfs", "ucs", "greedy", "astar", "bds"]


def create_search(
    algorithm: str,
    maze: MazeGrid,
    heuristic: Optional[str] = None,
    weight: float = 1.0,
) -> Search | BidirectionalSearch:
    norm = algorithm.lower().replace("*", "star").replace("-", "").replace("_", "").strip()
    if norm in ("bds", "bidirectional"):
        return BidirectionalSearch(maze)

    mapping = {
        "bfs": "bfs",
        "dfs": "dfs",
        "ucs": "ucs",
        "dijkstra": "ucs",
        "greedy": "greedy",
        "astar": "astar",
    }
    if norm not in mapping:
        raise ApiError(
            UNKNOWN_ALGORITHM,
            f"Unknown algorithm '{algorithm}'. Available: {', '.join(ALGORITHMS)}",
        )

    kind = mapping[norm]
    return Search(maze, kind=kind, heuristic=heuristic or "manhattan", weight=weight)


# Compatibility aliases
def BFS(maze: MazeGrid): return create_search("bfs", maze)
def DFS(maze: MazeGrid): return create_search("dfs", maze)
def UCS(maze: MazeGrid): return create_search("ucs", maze)
def Greedy(maze: MazeGrid, heuristic: Optional[str] = "manhattan"): return create_search("greedy", maze, heuristic=heuristic)
def AStar(maze: MazeGrid, heuristic: Optional[str] = "manhattan"): return create_search("astar", maze, heuristic=heuristic)
def BDS(maze: MazeGrid): return create_search("bds", maze)
