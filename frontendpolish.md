# PathFinder — Frontend Polish + Local Backend Plan (`frontendpolish.md`)

**Audience:** the Antigravity agent. Execute the phases **in order**. Finish each phase's *Acceptance checks* before starting the next.
**Project:** PathFinder — AI Search Algorithm Visualizer and Benchmark. It is a **college AI/ML mini-project, not a production app**. Keep everything simple, local, and good-looking.

---

## 0. Ground rules (read first)

### 0.1 Relationship to `plan.md`
- `plan.md` stays the **source of truth** for: algorithm definitions (§3), maze model (§4), race rules (§5), benchmark protocol (§6), ML experiments (§7), and the **API/WebSocket contract (§11, binding)**.
- This file **overrides only** these `plan.md` items:
  | `plan.md` said | Now |
  |---|---|
  | Frontend = exactly 7 flat files, vanilla JS, no build step (§10.2) | Frontend = **Vite + React + TypeScript** project with a build step |
  | Only Chart.js allowed | Any library in the stack below is allowed |
  | Backend not part of the frontend deliverable | A **simple FastAPI backend is built in Phases 2–3** so the app runs locally |
  | Frontend ZIP deliverable | The deliverable is a **runnable repo** (`python run.py` + `npm run dev`) |
- **Unchanged hard rule:** the browser never implements search, maze generation, heuristics, benchmarking, scoring, or ML. The browser only does UI, painting edits, animation and I/O. All of that lives in the backend.
- **Do not change the contract in §11.** If the backend needs a new field, add it as *optional* and document it in `docs/contract-notes.md`.

### 0.2 Starting point
The existing vanilla frontend (`pathfinder-frontend.zip`: `index.html, styles.css, app.js, api.js, maze-canvas.js, race.js, lab.js`) is the **behavioural reference**. Port its logic (race state machine, one-request-in-flight tick loop, `MazeView` layered canvas, job polling, benchmark and ML rendering). Do not port its DOM code. Put the old files in `legacy/` for reference, then delete `legacy/` in Phase 10.

### 0.3 Agent operating rules
1. One git commit per sub-phase: `phase-3.2: websocket race session`.
2. After each sub-phase run: `npm run typecheck && npm run lint` (frontend) and `pytest -q` (backend, from Phase 2 on).
3. Never leave a button that does nothing. Disable it and show the reason in a tooltip.
4. No hardcoded benchmark numbers, ML metrics, or predictions anywhere. Show only what the server returns.
5. No emoji as icons. No purple-blue gradient heroes, glassmorphism, or decorative blobs. Calm, educational, teal-accent dark theme (`plan.md` §8.1).
6. Keep it simple: no auth, no database, no Docker, no Redux, no microservices. Jobs live in memory.

---

## 1. Tech stack

### 1.1 Frontend
| Concern | Choice | Why |
|---|---|---|
| Build / dev server | **Vite** | Instant HMR, zero config |
| UI framework | **React 18 + TypeScript** | Component model, smooth re-render control |
| Routing | **React Router v6** (`HashRouter`) | Keeps `#/visualizer`-style URLs; works when served as static files |
| Styling | **Tailwind CSS** + CSS variables for tokens | Fast, consistent spacing/radius |
| Components | **shadcn/ui** (Radix primitives) | Accessible Tabs, Dialog, Tooltip, Slider, Select, Switch, Accordion, Popover |
| Icons / logo | **lucide-react** | Tree-shaken SVG icons; logo = `Route` icon + wordmark |
| Animation | **motion** (`motion/react`, formerly framer-motion) | Page transitions, layout animation, springs, number tweens |
| Toasts | **sonner** | Stacked, swipeable, accessible toasts with promise support |
| Server state | **TanStack Query v5** | Caching, retries, job polling with `refetchInterval` |
| Client state | **Zustand** | One small store for maze, selection, race UI state |
| Charts | **Recharts** | React-native, animated, responsive |
| Forms | **react-hook-form** + **zod** | Typed validation of benchmark/ML parameters |
| Fonts | `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono` | Local fonts; works offline |
| Misc | `clsx`, `tailwind-merge`, `canvas-confetti` (optional, winner only), `use-debounce` | Small helpers |
| Tests | **Vitest** + **React Testing Library**, **Playwright** (one smoke test) | Light but real |
| Canvas | **Plain Canvas 2D** wrapped in a React hook (`useMazeCanvas`) | Third-party canvas libs would be slower than a tuned typed-array renderer |

