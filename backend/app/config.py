"""Application configuration via pydantic-settings."""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = ROOT_DIR / "data"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="PF_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    app_name: str = "PathFinder API"
    app_version: str = "1.0.0"
    port: int = 8000
    host: str = "127.0.0.1"
    data_dir: Path = DATA_DIR
    db_url: str = f"sqlite:///{DATA_DIR / 'pathfinder.db'}"
    models_dir: Path = DATA_DIR / "models"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
    max_saved_mazes: int = 200
    max_history_races: int = 100
    max_benchmark_mazes: int = 3000


settings = Settings()

