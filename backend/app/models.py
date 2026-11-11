"""Pydantic v2 schemas matching plan.md §11 contract.

Field names: snake_case in result objects; camelCase only where the
contract specifies (requestId, raceId, jobId, etc.).
"""
from __future__ import annotations
from typing import Any, Literal, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Maze
# ---------------------------------------------------------------------------

class MazeCell(BaseModel):
    """A single cell: 0=open 1=wall 2=sand(cost3) 3=water(cost5)."""
    pass  # cells are stored as a flat list[int]


class MazeMeta(BaseModel):
    generator: str = ""
    seed: Optional[int] = None
    preset: Optional[str] = None


class Maze(BaseModel):
    rows: int
    cols: int
    cells: list[int]           # flat row-major, len == rows*cols
    start: list[int]           # [row, col]
    goal: list[int]            # [row, col]
    diagonal: bool = False
    seed: Optional[int] = None
    meta: MazeMeta = Field(default_factory=MazeMeta)


# ---------------------------------------------------------------------------
# Generate / preset requests
# ---------------------------------------------------------------------------

class GenerateMazeRequest(BaseModel):
    rows: int = 20
    cols: int = 20
    type: Literal["empty", "random", "backtracker", "braided", "weighted"] = "backtracker"
    density: float = 0.3
    weighted: bool = False
    weight_fraction: float = 0.3
    diagonal: bool = False
    seed: Optional[int] = None
    randomize_endpoints: bool = True


class PresetMazeRequest(BaseModel):
    name: str
    diagonal: bool = False


class RandomizeEndpointsRequest(BaseModel):
    maze: Maze


class ValidateMazeRequest(BaseModel):
    maze: Maze


# ---------------------------------------------------------------------------
# Solve
# ---------------------------------------------------------------------------

class SolveRequest(BaseModel):
    maze: Maze
    algorithm: str
    heuristic: Optional[str] = None
    include_trace: bool = False


class TimingStats(BaseModel):
    median_ms: float
    mean_ms: float
    std_ms: float
    min_ms: float
    max_ms: float


class SearchResult(BaseModel):
    algorithm: str
    heuristic: Optional[str] = None
    status: Literal["found", "failed"]
    reason: Optional[str] = None      # "no_path" | "budget_exceeded" | None
    path: Optional[list[list[int]]] = None   # list of [row,col]
    path_length: Optional[int] = None
    path_cost: Optional[float] = None
    optimality: Optional[float] = None       # C*/C
    expanded_count: int = 0
    frontier_count: int = 0
    peak_frontier: int = 0
    peak_open_entries: int = 0
    trace: Optional[list[list[int]]] = None  # explored cells if include_trace


# ---------------------------------------------------------------------------
# Compare (single benchmark)
# ---------------------------------------------------------------------------

class CompareRequest(BaseModel):
    maze: Maze
    participants: list[dict]           # [{algorithm, heuristic}]
    repeats: int = 5


class CompareEntry(BaseModel):
    algorithm: str
    heuristic: Optional[str] = None
    status: Literal["found", "failed"]
    path_length: Optional[int] = None
    path_cost: Optional[float] = None
    optimality: Optional[float] = None
    expanded_count: int = 0
    timing: TimingStats
    compute_ms: Optional[float] = None


class EnvironmentMeta(BaseModel):
    platform: str
    python_version: str
    cpu_count: Optional[int] = None
    repeats: int


class CompareResult(BaseModel):
    results: list[CompareEntry]
    environment: EnvironmentMeta


# ---------------------------------------------------------------------------
# Benchmark job
# ---------------------------------------------------------------------------

class SizeSpec(BaseModel):
    rows: int
    cols: int


class BenchmarkConfig(BaseModel):
    sizes: list[SizeSpec]
    densities: list[float] = [0.3]
    types: list[str] = ["backtracker"]
    mazes_per_config: int = 5
    participants: list[dict] = []
    repeats: int = 3
    base_seed: int = 42
    ensure_solvable: bool = True
    expansion_budget: Optional[int] = None
    diagonal: bool = False


class BenchmarkRow(BaseModel):
    config_index: int
    maze_index: int
    rows: int
    cols: int
    density: float
    type: str
    seed: int
    algorithm: str
    heuristic: Optional[str] = None
    status: str
    expanded_count: int
    path_length: Optional[int] = None
    path_cost: Optional[float] = None
    optimality: Optional[float] = None
    timing_ms: float


class BenchmarkSummaryRow(BaseModel):
    algorithm: str
    heuristic: Optional[str] = None
    group: str
    n_mazes: int
    n_found: int
    mean_expanded: float
    std_expanded: float
    mean_time_ms: float
    std_time_ms: float
    mean_optimality: Optional[float] = None
    within_noise_of_best: bool = False


