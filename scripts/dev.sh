#!/usr/bin/env bash
# Start backend with reload and frontend dev server concurrently
set -e

echo "Starting PathFinder in development mode..."
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

trap "kill $BACKEND_PID" EXIT

cd frontend
npm run dev

