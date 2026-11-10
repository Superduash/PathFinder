"""Health check endpoint."""
import time
from fastapi import APIRouter
from backend.app.models import HealthResponse

router = APIRouter()
START_TIME = time.time()


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        version="1.0.0",
        algorithms=["bfs", "dfs", "ucs", "greedy", "astar"],
        uptime_s=round(time.time() - START_TIME, 2),
    )

