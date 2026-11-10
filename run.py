"""Entry point: start the FastAPI backend with uvicorn."""
import sys
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).parent
FRONTEND_DIST = ROOT / "frontend" / "dist"

if __name__ == "__main__":
    if not FRONTEND_DIST.exists():
        print("Note: frontend/dist not found. Run `npm run build` in frontend/ for the production UI.")
        print("Starting backend API only on http://127.0.0.1:8000 ...")
    else:
        print("Starting backend + frontend on http://127.0.0.1:8000 ...")

    import uvicorn
    uvicorn.run(
        "backend.app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        reload_dirs=[str(ROOT / "backend")],
    )

