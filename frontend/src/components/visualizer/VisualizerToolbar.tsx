import React from "react";
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  Dices,
  Settings,
  Pencil,
  Grid,
} from "lucide-react";
import { PresetsPopover } from "./PresetsPopover";

interface VisualizerToolbarProps {
  raceState: "idle" | "ready" | "running" | "paused" | "finished" | "disconnected";
  onStart: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  onSelectPreset: (presetId: string) => void;
  activePreset?: string | null;
  onNewMaze: () => void;
  onOpenSettings: () => void;
  viewMode: "edit" | "race";
  onToggleViewMode: () => void;
  stepsCount?: number;
}

const SPEED_OPTIONS = [
  { label: "0.25×", value: 1 },
  { label: "0.5×", value: 3 },
  { label: "1×", value: 5 },
  { label: "2×", value: 7 },
  { label: "4×", value: 8 },
  { label: "Max", value: 10 },
];

export const VisualizerToolbar: React.FC<VisualizerToolbarProps> = ({
  raceState,
  onStart,
  onPause,
  onStep,
  onReset,
  speed,
  onSpeedChange,
  onSelectPreset,
  activePreset,
  onNewMaze,
  onOpenSettings,
  viewMode,
  onToggleViewMode,
  stepsCount = 0,
}) => {
  const isRunning = raceState === "running";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-surface border border-border rounded-xl shadow-xs select-none">
      {/* Playback Controls */}
      <div className="flex items-center gap-1.5">
        {isRunning ? (
          <button
            onClick={onPause}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>Pause</span>
          </button>
        ) : (
          <button
            onClick={onStart}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand hover:brightness-110 text-brand-ink font-bold text-xs shadow-xs transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start</span>
          </button>
        )}

        <button
          onClick={onStep}
          disabled={isRunning}
          title="Step one expansion"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-surface-2 hover:bg-surface text-text text-xs font-semibold disabled:opacity-40 transition-colors shadow-2xs"
        >
          <StepForward className="w-3.5 h-3.5 text-muted" />
          <span>Step</span>
        </button>

        <button
          onClick={onReset}
          title="Reset race progress"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-surface-2 hover:bg-surface text-text text-xs font-semibold transition-colors shadow-2xs"
        >
          <RotateCcw className="w-3.5 h-3.5 text-muted" />
          <span>Reset</span>
        </button>

        {stepsCount > 0 && (
          <span className="text-[11px] font-mono font-medium text-muted px-1.5">
            Step {stepsCount}
          </span>
        )}
      </div>

      {/* Speed Multiplier Segmented Control (§5.1) */}
      <div className="flex items-center gap-1 bg-surface-2 p-0.5 rounded-lg border border-border">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted px-2">
          Speed
        </span>
        {SPEED_OPTIONS.map((opt) => {
          const isActive = speed === opt.value;
          return (
            <button
              key={opt.label}
              onClick={() => onSpeedChange(opt.value)}
              className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                isActive
                  ? "bg-surface text-brand shadow-xs"
                  : "text-muted hover:text-text"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Maze Menu, Quick Dice, and Settings Modal */}
      <div className="flex items-center gap-1.5">
        <PresetsPopover onSelectPreset={onSelectPreset} activePreset={activePreset} />

        <button
          onClick={onNewMaze}
          title="Re-roll maze with current generator settings"
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-surface-2 hover:bg-surface text-text text-xs font-semibold transition-colors shadow-2xs"
        >
          <Dices className="w-3.5 h-3.5 text-brand" />
          <span>New maze</span>
        </button>

        <button
          onClick={onOpenSettings}
          title="Configure grid dimensions, generation style, and terrain"
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-surface-2 hover:bg-surface text-text text-xs font-semibold transition-colors shadow-2xs"
        >
          <Settings className="w-3.5 h-3.5 text-muted" />
          <span>Settings</span>
        </button>

        <div className="h-4 w-px bg-border mx-1" />

        {/* View Mode Toggle: Edit Mode vs Race Grid */}
        <button
          onClick={onToggleViewMode}
          title={viewMode === "edit" ? "Switch to Head-to-Head Race Panels" : "Switch to Large Editor Canvas"}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors shadow-2xs ${
            viewMode === "edit"
              ? "border-brand bg-brand/10 text-brand"
              : "border-border bg-surface-2 text-text"
          }`}
        >
          {viewMode === "edit" ? (
            <>
              <Pencil className="w-3.5 h-3.5" />
              <span>Editing</span>
            </>
          ) : (
            <>
              <Grid className="w-3.5 h-3.5" />
              <span>Race View</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
