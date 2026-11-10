import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Play, Sparkles } from "lucide-react";
import { request } from "@/lib/api";
import type { MetaResponse } from "@/lib/types";

export const LandingPage: React.FC = () => {
  const [meta, setMeta] = useState<MetaResponse | null>(null);

  useEffect(() => {
    request<MetaResponse>("/api/meta")
      .then(setMeta)
      .catch(() => {});
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero */}
      <section className="py-20 px-6 text-center max-w-4xl mx-auto flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-surface-2 text-accent border border-border mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Interactive AI Visualizer &amp; Benchmark Suite
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
          Watch Search Algorithms <span className="text-accent">Think</span>
        </h1>

        <p className="text-text-muted text-base md:text-lg max-w-2xl mb-8 leading-relaxed">
          Step-by-step visual exploration of BFS, DFS, UCS, Greedy Best-First, and A* on uniform and weighted terrain. Run reproducible multi-algorithm benchmarks and train ML heuristics.
        </p>

        <div className="flex items-center gap-4">
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
