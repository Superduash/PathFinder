import React, { useState, useMemo } from "react";
import { useTheme } from "next-themes";
import {
  X,
  Trophy,
  Info,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowUpDown,
  GitCompare,
} from "lucide-react";
import { getAlgorithmColor, ALGORITHM_VISUALS } from "@/lib/palette";
import type { RaceSummary, RaceResult } from "@/lib/types";

interface RaceInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: RaceSummary | null;
  onRaceAgain: () => void;
  onCompareRoutes?: () => void;
}

type SortField = "rank" | "label" | "checked" | "route_steps" | "route_cost" | "quality" | "search_ms";

export const RaceInsightsModal: React.FC<RaceInsightsModalProps> = ({
  isOpen,
  onClose,
  summary,
  onRaceAgain,
  onCompareRoutes,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const rawResults = summary?.results;
  const results: RaceResult[] = useMemo(() => rawResults || [], [rawResults]);
  const awards = summary?.awards;
  const bestId = awards?.best_overall?.id;
  const bestResult = bestId !== null && bestId !== undefined ? results.find((r) => r.id === bestId) : null;
  const bestReason = awards?.best_overall?.reason || summary?.winner_reason || "No route exists.";

  const sortedResults = useMemo(() => {
    const list = [...results];
    list.sort((a, b) => {
      let va: any = a[sortField];
      let vb: any = b[sortField];
      if (va === null || va === undefined) va = sortAsc ? Infinity : -Infinity;
      if (vb === null || vb === undefined) vb = sortAsc ? Infinity : -Infinity;
      if (typeof va === "string") {
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortAsc ? va - vb : vb - va;
    });
    return list;
  }, [results, sortField, sortAsc]);

  if (!isOpen || !summary) return null;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const bestVisual = bestResult ? ALGORITHM_VISUALS[bestResult.algorithm.toLowerCase()] : null;
  const bestColor = bestResult ? getAlgorithmColor(bestResult.algorithm.toLowerCase(), isDark) : "#4C9AFF";

  // Award racer names
  const shortestRacers = awards?.shortest_route?.ids?.map((id) => results.find((r) => r.id === id)?.label || `Racer ${id}`).join(", ") || "None";
  const fewestRacer = awards?.fewest_checked?.id !== null && awards?.fewest_checked?.id !== undefined
    ? results.find((r) => r.id === awards.fewest_checked?.id)?.label || `Racer ${awards.fewest_checked?.id}`
    : "None";
  const fastestRacer = awards?.fastest_search?.id !== null && awards?.fastest_search?.id !== undefined
    ? results.find((r) => r.id === awards.fastest_search?.id)?.label || `Racer ${awards.fastest_search?.id}`
    : "None";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-surface border border-border rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-text animate-in fade-in zoom-in-95 duration-200">
        {/* 1. Header */}
        <div className="p-5 border-b border-border flex items-start justify-between gap-4 bg-surface-2">
          <div>
            <h2 className="text-xl font-bold font-heading text-text">Race results</h2>
            <p className="text-sm text-muted mt-0.5">
              Ranked by: shortest route first, then fewest cells checked.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface border border-border text-muted hover:text-text transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-sm">
          {/* 2. Best Result Card */}
          {bestResult && (
            <div
              className="p-5 rounded-2xl border-2 bg-surface-2 space-y-3"
              style={{ borderColor: bestColor }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                  style={{ backgroundColor: bestColor }}
                >
                  <Trophy className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-text">{bestResult.label}</span>
                    <span className="text-xs text-muted">
                      ({bestVisual?.fullName || bestResult.algorithm.toUpperCase()})
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-brand/20 text-brand text-xs font-bold">
                      Best Overall
                    </span>
                  </div>
                  <p className="text-sm text-muted mt-0.5">{bestReason}</p>
                </div>
              </div>

              {/* Three Metric Tiles */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-surface border border-border">
                  <div className="text-xs text-muted">Cells checked</div>
                  <div className="text-lg font-bold font-mono text-text mt-0.5">
                    {bestResult.checked}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-border">
                  <div className="text-xs text-muted">Route cost</div>
                  <div className="text-lg font-bold font-mono text-text mt-0.5">
                    {bestResult.status === "failed" ? "No route" : bestResult.route_cost ?? "—"}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-border">
                  <div className="text-xs text-muted">Route steps</div>
                  <div className="text-lg font-bold font-mono text-text mt-0.5">
                    {bestResult.status === "failed" ? "No route" : bestResult.route_steps ?? "—"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Award Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-surface-2 border border-border">
              <div className="flex items-center justify-between text-xs text-muted mb-1">
                <span>Shortest route</span>
                <span title="Racers who found an optimal route with minimum total cost">
                  <Info className="w-3.5 h-3.5 text-muted hover:text-text cursor-help" />
                </span>
              </div>
              <div className="font-semibold text-text truncate">{shortestRacers}</div>
              <div className="text-xs text-muted font-mono mt-0.5">
                Cost: {awards?.shortest_route?.cost ?? "—"}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-2 border border-border">
              <div className="flex items-center justify-between text-xs text-muted mb-1">
                <span>Fewest checked</span>
                <span title="Racer that checked the minimal number of maze cells">
                  <Info className="w-3.5 h-3.5 text-muted hover:text-text cursor-help" />
                </span>
              </div>
              <div className="font-semibold text-text truncate">{fewestRacer}</div>
              <div className="text-xs text-muted font-mono mt-0.5">
                {awards?.fewest_checked?.value !== null && awards?.fewest_checked?.value !== undefined
                  ? `${awards.fewest_checked.value} cells`
                  : "—"}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-2 border border-border">
              <div className="flex items-center justify-between text-xs text-muted mb-1">
                <span>Fastest search (indicative)</span>
                <span title="Execution compute time on server">
                  <Info className="w-3.5 h-3.5 text-muted hover:text-text cursor-help" />
                </span>
              </div>
              <div className="font-semibold text-text truncate">{fastestRacer}</div>
              <div className="text-xs text-muted font-mono mt-0.5">
                {awards?.fastest_search?.within_noise
                  ? "too close to call"
                  : awards?.fastest_search?.ms !== null && awards?.fastest_search?.ms !== undefined
                  ? `${awards.fastest_search.ms} ms`
                  : "—"}
              </div>
            </div>
          </div>

          {/* 4. Insights List */}
          {(summary.insights.length > 0 || summary.explanations.length > 0) && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Analysis & Insights</h3>
              <div className="space-y-1.5">
                {summary.insights.map((ins, idx) => {
                  const tone = ins.tone;
                  return (
                    <div
                      key={ins.id || idx}
                      className="p-3 rounded-xl border border-border bg-surface-2 flex items-start gap-2.5 text-sm"
                    >
                      {tone === "good" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      ) : tone === "warn" ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        {ins.title && <span className="font-semibold text-text mr-1.5">{ins.title}:</span>}
                        <span className="text-muted">{ins.text}</span>
                      </div>
                    </div>
                  );
                })}
                {summary.explanations.map((exp, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-border bg-surface-2 flex items-start gap-2.5 text-sm"
                  >
                    <Info className="w-4 h-4 text-muted shrink-0 mt-0.5" />
                    <span className="text-muted">{exp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. All Racers Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">All racers</h3>
            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-surface-2 border-b border-border text-xs text-muted select-none">
                  <tr>
                    <th
                      className="px-3 py-2.5 cursor-pointer hover:text-text"
                      onClick={() => handleSort("rank")}
                    >
                      <div className="flex items-center gap-1">
                        Rank
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="px-3 py-2.5 cursor-pointer hover:text-text"
                      onClick={() => handleSort("label")}
                    >
                      <div className="flex items-center gap-1">
                        Racer
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="px-3 py-2.5 text-right cursor-pointer hover:text-text"
                      onClick={() => handleSort("checked")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Checked
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="px-3 py-2.5 text-right cursor-pointer hover:text-text"
                      onClick={() => handleSort("route_steps")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Steps
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="px-3 py-2.5 text-right cursor-pointer hover:text-text"
                      onClick={() => handleSort("route_cost")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Cost
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="px-3 py-2.5 text-right cursor-pointer hover:text-text"
                      onClick={() => handleSort("quality")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Quality %
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="px-3 py-2.5 text-right cursor-pointer hover:text-text"
                      onClick={() => handleSort("search_ms")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Search ms
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedResults.map((r) => {
                    const isShortest = awards?.shortest_route?.ids?.includes(r.id);
                    const color = getAlgorithmColor(r.algorithm.toLowerCase(), isDark);
                    return (
                      <tr key={r.id} className="hover:bg-surface-2/50 transition-colors">
                        <td className="px-3 py-2.5 font-bold tabular-nums">#{r.rank ?? r.id + 1}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="font-semibold text-text">{r.label}</span>
                            {isShortest && (
                              <span className="px-1.5 py-0.5 rounded bg-brand/15 text-brand text-[11px] font-bold">
                                Shortest
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums">{r.checked}</td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                          {r.status === "failed" ? (
                            <span className="text-danger">No route</span>
                          ) : (
                            r.route_steps ?? "—"
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                          {r.status === "failed" ? (
                            <span className="text-danger">No route</span>
                          ) : (
                            r.route_cost ?? "—"
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                          {r.quality ? `${Math.round(r.quality * 100)}%` : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted">
                          {r.search_ms.toFixed(2)} ms
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 6. Footer Buttons */}
        <div className="p-4 border-t border-border flex items-center justify-between gap-3 bg-surface-2">
          <div className="flex items-center gap-2">
            {onCompareRoutes && (
              <button
                type="button"
                onClick={onCompareRoutes}
                className="px-4 py-2.5 rounded-xl border border-border hover:bg-surface text-text font-semibold flex items-center gap-2 text-sm transition-colors"
              >
                <GitCompare className="w-4 h-4" />
                Compare routes
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRaceAgain}
              className="px-4 py-2.5 rounded-xl bg-brand text-brand-ink font-bold flex items-center gap-2 text-sm hover:opacity-90 transition-opacity"
            >
              <RotateCcw className="w-4 h-4" />
              Race again
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border hover:bg-surface text-text font-semibold text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
