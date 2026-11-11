"""Utility to reset the local SQLite database and model files."""
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"

def reset_db(force: bool = False):
    if not force:
        confirm = input("Are you sure you want to delete all database and model data? (y/N): ")
        if confirm.lower() != "y":
            print("Aborted.")
            return

    if DATA_DIR.exists():
        for item in DATA_DIR.iterdir():
            if item.is_file():
                item.unlink()
            elif item.is_dir():
                shutil.rmtree(item)
        print("data/ directory wiped.")
    else:
        print("data/ directory does not exist.")

if __name__ == "__main__":
    force_flag = "--force" in sys.argv
    reset_db(force=force_flag)