### 1.2 Backend (simple, local)
| Concern | Choice |
|---|---|
| Web framework | **FastAPI** + **uvicorn[standard]** (REST + WebSocket) |
| Validation | **Pydantic v2** models mirroring `plan.md` §11 |
| Numerics / ML | **numpy**, **scikit-learn** (`LinearRegression`, `DecisionTreeRegressor/Classifier`, `DummyClassifier`, `GroupShuffleSplit`, `train_test_split`) |
| Jobs | `threading.Thread` + in-memory dict (no Celery) |
| Tests | **pytest** |
| Entry | `python run.py` → uvicorn on `127.0.0.1:8000`, serves `/api`, `/ws/race`, and the built frontend from `frontend/dist` |

### 1.3 Target repository layout
```
pathfinder/
├─ plan.md
├─ frontendpolish.md
├─ run.py                      # starts backend (+ serves frontend/dist if built)
├─ requirements.txt
├─ backend/
│  ├─ app/
│  │  ├─ main.py               # FastAPI app, CORS, static mount, error handlers
│  │  ├─ models.py             # Pydantic schemas (contract §11)
│  │  ├─ errors.py             # ApiError + error envelope
│  │  ├─ maze/ {grid.py, generators.py, presets.py}
│  │  ├─ search/ {algorithms.py, heuristics.py, reference.py}
│  │  ├─ race.py               # RaceSession (stepwise search)
│  │  ├─ benchmark.py          # runner + stats + CSV
│  │  ├─ jobs.py               # in-memory job manager
│  │  ├─ ml/ {features.py, regression.py, classification.py, store.py}
│  │  └─ routes/ {health.py, maze.py, solve.py, benchmark.py, ml.py, ws.py}
│  └─ tests/
├─ frontend/
│  ├─ index.html
│  ├─ vite.config.ts           # dev proxy: /api and /ws → :8000
│  └─ src/
│     ├─ main.tsx, App.tsx, routes.tsx
│     ├─ styles/ {globals.css, tokens.css}
│     ├─ lib/ {api.ts, ws.ts, types.ts, motion.ts, format.ts, cn.ts}
│     ├─ store/ {useAppStore.ts, useRaceStore.ts}
│     ├─ hooks/ {useMazeCanvas.ts, useRace.ts, useJob.ts, useHealth.ts, useHotkeys.ts}
│     ├─ components/ {ui/ (shadcn), layout/, maze/, race/, charts/, feedback/}
│     └─ pages/ {Landing, Visualizer, Benchmark, MLLab, About}.tsx
└─ docs/ {contract-notes.md, demo-script.md}
```

---

## Phase 1 — Scaffold, tooling, and contract types

**Goal:** an empty-but-running monorepo with typed contracts.

### 1.1 Repo + tooling
- Create the layout in §1.3. `git init`. Add `.gitignore` (node_modules, dist, `__pycache__`, `.venv`, `backend/data/models`).
- `requirements.txt`: `fastapi`, `uvicorn[standard]`, `pydantic>=2`, `numpy`, `scikit-learn`, `joblib`, `pytest`, `httpx`.
- `npm create vite@latest frontend -- --template react-ts`. Add all libraries from §1.1. Initialise Tailwind and `npx shadcn@latest init`; add components: `button card tabs dialog tooltip slider select switch accordion popover progress badge table skeleton separator sonner`.
- Scripts in `frontend/package.json`: `dev`, `build`, `preview`, `typecheck` (`tsc --noEmit`), `lint`, `test`.
- `vite.config.ts` dev proxy: `/api` → `http://127.0.0.1:8000`; `/ws` → `ws://127.0.0.1:8000` (`ws: true`).

