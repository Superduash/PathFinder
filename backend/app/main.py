"""FastAPI application initialization, middleware, routes, and static mounts."""
from __future__ import annotations
import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.errors import ApiError, api_error_handler
from backend.app.routes import health, maze, solve, meta, benchmark

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIST = ROOT_DIR / "frontend" / "dist"

app = FastAPI(
    title="PathFinder API",
    description="AI Search Algorithm Visualizer and Benchmark Backend",
    version="1.0.0",
)

# Exception handler for contract-defined ApiError
app.add_exception_handler(ApiError, api_error_handler)

# CORS configuration for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers under /api prefix
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(maze.router, prefix="/api", tags=["maze"])
app.include_router(solve.router, prefix="/api", tags=["solve"])
app.include_router(meta.router, prefix="/api", tags=["meta"])
app.include_router(benchmark.router, prefix="/api", tags=["benchmark"])

# Mount frontend/dist if available
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")

