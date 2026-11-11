"""Benchmark runs management, paging, CSV export, and estimation routes (backend.md §4.3)."""
from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.db.base import get_db
from backend.app.services import runs as runs_service
from backend.app.models import BenchmarkConfig

router = APIRouter()


class EstimateResponse(BaseModel):
    mazes_total: int
    runs_total: int
    est_seconds_low: float
    est_seconds_high: float
    too_large: bool


@router.post("/benchmark/estimate", response_model=EstimateResponse)
def estimate_benchmark(config: BenchmarkConfig) -> EstimateResponse:
    total_configs = len(config.sizes) * len(config.densities) * len(config.types)
    mazes_total = total_configs * config.mazes_per_config
    participants_count = len(config.participants) if config.participants else 2
    repeats = max(1, config.repeats)
    runs_total = mazes_total * participants_count * repeats

    # Base estimate scaled by grid area average
    avg_area = sum(s.rows * s.cols for s in config.sizes) / max(1, len(config.sizes))
    scale = max(0.5, avg_area / 400.0)

    est_low = round(max(0.2, runs_total * 0.003 * scale), 1)
    est_high = round(max(0.5, runs_total * 0.012 * scale), 1)
    too_large = mazes_total > 3000

    return EstimateResponse(
        mazes_total=mazes_total,
        runs_total=runs_total,
        est_seconds_low=est_low,
        est_seconds_high=est_high,
        too_large=too_large,
    )


@router.get("/benchmark/runs")
def list_runs(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    items = runs_service.list_benchmark_runs(db, limit=limit)
    return {"runs": items}


@router.get("/benchmark/runs/{run_id}")
def get_run(
    run_id: int,
    db: Session = Depends(get_db),
):
    return runs_service.get_benchmark_run(db, run_id)


@router.get("/benchmark/runs/{run_id}/rows")
def get_run_rows(
    run_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    sort: str = Query("expanded"),
    dir: str = Query("asc"),
    algorithm: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return runs_service.get_benchmark_rows(
        db,
        run_id=run_id,
        page=page,
        page_size=page_size,
        sort=sort,
        direction=dir,
        algorithm=algorithm,
    )


@router.get("/benchmark/runs/{run_id}/csv")
def download_run_csv(
    run_id: int,
    table: str = Query("summary", pattern="^(summary|rows)$"),
    db: Session = Depends(get_db),
):
    csv_str = runs_service.export_benchmark_csv(db, run_id=run_id, table=table)
    filename = f"benchmark_run_{run_id}_{table}.csv"
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/benchmark/runs/{run_id}")
def delete_run(
    run_id: int,
    db: Session = Depends(get_db),
):
    runs_service.delete_benchmark_run(db, run_id)
    return {"status": "ok", "deleted": run_id}