### 1.2 Typed contract
- `frontend/src/lib/types.ts`: TypeScript types for every object in `plan.md` §11.2 (`Maze`, `Participant`, `SearchResult`, `TimingStats`, race messages, `BenchmarkConfig`, job results, regression/classification results, error envelope).
- `backend/app/models.py`: the matching Pydantic models. **Field names must be identical** (snake_case in result objects, camelCase only where the contract uses it: `requestId`, `raceId`, `jobId`).
- `backend/app/errors.py`: `ApiError(code, message, details, status)` plus a FastAPI exception handler that always returns `{"error": {code, message, details}}`.

### 1.3 Hello-world wiring
- `GET /api/health` returns the §11.4 shape. The React app shows a `Connected / Disconnected` pill using it.

**Acceptance checks**
- `python run.py` serves `/api/health`; `npm run dev` shows the pill turning green.
- `npm run typecheck` passes. Pydantic models import without errors.

---

## Phase 2 — Backend core (REST): mazes, algorithms, solve, compare

**Goal:** everything the Visualizer and single-compare need, following `plan.md` §3, §4, §6.

### 2.1 Maze model and generators
- `grid.py`: `Maze` dataclass (rows, cols, flat `cells`, start, goal, diagonal, seed, meta). Cell codes 0/1/2/3 with costs 1/∞/3/5. Neighbour function with 4- or 8-direction moves; **no corner cutting**; diagonal cost = `√2 × entry cost`.
- `generators.py`: `empty`, `random` (density), `backtracker` (odd dims), `braided` (loop_fraction 0.08), weighted terrain blobs (seeded), `randomize_endpoints` (Manhattan ≥ 0.5·(rows+cols) when possible), `ensure_solvable` (retry up to 50 derived seeds). Use `random.Random(seed)`; return the seed used.
- `presets.py`: `open_field`, `wall_with_gap`, `greedy_trap`, `weighted_river`, `corridor_maze`, `unreachable_goal` (deterministic).
- Validation raising `OUT_OF_BOUNDS`, `START_IS_WALL`, `GOAL_IS_WALL`, `INVALID_MAZE`, `MAZE_TOO_LARGE`.

### 2.2 Search algorithms (stepwise-capable)
- Implement BFS, DFS, UCS, Greedy, A* as **classes with `step()`** that perform exactly one expansion and expose `expanded_count`, `frontier` (distinct cells), `peak_frontier`, `peak_open_entries`, `status`, `reason`, `path`. The same class powers `/api/solve`, races and benchmarks, so results agree.
- Heuristics: manhattan, euclidean, chebyshev (diagonal only → `HEURISTIC_NOT_ALLOWED` otherwise), octile. `learned` arrives in Phase 3.
- `reference.py`: independent Dijkstra for `C*` and for the reverse cost-to-goal map. `validate_path()` recomputes cost.
- Optimality = `C*/C` with the edge cases in `plan.md` §6.2.

### 2.3 Routes
Implement exactly: `GET /api/meta` (algorithms with description/pros/cons/complexity, heuristics, generators, presets, cell_types, limits, defaults), `POST /api/maze/generate`, `/maze/preset`, `/maze/randomize-endpoints`, `/maze/validate`, `POST /api/solve`, `POST /api/compare` (1 warm-up + `repeats` timed runs via `perf_counter_ns`, `gc` disabled during timing, median/mean/std/min/max, environment metadata).

### 2.4 Tests
- Property tests on random mazes: BFS/UCS/A*(admissible)/Dijkstra costs agree; every path passes `validate_path`; DFS cost ≥ optimal; unreachable goal → `failed/no_path`; start == goal → cost 0.

**Acceptance checks**
- `pytest -q` green. `curl` of generate → solve → compare returns contract-shaped JSON.
- Swagger at `/docs` lists the endpoints.

---

## Phase 3 — Backend: race WebSocket, benchmark jobs, ML

**Goal:** the rest of the contract so every frontend screen has real data.

### 3.1 Race session over `/ws/race`
- Messages exactly as `plan.md` §11.3: `race.init → race.ready`, `race.step → race.update`, `race.summary` sent right after the final update, `race.reset`, `ping/pong`, `error`.
- One `RaceSession` per connection; a new `race.init` replaces the old one. Each tick: every running participant performs exactly `k` `step()` calls (`k` capped at 500). Return **deltas** (`expanded`, `discovered`) and cumulative `stats`. Include `path` and final stats at termination. Ranking: found before failed → fewer expansions → lower path cost. Reject with `BUSY` while a benchmark job runs.
- Add `compute_ms` accumulated with `perf_counter` around `step()` only.

