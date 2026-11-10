"""Solve route: runs an algorithm to completion and returns the SearchResult."""
from __future__ import annotations
from fastapi import APIRouter
from backend.app.models import SolveRequest, SearchResult
from backend.app.maze.grid import MazeGrid
from backend.app.search.algorithms import create_search
from backend.app.search.reference import dijkstra_optimal_cost, compute_optimality, validate_path

router = APIRouter()


@router.post("/solve", response_model=SearchResult)
def api_solve(req: SolveRequest) -> SearchResult:
    grid = MazeGrid.from_model(req.maze)
    grid.validate()

    search = create_search(req.algorithm, grid, heuristic=req.heuristic)
    search.run_to_completion()

    c_star = dijkstra_optimal_cost(grid)
    optimality = compute_optimality(c_star, search.path_cost)

    path_list = [list(pt) for pt in search.path] if search.path else None
    trace_list = [list(pt) for pt in search.trace] if req.include_trace else None

    # Self-validation safety check
    if search.path:
        valid, recomputed_cost = validate_path(grid, search.path)
        if not valid:
            search.status = "failed"
            search.reason = "invalid_path_generated"

    return SearchResult(
        algorithm=req.algorithm,
        heuristic=req.heuristic,
        status=search.status,  # "found" | "failed"
        reason=search.reason,
        path=path_list,
        path_length=search.path_length,
        path_cost=search.path_cost,
        optimality=optimality,
        expanded_count=search.expanded_count,
        frontier_count=search.frontier_count,
        peak_frontier=search.peak_frontier,
        peak_open_entries=search.peak_open_entries,
        trace=trace_list,
    )

