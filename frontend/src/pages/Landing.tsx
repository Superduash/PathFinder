import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Play, Sparkles, Route } from "lucide-react";
import { request } from "@/lib/api";
import { useMazeCanvas } from "@/hooks/useMazeCanvas";
import { useRace } from "@/hooks/useRace";
import type { MetaResponse, Maze } from "@/lib/types";

export const LandingPage: React.FC = () => {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [demoMaze, setDemoMaze] = useState<Maze | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  // Participants for hero loop demo: BFS vs A*
  const demoParticipants = [
    { algorithm: "bfs" },
    { algorithm: "astar", heuristic: "manhattan" },
  ];

  const { stats, startRace, resetRace, raceState } = useRace(demoMaze, demoParticipants, 3);

  // Load algorithm metadata and seed 7 demo maze
  useEffect(() => {
    request<MetaResponse>("/api/meta").then(setMeta).catch(() => {});

    request<Maze>("/api/maze/generate", {
      method: "POST",
      body: JSON.stringify({
        rows: 15,
        cols: 15,
        type: "backtracker",
        seed: 7,
        randomize_endpoints: true,
      }),
    })
      .then((m) => {
        setDemoMaze(m);
      })
      .catch(() => {});
  }, []);

  // Auto-run loop when demo maze is ready
  useEffect(() => {
    if (demoMaze && raceState === "idle") {
      const timer = setTimeout(() => {
        startRace();
      }, 500);
      return () => clearTimeout(timer);
    } else if (raceState === "finished") {
      const resetTimer = setTimeout(() => {
        resetRace();
      }, 3000);
      return () => clearTimeout(resetTimer);
    }
  }, [demoMaze, raceState]);

  const bfsStats = stats.find((s) => s.algorithm === "bfs");
  const astarStats = stats.find((s) => s.algorithm === "astar");

  const { canvasRef: bfsCanvasRef } = useMazeCanvas({
    maze: demoMaze,
    exploredSet: bfsStats?.exploredSet,
    frontierSet: bfsStats?.frontierSet,
    path: bfsStats?.path,
    interactive: false,
  });

  const { canvasRef: astarCanvasRef } = useMazeCanvas({
    maze: demoMaze,
    exploredSet: astarStats?.exploredSet,
    frontierSet: astarStats?.frontierSet,
    path: astarStats?.path,
    interactive: false,
  });

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero */}
      <section ref={heroRef} className="py-16 px-6 text-center max-w-4xl mx-auto flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-surface-2 text-accent border border-border mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Interactive AI Visualizer &amp; Benchmark Suite
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
          Watch Search Algorithms <span className="text-accent">Think</span>
        </h1>

        <p className="text-text-muted text-base max-w-2xl mb-8 leading-relaxed">
          Step-by-step visual exploration of BFS, DFS, UCS, Greedy Best-First, and A* on uniform and weighted terrain. Run reproducible multi-algorithm benchmarks and train ML heuristics.
        </p>

        <div className="flex items-center gap-4 mb-12">
          <Link
            to="/visualizer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-bg font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <Play className="w-4 h-4 fill-current" />
            Launch Visualizer
          </Link>
          <Link
            to="/benchmark"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface-2 border border-border text-text font-medium text-sm hover:bg-surface-2/80 transition-colors"
          >
            Run Benchmarks
          </Link>
        </div>

        {/* Real Live Looped Demo Canvas: BFS vs A* */}
        {demoMaze && (
          <div className="w-full max-w-2xl p-4 bg-surface border border-border rounded-xl flex flex-col gap-3 shadow-2xl">
            <div className="flex items-center justify-between text-xs text-text-muted font-mono">
              <span className="flex items-center gap-2 text-text font-semibold">
                <Route className="w-4 h-4 text-accent" /> Live Backend Demo: BFS vs A* (Manhattan)
              </span>
              <span className="text-accent uppercase font-bold text-[10px] px-2 py-0.5 rounded bg-accent/10 border border-accent/20">
                {raceState}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* BFS Canvas */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-[#4C9AFF] font-bold">BFS</span>
                  <span className="text-text-muted">{bfsStats?.expanded || 0} expanded</span>
                </div>
                <div className="w-full aspect-square bg-bg border border-border rounded-lg overflow-hidden">
                  <canvas ref={bfsCanvasRef} className="w-full h-full block" />
                </div>
              </div>

              {/* A* Canvas */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-[#5BD68A] font-bold">A*</span>
                  <span className="text-text-muted">{astarStats?.expanded || 0} expanded</span>
                </div>
                <div className="w-full aspect-square bg-bg border border-border rounded-lg overflow-hidden">
                  <canvas ref={astarCanvasRef} className="w-full h-full block" />
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Algorithms Overview Grid */}
      <section className="px-6 py-12 max-w-5xl mx-auto w-full">
        <h2 className="text-xl font-bold mb-6 text-center">Supported Algorithms</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {meta?.algorithms.map((alg) => (
            <div key={alg.id} className="p-5 rounded-lg bg-surface border border-border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm" style={{ color: alg.color }}>{alg.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-2 border border-border text-text-muted">
                    {alg.optimal ? "Optimal" : "Sub-optimal"}
                  </span>
                </div>
                <p className="text-xs text-text-muted mb-3 leading-relaxed">{alg.description}</p>
              </div>
              <div className="pt-3 border-t border-border/50 text-[11px] font-mono text-text-muted flex justify-between">
                <span>Time: {alg.time_complexity}</span>
                <span>Space: {alg.space_complexity}</span>
              </div>
            </div>
          )) || (
            <div className="col-span-3 text-center text-xs text-text-muted">Loading algorithm details...</div>
          )}
        </div>
      </section>
    </div>
  );
};
