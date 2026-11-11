"""SQLAlchemy ORM tables according to backend.md §2.2."""
from __future__ import annotations
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, Text, Boolean, DateTime,
    ForeignKey, Index
)
from sqlalchemy.orm import relationship
from backend.app.db.base import Base


def utcnow_str() -> str:
    return datetime.now(timezone.utc).isoformat()


class SchemaVersion(Base):
    __tablename__ = "schema_version"
    version = Column(Integer, primary_key=True)
    applied_at = Column(String, default=utcnow_str)


class Setting(Base):
    __tablename__ = "settings"
    key = Column(String, primary_key=True)
    value_json = Column(Text, nullable=False)
    updated_at = Column(String, default=utcnow_str, onupdate=utcnow_str)


class SavedMaze(Base):
    __tablename__ = "saved_mazes"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    rows = Column(Integer, nullable=False)
    cols = Column(Integer, nullable=False)
    diagonal = Column(Integer, default=0)
    maze_json = Column(Text, nullable=False)
    thumb_svg = Column(Text, nullable=True)
    tags = Column(String, nullable=True)
    created_at = Column(String, default=utcnow_str)
    updated_at = Column(String, default=utcnow_str, onupdate=utcnow_str)


class RaceHistory(Base):
    __tablename__ = "race_history"
    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(String, default=utcnow_str)
    maze_json = Column(Text, nullable=False)
    participants_json = Column(Text, nullable=False)
    summary_json = Column(Text, nullable=False)
    reachable = Column(Integer, default=1)
    optimal_cost = Column(Float, nullable=True)


class BenchmarkRun(Base):
    __tablename__ = "benchmark_runs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String, unique=True, index=True)
    created_at = Column(String, default=utcnow_str)
    finished_at = Column(String, nullable=True)
    status = Column(String, default="queued")
    config_json = Column(Text, nullable=False)
    summary_json = Column(Text, nullable=True)
    environment_json = Column(Text, nullable=True)
    insights_json = Column(Text, nullable=True)
    mazes_total = Column(Integer, default=0)
    duration_s = Column(Float, nullable=True)
    error_json = Column(Text, nullable=True)

    rows = relationship("BenchmarkRow", back_populates="run", cascade="all, delete-orphan")


class BenchmarkRow(Base):
    __tablename__ = "benchmark_rows"
    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(Integer, ForeignKey("benchmark_runs.id", ondelete="CASCADE"), index=True)
    maze_id = Column(String, nullable=True)
    size = Column(String, nullable=True)
    density = Column(Float, nullable=True)
    type = Column(String, nullable=True)
    algorithm = Column(String, nullable=True)
    heuristic = Column(String, nullable=True)
    status = Column(String, nullable=True)
    reason = Column(String, nullable=True)
    expanded = Column(Integer, default=0)
    path_cost = Column(Float, nullable=True)
    optimality = Column(Float, nullable=True)
    time_ms_median = Column(Float, nullable=True)
    time_ms_mean = Column(Float, nullable=True)
    time_ms_std = Column(Float, nullable=True)
    extra_json = Column(Text, nullable=True)

    run = relationship("BenchmarkRun", back_populates="rows")


class MLModel(Base):
    __tablename__ = "ml_models"
    id = Column(Integer, primary_key=True, autoincrement=True)
    kind = Column(String, nullable=False)  # 'regression' | 'classification'
    name = Column(String, nullable=False)
    created_at = Column(String, default=utcnow_str)
    params_json = Column(Text, nullable=True)
    metrics_json = Column(Text, nullable=True)
    artifact_path = Column(String, nullable=True)
    is_active = Column(Integer, default=0)
    job_id = Column(String, nullable=True)


class JobRecord(Base):
    __tablename__ = "jobs"
    job_id = Column(String, primary_key=True)
    kind = Column(String, nullable=False)
    status = Column(String, default="queued")
    progress_json = Column(Text, nullable=True)
    result_json = Column(Text, nullable=True)
    error_json = Column(Text, nullable=True)
    created_at = Column(String, default=utcnow_str)
    started_at = Column(String, nullable=True)
    finished_at = Column(String, nullable=True)

