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
    cost: "Blocked",
    desc: "You cannot walk through walls.",
    icon: <Square className="w-4 h-4 fill-current" />,
    colorClass: "bg-surface-2 border-border text-text hover:bg-surface-2/80",
    costClass: "bg-red-100 text-red-800 border-red-300 dark:bg-danger/15 dark:text-danger dark:border-danger/30",
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
    icon: <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
    colorClass:
      "bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100/80 dark:bg-amber-950/30 dark:border-amber-800/50 dark:text-amber-300 dark:hover:bg-amber-900/40",
    costClass:
      "bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-300",
  },
  {
    id: "water",
    label: "Water",
    cost: "Cost: 5",
    desc: "Very slow ground. Stepping on water costs 5.",
    icon: <Waves className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
    colorClass:
      "bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100/80 dark:bg-blue-950/30 dark:border-blue-800/50 dark:text-blue-300 dark:hover:bg-blue-900/40",
    costClass:
      "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-500/15 dark:border-blue-500/30 dark:text-blue-300",
  },
  {
    id: "start",
    label: "Start",
    cost: "Origin",
    desc: "Where every racer begins. Click to place.",
    icon: <Flag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    colorClass:
      "bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100/80 dark:bg-emerald-950/30 dark:border-emerald-800/50 dark:text-emerald-300 dark:hover:bg-emerald-900/40",
    costClass:
      "bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300",
  },
  {
    id: "goal",
    label: "Goal",
    cost: "Target",
    desc: "The destination racers seek.",
    icon: <Target className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
    colorClass:
      "bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100/80 dark:bg-red-950/30 dark:border-red-800/50 dark:text-rose-300 dark:hover:bg-red-900/40",
    costClass:
      "bg-rose-100 border-rose-300 text-rose-800 dark:bg-red-500/15 dark:border-red-500/30 dark:text-rose-300",
  },
];

export const TilePalette: React.FC<TilePaletteProps> = ({
  selectedTool,
  onSelectTool,
  disabled = false,
}) => {
  return (
    <aside className="w-56 shrink-0 flex flex-col gap-3 p-3 bg-surface border border-border rounded-xl shadow-xs select-none min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted">
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
              className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 min-w-0 p-2 rounded-lg border text-xs font-semibold transition-all overflow-visible ${
                isActive
                  ? "border-brand bg-brand/10 ring-1 ring-brand text-brand shadow-xs"
                  : t.colorClass
              } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="contents">
                <span className="shrink-0">{t.icon}</span>
                <span className="min-w-0 whitespace-nowrap">{t.label}</span>
              </div>
              <span
                className={`shrink-0 whitespace-nowrap text-xs px-1.5 py-0.5 rounded border font-mono ${t.costClass}`}
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
        <span className="text-xs font-bold uppercase tracking-wider text-muted">
          Legend
        </span>
        <div
          title="Cells already explored and expanded"
          className="flex items-center gap-2 p-1.5 rounded-md text-xs text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-help"
        >
          <div className="w-3.5 h-3.5 rounded bg-brand/30 border border-brand/60 shrink-0" />
          <span className="font-medium text-xs">Checked</span>
        </div>
        <div
          title="Cells discovered on the search frontier waiting to be evaluated"
          className="flex items-center gap-2 p-1.5 rounded-md text-xs text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-help"
        >
          <div className="w-3.5 h-3.5 rounded border-2 border-brand shrink-0" />
          <span className="font-medium text-xs">Waiting</span>
        </div>
        <div
          title="The final path found from Start to Goal"
          className="flex items-center gap-2 p-1.5 rounded-md text-xs text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-help"
        >
          <div className="w-3.5 h-1 rounded bg-brand shrink-0" />
          <span className="font-medium text-xs">Route</span>
        </div>
      </div>
    </aside>
  );
};
