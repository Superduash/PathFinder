import React from "react";
import { Tex } from "./Tex";
import { Walkthrough } from "./Walkthrough";
import { ALGORITHM_LESSONS } from "@/content/algorithms";

export const CostsLesson: React.FC = () => {
  const astarMeta = ALGORITHM_LESSONS.astar;

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="space-y-3 pb-6 border-b border-border">
        <h1 className="text-3xl font-extrabold font-heading text-text">
          Pathfinding Costs: g, h, and f
        </h1>
        <p className="text-lg text-text font-medium leading-relaxed">
          Understanding the three fundamental values that guide informed heuristic search.
        </p>
      </div>

      {/* Explanations of g, h, f */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-surface border border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">Cost So Far</span>
            <span className="font-mono font-bold text-lg text-brand">g(n)</span>
          </div>
          <h3 className="font-bold text-base text-text">Past Journey</h3>
          <p className="text-sm text-muted leading-relaxed">
            The exact, accumulated cost of moving from the Start cell to node n along the best known route so far.
          </p>
          <div className="p-3 rounded-xl bg-surface-2 border border-border text-xs font-mono text-muted">
            Floor: +1 · Sand: +3 · Water: +5
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-surface border border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">Heuristic Hint</span>
            <span className="font-mono font-bold text-lg text-brand">h(n)</span>
          </div>
          <h3 className="font-bold text-base text-text">Future Estimate</h3>
          <p className="text-sm text-muted leading-relaxed">
            An educated guess (heuristic) of the remaining cost from node n to the Goal. On a grid, usually Manhattan distance.
          </p>
          <div className="p-3 rounded-xl bg-surface-2 border border-border text-xs font-mono text-muted">
            <Tex block={false}>h(n) = |r_n - r_G| + |c_n - c_G|</Tex>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-surface border-2 border-brand/40 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">Total Score</span>
            <span className="font-mono font-bold text-lg text-brand">f(n)</span>
          </div>
          <h3 className="font-bold text-base text-text">The Deciding Sum</h3>
          <p className="text-sm text-muted leading-relaxed">
            The total estimated cost of the entire path passing through node n to the goal. A* expands lowest f(n) first.
          </p>
          <div className="p-3 rounded-xl bg-surface-2 border border-border text-xs font-mono font-bold text-text">
            <Tex block={false}>f(n) = g(n) + h(n)</Tex>
          </div>
        </div>
      </div>

      {/* Embedded Walkthrough: River Crossing */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold font-heading text-text">
            Watch g, h, and f in Action: The River Crossing
          </h2>
          <p className="text-sm text-muted mt-1">
            Water costs 5 per step; sand costs 3. Notice how A* calculates total score f to choose between wading through water or crossing the sand bridge.
          </p>
        </div>
        <Walkthrough algorithm="astar" meta={astarMeta} initialScenario="river" />
      </div>
    </div>
  );
};
