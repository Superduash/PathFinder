"""FastAPI application initialization, middleware, routes, WebSocket, and static mounts."""
from __future__ import annotations
from contextlib import asynccontextmanager
from pathlib import Path
import logging
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.app.config import settings
from backend.app.db.base import init_db
from backend.app.errors import (
    ApiError,
    api_error_handler,
    validation_error_handler,
    http_exception_handler,
    unhandled_exception_handler,
)
from backend.app.routes import (
    health, maze, solve, meta, benchmark, ws, jobs_api, ml,
    library, history, settings as settings_route, runs
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("pathfinder.api")

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIST = ROOT_DIR / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # App startup: initialize SQLite database and ensure tables exist
    init_db()
    yield
    # App shutdown: cleanup if needed


app = FastAPI(
    title="PathFinder API",
    description="AI Search Algorithm Visualizer and Benchmark Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# Exception handlers for standard error envelope
app.add_exception_handler(ApiError, api_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# CORS configuration restricted to local dev origins, credentials disallowed
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_logging_and_caching(request: Request, call_next):
    t0 = time.perf_counter()
    response = await call_next(request)
    dt_ms = (time.perf_counter() - t0) * 1000

    path = request.url.path
    if request.method != "GET" or dt_ms > 500:
        logger.info("%s %s -> %s (%.1f ms)", request.method, path, response.status_code, dt_ms)

    # Static assets cache headers per backend.md §8.2
    if path.startswith("/assets/"):
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    elif path == "/" or path.endswith("index.html"):
        response.headers["Cache-Control"] = "no-cache"

    return response

# Include API routers under /api prefix
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(maze.router, prefix="/api", tags=["maze"])
app.include_router(solve.router, prefix="/api", tags=["solve"])
app.include_router(meta.router, prefix="/api", tags=["meta"])
app.include_router(benchmark.router, prefix="/api", tags=["benchmark"])
app.include_router(jobs_api.router, prefix="/api", tags=["jobs"])
app.include_router(ml.router, prefix="/api", tags=["ml"])
app.include_router(library.router, prefix="/api", tags=["library"])
app.include_router(history.router, prefix="/api", tags=["history"])
app.include_router(settings_route.router, prefix="/api", tags=["settings"])
app.include_router(runs.router, prefix="/api", tags=["runs"])

# WebSocket router
app.include_router(ws.router, tags=["websocket"])

# Mount frontend/dist if available
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
