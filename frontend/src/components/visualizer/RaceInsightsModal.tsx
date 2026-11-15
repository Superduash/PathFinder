import React, { useState } from "react";
import { X, Trophy, Medal, ChevronDown, ChevronUp } from "lucide-react";

interface RaceInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: any | null;
  onRaceAgain: () => void;
}

interface AlgorithmColors {
  [key: string]: { main: string; soft: string };
}

const ALGORITHM_COLORS: AlgorithmColors = {
  bfs: { main: "#38BDF8", soft: "rgba(56, 189, 248, 0.22)" },
  dfs: { main: "#FB923C", soft: "rgba(251, 146, 60, 0.22)" },
  ucs: { main: "#A78BFA", soft: "rgba(167, 139, 250, 0.22)" },
  greedy: { main: "#F472B6", soft: "rgba(244, 114, 182, 0.22)" },
  astar: { main: "#34D399", soft: "rgba(52, 211, 153, 0.22)" },
  bds: { main: "#FACC15", soft: "rgba(250, 204, 21, 0.22)" },
};

const ALGORITHM_NAMES: { [key: string]: string } = {
  bfs: "BFS",
  dfs: "DFS",
  ucs: "UCS",
  greedy: "Greedy Best-First",
  astar: "A* Search",
  bds: "Bidirectional Search",
};

