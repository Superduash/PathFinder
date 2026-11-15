"""Export the current implementation into one compact AI-reference file."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUT_FILE = ROOT / "code.txt"

# Current contract and core execution paths are exported first.
PRIORITY_FILES = [
    "README.md",
    "requirements.txt",
    "polish4.md",
    "docs/contract-notes.md",
    "docs/behavior-report.md",
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
    "backend/app/main.py",
    "backend/app/routes/maze.py",
    "backend/app/routes/meta.py",
    "backend/app/routes/learn.py",
    "frontend/package.json",
    "frontend/vite.config.ts",
    "frontend/index.html",
    "frontend/src/App.tsx",
    "frontend/src/routes.tsx",
    "frontend/src/pages/Visualizer.tsx",
    "frontend/src/pages/Landing.tsx",
    "frontend/src/pages/Benchmark.tsx",
    "frontend/src/pages/Learn.tsx",
    "frontend/src/hooks/useRace.ts",
    "frontend/src/hooks/useMazeCanvas.ts",
    "frontend/src/lib/raceUi.ts",
    "frontend/src/styles/tokens.css",
    "frontend/src/styles/globals.css",
    "scripts/verify_behavior.py",
    "scripts/demo_check.py",
    "scripts/check_contrast.ts",
    "scripts/check_contrast.mjs",
]

# Whitelist extensions
VALID_EXTENSIONS = {".py", ".ts", ".tsx", ".css", ".html", ".json", ".md", ".mjs", ".txt"}

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
    ".next",
    ".turbo",
}

# Exclude specific files
EXCLUDED_FILES = {
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
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


def compact(content: str) -> str:
    """Remove blank lines and trailing whitespace without changing code tokens."""
    lines = [line.rstrip() for line in content.splitlines()]
    return "\n".join(line for line in lines if line.strip())


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
        out.write("# Compact export: current source, tests, contracts, and release checks\n")

        for i, f in enumerate(files_to_export):
            rel_path = f.relative_to(ROOT).as_posix()
            is_priority = i < len(priority_paths)
            marker = " [PRIORITY]" if is_priority else ""
            
            out.write(f"{'=' * 80}\nFILE: {rel_path}{marker}\n{'=' * 80}\n")
            try:
                out.write(compact(f.read_text(encoding="utf-8")))
            except Exception as e:
                out.write(f"[Error reading file: {e}]\n")
            out.write("\n")

    file_size = os.path.getsize(OUTPUT_FILE)
    file_size_mb = file_size / (1024 * 1024)
    print(f"\nSuccessfully generated: {OUTPUT_FILE}")
    print(f"Size: {file_size:,} bytes ({file_size_mb:.2f} MB)")


if __name__ == "__main__":
    export_code()