### 3.2 Job manager + benchmark
- `jobs.py`: `create(kind, fn)`, thread runner with `progress {done,total,label}`, cancel flag, status `queued|running|done|error|cancelled`. Routes: `POST /api/benchmark/jobs`, `GET /api/jobs/{id}`, `POST /api/jobs/{id}/cancel`, `GET /api/jobs/{id}/csv?table=rows|summary|dataset`.
- `benchmark.py`: seeds `base_seed*1_000_003 + config_index*1_000 + k`; identical mazes for all algorithms; shuffled run order; warm-up + repeats; summary stats and `within_noise_of_best`; `expansion_budget`; `CONFIG_TOO_LARGE` over 3000 mazes. Groups: `overall` plus by `size`.

### 3.3 ML (simple versions of `plan.md` §7)
- `features.py` with numpy features. `regression.py`: dataset, `GroupShuffleSplit`, Linear + Tree, Manhattan baseline, overestimate stats; `learned` heuristic table with one batched `predict`; `POST /api/ml/regression/astar-compare` including optional heatmap. `classification.py`: labels by really running the algorithms, `DecisionTreeClassifier(max_depth=5)`, `DummyClassifier` baseline, confusion matrix, importances, `export_text`, degenerate-class warning; `POST /api/ml/classification/predict` with `run_actual`.
- `ml/store.py`: keep the latest models and results in memory; `GET /api/ml/status` returns them (`{trained_at, params, metrics}` where `metrics` is the full job result — document this in `docs/contract-notes.md`).
- Default sizes are **small and fast** (e.g. 80–150 mazes) so training finishes in seconds on a laptop.

### 3.4 Static hosting
- `main.py` mounts `frontend/dist` at `/` when it exists. CORS allows `http://localhost:5173` in dev.

**Acceptance checks**
- A small Python script (`backend/tests/test_ws.py`, using `TestClient.websocket_connect`) plays a full race and verifies deltas reconstruct the same explored set as `/api/solve` with `include_trace`.
- A benchmark job finishes, CSV downloads, and a regression and classification job each finish and populate `/api/ml/status`.

---

## Phase 4 — Frontend foundation: design system, shell, data layer

**Goal:** the app *feels* like a polished React product before any feature lands.

### 4.1 Design tokens (`tokens.css` + Tailwind theme)
- Colours from `plan.md` §8.1: `--bg #0E1116`, `--surface #151A21`, `--surface-2 #1C222B`, `--border #2A323D`, `--text #E6EAF0`, `--text-muted #9AA5B1`, `--accent #3DD6C6`, `--danger #FF6B6B`, `--warning #F2C94C`, `--success #5BD68A`. Algorithm colours: BFS `#4C9AFF`, DFS `#FF9F43`, UCS `#F2C94C`, Greedy `#E86AB8`, A* `#5BD68A`.
- 4-px spacing scale, 12-px card radius, 1-px borders. Inter for UI, JetBrains Mono (tabular numbers) for stats.
- Map tokens into the shadcn theme so every primitive matches.

### 4.2 App shell
- `AppShell`: sticky top bar (logo, nav links with an animated underline using `layoutId`, connection pill, shortcuts button), main content, footer.
- **Connection pill:** `useHealth()` (TanStack Query, 5 s interval, retry with back-off) plus WebSocket state. States: Connected (green), Connecting (amber, pulsing dot), Disconnected (red + Retry).
- **Disconnected banner** (animated slide-down): "Backend not reachable. Start the server with `python run.py`, then Retry." Controls that need the backend are disabled with tooltips.
- **Page transitions:** `AnimatePresence mode="wait"` with a 160 ms fade + 8 px rise. Routes are lazy-loaded (`React.lazy` + `Suspense` with skeletons).

