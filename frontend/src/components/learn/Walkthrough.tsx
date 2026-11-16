import React, { useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import {
  RotateCcw,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  FastForward,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useMazeCanvas } from "@/hooks/useMazeCanvas";
import { getAlgorithmColor } from "@/lib/palette";
import { useWalkthrough } from "./useWalkthrough";
import { DataStrip } from "./DataStrip";
import { Tex } from "./Tex";
import type { AlgorithmContent } from "@/content/algorithms";

interface WalkthroughProps {
  algorithm: string;
  meta: AlgorithmContent;
  initialScenario?: string;
}

export const Walkthrough: React.FC<WalkthroughProps> = ({
  algorithm,
  meta,
  initialScenario = "open",
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const algColor = getAlgorithmColor(algorithm, isDark);

  const {
    scenario,
    setScenario,
    scenarios,
    data,
    isLoading,
    frameIdx,
    setFrameIdx,
    total,
    playing,
    speed,
    setSpeed,
    overlayMode,
    setOverlayMode,
    folded,
    handlePlayPause,
    handlePrev,
    handleNext,
    handleReset,
    handleJumpToEnd,
  } = useWalkthrough(algorithm, initialScenario);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === " ") {
        e.preventDefault();
        handlePlayPause();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrev, handleNext, handlePlayPause]);

  // Current frame info
  const currentFrame = data?.frames && Array.isArray(data.frames) ? data.frames[frameIdx] || null : null;

  const currentCoords = useMemo<[number, number] | null>(() => {
    if (!currentFrame || currentFrame.current === null || currentFrame.current === undefined || !data || typeof data.scenario !== "object") return null;
    const cols = data.scenario?.cols || 21;
    return [Math.floor(currentFrame.current / cols), currentFrame.current % cols];
  }, [currentFrame, data]);

  const currents = useMemo(() => {
    if (!currentCoords || !currentFrame) return [];
    return [{ side: currentFrame.side, cell: currentCoords }];
  }, [currentCoords, currentFrame]);

  // Only pass route line on the final frame
  const isLastFrame = total > 0 && frameIdx === total;
  const pathForCanvas = isLastFrame && data?.found && data.route ? data.route : null;

  const mazeObj = useMemo(() => {
    if (!data || typeof data.scenario !== "object" || !data.scenario?.cells) return null;
    return {
      rows: data.scenario.rows || 21,
      cols: data.scenario.cols || 21,
      cells: data.scenario.cells,
      start: data.scenario.start || [1, 1],
      goal: data.scenario.goal || [19, 19],
      diagonal: false,
      weighted: false,
      meta: {
        generator: "scenario",
      },
    };
  }, [data]);

  const { canvasRef } = useMazeCanvas({
    maze: mazeObj,
    algorithmColor: algColor,
    exploredSet: folded.explored,
    frontierSet: folded.frontier,
    cellInfoMap: folded.info,
    overlayMode,
    currents,
    path: pathForCanvas,
    interactive: false,
  });

  // Calculate cell substitution for Current Cell Card
  const currentCellCard = useMemo(() => {
    if (!currentCoords) return null;
    const [r, c] = currentCoords;
    const key = `${r},${c}`;
    const info = folded.info.get(key);

    let formulaContent: React.ReactNode = null;
    if (algorithm === "astar" && info) {
      const g = info.g;
      const h = info.h ?? 0;
      const f = g + h;
      formulaContent = (
        <div className="font-mono text-sm text-brand font-semibold flex items-center gap-1.5 mt-1">
          <span>f = g + h = {g} + {h} = {f}</span>
        </div>
      );
    } else if (algorithm === "greedy" && info) {
      formulaContent = (
        <div className="font-mono text-sm text-brand font-semibold flex items-center gap-1.5 mt-1">
          <span>h = {info.h ?? 0}</span>
        </div>
      );
    } else if (algorithm === "ucs" && info) {
      formulaContent = (
        <div className="font-mono text-sm text-brand font-semibold flex items-center gap-1.5 mt-1">
          <span>g = {info.g}</span>
        </div>
      );
    } else if (info) {
      formulaContent = (
        <div className="text-xs text-muted mt-1">
          Distance from Start: <span className="text-text font-bold font-mono">{info.g} steps</span>
        </div>
      );
    }

    return (
      <div className="p-4 rounded-2xl bg-surface border border-border space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">Current cell</span>
          <span className="text-xs text-muted font-mono">{currentFrame?.side ? `Wave: ${currentFrame.side}` : null}</span>
        </div>
        <div className="text-base font-bold font-mono text-text">
          Checking ({r}, {c})
        </div>
        {formulaContent}
      </div>
    );
  }, [currentCoords, currentFrame, folded.info, algorithm]);

  const hasH = meta.usesHint;
  const hasF = algorithm === "astar";

  return (
    <div className="space-y-4">
      {/* Scenario Selector Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted mr-1">Scenario:</span>
        {scenarios.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setScenario(s.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              scenario === s.key
                ? "bg-brand text-brand-ink border-brand shadow-xs"
                : "bg-surface-2 border-border text-muted hover:text-text hover:bg-surface"
            }`}
            title={s.blurb}
          >
            {s.title}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-muted border border-border rounded-2xl bg-surface">
          Loading scenario walkthrough...
        </div>
      ) : !data || !Array.isArray(data.frames) || data.frames.length === 0 ? (
        <div className="p-12 text-center text-danger border border-border rounded-2xl bg-surface">
          Failed to load walkthrough.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(420px,600px)_380px] gap-6 items-start">
          {/* Left Column: Canvas + Controls */}
          <div className="flex flex-col gap-4">
            {/* Square Canvas Container */}
            <div className="relative w-full aspect-square max-w-[600px] bg-[#0c1017] rounded-2xl border border-border overflow-hidden shadow-xl flex items-center justify-center">
              <canvas
                ref={canvasRef}
                className="w-full h-full block"
              />
            </div>

            {/* Controls Bar */}
            <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
              {/* Top: Progress and Step Count */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-text font-mono text-sm">
                  Step {frameIdx} / {total}
                </span>
                <span className="text-muted font-medium">
                  {Math.round((frameIdx / (total || 1)) * 100)}% complete
                </span>
              </div>

              {/* Scrubber Range */}
              <input
                type="range"
                min={0}
                max={total}
                value={frameIdx}
                onChange={(e) => {
                  setFrameIdx(Number(e.target.value));
                }}
                aria-label="Step"
                className="w-full accent-brand cursor-pointer h-2 bg-surface-2 rounded-lg"
              />

              {/* Playback Controls & Speed */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                {/* 44px Buttons Group */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-10 h-10 rounded-xl border border-border hover:bg-surface-2 flex items-center justify-center text-muted hover:text-text transition-colors"
                    title="Reset to start"
                    aria-label="Reset"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={frameIdx <= 0}
                    className="w-10 h-10 rounded-xl border border-border hover:bg-surface-2 disabled:opacity-40 flex items-center justify-center text-muted hover:text-text transition-colors"
                    title="Previous step (Left Arrow)"
                    aria-label="Previous step"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handlePlayPause}
                    className="h-10 px-4 rounded-xl bg-brand text-brand-ink font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                    title={frameIdx >= total ? "Replay (Space)" : playing ? "Pause (Space)" : "Play (Space)"}
                    aria-label="Play or Pause"
                  >
                    {frameIdx >= total ? (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        <span>Replay</span>
                      </>
                    ) : playing ? (
                      <>
                        <Pause className="w-4 h-4" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>Play</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={frameIdx >= total}
                    className="w-10 h-10 rounded-xl border border-border hover:bg-surface-2 disabled:opacity-40 flex items-center justify-center text-muted hover:text-text transition-colors"
                    title="Next step (Right Arrow)"
                    aria-label="Next step"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleJumpToEnd}
                    disabled={frameIdx >= total}
                    className="w-10 h-10 rounded-xl border border-border hover:bg-surface-2 disabled:opacity-40 flex items-center justify-center text-muted hover:text-text transition-colors"
                    title="Jump to end"
                    aria-label="Jump to end"
                  >
                    <FastForward className="w-4 h-4" />
                  </button>
                </div>

                {/* Speed Segmented Control */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-2 border border-border text-xs font-semibold">
                  {[0.5, 1, 2, 4, 8].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSpeed(s)}
                      className={`px-2 py-1 rounded-lg transition-colors ${
                        speed === s
                          ? "bg-brand text-brand-ink font-bold"
                          : "text-muted hover:text-text"
                      }`}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
              </div>

              {/* Numbers on Cells Segmented Control */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                <span className="text-xs text-muted font-medium">Numbers on cells:</span>
                <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-2 border border-border text-xs">
                  <button
                    type="button"
                    onClick={() => setOverlayMode("off")}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      overlayMode === "off" ? "bg-brand text-brand-ink font-bold" : "text-muted hover:text-text"
                    }`}
                  >
                    Off
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverlayMode("order")}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      overlayMode === "order" ? "bg-brand text-brand-ink font-bold" : "text-muted hover:text-text"
                    }`}
                  >
                    Order
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverlayMode("g")}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      overlayMode === "g" ? "bg-brand text-brand-ink font-bold" : "text-muted hover:text-text"
                    }`}
                  >
                    g (cost)
                  </button>
                  <button
                    type="button"
                    onClick={() => hasH && setOverlayMode("h")}
                    disabled={!hasH}
                    title={!hasH ? `${meta.name} has no hint` : undefined}
                    className={`px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      overlayMode === "h" ? "bg-brand text-brand-ink font-bold" : "text-muted hover:text-text"
                    }`}
                  >
                    h (hint)
                  </button>
                  <button
                    type="button"
                    onClick={() => hasF && setOverlayMode("f")}
                    disabled={!hasF}
                    title={!hasF ? `${meta.name} does not compute f = g + h` : undefined}
                    className={`px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      overlayMode === "f" ? "bg-brand text-brand-ink font-bold" : "text-muted hover:text-text"
                    }`}
                  >
                    f (g+h)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Step, Algorithm Type, Data Strip, Current Cell, End State */}
          <div className="flex flex-col gap-4">
            {/* 1. Step Card */}
            <div className="p-4 rounded-2xl bg-surface border border-border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  Step Narration
                </span>
                <span className="text-xs text-brand font-mono font-semibold">
                  Step {frameIdx} of {total}
                </span>
              </div>
              <p className="text-base text-text leading-relaxed font-sans">
                {currentFrame?.note || "Search initialized at start position."}
              </p>
            </div>

            {/* 2. Algorithm Type Card */}
            <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  Decision Rule
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    meta.informed
                      ? "bg-brand text-brand-ink"
                      : "bg-surface-2 text-muted border border-border"
                  }`}
                >
                  {meta.informed ? "Informed (heuristic) search" : "Uninformed (blind) search"}
                </span>
              </div>
              <div className="text-sm text-text">
                <span className="text-muted mr-1.5">Picks next:</span>
                <strong className="text-text font-bold">{meta.picksNext}</strong>
              </div>
              <div className="pt-1 text-sm text-muted flex items-center gap-2">
                <span>Formula:</span>
                <span className="text-text font-mono">
                  <Tex>{meta.formulaTex}</Tex>
                </span>
              </div>
            </div>

            {/* 3. Data Strip */}
            {currentFrame && currentFrame.queues && (
              <DataStrip
                algorithm={algorithm}
                dataStructureTitle={meta.structure}
                cols={data.scenario?.cols || 21}
                queues={currentFrame.queues}
                queueSize={currentFrame.queue_size ?? {}}
              />
            )}

            {/* 4. Current Cell Card */}
            {currentCellCard}

            {/* 5. End State Card */}
            {isLastFrame && (
              <div
                className={`p-4 rounded-2xl border-2 space-y-2 animate-in fade-in duration-300 ${
                  data.found
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/40 text-rose-400"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-base text-text">
                  {data.found ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-500" />
                  )}
                  <span>
                    {data.found
                      ? `Route found: ${data.route_steps} steps, cost ${data.route_cost}`
                      : "No route exists"}
                  </span>
                </div>
                <div className="text-xs text-muted">
                  Checked <strong>{data.checked} cells</strong>.{" "}
                  {data.c_star !== null && (
                    <span>
                      Shortest possible cost: <strong>{data.c_star} (C*)</strong>.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
