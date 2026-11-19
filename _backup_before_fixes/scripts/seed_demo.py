"""Demo seeder: runs a quick benchmark and trains fast ML models to populate the app on first start."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend.app.db.base import init_db, session_scope
from backend.app.models import BenchmarkConfig, SizeSpec, RegressionConfig, ClassificationConfig
from backend.app.benchmark import run_benchmark_job
from backend.app.ml.regression import train_regression
from backend.app.ml.classification import train_classification
from backend.app.ml.store import ml_store
from backend.app.services.runs import save_benchmark_run
from backend.app.services.models_registry import register_trained_model


class MockJob:
    def __init__(self, job_id: str, kind: str):
        self.job_id = job_id
        self.kind = kind
        self.cancelled = False
        self.cancel_requested = False

    def set_progress(self, done: int, total: int, label: str = ""):
        pass


def seed_demo():
    print("Initializing DB...")
    init_db()

    print("Running Quick Demo Benchmark...")
    cfg = BenchmarkConfig(
        sizes=[SizeSpec(rows=15, cols=15)],
        densities=[0.2, 0.3],
        types=["backtracker"],
        mazes_per_config=2,
        participants=[{"algorithm": "bfs"}, {"algorithm": "astar", "heuristic": "manhattan"}, {"algorithm": "greedy", "heuristic": "manhattan"}],
        repeats=1,
        base_seed=42,
    )
    bench_job = MockJob("demo_bench", "benchmark")
    bench_res = run_benchmark_job(bench_job, cfg)

    if bench_res:
        with session_scope() as session:
            # Delete older seeded run if exists
            from sqlalchemy import delete
            from backend.app.db.tables import BenchmarkRun
            session.execute(delete(BenchmarkRun).where(BenchmarkRun.job_id.like("demo_bench_%")))
            import uuid
            seeded_job_id = f"demo_bench_{uuid.uuid4().hex[:6]}"

            save_benchmark_run(
                session=session,
                job_id=seeded_job_id,
                config=cfg.model_dump(),
                summary=[s.model_dump() for s in bench_res.summary],
                environment=bench_res.environment.model_dump(),
                rows=[r.model_dump() for r in bench_res.rows],
                duration_s=bench_res.elapsed_s,
                status="done",
            )
        print("Demo benchmark seeded successfully!")

    print("Training Fast Regression Model...")
    reg_cfg = RegressionConfig(name="Sample Regression (seeded)", n_mazes=20, samples_per_maze=5, seed=42)
    reg_job = MockJob("demo_reg", "ml_regression")
    reg_res = train_regression(reg_job, reg_cfg)
    if reg_res:
        import uuid
        with session_scope() as session:
            register_trained_model(
                session=session,
                kind="regression",
                name=reg_cfg.name,
                model_obj=ml_store.regression_model,
                params=reg_cfg.model_dump(),
                metrics=reg_res.model_dump(),
                job_id=f"demo_reg_{uuid.uuid4().hex[:6]}",
            )
        print("Demo regression model seeded successfully!")

    print("Training Fast Classification Model...")
    cls_cfg = ClassificationConfig(name="Sample Classification (seeded)", n_mazes=25, seed=42)
    cls_job = MockJob("demo_cls", "ml_classification")
    cls_res = train_classification(cls_job, cls_cfg)
    if cls_res:
        import uuid
        with session_scope() as session:
            register_trained_model(
                session=session,
                kind="classification",
                name=cls_cfg.name,
                model_obj=ml_store.classification_model,
                params=cls_cfg.model_dump(),
                metrics=cls_res.model_dump(),
                job_id=f"demo_cls_{uuid.uuid4().hex[:6]}",
            )
        print("Demo classification model seeded successfully!")

    print("Demo seeding completed.")


if __name__ == "__main__":
    seed_demo()
