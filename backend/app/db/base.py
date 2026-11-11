"""SQLite Database Engine and session lifecycle (WAL Mode)."""
from __future__ import annotations
import sqlite3
from contextlib import contextmanager
from typing import Generator
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from backend.app.config import settings

# Ensure data and models directory exists
settings.data_dir.mkdir(parents=True, exist_ok=True)
settings.models_dir.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    settings.db_url,
    connect_args={"check_same_thread": False},
    echo=False,
)


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db() -> None:
    """Initialize database tables and schema version."""
    from backend.app.db import tables  # noqa: F401
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        # Check and set schema_version
        v = session.execute(text("SELECT version FROM schema_version LIMIT 1")).scalar()
        if v is None:
            session.execute(text("INSERT INTO schema_version (version, applied_at) VALUES (1, datetime('now'))"))
            session.commit()

        # Mark any interrupted runs/jobs from previous server sessions
        session.execute(text("UPDATE benchmark_runs SET status = 'interrupted' WHERE status IN ('queued', 'running')"))
        session.execute(text("UPDATE jobs SET status = 'interrupted' WHERE status IN ('queued', 'running')"))
        session.commit()


@contextmanager
def session_scope() -> Generator[Session, None, None]:
    """Provide a transactional scope around a series of operations."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for DB sessions."""
    with session_scope() as session:
        yield session

