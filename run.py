"""Entry point: start the FastAPI backend with uvicorn (backend.md Phase 8)."""
import argparse
import socket
import sys
import threading
import time
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FRONTEND_DIST = ROOT / "frontend" / "dist"
DATA_DIR = ROOT / "data"


def find_available_port(host: str, start_port: int, max_attempts: int = 5) -> int:
    for p in range(start_port, start_port + max_attempts + 1):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind((host, p))
                return p
            except OSError:
                continue
    return start_port


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PathFinder AI Search & Benchmark Platform")
    parser.add_argument("--host", default="127.0.0.1", help="Host address (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Port (default: 8000)")
    parser.add_argument("--reload", action="store_true", default=False, help="Enable auto-reload for local dev")
    parser.add_argument("--no-browser", action="store_true", default=False, help="Do not open browser automatically")
    parser.add_argument("--seed-demo", action="store_true", default=False, help="Seed demo benchmark and ML models")
    parser.add_argument("--reset-db", action="store_true", default=False, help="Reset SQLite database and models")
    args = parser.parse_args()

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if args.reset_db:
        from scripts.reset_db import reset_db
        reset_db(force=True)

    if args.seed_demo:
        from scripts.seed_demo import seed_demo
        seed_demo()

    actual_port = find_available_port(args.host, args.port, max_attempts=5)
    url = f"http://{args.host}:{actual_port}"

    frontend_status = "built UI found \u2714" if FRONTEND_DIST.exists() else "run `npm run build` in frontend/ for UI"

    print("\n" + "=" * 60)
    print(f"PathFinder is running \u2192 {url}")
    print(f"Frontend: {frontend_status}")
    print(f"Database: {DATA_DIR / 'pathfinder.db'}")
    print("=" * 60 + "\n")

    if not args.no_browser:
        threading.Timer(1.2, lambda: webbrowser.open(url)).start()

    import uvicorn
    uvicorn.run(
        "backend.app.main:app",
        host=args.host,
        port=actual_port,
        reload=args.reload,
        reload_dirs=[str(ROOT / "backend")] if args.reload else None,
    )
