# Contract Reconciliation Notes (`docs/contract-notes.md`)

This document records the design reconciliation between the original specification (`plan.md` §11) and the production backend implementation (`backend.md` §0.1, §1.3):

## 1. Error Envelope Standard
- All error responses strictly use `{"error": {"code": str, "message": str, "details": ...}}`.
- `RequestValidationError` maps to HTTP 422 with `code: "INVALID_REQUEST"` and Pydantic field details.
- Domain `ApiError` translates to custom status and code (`NOT_FOUND`, `INVALID_MAZE`, `LIBRARY_FULL`, etc.).
- Internal unexpected exceptions map to HTTP 500 with `code: "INTERNAL"`, logging traceback to server console while never leaking internal stack traces to clients.

## 2. Maze Generation & Weights
- Request model uses `type: Literal["empty", "random", "backtracker", "braided", "weighted"]` with `weighted: bool` and `weight_fraction: float`.
- Flat array `cells` encoding:
  - `0`: Open cell (cost 1.0)
  - `1`: Impassable wall
  - `2`: Sand terrain (cost 3.0)
  - `3`: Water terrain (cost 5.0)

## 3. Background Job Management & Cancellations
- Jobs run asynchronously with states: `queued`, `running`, `done`, `error`, `cancelled`.
- Cancellation uses cooperative flag `cancel_requested` so running workers cleanly abort and raise `JobCancelled` before marking state `cancelled`.
- `Job.error` is an object `{code, message, details}` rather than a raw string.
- `is_benchmark_running()` checks both `queued` and `running` jobs to prevent concurrent race/benchmark collisions (`BUSY` response).

## 4. Security & CORS
- CORS whitelist strictly enforces `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:8000`, `http://127.0.0.1:8000` with `allow_credentials=False`.

## 5. Health Check
- `GET /api/health` returns `{status: "ok", version: str, python: str, db: "ok" | "error", uptime_s: float, algorithms: list[str]}`.

## 6. Persistence & SQLite Tables
- Database stored in local file `data/pathfinder.db` with SQLite WAL mode (`PRAGMA journal_mode=WAL; foreign_keys=ON; synchronous=NORMAL;`).
- Tables:
  - `schema_version`
  - `settings`
  - `saved_mazes`
  - `race_history`
  - `benchmark_runs`
  - `benchmark_rows`
  - `ml_models`
  - `jobs`
- Race history auto-records on `race.summary` via WebSocket.
- Library enforces 200 maze maximum (`LIBRARY_FULL`) and generates 160×160 SVG thumbnails.
