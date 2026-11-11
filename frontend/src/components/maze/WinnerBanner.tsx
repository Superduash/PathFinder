import React from "react";
import { Trophy, ArrowRight, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import type { ParticipantStats } from "@/hooks/useRace";

export interface InsightItem {
  id?: string;
  tone?: "good" | "warn" | "neutral" | string;
  title?: string;
  text?: string;
}

interface WinnerBannerProps {
  winner: ParticipantStats;
  winnerReason?: string | null;
  insights?: (string | InsightItem)[];
  onRaceAgain: () => void;
  onNewMaze: () => void;
}

export const WinnerBanner: React.FC<WinnerBannerProps> = ({
  winner,
  winnerReason,
  insights = [],
  onRaceAgain,
  onNewMaze,
}) => {
  return (
    <div className="w-full p-4 rounded-xl border-2 border-brand bg-surface shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-3 duration-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand shrink-0">
          <Trophy className="w-5 h-5 fill-current" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-text">
              {winner.algorithm.toUpperCase()} Wins the Race
            </span>
            <span className="px-2 py-0.5 rounded-full bg-brand/20 text-brand text-[11px] font-bold">
              Winner
            </span>
          </div>
          <p className="text-muted text-xs mt-0.5 leading-relaxed">
            {winnerReason || (
              <>
                Checked <strong>{winner.expanded} cells</strong> with route steps:{" "}
                <strong>{winner.pathLength || "—"}</strong> and cost:{" "}
                <strong>{winner.pathCost || "—"}</strong>.
              </>
            )}
          </p>
          {insights.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {insights.map((ins, i) => {
                let text = "";
                let tone = "neutral";
                
                if (typeof ins === "string") {
                  text = ins;
                } else if (typeof ins === "object" && ins !== null) {
                  // Extract text from object, prioritize text > title, fallback to stringifying
                  text = ins.text || ins.title || "";
                  if (!text) {
                    // If both are empty, safely stringify the object
                    try {
                      text = JSON.stringify(ins);
                    } catch {
                      text = "[Insight]";
                    }
                  }
                  tone = ins.tone || "neutral";
                } else {
                  // Fallback for any other type
                  text = String(ins);
                }

                let toneClasses = "bg-surface-2 border-border text-text";
                if (tone === "good") {
                  toneClasses = "bg-emerald-500/15 border-emerald-500/30 text-emerald-400";
                } else if (tone === "warn") {
                  toneClasses = "bg-amber-500/15 border-amber-500/30 text-amber-400";
                }

                return (
                  <span
                    key={i}
                    className={`inline-block px-2.5 py-1 rounded-md border text-[11px] font-medium ${toneClasses}`}
                  >
                    {text}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onRaceAgain}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand text-brand-ink font-bold text-xs shadow-xs hover:brightness-110 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Race Again</span>
        </button>

        <button
          onClick={onNewMaze}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-2 hover:bg-surface text-text font-semibold text-xs shadow-2xs transition-colors"
        >
          <span>New Maze</span>
        </button>

        <Link
          to="/benchmark"
          className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg text-brand text-xs font-semibold hover:underline"
        >
          <span>Compare on 100 mazes</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
};