export const RaceInsightsModal: React.FC<RaceInsightsModalProps> = ({
  isOpen,
  onClose,
  summary,
  onRaceAgain,
}) => {
  const [showAllRacers, setShowAllRacers] = useState(false);

  if (!isOpen || !summary) return null;

  const winner = summary.awards?.best_overall?.id;
  const winnerScore = summary.awards?.best_overall?.score;
  const winnerData = winner !== undefined && winner !== null ? summary.participants[winner] : null;

  // Calculate scores for all successful participants
  const successfulIndices = summary.participants
    .map((p: any, i: number) => ({ index: i, participant: p }))
    .filter((item: any) => item.participant.status === "found");

  const scores: { [key: number]: number } = {};
  
  if (successfulIndices.length > 0) {
    // Find best values for normalization
    const minCost = Math.min(...successfulIndices.map((item: any) => item.participant.pathCost || Infinity));
    const minExpanded = Math.min(...successfulIndices.map((item: any) => item.participant.expanded));

    successfulIndices.forEach((item: any) => {
      const cost = item.participant.pathCost || Infinity;
      const expanded = item.participant.expanded;

      // Normalize each metric (100 = best)
      const qualityScore = 100.0 * (minCost / cost);
      const efficiencyScore = 100.0 * (minExpanded / expanded);
      const speedScore = 100.0; // Placeholder

      // Weighted combination: 40% quality, 35% efficiency, 25% speed
      const totalScore = 0.40 * qualityScore + 0.35 * efficiencyScore + 0.25 * speedScore;
      scores[item.index] = totalScore;
    });
  }

  // Find runner-up (second highest score)
  const sortedByScore = [...successfulIndices].sort((a: any, b: any) => {
    const scoreA = scores[a.index] || 0;
    const scoreB = scores[b.index] || 0;
    return scoreB - scoreA;
  });

  const runnerUp = sortedByScore.length > 1 ? sortedByScore[1].index : null;
  const runnerUpData = runnerUp !== null ? summary.participants[runnerUp] : null;
  const runnerUpScore = runnerUp !== null ? scores[runnerUp] : undefined;

  const getAlgorithmColor = (algorithm: string) => {
    return ALGORITHM_COLORS[algorithm.toLowerCase()] || { main: "#2DD4BF", soft: "rgba(45, 212, 191, 0.22)" };
  };

  const getAlgorithmName = (algorithm: string) => {
    return ALGORITHM_NAMES[algorithm.toLowerCase()] || algorithm.toUpperCase();
  };

  const generateComparison = () => {
    if (!winnerData || !runnerUpData) return "";

    const winnerAlg = getAlgorithmName(winnerData.algorithm);

    const winnerCost = winnerData.pathCost || 0;
    const runnerUpCost = runnerUpData.pathCost || 0;
    const winnerExpanded = winnerData.expanded;
    const runnerUpExpanded = runnerUpData.expanded;

    const parts = [];

    if (winnerExpanded < runnerUpExpanded) {
      const ratio = Math.round((runnerUpExpanded / winnerExpanded) * 10) / 10;
      parts.push(`explored ${ratio}× fewer cells`);
    }

    if (winnerCost > runnerUpCost) {
      const diff = Math.round(((winnerCost / runnerUpCost - 1) * 100) * 10) / 10;
      parts.push(`found a ${diff}% more expensive route`);
    } else if (runnerUpCost > winnerCost) {
      parts.push(`found a lower-cost route`);
    }

    if (parts.length === 0) {
      return `${winnerAlg} won through balanced performance across all metrics.`;
    }

    return `${winnerAlg} won because it ${parts[0]}${parts.length > 1 ? `, but ${parts[1]}` : ""}.`;
  };

  const generateTakeaway = () => {
    if (!winnerData || !runnerUpData) return "";

    const winnerAlg = winnerData.algorithm.toLowerCase();
    const runnerUpAlg = runnerUpData.algorithm.toLowerCase();

    if (winnerAlg === "greedy" && runnerUpAlg === "astar") {
      return "Greedy prioritizes reaching the goal quickly using a heuristic. A* balances the distance already travelled with an estimate of the remaining distance. Greedy can be faster, but A* provides optimality when its heuristic is admissible.";
    }

    if (winnerAlg === "astar" && runnerUpAlg === "greedy") {
      return "A* found the optimal path by considering both actual cost (g) and heuristic estimate (h). Greedy only considers the heuristic, which can lead to faster searches but suboptimal paths.";
    }

    if (winnerAlg === "ucs" && runnerUpAlg === "bfs") {
      return "UCS accounts for varying terrain costs, while BFS treats all moves equally. When terrain matters, UCS finds cheaper routes at the cost of more exploration.";
    }

    if (winnerAlg === "bfs" && runnerUpAlg === "dfs") {
      return "BFS explores systematically by distance, guaranteeing the shortest path. DFS follows deep paths before backtracking, which can be faster but may miss shorter routes.";
    }

    return `${getAlgorithmName(winnerData.algorithm)} and ${getAlgorithmName(runnerUpData.algorithm)} use different exploration strategies. The winner depends on maze layout, terrain costs, and the chosen performance priorities.`;
  };

  const MetricCard: React.FC<{ label: string; value: string | number; highlight?: boolean }> = ({
    label,
    value,
    highlight,
  }) => (
    <div className={`text-center px-3 py-2 rounded-lg ${highlight ? "bg-brand/10 border border-brand/30" : "bg-surface-3"}`}>
      <div className="text-2xl font-bold font-display text-text">{value}</div>
      <div className="text-xs text-muted mt-0.5">{label}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold font-display text-text">Race Insights</h2>
            <p className="text-sm text-muted">Understanding the results · Current maze</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-2 text-muted hover:text-text transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Winner Section */}
          {winnerData && (
            <div
              className="border-2 rounded-xl p-5"
              style={{
                borderColor: getAlgorithmColor(winnerData.algorithm).main,
                backgroundColor: getAlgorithmColor(winnerData.algorithm).soft,
              }}
            >
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: getAlgorithmColor(winnerData.algorithm).main }}
                >
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold uppercase tracking-wide text-muted mb-1">
                    🏆 1st Place
                  </div>
                  <h3 className="text-xl font-bold font-display text-text">
                    {getAlgorithmName(winnerData.algorithm)}
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold font-display" style={{ color: getAlgorithmColor(winnerData.algorithm).main }}>
                    {winnerScore !== undefined && !isNaN(winnerScore) ? winnerScore.toFixed(1) : "—"}
                  </div>
                  <div className="text-xs text-muted">Weighted score</div>
                </div>
              </div>

              <p className="text-sm text-text-2 mb-4">
                {generateComparison()}
              </p>

              <div className="grid grid-cols-3 gap-3">
                <MetricCard label="Cells checked" value={winnerData.expanded} />
                <MetricCard
                  label="Route cost"
                  value={winnerData.pathCost !== undefined && winnerData.pathCost !== null ? winnerData.pathCost.toFixed(1) : "—"}
                  highlight={winnerData.optimality === 1.0}
                />
                <MetricCard label="Path length" value={winnerData.pathLength !== undefined && winnerData.pathLength !== null ? winnerData.pathLength : "—"} />
              </div>
            </div>
          )}

          {/* Runner-up Section */}
          {runnerUpData && runnerUpScore !== undefined && (
            <div className="border rounded-xl p-5 bg-surface-2 border-border">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-lg bg-surface-3">
                  <Medal className="w-5 h-5 text-muted" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold uppercase tracking-wide text-muted mb-1">
                    🥈 2nd Place
                  </div>
                  <h3 className="text-lg font-bold font-display text-text">
                    {getAlgorithmName(runnerUpData.algorithm)}
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold font-display text-text">
                    {runnerUpScore !== undefined && !isNaN(runnerUpScore) ? runnerUpScore.toFixed(1) : "—"}
                  </div>
                  <div className="text-xs text-muted">Score</div>
                </div>
              </div>

              <p className="text-sm text-text-2 mb-4">
                {runnerUpData.optimality === 1.0
                  ? `${getAlgorithmName(runnerUpData.algorithm)} found an optimal route with cost ${runnerUpData.pathCost !== undefined && runnerUpData.pathCost !== null ? runnerUpData.pathCost.toFixed(1) : "unknown"}.`
                  : `${getAlgorithmName(runnerUpData.algorithm)} explored ${runnerUpData.expanded} cells and found a route.`}
              </p>

              <div className="grid grid-cols-3 gap-3">
                <MetricCard label="Cells checked" value={runnerUpData.expanded} />
                <MetricCard
                  label="Route cost"
                  value={runnerUpData.pathCost !== undefined && runnerUpData.pathCost !== null ? runnerUpData.pathCost.toFixed(1) : "—"}
                  highlight={runnerUpData.optimality === 1.0}
                />
                <MetricCard label="Path length" value={runnerUpData.pathLength !== undefined && runnerUpData.pathLength !== null ? runnerUpData.pathLength : "—"} />
              </div>
            </div>
          )}

          {/* Learning Takeaway */}
          {winnerData && runnerUpData && (
            <div className="bg-surface-2 border border-border rounded-xl p-5">
              <h4 className="text-sm font-bold font-display text-text mb-2">
                💡 What should you learn from this race?
              </h4>
              <p className="text-sm text-text-2 leading-relaxed">{generateTakeaway()}</p>
            </div>
          )}

          {/* Scoring Transparency */}
          <div className="bg-surface-2 border border-border rounded-xl p-5">
            <h4 className="text-sm font-bold font-display text-text mb-3">⚖️ Scoring Weights</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-2">Path Quality (lower cost)</span>
                <span className="font-bold font-mono text-brand">40%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-2">Search Efficiency (fewer cells)</span>
                <span className="font-bold font-mono text-brand">35%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-2">Execution Speed (faster time)</span>
                <span className="font-bold font-mono text-brand">25%</span>
              </div>
            </div>
            <p className="text-xs text-muted mt-3">
              The winner depends on these selected priorities. Different weights would produce different results.
            </p>
          </div>

          {/* Compare All Racers (Expandable) */}
          {summary.participants.length > 2 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setShowAllRacers(!showAllRacers)}
                className="w-full px-5 py-3 flex items-center justify-between bg-surface-2 hover:bg-surface-3 transition-colors"
              >
                <span className="text-sm font-bold font-display text-text">
                  Compare All {summary.participants.length} Racers
                </span>
                {showAllRacers ? (
                  <ChevronUp className="w-4 h-4 text-muted" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted" />
                )}
              </button>

              {showAllRacers && (
                <div className="p-5 bg-surface space-y-3">
                  {summary.participants.map((p: any, i: number) => {
                    const colors = getAlgorithmColor(p.algorithm);
                    const isWinner = i === winner;
                    const isRunnerUp = i === runnerUp;

                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-lg border"
                        style={{
                          borderColor: isWinner || isRunnerUp ? colors.main : "var(--border)",
                          backgroundColor: isWinner || isRunnerUp ? colors.soft : "var(--surface-2)",
                        }}
                      >
                        <div className="flex-shrink-0 w-8 text-center">
                          <span className="text-sm font-bold text-muted">#{i + 1}</span>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold font-display text-text">
                            {getAlgorithmName(p.algorithm)}
                            {isWinner && " 🏆"}
                            {isRunnerUp && " 🥈"}
                          </div>
                          <div className="text-xs text-muted">
                            {p.status === "found"
                              ? `${p.expanded} cells · Cost ${p.pathCost !== undefined && p.pathCost !== null ? p.pathCost.toFixed(1) : "—"} · ${p.optimality === 1.0 ? "Optimal" : "Suboptimal"}`
                              : "Failed to find route"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onRaceAgain}
              className="flex-1 px-4 py-2.5 rounded-lg bg-brand hover:brightness-110 text-brand-ink font-bold text-sm transition-all shadow-sm"
            >
              Race Again
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-border bg-surface-2 hover:bg-surface text-text font-bold text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
