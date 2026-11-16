import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

export const StartHere: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="space-y-3 pb-6 border-b border-border">
        <h1 className="text-3xl font-extrabold font-heading text-text">
          Introduction to Pathfinding & Search
        </h1>
        <p className="text-lg text-text font-medium leading-relaxed">
          Search algorithms explore a state space to discover an optimal sequence of actions connecting an initial state to a goal state.
        </p>
      </div>

      {/* What is Search? */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold font-heading text-text">What is a Search Problem?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-surface border border-border space-y-2">
            <div className="w-8 h-8 rounded-lg bg-brand/15 text-brand flex items-center justify-center font-bold text-sm">
              S
            </div>
            <h3 className="font-bold text-text">State</h3>
            <p className="text-xs text-muted leading-relaxed">
              A coordinate position (r, c) on the grid where the agent can stand.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-border space-y-2">
            <div className="w-8 h-8 rounded-lg bg-brand/15 text-brand flex items-center justify-center font-bold text-sm">
              A
            </div>
            <h3 className="font-bold text-text">Actions</h3>
            <p className="text-xs text-muted leading-relaxed">
              Moving up, down, left, or right into an adjacent, unblocked neighboring cell.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-border space-y-2">
            <div className="w-8 h-8 rounded-lg bg-brand/15 text-brand flex items-center justify-center font-bold text-sm">
              C
            </div>
            <h3 className="font-bold text-text">Cost</h3>
            <p className="text-xs text-muted leading-relaxed">
              The numerical penalty incurred when stepping onto a terrain cell (Floor: 1, Sand: 3, Water: 5).
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-border space-y-2">
            <div className="w-8 h-8 rounded-lg bg-brand/15 text-brand flex items-center justify-center font-bold text-sm">
              G
            </div>
            <h3 className="font-bold text-text">Goal</h3>
            <p className="text-xs text-muted leading-relaxed">
              The destination coordinate (target) the agent strives to reach with minimal penalty.
            </p>
          </div>
        </div>
      </div>

      {/* Two Families Side-by-Side */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold font-heading text-text">The Two Search Families</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Uninformed */}
          <div className="p-6 rounded-2xl bg-surface border border-border space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-surface-2 text-muted border border-border flex items-center gap-1.5">
                <EyeOff className="w-3.5 h-3.5" />
                <span>Uninformed (Blind) Search</span>
              </span>
            </div>
            <h3 className="text-lg font-bold text-text">Knows only the map</h3>
            <p className="text-sm text-muted leading-relaxed">
              Uninformed algorithms have no knowledge of where the goal coordinate is located until they physically collide with it. They expand blindly based purely on graph connectivity and accumulated travel cost.
            </p>
            <div className="space-y-2 pt-2 border-t border-border text-sm">
              <Link to="/learn/bfs" className="p-2.5 rounded-xl bg-surface-2 hover:bg-surface border border-border flex items-center justify-between group transition-colors">
                <div>
                  <strong className="text-text font-semibold">BFS (Breadth-First):</strong>
                  <span className="text-xs text-muted ml-1.5">Ring-by-ring via queue</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted group-hover:text-brand transition-colors" />
              </Link>
              <Link to="/learn/dfs" className="p-2.5 rounded-xl bg-surface-2 hover:bg-surface border border-border flex items-center justify-between group transition-colors">
                <div>
                  <strong className="text-text font-semibold">DFS (Depth-First):</strong>
                  <span className="text-xs text-muted ml-1.5">Deep corridor dives via stack</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted group-hover:text-brand transition-colors" />
              </Link>
              <Link to="/learn/ucs" className="p-2.5 rounded-xl bg-surface-2 hover:bg-surface border border-border flex items-center justify-between group transition-colors">
                <div>
                  <strong className="text-text font-semibold">UCS (Dijkstra):</strong>
                  <span className="text-xs text-muted ml-1.5">Cheapest path so far g(n)</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted group-hover:text-brand transition-colors" />
              </Link>
              <Link to="/learn/bds" className="p-2.5 rounded-xl bg-surface-2 hover:bg-surface border border-border flex items-center justify-between group transition-colors">
                <div>
                  <strong className="text-text font-semibold">BDS (Bidirectional):</strong>
                  <span className="text-xs text-muted ml-1.5">Waves from start and goal meet</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted group-hover:text-brand transition-colors" />
              </Link>
            </div>
          </div>

          {/* Informed */}
          <div className="p-6 rounded-2xl bg-surface border-2 border-brand/40 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-brand text-brand-ink flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>Informed (Heuristic) Search</span>
              </span>
            </div>
            <h3 className="text-lg font-bold text-text">Uses a distance hint h(n)</h3>
            <p className="text-sm text-muted leading-relaxed">
              Informed algorithms use a heuristic evaluation function h(n) that estimates how far any candidate cell is from the destination. This steers the search directly toward the target, cutting down massive exploratory waste.
            </p>
            <div className="space-y-2 pt-2 border-t border-border text-sm">
              <Link to="/learn/greedy" className="p-2.5 rounded-xl bg-surface-2 hover:bg-surface border border-border flex items-center justify-between group transition-colors">
                <div>
                  <strong className="text-text font-semibold">Greedy Best-First:</strong>
                  <span className="text-xs text-muted ml-1.5">Beelines via hint h(n)</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted group-hover:text-brand transition-colors" />
              </Link>
              <Link to="/learn/astar" className="p-2.5 rounded-xl bg-surface-2 hover:bg-surface border border-border flex items-center justify-between group transition-colors">
                <div>
                  <strong className="text-text font-semibold">A* (A-star):</strong>
                  <span className="text-xs text-muted ml-1.5">Balances cost and hint: f = g + h</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted group-hover:text-brand transition-colors" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Terrain & Tile Toolbox */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold font-heading text-text">Map Tiles & Terrain Costs</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-xl border border-border bg-surface text-center space-y-2">
            <div className="w-10 h-10 rounded-lg mx-auto bg-slate-100 border border-border text-slate-700 dark:bg-[#1b222d] dark:border-border/80 dark:text-muted flex items-center justify-center font-bold text-xs">
              1
            </div>
            <div className="font-bold text-text text-sm">Floor</div>
            <div className="text-xs text-muted">Cost: 1</div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface text-center space-y-2">
            <div className="w-10 h-10 rounded-lg mx-auto bg-slate-700 border border-slate-600 text-white dark:bg-[#334155] dark:border-border flex items-center justify-center font-bold text-xs">
              X
            </div>
            <div className="font-bold text-text text-sm">Wall</div>
            <div className="text-xs text-muted">Impassable</div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface text-center space-y-2">
            <div className="w-10 h-10 rounded-lg mx-auto bg-amber-100 border border-amber-300 text-amber-900 dark:bg-[#b45309]/50 dark:border-amber-600/50 dark:text-amber-200 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <div className="font-bold text-text text-sm">Sand</div>
            <div className="text-xs text-muted">Cost: 3</div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface text-center space-y-2">
            <div className="w-10 h-10 rounded-lg mx-auto bg-sky-100 border border-sky-300 text-sky-900 dark:bg-[#0369a1]/50 dark:border-sky-600/50 dark:text-sky-200 flex items-center justify-center font-bold text-xs">
              5
            </div>
            <div className="font-bold text-text text-sm">Water</div>
            <div className="text-xs text-muted">Cost: 5</div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface text-center space-y-2">
            <div className="w-10 h-10 rounded-lg mx-auto bg-emerald-100 border-2 border-emerald-500 text-emerald-900 dark:bg-emerald-500/20 dark:border-emerald-500 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
              S
            </div>
            <div className="font-bold text-text text-sm">Start</div>
            <div className="text-xs text-muted">Origin</div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface text-center space-y-2">
            <div className="w-10 h-10 rounded-lg mx-auto bg-rose-100 border-2 border-rose-500 text-rose-900 dark:bg-rose-500/20 dark:border-rose-500 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
              G
            </div>
            <div className="font-bold text-text text-sm">Goal</div>
            <div className="text-xs text-muted">Destination</div>
          </div>
        </div>
      </div>
    </div>
  );
};
