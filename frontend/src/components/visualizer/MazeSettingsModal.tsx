import React, { useState } from "react";
import { Settings, X, Dices, Copy, Check } from "lucide-react";

export interface MazeConfig {
  rows: number;
  cols: number;
  genType: string;
  density: number;
  diagonal: boolean;
  weighted: boolean;
  weightFraction: number;
  seed: number;
}

interface MazeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: MazeConfig;
  onApply: (newConfig: MazeConfig) => void;
}

const STYLES = [
  { id: "backtracker", name: "Twisty Corridors", desc: "Long winding paths with dead-ends" },
  { id: "braided", name: "Loops & Braids", desc: "Multiple alternative paths to the goal" },
  { id: "random", name: "Random Walls", desc: "Scattered obstacles with variable density" },
  { id: "weighted", name: "Terrain Blobs", desc: "Patches of Sand and Water" },
];

export const MazeSettingsModal: React.FC<MazeSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onApply,
}) => {
  const [local, setLocal] = useState<MazeConfig>({ ...config });
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopySeed = () => {
    navigator.clipboard.writeText(String(local.seed));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRollSeed = () => {
    setLocal((prev) => ({
      ...prev,
      seed: Math.floor(Math.random() * 900000) + 100000,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApply(local);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-surface-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-brand" />
            <h2 className="text-sm font-bold text-text">Maze Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-text hover:bg-surface transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 text-xs">
          {/* Maze Size */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between font-semibold text-text">
              <span>Grid Dimension</span>
              <span className="font-mono text-brand">{local.rows} × {local.cols}</span>
            </div>
            <input
              type="range"
              min={7}
              max={35}
              step={2}
              value={local.rows}
              onChange={(e) => {
                const val = Number(e.target.value);
                setLocal((prev) => ({ ...prev, rows: val, cols: val }));
              }}
              className="w-full accent-brand cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted">
              <span>7×7 (Fast)</span>
              <span>21×21 (Standard)</span>
              <span>35×35 (Detailed)</span>
            </div>
          </div>

          {/* Maze Generation Style */}
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold text-text">Generation Style</span>
            <div className="grid grid-cols-2 gap-2">
              {STYLES.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setLocal((prev) => ({ ...prev, genType: st.id }))}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                    local.genType === st.id
                      ? "border-brand bg-brand/10 text-brand ring-1 ring-brand/50"
                      : "border-border bg-surface-2 hover:border-brand/40 text-text"
                  }`}
                >
                  <span className="font-bold text-xs">{st.name}</span>
                  <span className="text-[10px] text-muted line-clamp-1">{st.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Wall Density Slider (Shown for Random Walls) */}
          {local.genType === "random" && (
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-surface-2 border border-border">
              <div className="flex justify-between font-semibold text-text">
                <span>Obstacle Density</span>
                <span className="font-mono text-brand">{Math.round(local.density * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={0.5}
                step={0.05}
                value={local.density}
                onChange={(e) => setLocal((prev) => ({ ...prev, density: Number(e.target.value) }))}
                className="w-full accent-brand cursor-pointer"
              />
            </div>
          )}

          {/* Diagonal & Terrain Toggles */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-surface-2 border border-border cursor-pointer">
              <div className="flex flex-col">
                <span className="font-semibold text-text">Diagonal Moves</span>
                <span className="text-[10px] text-muted">8 directions (√2 cost)</span>
              </div>
              <input
                type="checkbox"
                checked={local.diagonal}
                onChange={(e) => setLocal((prev) => ({ ...prev, diagonal: e.target.checked }))}
                className="accent-brand w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-surface-2 border border-border cursor-pointer">
              <div className="flex flex-col">
                <span className="font-semibold text-text">Terrain Weights</span>
                <span className="text-[10px] text-muted">Sand & Water patches</span>
              </div>
              <input
                type="checkbox"
                checked={local.weighted}
                onChange={(e) => setLocal((prev) => ({ ...prev, weighted: e.target.checked }))}
                className="accent-brand w-4 h-4 cursor-pointer"
              />
            </label>
          </div>

          {/* Seed with dice and copy */}
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold text-text">Reproducible Seed</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={local.seed}
                onChange={(e) => setLocal((prev) => ({ ...prev, seed: Number(e.target.value) }))}
                className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2 font-mono text-xs text-text focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <button
                type="button"
                onClick={handleRollSeed}
                title="Roll Random Seed"
                className="p-2 rounded-xl border border-border bg-surface-2 hover:bg-surface text-text transition-colors"
              >
                <Dices className="w-4 h-4 text-brand" />
              </button>
              <button
                type="button"
                onClick={handleCopySeed}
                title="Copy Seed"
                className="p-2 rounded-xl border border-border bg-surface-2 hover:bg-surface text-text transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-muted" />}
              </button>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-muted hover:text-text hover:bg-surface-2 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand text-brand-ink font-bold hover:brightness-110 shadow-sm transition-all"
            >
              Generate Maze
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
