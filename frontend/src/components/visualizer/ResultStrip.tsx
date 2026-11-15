import React, { useState } from "react";
import { useTheme } from "next-themes";
import { Trophy, CheckCircle2, AlertCircle } from "lucide-react";
import { ALGORITHM_VISUALS, getAlgorithmColor } from "@/lib/palette";
import type { ParticipantStats } from "@/hooks/useRace";

interface ResultStripProps {
  stats: ParticipantStats[];
  winnerIdx: number | null;
  maxExpandedSeen: number;
  summary?: { explanations?: string[]; route_groups?: { ids: number[]; same_route: boolean; label: string }[] } | null;
}

export const ResultStrip: React.FC<ResultStripProps> = ({
  stats,
  winnerIdx,
  maxExpandedSeen,
  summary,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const [compareRoutes, setCompareRoutes] = useState(false);

  if (!stats || stats.length === 0) return null;

  return (
    <div className="w-full flex flex-col gap-2 p-3 bg-surface border border-border rounded-xl shadow-xs select-none">
      <div className="flex items-center justify-between pb-1 border-b border-border text-xs text-muted font-bold uppercase tracking-wider">
        <span>Race Statistics</span>
        <span className="text-xs lowercase font-normal">
          * search time is server compute effort
        </span>
      </div>

      {summary && (summary.explanations?.length || summary.route_groups?.length) ? (
        <div className="flex flex-wrap items-center gap-2 text-sm" aria-live="polite">
          <button type="button" onClick={() => setCompareRoutes((open) => !open)} className="px-3 py-1.5 rounded-md border border-brand/40 text-brand font-semibold">
            {compareRoutes ? "Hide route comparison" : "Compare routes"}
          </button>
          {summary.route_groups?.filter((group) => group.same_route).map((group) => (
            <span key={group.ids.join(",")} className="px-2.5 py-1 rounded-full border border-border bg-surface-2 text-muted">
              {group.label} = same route
            </span>
          ))}
          {summary.explanations?.map((explanation) => (
            <span key={explanation} className="text-text-2">{explanation}</span>
          ))}
        </div>
      ) : null}

      {compareRoutes && (
        <div className="overflow-x-auto rounded-lg border border-border" aria-label="Route comparison">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-2 text-muted">
              <tr><th className="px-3 py-2">Algorithm</th><th className="px-3 py-2">Steps</th><th className="px-3 py-2">Cost</th><th className="px-3 py-2">Turns</th></tr>
            </thead>
            <tbody>
              {stats.filter((stat) => stat.path?.length).map((stat) => {
                const path = stat.path || [];
                const turns = path.slice(2).reduce((count, cell, index) => {
                  const previous = path[index + 1];
                  const before = path[index];
                  const firstDirection = [previous[0] - before[0], previous[1] - before[1]];
                  const direction = [cell[0] - previous[0], cell[1] - previous[1]];
                  return count + (firstDirection[0] !== direction[0] || firstDirection[1] !== direction[1] ? 1 : 0);
                }, 0);
                return <tr key={stat.algorithm} className="border-t border-border"><td className="px-3 py-2 font-semibold">{stat.algorithm.toUpperCase()}</td><td className="px-3 py-2 tabular-nums">{stat.pathLength ?? "-"}</td><td className="px-3 py-2 tabular-nums">{stat.pathCost ?? "-"}</td><td className="px-3 py-2 tabular-nums">{turns}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
        {stats.map((s, idx) => {
          const algKey = s.algorithm.toLowerCase();
          const meta = ALGORITHM_VISUALS[algKey] || {
            short: s.algorithm.toUpperCase(),
            fullName: s.algorithm,
          };
          const color = getAlgorithmColor(algKey, isDark);
          const isWinner = winnerIdx === idx && s.status === "found";
          const workPercent = maxExpandedSeen > 0 ? (s.expanded / maxExpandedSeen) * 100 : 0;

          return (
            <div
              key={idx}
              className={`flex flex-col p-2.5 rounded-lg border transition-all text-xs ${
                isWinner
                  ? "border-brand bg-brand/10 ring-1 ring-brand/40 shadow-xs"
                  : "border-border bg-surface-2"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-bold text-text truncate">
                    {meta.short}
                  </span>
                  {s.heuristic && (
                    <span className="text-xs text-muted">({s.heuristic})</span>
                  )}
                </div>

                {isWinner ? (
                  <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-bold bg-brand text-brand-ink uppercase leading-none min-h-[20px]">
                    <Trophy className="w-2.5 h-2.5 fill-current" />
                    <span>Win</span>
                  </span>
                ) : s.status === "found" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                ) : s.status === "failed" ? (
                  <AlertCircle className="w-3.5 h-3.5 text-danger" />
                ) : (
                  <span className="text-xs text-muted">{s.status}</span>
                )}
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs py-1 border-t border-border/60">
                <div className="flex justify-between">
                  <span className="text-muted">Checked:</span>
                  <span className="font-mono font-bold text-text">{s.expanded}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Waiting:</span>
                  <span className="font-mono font-medium text-text">{s.frontier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Steps:</span>
                  <span className="font-mono font-bold text-brand">
                    {s.pathLength !== undefined && s.pathLength !== null ? s.pathLength : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Cost:</span>
                  <span className="font-mono font-medium text-text">
                    {s.pathCost !== undefined && s.pathCost !== null ? s.pathCost : "—"}
                  </span>
                </div>
              </div>

              {/* Optimality & Timing */}
              <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs text-muted">
                <span>
                  Opt:{" "}
                  <strong className="text-text">
                    {s.optimality ? `${Math.round(s.optimality * 100)}%` : "—"}
                  </strong>
                </span>
                <span>
                  Time:{" "}
                  <strong className="text-text font-mono">
                    {s.computeMs ? `${s.computeMs.toFixed(1)}ms` : "0ms"}
                  </strong>
                </span>
              </div>

              {/* Effort Bar */}
              <div className="w-full h-1 bg-surface rounded-full overflow-hidden mt-1.5">
                <div
                  className="h-full transition-all duration-200"
                  style={{
                    width: `${Math.min(100, Math.max(4, workPercent))}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

