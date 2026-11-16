import React from "react";
import { Link } from "react-router-dom";
import { ExternalLink, ShieldCheck, AlertCircle } from "lucide-react";
import { Tex } from "./Tex";

export const HintsLesson: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl">
      <div className="space-y-3 pb-6 border-b border-border">
        <h1 className="text-3xl font-extrabold font-heading text-text">
          Distance Hints &amp; Admissibility
        </h1>
        <p className="text-lg text-text font-medium leading-relaxed">
          How heuristic functions estimate distance to the goal, and why mathematical admissibility guarantees shortest routes.
        </p>
      </div>

      {/* Admissibility Concept */}
      <div className="p-6 rounded-2xl bg-surface border border-border space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-bold text-text">What is an Admissible Heuristic?</h2>
        </div>
        <p className="text-sm text-muted leading-relaxed">
          A heuristic <Tex>{"h(n)"}</Tex> is <strong>admissible</strong> if it <em>never overestimates</em> the true remaining cost <Tex>{"h^*(n)"}</Tex> to reach the goal:
        </p>
        <div className="p-4 rounded-xl bg-surface-2 border border-border font-mono text-base text-brand font-bold text-center">
          <Tex>{"h(n) \\le h^*(n)"}</Tex>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          When <Tex>{"h(n)"}</Tex> is admissible and consistent, A* is mathematically guaranteed to return the optimal shortest route without checking extra paths.
        </p>
      </div>

      {/* Heuristic Formulas Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold font-heading text-text">The Four Grid Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Manhattan */}
          <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-text">Manhattan Distance (L1)</h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand/15 text-brand">
                Standard 4-way
              </span>
            </div>
            <div className="p-3 rounded-xl bg-surface-2 border border-border font-mono text-sm text-text">
              <Tex>{"h(n) = |r_1 - r_2| + |c_1 - c_2|"}</Tex>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Assumes movement only in 4 cardinal directions (up, down, left, right). Always admissible on 4-way grids.
            </p>
            <div className="text-xs text-amber-500 flex items-center gap-1.5 pt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Inadmissible if diagonal cuts are allowed!</span>
            </div>
          </div>

          {/* Euclidean */}
          <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-text">Euclidean Distance (L2)</h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-surface-2 text-muted border border-border">
                Straight line
              </span>
            </div>
            <div className="p-3 rounded-xl bg-surface-2 border border-border font-mono text-sm text-text">
              <Tex>{"h(n) = \\sqrt{(r_1 - r_2)^2 + (c_1 - c_2)^2}"}</Tex>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              True geometric straight-line "as the crow flies" distance. Always admissible, but underestimates 4-way grid moves.
            </p>
          </div>

          {/* Chebyshev */}
          <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-text">Chebyshev Distance</h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-surface-2 text-muted border border-border">
                8-way uniform
              </span>
            </div>
            <div className="p-3 rounded-xl bg-surface-2 border border-border font-mono text-sm text-text">
              <Tex>{"h(n) = \\max(|r_1 - r_2|, |c_1 - c_2|)"}</Tex>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Chess king's moves. Admissible when diagonal steps cost the exact same as straight steps (cost = 1.0).
            </p>
          </div>

          {/* Octile */}
          <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-text">Octile Distance</h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-surface-2 text-muted border border-border">
                8-way metric
              </span>
            </div>
            <div className="p-3 rounded-xl bg-surface-2 border border-border font-mono text-sm text-text">
              <Tex>{"h(n) = |dr - dc| + \\sqrt{2} \\min(dr, dc)"}</Tex>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Admissible when diagonal movements cost <Tex>{"\\sqrt{2} \\approx 1.414"}</Tex>. The standard metric for 8-direction pathfinding.
            </p>
          </div>
        </div>
      </div>

      {/* Visualizer Link */}
      <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-text">Explore Distance Gradients in the Visualizer</h3>
          <p className="text-sm text-muted mt-0.5">
            Turn on the "Hint map" overlay in the Visualizer toolbar to see the live distance field across the entire grid.
          </p>
        </div>
        <Link
          to="/visualizer"
          className="h-11 px-5 rounded-xl bg-brand text-brand-ink font-bold flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0 text-sm"
        >
          <span>Open Visualizer</span>
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
