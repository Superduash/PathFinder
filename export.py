"""Single-file code exporter for AI reference.

Collects only necessary source code files into code.txt, skipping build
artifacts, virtualenvs, dependencies, and temporary files.

Updated to prioritize core backend files for BDS fixes and algorithm implementation.
"""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUT_FILE = ROOT / "code.txt"

# Priority files - these are exported first and always included
PRIORITY_FILES = [
    "backend/app/search/engine.py",
    "backend/app/search/bidirectional.py",
    "backend/app/search/algorithms.py",
    "backend/app/race.py",
    "backend/app/models.py",
    "backend/app/routes/ws.py",
    "backend/app/maze/grid.py",
    "backend/app/maze/generators.py",
    "backend/app/maze/presets.py",
    "backend/app/services/narration.py",
    "backend/app/services/insights.py",
    "polish4.md",
]

# Whitelist extensions
VALID_EXTENSIONS = {".py", ".ts", ".tsx", ".css", ".html", ".json", ".md"}

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
    "docs",  # Skip docs for code export
}

# Exclude specific files
EXCLUDED_FILES = {
    "package-lock.json",
    "tsconfig.app.tsbuildinfo",
    "code.txt",
    "export.py",
    "test_bds_fix.py",
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
    
    # First, collect priority files
    priority_paths = []
    for rel_path in PRIORITY_FILES:
        p = ROOT / rel_path
        if p.exists():
            priority_paths.append(p)
            print(f"  Priority: {rel_path}")
        else:
            print(f"  Warning: Priority file not found: {rel_path}")
    
    # Then collect other files
    other_files = []
    for root, dirs, files in os.walk(ROOT):
        # Prune excluded dirs
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]

        for file in sorted(files):
            p = Path(root) / file
            if should_include(p) and p not in priority_paths:
                other_files.append(p)

    other_files.sort()
    
    # Combine: priority first, then others
    files_to_export = priority_paths + other_files
    
    print(f"\nFound {len(priority_paths)} priority files + {len(other_files)} other files = {len(files_to_export)} total.")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
        out.write(f"# PATHFINDER CODEBASE EXPORT\n")
        out.write(f"# Generated: {Path(__file__).name}\n")
        out.write(f"# Total Files: {len(files_to_export)}\n")
        out.write(f"# Priority Files: {len(priority_paths)}\n")
        out.write(f"#\n")
        out.write(f"# Recent changes: BDS (Bidirectional Search) fixes from polish4.md Phase 3.1-3.2\n")
        out.write(f"# - Per-racer initial_waiting (BDS shows start+goal, others show start only)\n")
        out.write(f"# - Two-sided currents array for BDS visualization\n")
        out.write(f"# - Phase field derivation from status\n")
        out.write(f"# - Side-aware narration for BDS waves\n")
        out.write(f"\n")

        for i, f in enumerate(files_to_export):
            rel_path = f.relative_to(ROOT).as_posix()
            is_priority = i < len(priority_paths)
            marker = " [PRIORITY]" if is_priority else ""
            
            out.write(f"{'='*80}\n")
            out.write(f"FILE: {rel_path}{marker}\n")
            out.write(f"{'='*80}\n\n")
            try:
                content = f.read_text(encoding="utf-8")
                out.write(content)
                if not content.endswith("\n"):
                    out.write("\n")
            except Exception as e:
                out.write(f"[Error reading file: {e}]\n")
            out.write("\n\n")

    file_size = os.path.getsize(OUTPUT_FILE)
    file_size_mb = file_size / (1024 * 1024)
    print(f"\nSuccessfully generated: {OUTPUT_FILE}")
    print(f"Size: {file_size:,} bytes ({file_size_mb:.2f} MB)")


if __name__ == "__main__":
    export_code()

