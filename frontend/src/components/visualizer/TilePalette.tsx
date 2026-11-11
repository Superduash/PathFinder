import React from "react";
import {
  Square,
  Eraser,
  Waves,
  Sparkles,
  Flag,
  Target,
} from "lucide-react";
import type { ToolType } from "@/store/useAppStore";

interface TilePaletteProps {
  selectedTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  disabled?: boolean;
}

interface TileItem {
  id: ToolType;
  label: string;
  cost: string;
  desc: string;
  icon: React.ReactNode;
  colorClass: string;
  costClass: string;
}

const TILES: TileItem[] = [
  {
    id: "wall",
    label: "Wall",
    cost: "✕ Blocked",
    desc: "You cannot walk through walls.",
    icon: <Square className="w-4 h-4 fill-current" />,
    colorClass: "bg-surface-2 border-border text-text hover:bg-surface-2/80",
    costClass: "bg-danger/15 text-danger border-danger/30",
  },
  {
    id: "erase",
    label: "Floor",
    cost: "Cost: 1",
    desc: "Normal ground. Each step costs 1.",
    icon: <Eraser className="w-4 h-4" />,
    colorClass: "bg-surface-2 border-border text-text hover:bg-surface-2/80",
    costClass: "bg-surface text-muted border-border",
  },
  {
    id: "sand",
    label: "Sand",
    cost: "Cost: 3",
    desc: "Slow ground. Stepping on sand costs 3.",
    icon: <Sparkles className="w-4 h-4 text-amber-500" />,
    colorClass: "bg-amber-950/20 border-amber-800/40 text-amber-400 hover:bg-amber-900/30",
    costClass: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  },
  {
    id: "water",
    label: "Water",
    cost: "Cost: 5",
    desc: "Very slow ground. Stepping on water costs 5.",
    icon: <Waves className="w-4 h-4 text-blue-500" />,
    colorClass: "bg-blue-950/20 border-blue-800/40 text-blue-400 hover:bg-blue-900/30",
    costClass: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  {
    id: "start",
    label: "Start",
    cost: "Origin",
    desc: "Where every racer begins. Click to place.",
    icon: <Flag className="w-4 h-4 text-emerald-500" />,
    colorClass: "bg-emerald-950/20 border-emerald-800/40 text-emerald-400 hover:bg-emerald-900/30",
    costClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  {
    id: "goal",
    label: "Goal",
    cost: "Target",
    desc: "The destination racers seek.",
    icon: <Target className="w-4 h-4 text-red-500" />,
    colorClass: "bg-red-950/20 border-red-800/40 text-red-400 hover:bg-red-900/30",
    costClass: "bg-red-500/15 text-red-400 border-red-500/30",
  },
];

export const TilePalette: React.FC<TilePaletteProps> = ({
  selectedTool,
  onSelectTool,
  disabled = false,
}) => {
  return (
    <aside className="w-40 shrink-0 flex flex-col gap-3 p-3 bg-surface border border-border rounded-xl shadow-xs select-none">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
          Draw Palette
        </span>
      </div>

      {/* Interactive Tile Tools */}
      <div className="flex flex-col gap-1.5">
        {TILES.map((t) => {
          const isActive = selectedTool === t.id;
          return (
            <button
              key={t.id}
              disabled={disabled}
              onClick={() => onSelectTool(t.id)}
              title={t.desc}
              className={`flex items-center justify-between p-2 rounded-lg border text-xs font-semibold transition-all ${
                isActive
                  ? "border-brand bg-brand/10 ring-1 ring-brand text-brand shadow-xs"
                  : `${t.colorClass} border-transparent`
              } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="flex items-center gap-2">
                <span className="shrink-0">{t.icon}</span>
                <span className="truncate">{t.label}</span>
              </div>
              <span
                className={`text-[10px] px-1 py-0.5 rounded border font-mono ${t.costClass}`}
              >
                {t.cost}
              </span>
            </button>
          );
        })}
      </div>

      <div className="h-px bg-border my-1" />

      {/* Legend Marks */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
          Legend
        </span>
        <div
          title="Cells already explored and expanded"
          className="flex items-center gap-2 p-1.5 rounded-md text-xs text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-help"
        >
          <div className="w-3.5 h-3.5 rounded bg-brand/30 border border-brand/60 shrink-0" />
          <span className="font-medium text-[11px]">Checked</span>
        </div>
        <div
          title="Cells discovered on the search frontier waiting to be evaluated"
          className="flex items-center gap-2 p-1.5 rounded-md text-xs text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-help"
        >
          <div className="w-3.5 h-3.5 rounded border-2 border-brand shrink-0" />
          <span className="font-medium text-[11px]">Waiting</span>
        </div>
        <div
          title="The final path found from Start to Goal"
          className="flex items-center gap-2 p-1.5 rounded-md text-xs text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-help"
        >
          <div className="w-3.5 h-1 rounded bg-brand shrink-0" />
          <span className="font-medium text-[11px]">Route</span>
        </div>
      </div>
    </aside>
  );
};
