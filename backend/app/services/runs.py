"""Benchmark persistence, run querying, and row pagination service (backend.md §4.3)."""
from __future__ import annotations
import csv
import io
from typing import Any, Optional
from datetime import datetime, timezone
from sqlalchemy import select, desc, asc, delete
from sqlalchemy.orm import Session
from backend.app.db.tables import BenchmarkRun, BenchmarkRow
from backend.app.db.repo import serialize_json, deserialize_json
from backend.app.services.insights import benchmark_insights
from backend.app.errors import ApiError, NOT_FOUND


def utcnow_str() -> str:
    return datetime.now(timezone.utc).isoformat()


def save_benchmark_run(
    session: Session,
    job_id: str,
    config: dict,
    summary: list[dict],
    environment: dict,
    rows: list[dict],
    duration_s: float,
    status: str = "done",
    error: Optional[dict] = None,
) -> BenchmarkRun:
    """Persists a completed benchmark run and bulk inserts its rows."""
    insights = benchmark_insights(summary)

    run = BenchmarkRun(
        job_id=job_id,
        created_at=utcnow_str(),
        finished_at=utcnow_str(),
        status=status,
        config_json=serialize_json(config),
        summary_json=serialize_json(summary),
        environment_json=serialize_json(environment),
        insights_json=serialize_json(insights),
        mazes_total=len(rows),
        duration_s=round(duration_s, 3),
        error_json=serialize_json(error) if error else None,
    )
    session.add(run)
    session.flush()

    # Bulk insert rows
    db_rows = []
    for r in rows:
        db_rows.append(
            BenchmarkRow(
                run_id=run.id,
                maze_id=str(r.get("maze_index", "")),
                size=f"{r.get('rows', 0)}x{r.get('cols', 0)}",
                density=r.get("density"),
                type=r.get("type"),
                algorithm=r.get("algorithm"),
                heuristic=r.get("heuristic"),
                status=r.get("status"),
                reason=r.get("reason"),
                expanded=r.get("expanded_count", 0),
                path_cost=r.get("path_cost"),
                optimality=r.get("optimality"),
                time_ms_median=r.get("timing_ms"),
                time_ms_mean=r.get("timing_ms"),
                time_ms_std=0.0,
                extra_json=serialize_json({"seed": r.get("seed"), "path_length": r.get("path_length")}),
            )
        )
    if db_rows:
        session.add_all(db_rows)
        session.flush()

    return run


def list_benchmark_runs(session: Session, limit: int = 20) -> list[dict[str, Any]]:
    stmt = select(BenchmarkRun).order_by(desc(BenchmarkRun.id)).limit(limit)
    runs = session.scalars(stmt).all()
    out = []
    for r in runs:
        cfg = deserialize_json(r.config_json) or {}
        participants = cfg.get("participants", [])
        algorithms = [p.get("algorithm") for p in participants if p.get("algorithm")]
        out.append({
            "id": r.id,
            "job_id": r.job_id,
            "created_at": r.created_at,
            "status": r.status,
            "mazes_total": r.mazes_total,
            "duration_s": r.duration_s,
            "algorithms": algorithms,
        })
    return out


def get_benchmark_run(session: Session, run_id: int) -> dict[str, Any]:
    run = session.get(BenchmarkRun, run_id)
    if not run:
        raise ApiError(NOT_FOUND, f"Benchmark run #{run_id} not found.")

    return {
        "id": run.id,
        "job_id": run.job_id,
        "created_at": run.created_at,
        "finished_at": run.finished_at,
        "status": run.status,
        "duration_s": run.duration_s,
        "mazes_total": run.mazes_total,
        "config": deserialize_json(run.config_json),
        "summary": deserialize_json(run.summary_json),
        "environment": deserialize_json(run.environment_json),
        "insights": deserialize_json(run.insights_json),
        "error": deserialize_json(run.error_json),
    }


