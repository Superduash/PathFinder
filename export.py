"""Single-file code exporter for AI reference.

Collects only necessary source code files into code.txt, skipping build
artifacts, virtualenvs, dependencies, and temporary files.
"""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUT_FILE = ROOT / "code.txt"

# Whitelist extensions
VALID_EXTENSIONS = {".py", ".ts", ".tsx", ".css", ".html", ".json"}

# Exclude directories
EXCLUDED_DIRS = {
    "node_modules",
    "dist",
    "build",
    ".git",
    "__pycache__",
    ".pytest_cache",
    ".venv",
    "venv",
    "legacy",
}

# Exclude specific files
EXCLUDED_FILES = {
    "package-lock.json",
    "tsconfig.app.tsbuildinfo",
    "code.txt",
}


def should_include(file_path: Path) -> bool:
    # Check parent dirs
    for part in file_path.parts:
        if part in EXCLUDED_DIRS:
            return False

    if file_path.name in EXCLUDED_FILES:
        return False

    if file_path.suffix not in VALID_EXTENSIONS:
        return False

    return True


def export_code():
    print(f"Scanning project root: {ROOT}")
    files_to_export = []

    for root, dirs, files in os.walk(ROOT):
        # Prune excluded dirs
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]

        for file in sorted(files):
            p = Path(root) / file
            if should_include(p):
                files_to_export.append(p)

    files_to_export.sort()
    print(f"Found {len(files_to_export)} source files to export.")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
        out.write(f"# PATHFINDER CODEBASE EXPORT\n")
        out.write(f"# Total Files: {len(files_to_export)}\n\n")

        for f in files_to_export:
            rel_path = f.relative_to(ROOT).as_posix()
            out.write(f"{'='*80}\n")
            out.write(f"FILE: {rel_path}\n")
            out.write(f"{'='*80}\n\n")
            try:
                content = f.read_text(encoding="utf-8")
                out.write(content)
                if not content.endswith("\n"):
                    out.write("\n")
            except Exception as e:
                out.write(f"[Error reading file: {e}]\n")
            out.write("\n\n")

    print(f"Successfully generated: {OUTPUT_FILE} ({os.path.getsize(OUTPUT_FILE)} bytes)")


if __name__ == "__main__":
    export_code()
