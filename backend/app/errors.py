"""Error types and FastAPI exception handler."""
from __future__ import annotations
from typing import Any, Optional
from fastapi import Request
from fastapi.responses import JSONResponse


class ApiError(Exception):
    """Raised by any backend logic; translated to JSON by the handler."""

    def __init__(
        self,
        code: str,
        message: str,
        details: Optional[Any] = None,
        status: int = 400,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details
        self.status = status


async def api_error_handler(request: Request, exc: ApiError) -> JSONResponse:
    body: dict = {"error": {"code": exc.code, "message": exc.message}}
    if exc.details is not None:
        body["error"]["details"] = exc.details
    return JSONResponse(status_code=exc.status, content=body)


# Common error codes
OUT_OF_BOUNDS       = "OUT_OF_BOUNDS"
START_IS_WALL       = "START_IS_WALL"
GOAL_IS_WALL        = "GOAL_IS_WALL"
INVALID_MAZE        = "INVALID_MAZE"
MAZE_TOO_LARGE      = "MAZE_TOO_LARGE"
UNKNOWN_ALGORITHM   = "UNKNOWN_ALGORITHM"
UNKNOWN_HEURISTIC   = "UNKNOWN_HEURISTIC"
HEURISTIC_NOT_ALLOWED = "HEURISTIC_NOT_ALLOWED"
UNKNOWN_PRESET      = "UNKNOWN_PRESET"
UNKNOWN_GENERATOR   = "UNKNOWN_GENERATOR"
CONFIG_TOO_LARGE    = "CONFIG_TOO_LARGE"
BUSY                = "BUSY"
NOT_FOUND           = "NOT_FOUND"

