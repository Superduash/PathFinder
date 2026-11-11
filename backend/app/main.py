"""FastAPI application initialization, middleware, routes, WebSocket, and static mounts."""
from __future__ import annotations
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
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
    library, history, settings as settings_route
)

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

# WebSocket router
app.include_router(ws.router, tags=["websocket"])

# Mount frontend/dist if available
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
