"""In-memory asynchronous background job manager."""
from __future__ import annotations
import threading
import uuid
from typing import Any, Callable, Optional
from backend.app.models import JobStatus, JobProgress
from backend.app.errors import ApiError, JobCancelled, NOT_FOUND


class Job:
    def __init__(self, job_id: str, kind: str, fn: Callable[[Job], Any]) -> None:
        self.job_id = job_id
        self.kind = kind
        self.fn = fn
        self.status = "queued"
        self.progress = JobProgress(done=0, total=0, label="")
        self.result: Optional[Any] = None
        self.error: Optional[dict[str, Any]] = None
        self.cancelled = False
        self.cancel_requested = False
        self._thread: Optional[threading.Thread] = None

    def start(self) -> None:
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def _run(self) -> None:
        if self.cancel_requested:
            self.status = "cancelled"
            self.cancelled = True
            return

        self.status = "running"
        try:
            res = self.fn(self)
            if self.cancel_requested or self.cancelled:
                self.status = "cancelled"
                self.cancelled = True
            else:
                self.result = res
                self.status = "done"
        except JobCancelled:
            self.status = "cancelled"
            self.cancelled = True
        except ApiError as e:
            self.error = {"code": e.code, "message": e.message, "details": e.details}
            self.status = "error"
        except Exception as e:
            self.error = {"code": "INTERNAL", "message": str(e), "details": None}
            self.status = "error"

    def cancel(self) -> None:
        self.cancel_requested = True
        if self.status == "queued":
            self.status = "cancelled"
            self.cancelled = True

    def set_progress(self, done: int, total: int, label: str = "") -> None:
        self.progress.done = done
        self.progress.total = total
        self.progress.label = label

    def to_model(self) -> JobStatus:
        return JobStatus(
            jobId=self.job_id,
            kind=self.kind,
            status=self.status,
            progress=self.progress,
            result=self.result,
            error=self.error,
        )


class JobManager:
    def __init__(self) -> None:
        self.jobs: dict[str, Job] = {}
        self._lock = threading.Lock()

    def create(self, kind: str, fn: Callable[[Job], Any]) -> Job:
        job_id = str(uuid.uuid4())[:8]
        job = Job(job_id, kind, fn)
        with self._lock:
            self.jobs[job_id] = job
        job.start()
        return job

    def get(self, job_id: str) -> Job:
        with self._lock:
            if job_id not in self.jobs:
                raise ApiError(NOT_FOUND, f"Job '{job_id}' not found.")
            return self.jobs[job_id]

    def is_benchmark_running(self) -> bool:
        with self._lock:
            return any(
                j.kind == "benchmark" and j.status in ("queued", "running")
                for j in self.jobs.values()
            )


job_manager = JobManager()

