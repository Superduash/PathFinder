import React from "react";
import { useMazeCanvas } from "@/hooks/useMazeCanvas";
import type { Maze } from "@/lib/types";
import type { ParticipantStats } from "@/hooks/useRace";

interface RacePanelProps {
  maze: Maze;
  stats: ParticipantStats;
  isWinner: boolean;
}

const ALG_COLORS: Record<string, string> = {
  bfs: "#4C9AFF",
  dfs: "#FF9F43",
  ucs: "#F2C94C",
  greedy: "#E86AB8",
  astar: "#5BD68A",
};

export const RacePanel: React.FC<RacePanelProps> = ({ maze, stats, isWinner }) => {
  const { canvasRef } = useMazeCanvas({
    maze,
    exploredSet: stats.exploredSet,
    frontierSet: stats.frontierSet,
    path: stats.path,
    interactive: false,
  });

  const algColor = ALG_COLORS[stats.algorithm.toLowerCase()] || "#3DD6C6";

  return (
    <div
      className={`relative flex flex-col rounded-xl border bg-surface overflow-hidden transition-all duration-300 ${
        isWinner
          ? "border-accent shadow-[0_0_15px_rgba(61,214,198,0.2)]"
          : "border-border"
      }`}
    >
      {/* Panel header */}
      <div className="px-3 py-2 border-b border-border bg-surface-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: algColor }}
          />
          <span className="font-semibold text-text uppercase tracking-wider">
            {stats.algorithm} {stats.heuristic ? `(${stats.heuristic})` : ""}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          {isWinner && (
            <span className="px-1.5 py-0.5 rounded bg-accent/20 text-accent font-bold border border-accent/30">
              WINNER
            </span>
          )}
          <span
            className={`px-1.5 py-0.5 rounded ${
              stats.status === "found"
                ? "bg-emerald-950/60 text-success border border-success/30"
                : stats.status === "failed"
                ? "bg-red-950/60 text-danger border border-danger/30"
                : "bg-surface text-text-muted border border-border"
            }`}
          >
            {stats.status}
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full aspect-square bg-bg">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Stats bar */}
      <div className="p-3 bg-surface grid grid-cols-2 gap-2 text-xs font-mono border-t border-border">
        <div>
          <span className="text-text-muted text-[10px] block">EXPANDED</span>
          <span className="font-semibold text-text">{stats.expanded}</span>
        </div>
        <div>
          <span className="text-text-muted text-[10px] block">FRONTIER</span>
          <span className="font-semibold text-text">{stats.frontier} (pk {stats.peakFrontier})</span>
        </div>
        <div>
          <span className="text-text-muted text-[10px] block">PATH COST</span>
          <span className="font-semibold text-text">
            {stats.pathCost !== undefined && stats.pathCost !== null ? stats.pathCost : "—"}
          </span>
        </div>
        <div>
          <span className="text-text-muted text-[10px] block">OPTIMALITY</span>
          <span className="font-semibold text-text">
            {stats.optimality !== undefined && stats.optimality !== null
              ? `${Math.round(stats.optimality * 100)}%`
              : "—"}
          </span>
        </div>
      </div>
    </div>
  );
};
