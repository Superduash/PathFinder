import React from "react";
import { Trophy, ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { ParticipantStats } from "@/hooks/useRace";

interface WinnerBannerProps {
  winner: ParticipantStats;
  totalParticipants: number;
  onRaceAgain: () => void;
  onNewMaze: () => void;
}

export const WinnerBanner: React.FC<WinnerBannerProps> = ({
  winner,
  onRaceAgain,
  onNewMaze,
}) => {
  return (
    <div className="w-full p-5 rounded-2xl border-2 border-brand bg-surface shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand">
          <Trophy className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-text">
              {winner.algorithm.toUpperCase()} Wins the Race
            </span>
            <span className="px-2 py-0.5 rounded-full bg-brand/20 text-brand text-xs font-semibold">
              Least Work
            </span>
          </div>
          <p className="text-muted text-xs mt-0.5">
            Checked only <strong>{winner.expanded} cells</strong> and discovered the optimal route of cost{" "}
            <strong>{winner.pathCost}</strong>.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <Button variant="secondary" size="sm" onClick={onRaceAgain} className="gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" /> Race Again
        </Button>
        <Button variant="outline" size="sm" onClick={onNewMaze} className="gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> New Maze
        </Button>
        <Link to="/benchmark">
          <Button size="sm" className="gap-1.5">
            Compare on 100 Mazes <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

