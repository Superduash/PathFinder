import React from "react";
import { useTheme } from "next-themes";
import { AlertTriangle } from "lucide-react";
import { ALGORITHM_VISUALS, getAlgorithmColor } from "@/lib/palette";
import type { Participant } from "@/lib/types";

interface RacersSidebarProps {
  participants: Participant[];
  onToggleParticipant: (algKey: string) => void;
  onUpdateHeuristic: (algKey: string, heuristic: string) => void;
  diagonal: boolean;
}

const ALGORITHMS_ORDER = ["bfs", "dfs", "ucs", "greedy", "astar", "bds"];

export const RacersSidebar: React.FC<RacersSidebarProps> = ({
  participants,
  onToggleParticipant,
  onUpdateHeuristic,
  diagonal,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const isSelected = (key: string) => participants.some((p) => p.algorithm === key);
  const getHeuristic = (key: string) =>
    participants.find((p) => p.algorithm === key)?.heuristic || "manhattan";

  return (
    <aside className="w-56 shrink-0 flex flex-col gap-2 p-3 bg-surface border border-border rounded-xl shadow-xs select-none">
      <div className="flex items-center justify-between pb-1 border-b border-border">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
          Racers ({participants.length}/6)
        </span>
        <span className="text-[11px] text-muted font-medium">Head-to-Head</span>
      </div>

      <div className="flex flex-col gap-2">
        {ALGORITHMS_ORDER.map((key) => {
          const meta = ALGORITHM_VISUALS[key];
          const active = isSelected(key);
          const color = getAlgorithmColor(key, isDark);
          const hasHeuristic = key === "greedy" || key === "astar";
          const currentH = getHeuristic(key);
          const showAdmissibilityWarn = diagonal && hasHeuristic && currentH === "manhattan";

          return (
            <div
              key={key}
              className={`flex flex-col rounded-xl border transition-all duration-200 overflow-hidden ${
                active
                  ? "border-border bg-surface-2/60 shadow-xs ring-1"
                  : "border-border/40 bg-surface/40 opacity-55 hover:opacity-80"
              }`}
              style={{
                borderColor: active ? color : undefined,
                boxShadow: active ? `0 0 0 1px ${color}33` : undefined,
              }}
            >
              {/* Chip Header */}
              <div
                onClick={() => onToggleParticipant(key)}
                className="flex items-center justify-between p-2 cursor-pointer gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-text truncate">
                      {meta.short}
                    </span>
                    <span className="text-[10px] text-muted truncate leading-tight">
                      {meta.fullName}
                    </span>
                  </div>
                </div>

                {/* Custom Compact Switch */}
                <div
                  className={`w-8 h-4 rounded-full p-0.5 transition-colors shrink-0 ${
                    active ? "bg-brand" : "bg-surface-2 border border-border"
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-white transition-transform ${
                      active ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </div>
              </div>

              {/* Expandable Heuristic Selector for Greedy and A* */}
              {active && hasHeuristic && (
                <div className="px-2 pb-2 pt-1 border-t border-border/50 bg-surface/60 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px] text-muted font-medium">
                    <span>Hint (Heuristic):</span>
                    <select
                      value={currentH}
                      onChange={(e) => onUpdateHeuristic(key, e.target.value)}
                      className="bg-surface-2 border border-border rounded px-1.5 py-0.5 text-[11px] font-semibold text-text focus:outline-none focus:ring-1 focus:ring-brand"
                    >
                      <option value="manhattan">Manhattan (Grid)</option>
                      <option value="euclidean">Euclidean (Direct)</option>
                      {diagonal && <option value="chebyshev">Chebyshev (8-dir)</option>}
                      {diagonal && <option value="octile">Octile (8-dir)</option>}
                    </select>
                  </div>

                  {showAdmissibilityWarn && (
                    <div className="flex items-center gap-1 p-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px]">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span className="truncate leading-tight">
                        Manhattan may overestimate diagonal moves!
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};
