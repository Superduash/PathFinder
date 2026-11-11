# PathFinder — AI Search Algorithm Visualizer & Benchmark Suite

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![React 19](https://img.shields.io/badge/react-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**PathFinder** is a local AI search algorithm visualizer, benchmark harness, and machine learning testbed built for studying and comparing classical heuristic search techniques against learned models on grid graphs.

---

## 🌟 Key Features

1. **Interactive Stepwise Visualizer (Phase 5):**
   - High-performance Canvas 2D engine with sub-millisecond drawing and pointer-drag Bresenham interpolation.
   - Interactive drawing tools: Wall, Erase, Sand (cost 3.0), Water (cost 5.0), Start, and Goal.
   - Live multi-participant races powered by WebSocket streaming with delta exploration.
   - Hotkeys: <kbd>Space</kbd> (Start/Pause), <kbd>S</kbd> (Step), <kbd>R</kbd> (Reset).

2. **Supported Classical Search Algorithms:**
   - **BFS (Breadth-First Search):** Unweighted shortest path.
   - **DFS (Depth-First Search):** Deep exploration with minimal corridor memory.
   - **UCS (Uniform-Cost Search / Dijkstra):** Optimal cost on arbitrary weighted terrain.
   - **Greedy Best-First:** Heuristic-driven speed towards target.
   - **A\* Search:** Optimal heuristic search with admissible heuristics.

3. **Multi-Heuristic Engine:**
   - Manhattan, Euclidean, Octile, Chebyshev (diagonal only), and Zero heuristics.

4. **Batch Benchmark & Metrics Engine (Phase 6):**
   - Head-to-head timed comparisons with isolated GC execution.
   - Batch background jobs across grid dimensions and densities.
   - Summary statistics (nodes expanded, runtime variance, $C^*/C$ optimality).
   - CSV export for both summary and per-run telemetry.

5. **Machine Learning Laboratory (Phase 6):**
   - **Heuristic Regression:** Linear Regression & Decision Tree models trained to predict true distance $h(n)$ with MAE, $R^2$, and overestimation reporting.
   - **Algorithm Classifier:** Decision Tree classifier predicting the fastest search algorithm on unseen mazes against a majority-class baseline.

---

## 🚀 Quickstart

### Prerequisites
- Python 3.11 or newer
- Node.js 20 or newer with npm

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/Superduash/PathFinder.git
cd PathFinder

# Install backend dependencies
pip install -r requirements.txt

# Install frontend dependencies and build production UI
cd frontend
npm install
npm run build
cd ..
```

### 2. Running PathFinder
Run the integrated local server (serves the backend API, WebSocket, and compiled frontend):
```bash
python run.py
```
Or double-click **`start-all.bat`** on Windows.
The browser automatically opens to: **`http://127.0.0.1:8000`**

#### Command-Line Options:
- **Seed sample demo data:**
  ```bash
  python run.py --seed-demo
  ```
  Runs a quick benchmark and trains fast ML models with fixed seeds so first-time demos look immediately populated.
- **Wipe and reset database:**
  ```bash
  python run.py --reset-db
  ```
- **Custom host and port:**
  ```bash
  python run.py --host 127.0.0.1 --port 8000
  ```
  *(If port 8000 is occupied, PathFinder automatically searches and binds to the next available port).*
- **No browser pop-up:**
  ```bash
  python run.py --no-browser
  ```

### 3. Developer Mode (Hot Reload)
To run frontend and backend with hot-reloading:
- **Windows:**
  ```powershell
  .\scripts\dev.ps1
  ```
- **Linux / macOS:**
  ```bash
  ./scripts/dev.sh
  ```

---

## 🧪 Testing & Verification

Run the full pytest suite (27 comprehensive unit and integration tests):
```bash
python -m pytest -q
```

Run latency and benchmark SLA performance checks:
```bash
python scripts/perf_check.py
```

Re-generate TypeScript API types from FastAPI OpenAPI:
```bash
python scripts/gen_types.py
```

---

## 🔧 Troubleshooting

- **Port in use:** PathFinder automatically attempts binding to `port + 1` through `port + 5`. You can also manually specify `--port 8080`.
- **Database reset:** Delete the `data/` directory or run `python run.py --reset-db` to reset state.
- **Python version:** Requires Python 3.11 or newer (tested on Python 3.12).
- **Node version:** Requires Node.js 20 or newer.

---

## 🏛 Architecture

- **Backend:** FastAPI, Uvicorn, Pydantic v2, SQLite WAL mode with SQLAlchemy 2.0, NumPy, Scikit-learn, WebSockets.
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Radix UI primitives, Motion, Recharts, Zustand, TanStack Query.
