import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/lib/api";
import { 
  BookOpen, 
  Circle, 
  Triangle, 
  Square, 
  Diamond, 
  Star, 
  Hexagon,
  Map
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface WalkthroughFrame {
  step: number;
  current: number | null;
  current_coord: [number, number] | null;
  checked: number[];
  waiting: { idx: number; coord: number[]; g: number; h: number | null; f: number }[];
  note: string;
}

interface WalkthroughData {
  scenario: string;
  algorithm: string;
  total_steps: number;
  found: boolean;
  frames: WalkthroughFrame[];
}

// ─── Tiny scenario mini-maze visualizer ──────────────────────────────────────

const SCENARIO_GRIDS: Record<string, { rows: number; cols: number; cells: number[]; start: [number, number]; goal: [number, number] }> = {
  tiny: {
    rows: 7, cols: 7,
    start: [1, 1], goal: [5, 5],
    cells: [1,1,1,1,1,1,1, 1,0,0,0,1,0,1, 1,0,1,0,1,0,1, 1,0,1,0,0,0,1, 1,0,1,1,1,0,1, 1,0,0,0,0,0,1, 1,1,1,1,1,1,1],
  },
  trap: {
    rows: 7, cols: 7,
    start: [3, 1], goal: [3, 5],
    cells: [1,1,1,1,1,1,1, 1,0,0,0,0,0,1, 1,0,1,1,1,0,1, 1,0,1,0,1,0,1, 1,0,1,1,1,0,1, 1,0,0,0,0,0,1, 1,1,1,1,1,1,1],
  },
};

function MiniMaze({
  scenario,
  frame,
  path,
}: {
  scenario: string;
  frame: WalkthroughFrame | null;
  path?: number[];
}) {
  const grid = SCENARIO_GRIDS[scenario] || SCENARIO_GRIDS.tiny;
  const checkedSet = new Set(frame?.checked ?? []);
  const waitingSet = new Set((frame?.waiting ?? []).map((w) => w.idx));
  const pathSet = new Set(path ?? []);

  return (
    <div
      className="grid gap-px bg-border rounded-lg overflow-hidden border border-border"
      style={{ gridTemplateColumns: `repeat(${grid.cols}, 1fr)` }}
    >
      {grid.cells.map((cell, idx) => {
        const r = Math.floor(idx / grid.cols);
        const c = idx % grid.cols;
        const isStart = r === grid.start[0] && c === grid.start[1];
        const isGoal = r === grid.goal[0] && c === grid.goal[1];
        const isCurrent = frame?.current === idx;
        const isChecked = checkedSet.has(idx);
        const isWaiting = waitingSet.has(idx);
        const isPath = pathSet.has(idx);

        let bg = "bg-bg";
        if (cell === 1) bg = "bg-surface-2";
        if (isWaiting) bg = "bg-brand/30";
        if (isChecked) bg = "bg-brand/50";
        if (isPath) bg = "bg-green-500/60";
        if (isCurrent) bg = "bg-brand";
        if (isStart) bg = "bg-emerald-500";
        if (isGoal) bg = "bg-red-500";

        return (
          <div
            key={idx}
            className={`w-6 h-6 ${bg} flex items-center justify-center transition-colors duration-100`}
          >
            {isStart && <span className="text-[8px] font-bold text-white">S</span>}
            {isGoal && <span className="text-[8px] font-bold text-white">G</span>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Walkthrough component ────────────────────────────────────────────────────

function AlgorithmWalkthrough({ algorithmId }: { algorithmId: string }) {
  const [scenario, setScenario] = useState("tiny");
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  const { data, isLoading } = useQuery<WalkthroughData>({
    queryKey: ["walkthrough", algorithmId, scenario],
    queryFn: () =>
      request<WalkthroughData>(
        `/api/learn/walkthrough?algorithm=${algorithmId}&scenario=${scenario}`
      ),
    staleTime: 60_000,
  });

  React.useEffect(() => {
    setFrameIdx(0);
    setPlaying(false);
  }, [algorithmId, scenario]);

  React.useEffect(() => {
    if (!playing || !data) return;
    if (frameIdx >= data.frames.length - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setFrameIdx((f) => f + 1), 350);
    return () => clearTimeout(t);
  }, [playing, frameIdx, data]);

  if (isLoading || !data)
    return (
      <div className="h-40 flex items-center justify-center text-muted text-xs animate-pulse">
        Loading walkthrough…
      </div>
    );

  const frame = data.frames[frameIdx] ?? null;
  const isEnd = frameIdx >= data.frames.length - 1;

  // Reconstruct path at end
  const finalPath =
    isEnd && data.found ? data.frames[data.frames.length - 1]?.checked : undefined;

  return (
    <div className="flex flex-col gap-3">
      {/* Scenario selector */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
          Scenario:
        </span>
        {["tiny", "trap"].map((s) => (
          <button
            key={s}
            onClick={() => setScenario(s)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              scenario === s
                ? "bg-brand text-brand-ink"
                : "bg-surface-2 border border-border text-muted hover:text-text"
            }`}
          >
            {s === "tiny" ? "Simple Maze" : "U-Trap"}
          </button>
        ))}
      </div>

      <div className="flex gap-4 items-start">
        {/* Mini maze */}
        <MiniMaze scenario={scenario} frame={frame} path={finalPath} />

        {/* Frame info */}
        <div className="flex-1 flex flex-col gap-2 text-xs">
          <div className="bg-surface-2 border border-border rounded-lg p-2.5 min-h-[60px]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
              Step {frameIdx + 1} / {data.total_steps}
            </div>
            <p className="text-text leading-relaxed">{frame?.note || "—"}</p>
          </div>

          {frame && frame.waiting.length > 0 && (
            <div className="bg-surface-2 border border-border rounded-lg p-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                Frontier ({frame.waiting.length} cells)
              </div>
              <div className="flex flex-wrap gap-1">
                {frame.waiting.slice(0, 6).map((w) => (
                  <span
                    key={w.idx}
                    className="font-mono text-[10px] bg-brand/15 text-brand px-1.5 py-0.5 rounded"
                  >
                    ({w.coord[0]},{w.coord[1]})
                    {w.h !== null ? ` f=${w.f}` : ` g=${w.g}`}
                  </span>
                ))}
                {frame.waiting.length > 6 && (
                  <span className="text-muted text-[10px]">
                    +{frame.waiting.length - 6} more
                  </span>
                )}
              </div>
            </div>
          )}

          {isEnd && (
            <div
              className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg ${
                data.found
                  ? "bg-green-500/15 text-green-400"
                  : "bg-red-500/15 text-red-400"
              }`}
            >
              {data.found
                ? `✓ Path found in ${data.total_steps} steps`
                : `✗ No path exists — search exhausted`}
            </div>
          )}
        </div>
      </div>

      {/* Playback controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setFrameIdx(0); setPlaying(false); }}
          className="px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-xs text-muted hover:text-text transition-colors"
        >
          ↩ Reset
        </button>
        <button
          onClick={() => setFrameIdx((f) => Math.max(0, f - 1))}
          disabled={frameIdx === 0}
          className="px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-xs text-muted hover:text-text transition-colors disabled:opacity-40"
        >
          ‹ Prev
        </button>
        <button
          onClick={() => setPlaying((p) => !p)}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
            playing ? "bg-amber-500 text-white" : "bg-brand text-brand-ink"
          }`}
        >
          {playing ? "⏸ Pause" : isEnd ? "▶ Replay" : "▶ Play"}
        </button>
        <button
          onClick={() =>
            setFrameIdx((f) => Math.min(data.frames.length - 1, f + 1))
          }
          disabled={isEnd}
          className="px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-xs text-muted hover:text-text transition-colors disabled:opacity-40"
        >
          Next ›
        </button>
        <div className="ml-auto h-1.5 flex-1 bg-surface-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all"
            style={{ width: `${((frameIdx + 1) / data.total_steps) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Cheat sheet table ────────────────────────────────────────────────────────

const CHEAT_ROWS = [
  { alg: "BFS", shape: "●", optimal: "✓ (unweighted)", complete: "✓", time: "O(V+E)", space: "O(V)", heuristic: "None", notes: "Uniform rings" },
  { alg: "DFS", shape: "▲", optimal: "✗", complete: "✓", time: "O(V+E)", space: "O(V)", heuristic: "None", notes: "Deep corridors" },
  { alg: "UCS", shape: "■", optimal: "✓", complete: "✓", time: "O((V+E)logV)", space: "O(V)", heuristic: "None", notes: "Terrain aware" },
  { alg: "Greedy", shape: "◆", optimal: "✗", complete: "✗", time: "O(bᵐ)", space: "O(bᵐ)", heuristic: "h(n)", notes: "Fast, trappable" },
  { alg: "A*", shape: "★", optimal: "✓", complete: "✓", time: "O(bᵈ)", space: "O(bᵈ)", heuristic: "f=g+h", notes: "Best informed" },
  { alg: "BDS", shape: "⬡", optimal: "✓ (unweighted)", complete: "✓", time: "O(b^(d/2))", space: "O(b^(d/2))", heuristic: "None", notes: "Two waves meet" },
];

function CheatSheet() {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-xs text-left">
        <thead>
          <tr className="border-b border-border bg-surface-2">
            <th className="px-3 py-2 font-bold text-muted uppercase tracking-wider">Algorithm</th>
            <th className="px-3 py-2 font-bold text-muted uppercase tracking-wider">Optimal</th>
            <th className="px-3 py-2 font-bold text-muted uppercase tracking-wider">Complete</th>
            <th className="px-3 py-2 font-bold text-muted uppercase tracking-wider">Time</th>
            <th className="px-3 py-2 font-bold text-muted uppercase tracking-wider">Space</th>
            <th className="px-3 py-2 font-bold text-muted uppercase tracking-wider">Uses</th>
            <th className="px-3 py-2 font-bold text-muted uppercase tracking-wider">Notes</th>
          </tr>
        </thead>
        <tbody>
          {CHEAT_ROWS.map((row, i) => (
            <tr
              key={row.alg}
              className={`border-b border-border/60 hover:bg-surface-2/50 transition-colors ${
                i % 2 === 0 ? "" : "bg-surface-2/20"
              }`}
            >
              <td className="px-3 py-2 font-bold text-text">
                {row.shape} {row.alg}
              </td>
              <td className="px-3 py-2">
                <span className={row.optimal.startsWith("✓") ? "text-green-400" : "text-red-400"}>
                  {row.optimal}
                </span>
              </td>
              <td className="px-3 py-2">
                <span className={row.complete === "✓" ? "text-green-400" : "text-red-400"}>
                  {row.complete}
                </span>
              </td>
              <td className="px-3 py-2 font-mono text-muted">{row.time}</td>
              <td className="px-3 py-2 font-mono text-muted">{row.space}</td>
              <td className="px-3 py-2 font-mono text-brand">{row.heuristic}</td>
              <td className="px-3 py-2 text-muted">{row.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Glossary ─────────────────────────────────────────────────────────────────

function GlossarySection() {
  const { data: meta } = useQuery({
    queryKey: ["meta"],
    queryFn: () => request<{ glossary: { term: string; plain: string; technical: string }[] }>("/api/meta"),
    staleTime: 300_000,
  });

  const glossary = meta?.glossary ?? [];

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {glossary.map((item) => (
        <div
          key={item.term}
          className="bg-surface-2/50 border border-border rounded-xl p-3 flex flex-col gap-1"
        >
          <span className="font-bold text-text text-sm">{item.term}</span>
          <span className="text-muted text-xs leading-relaxed">{item.plain}</span>
          <span className="text-muted/70 text-[10px] font-mono leading-relaxed italic">
            {item.technical}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Lessons data ─────────────────────────────────────────────────────────────

const LESSONS = [
  {
    id: "overview",
    title: "What is PathFinder?",
    icon: Map,
    content: (
      <div className="flex flex-col gap-4 text-sm text-muted leading-relaxed">
        <p>
          <strong className="text-text">PathFinder</strong> is an interactive visualizer, benchmark
          harness, and ML testbed for classical graph search algorithms. It lets you{" "}
          <em>see</em> how BFS, DFS, UCS, Greedy, A*, and Bidirectional Search navigate identical
          mazes — side by side, in real time.
        </p>
        <div className="bg-surface-2 border border-border rounded-xl p-4 text-xs space-y-2">
          <p>
            <strong className="text-text">The Visualizer</strong> — Generate a maze, pick your
            racers, hit Start. Watch each algorithm expand cells at a speed you control.
          </p>
          <p>
            <strong className="text-text">The Benchmark</strong> — Run hundreds of random mazes,
            collect stats, and compare algorithms statistically.
          </p>
          <p>
            <strong className="text-text">ML Lab</strong> — Train a regression model to predict
            path cost, or a classifier to predict which algorithm wins a given maze.
          </p>
        </div>
        <CheatSheet />
      </div>
    ),
  },
  {
    id: "bfs",
    title: "BFS — Breadth-First Search",
    icon: Circle,
    content: (
      <div className="flex flex-col gap-4 text-sm text-muted leading-relaxed">
        <p>
          BFS explores the maze in concentric rings using a <strong className="text-text">FIFO queue</strong>.
          Every cell discovered at distance <em>d</em> is fully explored before any cell at
          distance <em>d+1</em> is visited.
        </p>
        <div className="bg-surface-2 border border-brand/30 rounded-xl p-3 text-xs font-mono">
          <span className="text-brand">Queue</span> (FIFO): [start] → pop start → push neighbours →
          pop next-nearest → …
        </div>
        <div className="grid sm:grid-cols-2 gap-2 text-xs">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
            <strong className="text-green-400">✓ Pros</strong>
            <ul className="mt-1 space-y-0.5 text-muted">
              <li>Shortest path guaranteed (unweighted)</li>
              <li>Complete — always finds a path if one exists</li>
              <li>Predictable ring-by-ring expansion</li>
            </ul>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <strong className="text-red-400">✗ Cons</strong>
            <ul className="mt-1 space-y-0.5 text-muted">
              <li>High memory: stores entire frontier</li>
              <li>Ignores terrain costs (finds fewest moves, not cheapest)</li>
              <li>Explores uniformly in all directions</li>
            </ul>
          </div>
        </div>
        <AlgorithmWalkthrough algorithmId="bfs" />
      </div>
    ),
  },
  {
    id: "dfs",
    title: "DFS — Depth-First Search",
    icon: Triangle,
    content: (
      <div className="flex flex-col gap-4 text-sm text-muted leading-relaxed">
        <p>
          DFS plunges down one corridor as deep as possible using a <strong className="text-text">LIFO stack</strong>
          , backtracking only when it reaches a dead end.
        </p>
        <div className="bg-surface-2 border border-orange-500/30 rounded-xl p-3 text-xs font-mono">
          <span className="text-orange-400">Stack</span> (LIFO): [start] → pop start → push neighbours →
          pop <em>last-pushed</em> (deepest first) → …
        </div>
        <div className="grid sm:grid-cols-2 gap-2 text-xs">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
            <strong className="text-green-400">✓ Pros</strong>
            <ul className="mt-1 space-y-0.5 text-muted">
              <li>Low memory in straight corridors</li>
              <li>Simple to implement (recursion or stack)</li>
            </ul>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <strong className="text-red-400">✗ Cons</strong>
            <ul className="mt-1 space-y-0.5 text-muted">
              <li>Not optimal — finds <em>a</em> path, not the best</li>
              <li>High variance — depends heavily on order of neighbours</li>
            </ul>
          </div>
        </div>
        <AlgorithmWalkthrough algorithmId="dfs" />
      </div>
    ),
  },
  {
    id: "ucs",
    title: "UCS — Uniform-Cost Search",
    icon: Square,
    content: (
      <div className="flex flex-col gap-4 text-sm text-muted leading-relaxed">
        <p>
          UCS (Dijkstra) always expands the cell with the{" "}
          <strong className="text-text">smallest cumulative path cost g(n)</strong>. It navigates
          around expensive sand (3×) and water (5×) terrain automatically.
        </p>
        <div className="bg-surface-2 border border-yellow-500/30 rounded-xl p-3 text-xs">
          <span className="font-mono text-yellow-400">Priority Queue</span> ordered by{" "}
          <strong>g(n) = sum of edge costs from start</strong>
        </div>
        <div className="grid sm:grid-cols-2 gap-2 text-xs">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
            <strong className="text-green-400">✓ Pros</strong>
            <ul className="mt-1 space-y-0.5 text-muted">
              <li>Optimal for any non-negative edge weights</li>
              <li>Finds cheapest path through terrain</li>
            </ul>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <strong className="text-red-400">✗ Cons</strong>
            <ul className="mt-1 space-y-0.5 text-muted">
              <li>Blind to goal direction — expands cost contours</li>
              <li>Slower than A* on large uniform grids</li>
            </ul>
          </div>
        </div>
        <AlgorithmWalkthrough algorithmId="ucs" />
      </div>
    ),
  },
  {
    id: "greedy",
    title: "Greedy Best-First Search",
    icon: Diamond,
    content: (
      <div className="flex flex-col gap-4 text-sm text-muted leading-relaxed">
        <p>
          Greedy evaluates cells purely by their estimated distance to the goal —{" "}
          <strong className="text-text">h(n)</strong>. It rushes straight toward the goal, ignoring
          how far it has already traveled.
        </p>
        <div className="bg-surface-2 border border-pink-500/30 rounded-xl p-3 text-xs">
          <span className="font-mono text-pink-400">Priority Queue</span> ordered by{" "}
          <strong>h(n) = estimated distance to goal</strong> (Manhattan, Euclidean, etc.)
        </div>
        <div className="grid sm:grid-cols-2 gap-2 text-xs">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
            <strong className="text-green-400">✓ Pros</strong>
            <ul className="mt-1 space-y-0.5 text-muted">
              <li>Very fast in open spaces</li>
              <li>Expands fewest cells when path is unobstructed</li>
            </ul>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <strong className="text-red-400">✗ Cons</strong>
            <ul className="mt-1 space-y-0.5 text-muted">
              <li>Not optimal — ignores actual path cost</li>
              <li>Gets trapped in U-shaped obstacles (try the trap scenario!)</li>
            </ul>
          </div>
        </div>
        <AlgorithmWalkthrough algorithmId="greedy" />
      </div>
    ),
  },
  {
    id: "astar",
    title: "A* Search",
    icon: Star,
    content: (
      <div className="flex flex-col gap-4 text-sm text-muted leading-relaxed">
        <p>
          A* combines actual cost and heuristic estimate:{" "}
          <strong className="text-text">f(n) = g(n) + h(n)</strong>. With an admissible heuristic
          (one that never overestimates), A* is both <em>optimal</em> and{" "}
          <em>optimally efficient</em> — no other algorithm checks fewer cells while still
          guaranteeing the shortest path.
        </p>
        <div className="bg-surface-2 border border-green-500/30 rounded-xl p-3 text-xs">
          <span className="font-mono text-green-400">f(n) = g(n) + h(n)</span>
          <div className="mt-1 text-muted">
            g(n) = cost from start · h(n) = estimated cost to goal · f(n) = total estimated cost
          </div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-400">
          💡 Set h(n) = 0 → behaves like UCS. Set weight → infinity → behaves like Greedy. A* is
          the continuum between them.
        </div>
        <div className="grid sm:grid-cols-2 gap-2 text-xs">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
            <strong className="text-green-400">✓ Pros</strong>
            <ul className="mt-1 space-y-0.5 text-muted">
              <li>Optimal with admissible + consistent heuristics</li>
              <li>Optimally efficient (fewest expansions to optimality)</li>
              <li>Handles weighted terrain</li>
            </ul>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <strong className="text-red-400">✗ Cons</strong>
            <ul className="mt-1 space-y-0.5 text-muted">
              <li>Stores all discovered nodes in memory</li>
              <li>Quality depends strongly on heuristic choice</li>
            </ul>
          </div>
        </div>
        <AlgorithmWalkthrough algorithmId="astar" />
      </div>
    ),
  },
  {
    id: "bds",
    title: "BDS — Bidirectional Search",
    icon: Hexagon,
    content: (
      <div className="flex flex-col gap-4 text-sm text-muted leading-relaxed">
        <p>
          Bidirectional Search launches <strong className="text-text">two BFS waves simultaneously</strong>:
          one from the start, one from the goal. When the two frontiers meet, the path is complete.
          This reduces the search space from O(b^d) to O(b^(d/2)).
        </p>
        <div className="bg-surface-2 border border-yellow-500/30 rounded-xl p-3 text-xs font-mono">
          <span className="text-yellow-400">Forward wave</span>: start → … ⟵ meeting point ⟶ … ←{" "}
          <span className="text-yellow-200">Backward wave</span>: goal
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-400">
          💡 BDS optimises <em>number of moves</em>, not terrain cost. Like BFS, it ignores
          sand/water weights.
        </div>
        <div className="grid sm:grid-cols-2 gap-2 text-xs">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
            <strong className="text-green-400">✓ Pros</strong>
            <ul className="mt-1 space-y-0.5 text-muted">
              <li>Dramatically fewer expansions on large mazes</li>
              <li>Symmetric, predictable, visually stunning</li>
            </ul>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <strong className="text-red-400">✗ Cons</strong>
            <ul className="mt-1 space-y-0.5 text-muted">
              <li>Requires knowing the goal upfront</li>
              <li>Two frontier maps in memory</li>
              <li>Ignores edge weights</li>
            </ul>
          </div>
        </div>
        <AlgorithmWalkthrough algorithmId="bds" />
      </div>
    ),
  },
  {
    id: "glossary",
    title: "Glossary",
    icon: BookOpen,
    content: <GlossarySection />,
  },
];

// ─── Main Learn Page ──────────────────────────────────────────────────────────

export const LearnPage: React.FC = () => {
  const [activeLesson, setActiveLesson] = useState("overview");
  const lesson = LESSONS.find((l) => l.id === activeLesson) ?? LESSONS[0];

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
      {/* Sidebar */}
      <aside className="lg:w-52 flex-shrink-0">
        <div className="sticky top-20 flex flex-col gap-1">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted px-2 pb-1">
            Learn
          </h2>
          {LESSONS.map((l) => {
            const IconComponent = l.icon;
            return (
              <button
                key={l.id}
                onClick={() => setActiveLesson(l.id)}
                className={`text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 ${
                  activeLesson === l.id
                    ? "bg-brand text-brand-ink font-bold"
                    : "text-muted hover:text-text hover:bg-surface-2"
                }`}
              >
                {typeof IconComponent === 'string' ? (
                  <span className="text-sm">{IconComponent}</span>
                ) : (
                  <IconComponent className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{l.title}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            {typeof lesson.icon === 'string' ? (
              <span className="text-3xl" aria-hidden>
                {lesson.icon}
              </span>
            ) : (
              <lesson.icon className="w-8 h-8 text-brand" />
            )}
            <h1 className="text-xl font-bold text-text tracking-tight">{lesson.title}</h1>
          </div>
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
            {lesson.content}
          </div>
        </div>
      </main>
    </div>
  );
};

export default LearnPage;