### 4.3 Data layer
- `lib/api.ts`: typed `request<T>()`, parses the error envelope into `ApiError`; one function per endpoint.
- `lib/ws.ts`: `RaceSocket` class (connect, typed send, subscribe, 20 s ping, back-off 0.5 s → 5 s). Wrapped by `useRaceSocket()`.
- `hooks/useJob.ts`: starts a job, polls `GET /api/jobs/{id}` every 500 ms via `refetchInterval`, exposes `{progress, status, result, cancel}`, stops polling on terminal status.
- `store/useAppStore.ts` (Zustand): current `maze`, maze params, selected participants, tool, seed. `useRaceStore.ts`: race state machine and per-participant stats.
- Global `QueryClient` defaults: `retry: 1`, `refetchOnWindowFocus: false`.

### 4.4 Feedback system
- `<Toaster richColors closeButton position="bottom-right" />` from sonner, themed to tokens.
- `notify.ts` helper: `notify.success/info/error`, `notify.promise(promise, {loading, success, error})`. Errors always show `code: message`.
- Global error boundary with a friendly fallback and "Reload" button.

**Acceptance checks**
- Navigating between empty pages animates smoothly with no layout jump; the pill reacts when the backend is killed and restarted; the banner appears and disappears with animation.

---

## Phase 5 — Visualizer (the centrepiece)

**Goal:** buttery race animation and painting, 60 fps with 5 panels of 60×60.

### 5.1 Canvas engine: `useMazeCanvas`
- Port `MazeView` ideas into a hook returning `{canvasRef, api}`:
  - DPR-aware sizing through `ResizeObserver`; **three layers**: cached static layer (offscreen canvas: floor, wall, terrain dots, faint grid), overlay layer (explored/frontier), and a compose step (static + heatmap + overlay + path + S/G markers).
  - State in `Uint8Array` (0 none, 1 explored, 2 frontier). Updates touch only changed cells; compose is scheduled through **one `requestAnimationFrame`** per canvas (coalesced).
  - Path drawing: animated "draw-in" along the path using a per-frame `progress` value (≈400 ms) with a light outline; dashed for variant participants.
  - Start = circle "S"; goal = diamond "G"; terrain uses dot patterns (not colour alone).
  - Pointer Events painting with `setPointerCapture`, Bresenham interpolation between pointer samples so fast drags leave no gaps, `touch-action: none`, hover-cell highlight ring.
- Cell edits are **UI edits only** (wall/erase/sand/water/start/goal).

### 5.2 Controls (shadcn components)
- **Maze card:** sliders for rows/cols (5–60) with live numeric readouts, type `Select`, density slider (enabled for random), weighted `Switch` + fraction, diagonal `Switch`, seed input + dice button (icon rotates on click), **Generate**, preset `Select` + **Load**, random start/goal, Clear walls, Clear terrain.
- **Tools:** segmented toolbar (Wall, Erase, Start, Goal, Sand, Water) with `aria-pressed`; cursor changes per tool.
- **Algorithms:** animated list (`AnimatePresence`) of the five algorithms with colour chip, enable `Switch`, heuristic `Select` (Chebyshev only if diagonal; warning banner "Manhattan is not admissible with diagonal moves"), **Add variant** and remove actions. Max 5 participants.
- **Race controls:** Start / Pause↔Resume / Step / Reset with lucide icons, speed slider 1–10 mapped to `[1,1,2,3,5,8,13,21,34,55]` expansions per tick, readout "k = N expansions per tick".
- Controls on desktop live in a left column; at 700–1099 px they collapse into an `Accordion`; below 700 px they stack.

### 5.3 Stage and race
- **Edit mode:** one large editable canvas. **Race mode:** one read-only panel per participant in a responsive grid; entering/leaving race mode animates with `layout` transitions (panels glide into place, no snapping).
- Race hook `useRace()` implements the state machine `idle → initing → ready → running ⇄ paused → finished | disconnected`:
  - send `race.init`; on `race.ready` draw `initial`; loop: send `race.step` with current `k`, **one request in flight**, target ≈33 ms between ticks; apply deltas (discovered first, then expanded); stop on `finished`; handle `race.summary`.
  - Socket drop mid-race → state `disconnected`, button **Reconnect and restart**.
  - Pause just stops sending steps. Reset sends `race.reset` and returns to edit mode.
