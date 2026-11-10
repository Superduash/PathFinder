import React from "react";
import { useMazeCanvas } from "@/hooks/useMazeCanvas";
import type { Maze } from "@/lib/types";
import type { ParticipantStats } from "@/hooks/useRace";

interface RacePanelProps {
  maze: Maze;
  stats: ParticipantStats;
  isWinner: boolean;
  maxExpandedSeen: number;
}

const ALG_DETAILS: Record<string, { color: string; shape: string }> = {
  bfs: { color: "var(--alg-bfs)", shape: "●" },
  dfs: { color: "var(--alg-dfs)", shape: "▲" },
  ucs: { color: "var(--alg-ucs)", shape: "■" },
  greedy: { color: "var(--alg-greedy)", shape: "◆" },
  astar: { color: "var(--alg-astar)", shape: "★" },
};

export const RacePanel: React.FC<RacePanelProps> = ({
  maze,
  stats,
  isWinner,
  maxExpandedSeen,
}) => {
  const detail = ALG_DETAILS[stats.algorithm.toLowerCase()] || {
    color: "var(--brand)",
    shape: "●",
  };

  const { canvasRef } = useMazeCanvas({
    maze,
    algorithmColor: detail.color,
    exploredSet: stats.exploredSet,
    frontierSet: stats.frontierSet,
    currentNode: stats.currentNode,
    path: stats.path,
    interactive: false,
  });

  const relativeEffort = maxExpandedSeen > 0 ? (stats.expanded / maxExpandedSeen) * 100 : 0;

  return (
    <div
      className={`flex flex-col rounded-2xl border bg-surface overflow-hidden transition-all duration-300 ${
        isWinner
          ? "border-brand shadow-lg shadow-brand/10 ring-1 ring-brand/50"
          : "border-border hover:border-border/80"
      }`}
    >
      {/* Header Bar */}
      <div className="px-4 py-3 border-b border-border bg-surface-2/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-base" style={{ color: detail.color }}>
            {detail.shape}
          </span>
          <span className="font-bold text-sm tracking-tight text-text">
            {stats.algorithm.toUpperCase()}
          </span>
          {stats.heuristic && (
            <span className="text-xs text-muted font-normal">({stats.heuristic})</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isWinner && (
            <span className="px-2 py-0.5 rounded-full bg-brand/20 text-brand text-[11px] font-bold">
              WINNER
            </span>
          )}
          <span
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
              stats.status === "found"
                ? "bg-success/15 text-success"
                : stats.status === "failed"
                ? "bg-danger/15 text-danger"
                : "bg-surface-2 text-muted"
            }`}
          >
            {stats.status === "found" ? "Route Found" : stats.status === "running" ? "Searching..." : stats.status}
          </span>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="relative w-full aspect-square bg-bg">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Relative Workload Bar */}
      <div className="w-full h-1 bg-surface-2">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${Math.min(100, Math.max(5, relativeEffort))}%`,
            backgroundColor: detail.color,
          }}
        />
      </div>

      {/* 2x3 Metric Stat Block */}
      <div className="p-4 bg-surface grid grid-cols-3 gap-3 border-t border-border text-left">
        <div>
          <span className="text-[11px] text-muted block mb-0.5">Cells Checked</span>
          <span className="text-base font-bold text-text tabular-nums">{stats.expanded}</span>
        </div>
        <div>
          <span className="text-[11px] text-muted block mb-0.5">Waiting Now</span>
          <span className="text-base font-bold text-text tabular-nums">{stats.frontier}</span>
        </div>
        <div>
          <span className="text-[11px] text-muted block mb-0.5">Peak Waiting</span>
          <span className="text-base font-bold text-text tabular-nums">{stats.peakFrontier}</span>
        </div>
        <div>
          <span className="text-[11px] text-muted block mb-0.5">Route Length</span>
          <span className="text-sm font-semibold text-text tabular-nums">
            {stats.pathLength !== null && stats.pathLength !== undefined ? stats.pathLength : "—"}
          </span>
        </div>
        <div>
          <span className="text-[11px] text-muted block mb-0.5">Route Cost</span>
          <span className="text-sm font-semibold text-text tabular-nums">
            {stats.pathCost !== null && stats.pathCost !== undefined ? stats.pathCost : "—"}
          </span>
        </div>
        <div>
          <span className="text-[11px] text-muted block mb-0.5">Quality vs Best</span>
          <span className="text-sm font-bold text-brand tabular-nums">
            {stats.optimality !== null && stats.optimality !== undefined
              ? `${Math.round(stats.optimality * 100)}%`
              : "—"}
          </span>
        </div>
      </div>
    </div>
  );
};