def get_benchmark_run_by_job_id(session: Session, job_id: str) -> Optional[BenchmarkRun]:
    stmt = select(BenchmarkRun).where(BenchmarkRun.job_id == job_id)
    return session.scalars(stmt).first()


def get_benchmark_rows(
    session: Session,
    run_id: int,
    page: int = 1,
    page_size: int = 25,
    sort: str = "expanded",
    direction: str = "asc",
    algorithm: Optional[str] = None,
) -> dict[str, Any]:
    run = session.get(BenchmarkRun, run_id)
    if not run:
        raise ApiError(NOT_FOUND, f"Benchmark run #{run_id} not found.")

    query = select(BenchmarkRow).where(BenchmarkRow.run_id == run_id)
    if algorithm:
        query = query.where(BenchmarkRow.algorithm == algorithm)

    # Sort column mapping
    col_map = {
        "expanded": BenchmarkRow.expanded,
        "path_cost": BenchmarkRow.path_cost,
        "optimality": BenchmarkRow.optimality,
        "time": BenchmarkRow.time_ms_median,
        "algorithm": BenchmarkRow.algorithm,
    }
    col = col_map.get(sort, BenchmarkRow.expanded)
    query = query.order_by(asc(col) if direction == "asc" else desc(col))

    # Total count
    total_rows = session.query(BenchmarkRow).filter(BenchmarkRow.run_id == run_id)
    if algorithm:
        total_rows = total_rows.filter(BenchmarkRow.algorithm == algorithm)
    total_count = total_rows.count()

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    items = session.scalars(query).all()

    return {
        "page": page,
        "page_size": page_size,
        "total": total_count,
        "rows": [
            {
                "id": i.id,
                "maze_id": i.maze_id,
                "size": i.size,
                "density": i.density,
                "type": i.type,
                "algorithm": i.algorithm,
                "heuristic": i.heuristic,
                "status": i.status,
                "reason": i.reason,
                "expanded": i.expanded,
                "path_cost": i.path_cost,
                "optimality": i.optimality,
                "time_ms": i.time_ms_median,
            }
            for i in items
        ],
    }


def export_benchmark_csv(session: Session, run_id: int, table: str = "summary") -> str:
    run = session.get(BenchmarkRun, run_id)
    if not run:
        raise ApiError(NOT_FOUND, f"Benchmark run #{run_id} not found.")

    output = io.StringIO()
    writer = csv.writer(output)

    if table == "summary":
        summary = deserialize_json(run.summary_json) or []
        writer.writerow(["algorithm", "heuristic", "n_mazes", "n_found", "mean_expanded", "std_expanded", "mean_time_ms", "std_time_ms", "mean_optimality", "within_noise_of_best"])
        for r in summary:
            writer.writerow([
                r.get("algorithm"),
                r.get("heuristic") or "",
                r.get("n_mazes"),
                r.get("n_found"),
                r.get("mean_expanded"),
                r.get("std_expanded"),
                r.get("mean_time_ms"),
                r.get("std_time_ms"),
                r.get("mean_optimality"),
                r.get("within_noise_of_best"),
            ])
    else:  # rows
        rows = session.scalars(select(BenchmarkRow).where(BenchmarkRow.run_id == run_id)).all()
        writer.writerow(["maze_id", "size", "density", "type", "algorithm", "heuristic", "status", "reason", "expanded", "path_cost", "optimality", "time_ms"])
        for r in rows:
            writer.writerow([
                r.maze_id,
                r.size,
                r.density,
                r.type,
                r.algorithm,
                r.heuristic or "",
                r.status,
                r.reason or "",
                r.expanded,
                r.path_cost,
                r.optimality,
                r.time_ms_median,
            ])

    return output.getvalue()


def delete_benchmark_run(session: Session, run_id: int) -> bool:
    run = session.get(BenchmarkRun, run_id)
    if not run:
        raise ApiError(NOT_FOUND, f"Benchmark run #{run_id} not found.")
    session.delete(run)
    return True