- Editing is locked during a race (controls dim with a tooltip "Reset to edit").
- Unreachable goal: inline callout "Goal unreachable — all algorithms will exhaust the search" (distinct from errors).
- Hotkeys via `useHotkeys`: Space start/pause, S step, R reset, 1–5 toggle algorithms. Ignored while typing.

### 5.4 Stats cards and winner
- One card per participant: status badge (icon + text), expanded, frontier, peak frontier, path length, path cost, optimality (on finish), "server compute ms (indicative)", rank.
- Numbers tween smoothly (`useSpring`/`animate` number component) and use tabular figures. Progress ring or bar based on expansions vs the maximum seen.
- Winner banner with spring entrance and a subtle highlight on the winning card; optional single small `canvas-confetti` burst (respect reduced motion). Text: "Winner by search effort (expansions), not wall-clock time."
- `aria-live="polite"` race status line.

**Acceptance checks**
- A 60×60 five-algorithm race stays smooth (no dropped-frame stutter in the browser Performance panel at default speed; 5.x ms scripting per tick).
- Dragging fast across the canvas leaves a continuous line on mouse and touch (DevTools device mode).
- Killing the backend mid-race shows the disconnected state and the restart button works after restart.

---

## Phase 6 — Benchmark and ML Lab views

**Goal:** data-heavy screens that still feel light.

### 6.1 Benchmark page
- Tabs: **Single comparison** | **Batch benchmark**.
- **Single:** thumbnail of the current maze (read-only canvas), participant toggles, repeats input, **Run comparison** → `notify.promise`; results table with animated row entrance and "time ± std".
- **Batch form** (`react-hook-form` + `zod`): size chips (15, 30, 50 + custom `RxC`), densities, types, mazes per config, algorithms/heuristics, repeats (≤ 20), base seed, ensure-solvable `Switch`, optional expansion budget, live "total mazes" counter that turns amber above the 3000 limit.
- **Job UX:** animated `Progress` with label (`maze 41/240`), Cancel, `aria-live` updates; warning "Don't run a race while a benchmark runs".
- **Results:** summary table (sortable, "within noise" badge with tooltip explaining why no time winner is declared), four Recharts charts (mean time with std; nodes expanded grouped; optimality mean + min; time vs maze area), collapsible paged per-run table, environment card, **Export CSV (summary)** and **(all runs)** buttons (download through the API).
- **Empty state** before the first run: icon, explanation, primary button that scrolls to the form.
- Honest-timing note: "Timings are pure Python on this machine; nodes expanded is the machine-independent comparison."

### 6.2 ML Lab page
Two cards side by side (stacked on small screens). Each shows the note "No fixed accuracy is promised; results depend on the generated data."
- **Regression card:** parameters (`n_mazes`, `samples_per_maze`, `test_size`, `seed`) → Train (job progress) → dataset info, metrics table (Linear / Tree / Manhattan baseline: MAE, R², overestimate %), coefficient list. **Demo:** model select, "Compare A* heuristics on the current maze" → table (expansions, cost, optimality, `h > true` count) + overlay toggle drawing the returned heatmap on a read-only canvas. Permanent warning: a learned heuristic can overestimate, so A* may lose optimality.
- **Classification card:** parameters (`n_mazes`, `test_size`, `seed`, criterion, tolerance) → Train → dataset info with a class-distribution bar (animated widths), metrics (accuracy, macro P/R/F1) shown **next to the majority-class baseline**, confusion matrix as a heat-shaded table, feature-importance bar chart, tree rules in a scrollable `<pre>`, server warnings in a callout. **Demo:** "Predict for the current maze" with probabilities bar and an optional "Run actual race to verify" showing correct/incorrect.
- On load call `GET /api/ml/status` to restore previous results.
- Skeletons while loading; every error shows inline next to the control plus a toast.

**Acceptance checks**
- Run a small benchmark end to end; charts animate in; CSV files download and open correctly.
- Train both models; reload the page; results are restored from `/api/ml/status`.

---

## Phase 7 — Landing, About, motion language, toasts

**Goal:** first impression and consistent micro-interactions.

