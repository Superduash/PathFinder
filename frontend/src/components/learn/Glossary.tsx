import React from "react";
import { BookOpen, Keyboard, Info } from "lucide-react";
import { Tex } from "./Tex";

export const Glossary: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl">
      <div className="space-y-3 pb-6 border-b border-border">
        <h1 className="text-3xl font-extrabold font-heading text-text">
          Glossary, Shortcuts &amp; Credits
        </h1>
        <p className="text-lg text-text font-medium leading-relaxed">
          Standard terminology in graph search, navigation shortcuts, and project credits.
        </p>
      </div>

      {/* 1. Glossary */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-brand" />
          <h2 className="text-xl font-bold font-heading text-text">Key Terminology</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-surface border border-border space-y-1">
            <h3 className="font-bold text-text">Admissible Heuristic</h3>
            <p className="text-xs text-muted leading-relaxed">
              A heuristic estimate that never overestimates the true remaining distance: <Tex>{"h(n) \\le h^*(n)"}</Tex>. Guarantees A* optimality.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border space-y-1">
            <h3 className="font-bold text-text">Consistent (Monotonic)</h3>
            <p className="text-xs text-muted leading-relaxed">
              A heuristic satisfying the triangle inequality: <Tex>{"h(n) \\le c(n, a, n') + h(n')"}</Tex>. Ensures nodes are only expanded once.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border space-y-1">
            <h3 className="font-bold text-text">Frontier (Open / Waiting List)</h3>
            <p className="text-xs text-muted leading-relaxed">
              The collection of discovered nodes that have been generated but not yet expanded.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border space-y-1">
            <h3 className="font-bold text-text">Explored Set (Closed Set)</h3>
            <p className="text-xs text-muted leading-relaxed">
              The collection of states that have already been expanded, preventing infinite loops and redundant exploration.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border space-y-1">
            <h3 className="font-bold text-text">Branching Factor (b)</h3>
            <p className="text-xs text-muted leading-relaxed">
              The average number of valid child transitions available from any given node (on a 4-way grid, at most 4).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border space-y-1">
            <h3 className="font-bold text-text">Completeness</h3>
            <p className="text-xs text-muted leading-relaxed">
              A search algorithm is complete if it is guaranteed to find a solution when at least one valid path exists.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border space-y-1">
            <h3 className="font-bold text-text">Optimality &amp; C*</h3>
            <p className="text-xs text-muted leading-relaxed">
              An algorithm is optimal if it finds the highest quality (lowest cost <Tex>{"C^*"}</Tex>) path. Optimality ratio is measured as <Tex>{"\\text{Quality} = C^* / C_{\\text{found}}"}</Tex>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border space-y-1">
            <h3 className="font-bold text-text">Manhattan Distance (L1)</h3>
            <p className="text-xs text-muted leading-relaxed">
              Grid distance calculated as <Tex>{"|r_1 - r_2| + |c_1 - c_2|"}</Tex>. The standard metric for 4-directional grids without diagonals.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Keyboard Shortcuts */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Keyboard className="w-5 h-5 text-brand" />
          <h2 className="text-xl font-bold font-heading text-text">Visualizer Keyboard Shortcuts</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-xl border border-border bg-surface flex items-center justify-between">
            <span className="text-text font-sans">Start / Pause Race</span>
            <span className="px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-brand font-bold">Space</span>
          </div>
          <div className="p-3.5 rounded-xl border border-border bg-surface flex items-center justify-between">
            <span className="text-text font-sans">Step 1 Expansion</span>
            <span className="px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-brand font-bold">S</span>
          </div>
          <div className="p-3.5 rounded-xl border border-border bg-surface flex items-center justify-between">
            <span className="text-text font-sans">Reset Current Race</span>
            <span className="px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-brand font-bold">R</span>
          </div>
          <div className="p-3.5 rounded-xl border border-border bg-surface flex items-center justify-between">
            <span className="text-text font-sans">Draw Walls / Erase</span>
            <span className="px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-brand font-bold">Click + Drag</span>
          </div>
        </div>
      </div>

      {/* 3. Credits & About */}
      <div className="p-6 rounded-2xl bg-surface border border-border space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-brand" />
          <h2 className="text-base font-bold text-text">About PathFinder</h2>
        </div>
        <p className="text-sm text-muted leading-relaxed">
          PathFinder is an open, high-performance AI search algorithm laboratory, benchmark harness, and machine learning testbed built with FastAPI, PyTorch, React, and Vite. Designed to explain, compare, and benchmark classical heuristic graph search algorithms against learned heuristic neural models.
        </p>
      </div>
    </div>
  );
};
