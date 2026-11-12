import React from "react";
import { Sparkles } from "lucide-react";
import type { ParticipantStats } from "@/hooks/useRace";

interface NarratorBarProps {
  stats: ParticipantStats[];
  raceState: string;
  serverNote?: string | null;
}

const NARRATOR_TEMPLATES: Record<string, string> = {
  bfs: "BFS is expanding in concentric rings, verifying all paths level by level.",
  dfs: "DFS is plunging deep along an unobstructed branch to explore dead ends.",
  ucs: "UCS (Dijkstra) always prioritizes the path with the lowest accumulated cost.",
  greedy: "Greedy Best-First is sprinting straight toward the goal using its heuristic hint.",
  astar: "A* is balancing distance traveled against remaining estimated cost (smallest f).",
  bds: "Bidirectional search is expanding two simultaneous wavefronts from start and goal until they meet.",
};

export const NarratorBar: React.FC<NarratorBarProps> = ({
  stats,
  raceState,
  serverNote,
}) => {
  if (raceState === "idle") {
    return (
      <div className="w-full px-3.5 py-1.5 rounded-lg border border-border bg-surface-2 flex items-center justify-between text-xs text-muted select-none">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-brand" />
          <span>Select algorithms, draw walls or terrain, and start racing.</span>
          <span className="hidden md:inline text-muted/70">• Use "Show" dropdown to display algorithm values on cells (g, h, f).</span>
        </div>
        <span className="font-mono text-[11px] text-muted/80">Press Space to start</span>
      </div>
    );
  }

  const activeParticipant = stats.find((s) => s.status === "running") || stats[0];
  const fallback = activeParticipant
    ? NARRATOR_TEMPLATES[activeParticipant.algorithm.toLowerCase()] ||
      `${activeParticipant.algorithm.toUpperCase()} is checking cells…`
    : "Evaluating search frontiers…";

  const displayMessage = serverNote || fallback;

  return (
    <div
      aria-live="polite"
      className="w-full px-3.5 py-1.5 rounded-lg border border-brand/30 bg-brand/10 flex items-center justify-between text-xs text-text transition-all duration-300 select-none shadow-2xs"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2 h-2 rounded-full bg-brand animate-pulse shrink-0" />
        <span className="font-medium truncate">{displayMessage}</span>
      </div>
      <span className="font-mono text-[11px] text-brand uppercase font-bold tracking-wider shrink-0 ml-2">
        {raceState}
      </span>
    </div>
  );
};