### 7.1 Landing
- Hero: headline "Watch search algorithms think", one-sentence description, **Launch visualizer** (primary) and **See how it works** (smooth-scrolls to the overview).
- **Hero visual:** a real, looped race. Request a seeded 15×15 maze (`POST /api/maze/generate`, seed 7) and run BFS vs A\* over `/ws/race`; pause when scrolled off-screen (`IntersectionObserver`) or when the tab is hidden. If the backend is offline show a static, non-animated grid illustration. The browser never simulates the search.
- Algorithm cards from `/api/meta` (stagger-in on scroll with `whileInView`), feature highlight cards linking to views, a three-step "how it works", footer with project name, "College mini-project", tech stack list, view links, backend version.

### 7.2 About
- Algorithm explanations (from `/api/meta` + short static text), heuristic table with admissibility notes, metric definitions with the optimality formula `C*/C`, problem formulation and PEAS, syllabus mapping, "Not implemented" list, keyboard shortcuts, credits. Use an `Accordion` for long sections. Print-friendly stylesheet.

### 7.3 Motion language (`lib/motion.ts`)
| Interaction | Spec |
|---|---|
| Hover / press | 120 ms ease-out; buttons scale 0.98 on press |
| Cards entering | fade + 8 px rise, 180 ms, stagger 40 ms |
| Page change | 160 ms fade + rise |
| Panels (layout) | spring `{stiffness: 260, damping: 28}` |
| Number change | spring tween ≈250 ms |
| Progress bars | width spring, no linear jumps |
| Path draw-in | ≈400 ms ease-out |
| Reduced motion | `useReducedMotion()` + `MotionConfig reducedMotion="user"` removes transforms; keep only opacity |

No parallax, bouncing, or animated gradients.

### 7.4 Toast catalogue (sonner)
| Event | Type | Text pattern |
|---|---|---|
| Maze generated / preset loaded | success | "Maze 20×30 generated (seed 42)" |
| Goal unreachable after generate | warning | "Goal unreachable in this maze" |
| Race finished | success | "Race finished — A* won with 52 expansions" |
| Socket dropped | error (persistent until dismissed) | "Connection lost. Reconnect and restart the race." |
| Backend back online | success | "Backend connected" |
| Benchmark / ML complete | success | "Benchmark complete: 240 mazes, 3.2 s" |
| Job cancelled | info | "Benchmark cancelled" |
| API error | error | "`START_IS_WALL`: Start cell (3, 4) is a wall." |
| CSV exported | success | "summary.csv downloaded" |
Dedupe by `id` so repeated errors do not stack.

**Acceptance checks**
- Landing demo loops using only backend data; offline shows the static illustration.
- With "reduce motion" on in the OS, nothing slides or scales.

---

## Phase 8 — Performance and smoothness pass

**Goal:** make "smooth like a polished React site" measurable.

### 8.1 Rendering performance
- Memoise heavy components (`React.memo`, stable callbacks). Race panels read from **refs/imperative canvas APIs**, not React state, so ticks cause **no React re-renders** except throttled (≈4 Hz) stats text updates.
- Batch Zustand updates; use selectors to avoid wide re-renders.
- Avoid per-tick allocations: reuse typed arrays; parse `race.update` once.
- Pause canvases that are off-screen (`IntersectionObserver`) and when `document.hidden`.

### 8.2 Bundle and load
- Route-level code splitting; lazy-load Recharts and the ML/Benchmark pages. Import lucide icons by name only.
- Target: initial JS < 250 KB gzipped, Lighthouse Performance ≥ 90 on the landing page (local preview build).
- Preload the two font files; `font-display: swap`.

### 8.3 Network behaviour
- Debounce slider-driven requests; never auto-generate on every slider tick (Generate is explicit).
- Abort in-flight REST requests on unmount (`AbortController`); WebSocket handlers are removed in cleanup (no listener leaks in StrictMode).

### 8.4 Measure
- Record a Performance trace of a 5-panel race and note frame times in `docs/perf-notes.md`.
- Add a tiny dev-only FPS meter (hidden in production builds).

**Acceptance checks**
- React Profiler shows no re-render storms during a race; frame time stays under 16 ms in the desktop trace.

