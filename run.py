"""Entry point: start the FastAPI backend with uvicorn."""
import argparse
import sys
import os
from pathlib import Path

ROOT = Path(__file__).parent
FRONTEND_DIST = ROOT / "frontend" / "dist"

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PathFinder server")
    parser.add_argument("--host", default="127.0.0.1", help="Host address (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Port (default: 8000)")
    parser.add_argument("--reload", action="store_true", default=False, help="Enable auto-reload on code changes (default: off)")
    parser.add_argument("--seed-demo", action="store_true", default=False, help="Seed demo benchmark and ML models before start")
    parser.add_argument("--reset-db", action="store_true", default=False, help="Wipe local database and models before start")
    args = parser.parse_args()

    if args.reset_db:
        from scripts.reset_db import reset_db
        reset_db(force=True)

    if args.seed_demo:
        from scripts.seed_demo import seed_demo
        seed_demo()

    if not FRONTEND_DIST.exists():
        print("Note: frontend/dist not found. Run `npm run build` in frontend/ for the production UI.")
        print(f"Starting backend API only on http://{args.host}:{args.port} ...")
    else:
        print(f"Starting backend + frontend on http://{args.host}:{args.port} ...")

    import uvicorn
    uvicorn.run(
        "backend.app.main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        reload_dirs=[str(ROOT / "backend")] if args.reload else None,
    )

