"""Health check endpoint."""
import sys
import time
from fastapi import APIRouter
from sqlalchemy import text
from backend.app.models import HealthResponse
from backend.app.db.base import session_scope

router = APIRouter()
START_TIME = time.time()


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    db_status = "ok"
    try:
        with session_scope() as session:
            session.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    return HealthResponse(
        status="ok",
        version="1.0.0",
        python=sys.version.split()[0],
        db=db_status,
        uptime_s=round(time.time() - START_TIME, 2),
        algorithms=["bfs", "dfs", "ucs", "greedy", "astar", "bds"],
    )