---

## Phase 9 — Accessibility, responsiveness, states, tests

### 9.1 Accessibility (WCAG 2.2 AA target)
- Landmarks (`header`, `nav`, `main`, `section`, `footer`), one `h1` per page, skip link, visible `:focus-visible` rings (teal), full keyboard operation including a keyboard-accessible canvas editor: arrow keys move a cursor cell, Enter/Space applies the current tool.
- Contrast ≥ 4.5:1 for text, ≥ 3:1 for UI and key canvas elements. Status never by colour alone (icon + text).
- `aria-live="polite"` for race status and job progress; canvases have `role="img"` with an updating `aria-label` ("A*: 233 explored, 18 frontier, path found").
- Labels on all fields; errors linked with `aria-describedby`; Radix handles dialog/tooltip semantics.

### 9.2 Responsive
- ≥ 1100 px three-zone visualizer; 700–1099 px accordion controls; < 700 px stacked layout, race panels one column, larger touch targets (≥ 40 px).
- Tables scroll inside their own containers; charts use `ResponsiveContainer`.

### 9.3 States everywhere
- **Loading** skeletons and spinners; **empty** states (Benchmark, ML); **success** toast + inline confirmation; **error** inline + toast using `code: message`; **disconnected** banner with disabled controls (Landing and About still render).

### 9.4 Tests (keep light)
- Backend: `pytest` suite from Phases 2–3 stays green.
- Frontend Vitest: reducer/state-machine tests for `useRace` (mock socket), zoning of speed → `k` mapping, delta application, error-envelope parsing.
- One **Playwright smoke test** (against `python run.py` + built frontend): load app → generate maze → start race → wait for winner banner → open Benchmark → run a tiny benchmark → see charts.

**Acceptance checks**
- Keyboard-only run-through works. axe DevTools shows no serious violations on the five pages.
- Playwright smoke test passes.

---

## Phase 10 — Final polish, packaging, demo

### 10.1 Visual polish checklist
- Consistent spacing/radius everywhere; no orphaned default browser styles; custom scrollbars (thin, tokenised).
- Subtle focus/hover states on every interactive element. Empty/loading/error states reviewed on each page.
- Favicon (lucide `Route` as SVG), page titles per route, social meta tags, a clean 404 route.
- Dark theme only (simple). Remove all `console.log`, dead code, and `legacy/`.

### 10.2 One-command run
- `run.py`: if `frontend/dist` is missing, prints "Run `npm run build` in frontend/ for the production UI" and still serves the API; otherwise serves everything on `http://127.0.0.1:8000`.
- Root `package.json`-free helper scripts: `make dev` / `make build` or simple `scripts/dev.ps1` + `scripts/dev.sh` starting uvicorn (reload) and `npm run dev` together.
- `README.md` (short): requirements (Python 3.11+, Node 20+), install, run (dev and production), screenshots placeholders replaced by real screenshots, project structure, and the honest-limitations list from `plan.md`.

### 10.3 Demo preparation (`docs/demo-script.md`)
Follow `plan.md` §13.3 (8–10 minutes): landing hero → generate a seeded maze → race BFS/DFS/A* → show unreachable preset → single compare → small benchmark with charts → regression demo with heatmap and the "may lose optimality" note → classification vs majority baseline → About page. Add a "if something fails" fallback list (backend restart, pre-trained models via `/api/ml/status`).

### 10.4 Final QA matrix
| Check | Result |
|---|---|
| Fresh clone → install → `python run.py` → UI loads | ☐ |
| All five pages work online; Landing + About render offline | ☐ |
| Every button does something real or is disabled with a reason | ☐ |
| No hardcoded numbers (grep for sample metrics) | ☐ |
| Same seed reproduces the same maze and benchmark list | ☐ |
| Reduced-motion and keyboard-only pass | ☐ |
| `pytest`, `vitest`, Playwright smoke all green | ☐ |
| Console clean (no errors/warnings) in a full demo run | ☐ |

**Definition of done:** a classmate can clone the repo, follow the README, and run the full demo script without help; the UI feels fast and consistent; every number on screen comes from the backend.
