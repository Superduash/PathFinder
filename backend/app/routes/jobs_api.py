"""Benchmark job endpoints, status, cancel, and CSV export."""
from __future__ import annotations
from fastapi import APIRouter, Response
from backend.app.models import BenchmarkConfig, JobStatus
from backend.app.jobs import job_manager
from backend.app.benchmark import run_benchmark_job, export_csv

router = APIRouter()


@router.post("/benchmark/jobs", response_model=JobStatus)
def create_benchmark_job(config: BenchmarkConfig) -> JobStatus:
    job = job_manager.create("benchmark", lambda j: run_benchmark_job(j, config))
    return job.to_model()


@router.get("/jobs/{job_id}", response_model=JobStatus)
def get_job_status(job_id: str) -> JobStatus:
    job = job_manager.get(job_id)
    return job.to_model()


@router.post("/jobs/{job_id}/cancel", response_model=JobStatus)
def cancel_job(job_id: str) -> JobStatus:
    job = job_manager.get(job_id)
    job.cancel()
    return job.to_model()


@router.get("/jobs/{job_id}/csv")
def download_job_csv(job_id: str, table: str = "summary") -> Response:
    job = job_manager.get(job_id)
    if not job.result:
        return Response(content="No data available", media_type="text/plain", status_code=400)

    result_dict = job.result.model_dump() if hasattr(job.result, "model_dump") else job.result
    csv_str = export_csv(result_dict, table=table)
    filename = f"{job_id}_{table}.csv"

    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

