import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Reveal } from "@/components/fx/Reveal";
import { Marquee } from "@/components/fx/Marquee";
import { TextGenerateEffect } from "@/components/fx/TextGenerateEffect";
import { BentoGrid, BentoCard } from "@/components/fx/BentoGrid";
import { MovingBorderButton } from "@/components/fx/MovingBorder";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { useMazeCanvas } from "@/hooks/useMazeCanvas";
import { useRace } from "@/hooks/useRace";
import { request } from "@/lib/api";
import type { Maze } from "@/lib/types";

const TECH_ITEMS = [
  "React 19",
  "TypeScript",
  "FastAPI",
  "NumPy",
  "Scikit-learn",
  "WebSockets",
  "Tailwind CSS",
  "Recharts",
];

const ALGORITHM_CARDS = [
  {
    id: "bfs",
    name: "BFS",
    fullName: "Breadth-First Search",
    shape: "●",
    color: "var(--alg-bfs)",
    description: "Expands in uniform rings around the starting position. Checks every path level-by-level.",
    chips: ["Shortest Path Guaranteed", "No Heuristic Hint", "Exhaustive"],
  },
  {
    id: "dfs",
    name: "DFS",
    fullName: "Depth-First Search",
    shape: "▲",
    color: "var(--alg-dfs)",
    description: "Dives deep along single branches before backtracking. Minimal memory in corridors.",
    chips: ["Sub-optimal Path", "No Heuristic Hint", "High Variance"],
  },
  {
    id: "ucs",
    name: "UCS",
    fullName: "Uniform-Cost Search",
    shape: "■",
    color: "var(--alg-ucs)",
    description: "Expands nodes in strict order of lowest cumulative cost. Dijkstra on weighted graphs.",
    chips: ["Optimal with Terrain", "No Heuristic Hint", "Exhaustive"],
  },
  {
    id: "greedy",
    name: "Greedy",
    fullName: "Greedy Best-First",
    shape: "◆",
    color: "var(--alg-greedy)",
    description: "Heads directly towards the goal using distance estimates. Fast but easily trapped.",
    chips: ["Sub-optimal Path", "Uses Distance Hint", "Very Fast"],
  },
  {
    id: "astar",
    name: "A*",
    fullName: "A* Search",
    shape: "★",
    color: "var(--alg-astar)",
    description: "Balances path cost with distance estimates. Optimal efficiency with admissible heuristics.",
    chips: ["Shortest Path Guaranteed", "Uses Distance Hint", "Smart & Optimal"],
  },
];