class BenchmarkResult(BaseModel):
    rows: list[BenchmarkRow]
    summary: list[BenchmarkSummaryRow]
    dataset_size: int
    environment: EnvironmentMeta
    elapsed_s: float


# ---------------------------------------------------------------------------
# Job
# ---------------------------------------------------------------------------

class JobProgress(BaseModel):
    done: int = 0
    total: int = 0
    label: str = ""


class JobStatus(BaseModel):
    jobId: str
    kind: str
    status: Literal["queued", "running", "done", "error", "cancelled"]
    progress: JobProgress = Field(default_factory=JobProgress)
    result: Optional[Any] = None
    error: Optional[Any] = None


# ---------------------------------------------------------------------------
# Race WebSocket messages (typed envelopes)
# ---------------------------------------------------------------------------

class RaceInitMessage(BaseModel):
    type: Literal["race.init"]
    raceId: str
    maze: Maze
    participants: list[dict]           # [{algorithm, heuristic}]
    k: int = 5                         # expansions per tick


class RaceStepMessage(BaseModel):
    type: Literal["race.step"]
    k: int = 5


class RaceResetMessage(BaseModel):
    type: Literal["race.reset"]


class PingMessage(BaseModel):
    type: Literal["ping"]


# Outgoing
class ParticipantState(BaseModel):
    algorithm: str
    heuristic: Optional[str] = None
    status: Literal["running", "found", "failed", "init"]
    expanded: int = 0
    frontier: int = 0
    peak_frontier: int = 0
    peak_open_entries: int = 0
    path: Optional[list[list[int]]] = None
    path_length: Optional[int] = None
    path_cost: Optional[float] = None
    optimality: Optional[float] = None
    compute_ms: float = 0.0
    # deltas (only in race.update)
    delta_expanded: Optional[list[list[int]]] = None   # newly expanded cells
    delta_discovered: Optional[list[list[int]]] = None  # newly discovered cells


class RaceReadyMessage(BaseModel):
    type: Literal["race.ready"] = "race.ready"
    raceId: str
    participants: list[ParticipantState]
    initial: list[list[int]]   # start/goal cells


class RaceUpdateMessage(BaseModel):
    type: Literal["race.update"] = "race.update"
    raceId: str
    tick: int
    participants: list[ParticipantState]
    all_done: bool = False


class RaceSummaryMessage(BaseModel):
    type: Literal["race.summary"] = "race.summary"
    raceId: str
    participants: list[ParticipantState]
    ranking: list[int]   # indices into participants, best first


class ErrorMessage(BaseModel):
    type: Literal["error"] = "error"
    code: str
    message: str


# ---------------------------------------------------------------------------
# ML
# ---------------------------------------------------------------------------

class RegressionConfig(BaseModel):
    n_mazes: int = 100
    samples_per_maze: int = 10
    test_size: float = 0.2
    seed: int = 42


class ClassificationConfig(BaseModel):
    n_mazes: int = 100
    test_size: float = 0.2
    seed: int = 42
    criterion: str = "gini"
    tolerance: float = 0.05


class RegressionMetrics(BaseModel):
    model: str
    mae: float
    r2: float
    overestimate_pct: float


class ClassificationMetrics(BaseModel):
    accuracy: float
    macro_precision: float
    macro_recall: float
    macro_f1: float


class RegressionResult(BaseModel):
    dataset_size: int
    n_mazes: int
    metrics: list[RegressionMetrics]
    coefficients: Optional[dict] = None
    warnings: list[str] = []


class ClassificationResult(BaseModel):
    dataset_size: int
    n_classes: int
    class_distribution: dict
    metrics: ClassificationMetrics
    baseline_accuracy: float
    confusion_matrix: list[list[int]]
    feature_importances: dict
    tree_rules: str
    warnings: list[str] = []


class MLStatus(BaseModel):
    regression: Optional[dict] = None
    classification: Optional[dict] = None


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    version: str = "1.0.0"
    python: str = ""
    db: Literal["ok", "error"] = "ok"
    uptime_s: float = 0.0
    algorithms: list[str] = ["bfs", "dfs", "ucs", "greedy", "astar"]


# ---------------------------------------------------------------------------
# Meta
# ---------------------------------------------------------------------------

class AlgorithmMeta(BaseModel):
    id: str
    name: str
    description: str
    pros: list[str]
    cons: list[str]
    time_complexity: str
    space_complexity: str
    optimal: bool
    complete: bool
    color: str


class MetaResponse(BaseModel):
    algorithms: list[AlgorithmMeta]
    heuristics: list[str]
    generators: list[str]
    presets: list[str]
    cell_types: dict
    limits: dict
    defaults: dict

