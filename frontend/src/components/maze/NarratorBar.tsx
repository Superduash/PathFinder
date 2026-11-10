import React from "react";
import { Sparkles } from "lucide-react";
import type { ParticipantStats } from "@/hooks/useRace";

interface NarratorBarProps {
  stats: ParticipantStats[];
  raceState: string;
}

const NARRATOR_TEMPLATES: Record<string, string> = {
  bfs: "BFS is expanding in concentric rings, verifying all paths level by level.",
  dfs: "DFS is plunging deep along an unobstructed branch to test dead ends.",
  ucs: "UCS (Dijkstra) always prioritizes the path with the lowest accumulated cost.",
  greedy: "Greedy Best-First is sprinting straight toward the goal using its heuristic.",
  astar: "A* is balancing distance traveled against remaining estimated cost.",
};

export const NarratorBar: React.FC<NarratorBarProps> = ({ stats, raceState }) => {
  if (raceState === "idle") {
    return (
      <div className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-2/60 flex items-center justify-between text-xs text-muted">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-brand" />
          <span>Select algorithms, draw walls, or choose a preset to begin racing.</span>
        </div>
        <span className="font-mono text-[11px] text-muted/80">Press Space to start</span>
      </div>
    );
  }

  const activeParticipant = stats.find((s) => s.status === "running") || stats[0];
  const narrative = activeParticipant
    ? NARRATOR_TEMPLATES[activeParticipant.algorithm.toLowerCase()] ||
      `${activeParticipant.algorithm.toUpperCase()} is checking cells...`
    : "Evaluating search frontiers...";

  return (
    <div
      aria-live="polite"
      className="w-full px-4 py-2.5 rounded-xl border border-brand/30 bg-brand/10 flex items-center justify-between text-xs text-text transition-all duration-300"
    >
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
        <span className="font-medium">{narrative}</span>
      </div>
      <span className="font-mono text-[11px] text-brand uppercase font-bold tracking-wider">
        {raceState}
      </span>
    </div>
  );
};

