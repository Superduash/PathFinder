import React from "react";
import { useTheme } from "next-themes";
import { useMazeCanvas } from "@/hooks/useMazeCanvas";
import { getAlgorithmColor, ALGORITHM_VISUALS } from "@/lib/palette";
import type { Maze } from "@/lib/types";
import type { ParticipantStats } from "@/hooks/useRace";

interface RacePanelProps {
  maze: Maze;
  stats: ParticipantStats;
  isWinner: boolean;
  maxExpandedSeen: number;
}

export const RacePanel: React.FC<RacePanelProps> = ({
  maze,
  stats,
  isWinner,
  maxExpandedSeen,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const algKey = stats.algorithm.toLowerCase();
  const visual = ALGORITHM_VISUALS[algKey] || {
    short: stats.algorithm.toUpperCase(),
    fullName: stats.algorithm,
    shape: "circle",
  };
  const color = getAlgorithmColor(algKey, isDark);

  const { canvasRef } = useMazeCanvas({
    maze,
    algorithmColor: color,
    exploredSet: stats.exploredSet,
    frontierSet: stats.frontierSet,
    currentNode: stats.currentNode,
    path: stats.path,
    interactive: false,
  });

  const relativeEffort = maxExpandedSeen > 0 ? (stats.expanded / maxExpandedSeen) * 100 : 0;

  return (
    <div
      className={`flex flex-col rounded-xl border bg-surface overflow-hidden transition-all duration-200 shadow-sm ${
        isWinner
          ? "border-brand ring-2 ring-brand/40 shadow-md"
          : "border-border hover:border-border/80"
      }`}
    >
      {/* Header Bar - compact 28px */}
      <div className="h-7 px-3 border-b border-border bg-surface-2 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="font-bold text-text truncate">
            {visual.short}
          </span>
          {stats.heuristic && (
            <span className="text-muted text-[11px] truncate">({stats.heuristic})</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isWinner && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-brand text-brand-ink uppercase tracking-wide">
              WINNER
            </span>
          )}
          <span
            className={`px-1.5 py-0.2 rounded text-[11px] font-medium ${
              stats.status === "found"
                ? "bg-success/15 text-success"
                : stats.status === "failed"
                ? "bg-danger/15 text-danger"
                : "text-muted"
            }`}
          >
            {stats.status === "found" ? "Route found" : stats.status === "running" ? "Searching…" : stats.status}
          </span>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="relative w-full aspect-square bg-bg">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Effort progress indicator */}
      <div className="w-full h-1 bg-surface-2">
        <div
          className="h-full transition-all duration-200"
          style={{
            width: `${Math.min(100, Math.max(3, relativeEffort))}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
};