export const LandingPage: React.FC = () => {
  const [demoMaze, setDemoMaze] = useState<Maze | null>(null);

  // Slow, easily followable hero demo race (BFS vs A*)
  const demoParticipants = [
    { algorithm: "bfs" },
    { algorithm: "astar", heuristic: "manhattan" },
  ];

  const { stats, startRace, resetRace, raceState } = useRace(demoMaze, demoParticipants, 1);

  // Load seeded 15x15 maze
  useEffect(() => {
    request<Maze>("/api/maze/generate", {
      method: "POST",
      body: JSON.stringify({
        rows: 15,
        cols: 15,
        type: "backtracker",
        seed: 42,
        randomize_endpoints: true,
      }),
    })
      .then((m) => setDemoMaze(m))
      .catch(() => {});
  }, []);

  // Looped pacing for hero
  useEffect(() => {
    if (demoMaze && raceState === "idle") {
      const timer = setTimeout(() => startRace(), 800);
      return () => clearTimeout(timer);
    } else if (raceState === "finished") {
      const resetTimer = setTimeout(() => resetRace(), 2500);
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
    <div className="flex-1 flex flex-col items-center">
      {/* 3.1 Hero Section */}
      <section className="relative w-full max-w-6xl mx-auto px-6 pt-16 pb-20 flex flex-col lg:flex-row items-center gap-12">
        <div className="flex-1 flex flex-col items-start text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand/15 text-brand border border-brand/30 mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Free &amp; runs entirely on your laptop
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-text leading-[1.1] mb-6">
            <TextGenerateEffect words="See how AI finds the shortest path." />
          </h1>

          <p className="text-muted text-base md:text-lg max-w-xl mb-8 leading-relaxed">
            Watch BFS, DFS, UCS, Greedy and A* race through the exact same maze. Understand where they search, measure their efficiency fairly, and train ML distance heuristics.
          </p>

          <div className="flex items-center gap-4">
            <Link to="/visualizer">
              <Button size="lg" className="gap-2 font-semibold shadow-lg shadow-brand/10">
                Start exploring <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                const el = document.getElementById("how-it-works");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth" });
                }
              }}
            >
              Watch how it works
            </Button>
          </div>
        </div>

        {/* Live Hero Race Framed Card */}
        <div className="w-full lg:w-[480px] rounded-2xl border border-border bg-surface p-5 shadow-2xl flex flex-col gap-4">
          {/* Mock Browser Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-danger/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-warn/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-success/60" />
              <span className="text-xs font-medium text-muted ml-2">Live Head-to-Head Search Race</span>
            </div>
            <Chip variant="brand" className="text-[10px] uppercase font-bold tracking-wider">
              {raceState}
            </Chip>
          </div>

          {/* Mazes comparison */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-alg-bfs">● BFS</span>
                <span className="text-muted tabular-nums text-[11px]">{bfsStats?.expanded || 0} checked</span>
              </div>
              <div className="w-full aspect-square rounded-xl overflow-hidden border border-border bg-bg">
                <canvas ref={bfsCanvasRef} className="w-full h-full block" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-alg-astar">★ A*</span>
                <span className="text-muted tabular-nums text-[11px]">{astarStats?.expanded || 0} checked</span>
              </div>
              <div className="w-full aspect-square rounded-xl overflow-hidden border border-border bg-bg">
                <canvas ref={astarCanvasRef} className="w-full h-full block" />
              </div>
            </div>
          </div>

          {/* Real-time counters & legend row */}
          <div className="pt-2 border-t border-border flex flex-col gap-2 text-xs">
            <div className="flex justify-between text-muted text-[11px]">
              <span>BFS checked <strong className="text-text">{bfsStats?.expanded || 0}</strong> cells</span>
              <span>A* checked <strong className="text-brand">{astarStats?.expanded || 0}</strong> cells</span>
            </div>
            <div className="flex items-center justify-center gap-4 text-[10px] text-muted font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-brand/30 border border-brand/50" /> Visited
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full border border-warn" /> Waiting
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-0.5 bg-success" /> Shortest Route
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3.2 Social Proof / Built with Marquee */}
      <Marquee items={TECH_ITEMS} />

      {/* 3.3 "What You'll Learn" — Bento Grid */}
      <section className="w-full max-w-6xl mx-auto px-6 py-24 flex flex-col gap-12">
        <Reveal className="text-center flex flex-col items-center gap-3">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
            Everything you need to master search
          </h2>
          <p className="text-muted text-base max-w-xl">
            Designed to bridge the gap between classroom search theory and real algorithm behavior.
          </p>
        </Reveal>

        <BentoGrid>
          <BentoCard
            title="Multi-Algorithm Live Races"
            description="Run up to 5 algorithms concurrently on the identical maze with real-time expansion counters and step pacing."
            className="md:col-span-2"
          />
          <BentoCard
            title="Independent Dijkstra Benchmarks"
            description="Evaluate optimality C*/C against true optimal cost with isolated GC timing and variance bounds."
          />
          <BentoCard
            title="Teach a Cost Heuristic"
            description="Train scikit-learn Linear Regression and Decision Tree models to predict distance to goal and observe admissibility loss."
          />
          <BentoCard
            title="Predict the Optimal Algorithm"
            description="Use maze topological features and decision trees to classify which search algorithm wins on unseen terrain."
            className="md:col-span-2"
          />
        </BentoGrid>
      </section>

      {/* 3.4 "How It Works" 3-step section */}
      <section id="how-it-works" className="w-full max-w-6xl mx-auto px-6 py-20 flex flex-col gap-12">
        <Reveal className="text-left">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand">Workflow</span>
          <h2 className="text-3xl font-bold tracking-tight text-text mt-1">How PathFinder works</h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "Build or generate a maze",
              desc: "Choose recursive backtracker, braided loops, or weighted sand and water terrain. Draw your own walls with smooth pointer gestures.",
            },
            {
              step: "02",
              title: "Select algorithms & heuristics",
              desc: "Compare unweighted searches (BFS, DFS) against weighted Dijkstra and heuristic evaluations (Manhattan, Octile, Euclidean).",
            },
            {
              step: "03",
              title: "Watch, step, and analyze",
              desc: "Step through expansions one-by-one or let them race at comfortable speed. Inspect node expansions, path cost, and optimality.",
            },
          ].map((item, idx) => (
            <Reveal key={idx} delay={idx * 0.1} className="p-6 rounded-2xl border border-border bg-surface flex flex-col gap-4">
              <span className="font-mono text-2xl font-bold text-brand">{item.step}</span>
              <h3 className="font-bold text-text text-lg">{item.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{item.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 3.5 Supported Algorithm Cards */}
      <section className="w-full max-w-6xl mx-auto px-6 py-20 flex flex-col gap-10">
        <Reveal className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text">The Contenders</h2>
          <p className="text-muted text-sm mt-1">Five classical algorithms, each with its own signature search strategy.</p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {ALGORITHM_CARDS.map((alg, idx) => (
            <Reveal key={alg.id} delay={idx * 0.05} className="p-5 rounded-2xl border border-border bg-surface flex flex-col justify-between hover:border-brand/40 transition-colors">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg" style={{ color: alg.color }}>
                    {alg.shape} {alg.name}
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: alg.color }} />
                </div>
                <p className="text-xs text-muted leading-relaxed">{alg.description}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-border flex flex-col gap-1.5">
                {alg.chips.map((c, i) => (
                  <span key={i} className="text-[10px] text-muted font-medium flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-muted/60" /> {c}
                  </span>
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 3.6 Closing CTA Section */}
      <section className="w-full max-w-4xl mx-auto px-6 py-24 text-center flex flex-col items-center gap-6">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
          Ready to watch them race?
        </h2>
        <p className="text-muted text-base max-w-md">
          Explore interactive searches directly in your browser. No account or setup required.
        </p>
        <Link to="/visualizer">
          <MovingBorderButton>
            Launch Visualizer <ArrowRight className="w-4 h-4 ml-1" />
          </MovingBorderButton>
        </Link>
      </section>
    </div>
  );
};
