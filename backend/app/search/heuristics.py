"""Heuristics for grid search.

Supported heuristics:
- manhattan: |dr| + |dc|
- euclidean: √(dr² + dc²)
- chebyshev: max(|dr|, |dc|) — diagonal moves only
- octile: max(|dr|, |dc|) + (√2 - 1) * min(|dr|, |dc|) — diagonal moves
- zero: always 0 (reduces A* to UCS)
"""
from __future__ import annotations
import math
from typing import Callable
from backend.app.errors import ApiError, UNKNOWN_HEURISTIC, HEURISTIC_NOT_ALLOWED

_SQRT2_MINUS_1 = math.sqrt(2) - 1


def manhattan(r: int, c: int, gr: int, gc: int) -> float:
    return float(abs(r - gr) + abs(c - gc))


def euclidean(r: int, c: int, gr: int, gc: int) -> float:
    return math.hypot(r - gr, c - gc)


def chebyshev(r: int, c: int, gr: int, gc: int) -> float:
    return float(max(abs(r - gr), abs(c - gc)))


def octile(r: int, c: int, gr: int, gc: int) -> float:
    dx = abs(r - gr)
    dy = abs(c - gc)
    return max(dx, dy) + _SQRT2_MINUS_1 * min(dx, dy)


def zero(r: int, c: int, gr: int, gc: int) -> float:
    return 0.0


HEURISTICS: dict[str, Callable[[int, int, int, int], float]] = {
    "manhattan": manhattan,
    "euclidean": euclidean,
    "chebyshev": chebyshev,
    "octile": octile,
    "zero": zero,
}


def get_heuristic(name: str, diagonal: bool = False) -> Callable[[int, int, int, int], float]:
    name = (name or "manhattan").lower()
    if name not in HEURISTICS:
        raise ApiError(UNKNOWN_HEURISTIC,
                       f"Unknown heuristic '{name}'. Available: {list(HEURISTICS.keys())}")
    if name == "chebyshev" and not diagonal:
        raise ApiError(
            HEURISTIC_NOT_ALLOWED,
            "Chebyshev heuristic is only allowed when diagonal moves are enabled."
        )
    return HEURISTICS[name]

