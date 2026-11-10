"""Maze grid model and neighbour logic.

Cell codes
----------
0 = open floor   cost 1
1 = wall         cost ∞
2 = sand         cost 3
3 = water        cost 5
"""
from __future__ import annotations
import math
from dataclasses import dataclass, field
from typing import Optional
from backend.app.errors import ApiError, OUT_OF_BOUNDS, START_IS_WALL, GOAL_IS_WALL, INVALID_MAZE, MAZE_TOO_LARGE

CELL_COSTS = {0: 1.0, 1: math.inf, 2: 3.0, 3: 5.0}
MAX_ROWS = 100
MAX_COLS = 100

# 4-direction deltas
_DIRS4 = [(-1, 0), (1, 0), (0, -1), (0, 1)]

# 8-direction deltas (cardinals + diagonals)
_DIRS8 = _DIRS4 + [(-1, -1), (-1, 1), (1, -1), (1, 1)]


@dataclass
class MazeGrid:
    rows: int
    cols: int
    cells: list[int]           # flat row-major
    start: tuple[int, int]     # (row, col)
    goal: tuple[int, int]
    diagonal: bool = False
    seed: Optional[int] = None
    meta: dict = field(default_factory=dict)

    # ------------------------------------------------------------------
    # Factories
    # ------------------------------------------------------------------

    @classmethod
    def from_model(cls, m) -> "MazeGrid":
        """Build from a Pydantic Maze model."""
        return cls(
            rows=m.rows,
            cols=m.cols,
            cells=list(m.cells),
            start=tuple(m.start),
            goal=tuple(m.goal),
            diagonal=m.diagonal,
            seed=m.seed,
            meta=m.meta.model_dump() if hasattr(m.meta, "model_dump") else dict(m.meta),
        )

    def to_dict(self) -> dict:
        return {
            "rows": self.rows,
            "cols": self.cols,
            "cells": self.cells,
            "start": list(self.start),
            "goal": list(self.goal),
            "diagonal": self.diagonal,
            "seed": self.seed,
            "meta": self.meta,
        }

    # ------------------------------------------------------------------
    # Cell access
    # ------------------------------------------------------------------

    def index(self, r: int, c: int) -> int:
        return r * self.cols + c

    def cell(self, r: int, c: int) -> int:
        return self.cells[self.index(r, c)]

    def cost_of(self, r: int, c: int) -> float:
        return CELL_COSTS.get(self.cell(r, c), math.inf)

    def in_bounds(self, r: int, c: int) -> bool:
        return 0 <= r < self.rows and 0 <= c < self.cols

    # ------------------------------------------------------------------
    # Neighbours
    # ------------------------------------------------------------------

    def neighbours(self, r: int, c: int) -> list[tuple[int, int, float]]:
        """Return list of (nr, nc, edge_cost) for passable neighbours.

        Diagonal moves: no corner-cutting. Cost = √2 × entry_cell_cost.
        """
        dirs = _DIRS8 if self.diagonal else _DIRS4
        result: list[tuple[int, int, float]] = []
        for dr, dc in dirs:
            nr, nc = r + dr, c + dc
            if not self.in_bounds(nr, nc):
                continue
            cell_code = self.cell(nr, nc)
            if cell_code == 1:          # wall
                continue
            entry_cost = CELL_COSTS[cell_code]
            is_diag = dr != 0 and dc != 0
            if is_diag:
                # No corner cutting: both adjacent cards must be passable
                if self.cell(r, nc) == 1 or self.cell(nr, c) == 1:
                    continue
                edge_cost = math.sqrt(2) * entry_cost
            else:
                edge_cost = entry_cost
            result.append((nr, nc, edge_cost))
        return result

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def validate(self) -> None:
        if self.rows < 2 or self.cols < 2:
            raise ApiError(INVALID_MAZE, "Maze must be at least 2×2.")
        if self.rows > MAX_ROWS or self.cols > MAX_COLS:
            raise ApiError(MAZE_TOO_LARGE, f"Maze exceeds {MAX_ROWS}×{MAX_COLS} limit.")
        if len(self.cells) != self.rows * self.cols:
            raise ApiError(INVALID_MAZE, "cells length does not match rows×cols.")
        sr, sc = self.start
        gr, gc = self.goal
        if not self.in_bounds(sr, sc) or not self.in_bounds(gr, gc):
            raise ApiError(OUT_OF_BOUNDS, "Start or goal is out of bounds.")
        if self.cell(sr, sc) == 1:
            raise ApiError(START_IS_WALL, f"Start cell ({sr}, {sc}) is a wall.")
        if self.cell(gr, gc) == 1:
            raise ApiError(GOAL_IS_WALL, f"Goal cell ({gr}, {gc}) is a wall.")
        for v in self.cells:
            if v not in (0, 1, 2, 3):
                raise ApiError(INVALID_MAZE, f"Unknown cell code {v}.")

