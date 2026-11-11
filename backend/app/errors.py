"""Error types and FastAPI exception handlers."""
from __future__ import annotations
import logging
from typing import Any, Optional
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("pathfinder.errors")


class JobCancelled(Exception):
    """Raised when a background job is cancelled."""
    pass


class ApiError(Exception):
    """Raised by domain logic; translated to standard JSON error envelope."""

    def __init__(
        self,
        code: str,
        message: str,
        details: Optional[Any] = None,
        status: Optional[int] = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details
        if status is not None:
            self.status = status
        elif code == "NOT_FOUND":
            self.status = 404
        else:
            self.status = 400


async def api_error_handler(request: Request, exc: ApiError) -> JSONResponse:
    body: dict = {"error": {"code": exc.code, "message": exc.message}}
    if exc.details is not None:
        body["error"]["details"] = exc.details
    return JSONResponse(status_code=exc.status, content=body)


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "INVALID_REQUEST",
                "message": "Request validation failed",
                "details": exc.errors(),
            }
        },
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    code = "NOT_FOUND" if exc.status_code == 404 else "HTTP_ERROR"
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": code, "message": str(exc.detail)}},
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled server exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL",
                "message": "An internal server error occurred.",
            }
        },
    )


# Standard contract error codes
OUT_OF_BOUNDS = "OUT_OF_BOUNDS"
START_IS_WALL = "START_IS_WALL"
GOAL_IS_WALL = "GOAL_IS_WALL"
INVALID_MAZE = "INVALID_MAZE"
MAZE_TOO_LARGE = "MAZE_TOO_LARGE"
UNKNOWN_ALGORITHM = "UNKNOWN_ALGORITHM"
UNKNOWN_HEURISTIC = "UNKNOWN_HEURISTIC"
HEURISTIC_NOT_ALLOWED = "HEURISTIC_NOT_ALLOWED"
UNKNOWN_PRESET = "UNKNOWN_PRESET"
UNKNOWN_GENERATOR = "UNKNOWN_GENERATOR"
CONFIG_TOO_LARGE = "CONFIG_TOO_LARGE"
BUSY = "BUSY"
NOT_FOUND = "NOT_FOUND"
LIBRARY_FULL = "LIBRARY_FULL"
