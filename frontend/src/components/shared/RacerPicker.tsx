import React from "react";
import { useTheme } from "next-themes";
import { ALGORITHMS, ALGORITHM_VISUALS, getAlgorithmColor } from "@/lib/palette";

export interface ParticipantItem {
  algorithm: string;
  heuristic?: string | null;
}

interface RacerPickerProps {
  selected: ParticipantItem[];
  onChange: (participants: ParticipantItem[]) => void;
  max?: number;
  diagonal?: boolean;
}

const HEURISTIC_OPTIONS = [
  { value: "manhattan", label: "Manhattan (Grid)" },
  { value: "euclidean", label: "Euclidean (Direct)" },
  { value: "chebyshev", label: "Chebyshev (Diagonal)" },
  { value: "octile", label: "Octile (Natural)" },
  { value: "zero", label: "Zero (Dijkstra)" },
];

export const RacerPicker: React.FC<RacerPickerProps> = ({
  selected,
  onChange,
  max = 6,
  diagonal = false,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const isSelected = (id: string) => selected.some((p) => p.algorithm === id);

  const toggle = (id: string) => {
    if (isSelected(id)) {
      if (selected.length > 1) {
        onChange(selected.filter((p) => p.algorithm !== id));
      }
    } else {
      if (selected.length < max) {
        onChange([
          ...selected,
          {
            algorithm: id,
            heuristic: id === "greedy" || id === "astar" ? "manhattan" : null,
          },
        ]);
      }
    }
  };

  const updateHeuristic = (id: string, heuristic: string) => {
    onChange(
      selected.map((p) => (p.algorithm === id ? { ...p, heuristic } : p))
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-text">Choose Racers ({selected.length}/{max})</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              onChange(
                ALGORITHMS.map((alg: string) => ({
                  algorithm: alg,
                  heuristic: alg === "greedy" || alg === "astar" ? "manhattan" : null,
                }))
              )
            }
            className="text-[11px] text-brand hover:underline"
          >
            All
          </button>
          <span className="text-muted">·</span>
          <button
            type="button"
            onClick={() => onChange([{ algorithm: "bfs" }, { algorithm: "astar", heuristic: "manhattan" }])}
            className="text-[11px] text-muted hover:text-text"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {ALGORITHMS.map((algId: string) => {
          const active = isSelected(algId);
          const color = getAlgorithmColor(algId, isDark);
          const visual = ALGORITHM_VISUALS[algId] || { short: algId.toUpperCase(), fullName: algId, shape: "circle" };
          const participant = selected.find((p) => p.algorithm === algId);
          const hasHeuristic = algId === "greedy" || algId === "astar";

          return (
            <div
              key={algId}
              className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-1.5 ${
                active
                  ? "border-border bg-surface shadow-2xs"
                  : "border-border/50 bg-surface-2/40 opacity-60 hover:opacity-90"
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(algId)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div>
                    <div className="font-bold text-xs text-text">{visual.short}</div>
                    <div className="text-[10px] text-muted">{visual.fullName}</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => {}}
                  className="rounded text-brand accent-brand cursor-pointer"
                />
              </button>

              {active && hasHeuristic && (
                <div className="pt-1.5 border-t border-border/40 mt-1">
                  <label className="text-[10px] text-muted block mb-0.5">Hint:</label>
                  <select
                    value={participant?.heuristic || "manhattan"}
                    onChange={(e) => updateHeuristic(algId, e.target.value)}
                    className="w-full bg-surface-2 border border-border text-[11px] rounded px-1.5 py-0.5 text-text"
                  >
                    {HEURISTIC_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {participant?.heuristic === "manhattan" && diagonal && (
                    <span className="text-[9px] text-amber-500 block mt-0.5">
                      ⚠️ Inadmissible with diagonals
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
