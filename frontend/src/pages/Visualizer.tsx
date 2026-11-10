import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  Sparkles,
} from "lucide-react";
import { useAppStore, type ToolType } from "@/store/useAppStore";
import { useRace } from "@/hooks/useRace";
import { useMazeCanvas } from "@/hooks/useMazeCanvas";
import { useHotkeys } from "@/hooks/useHotkeys";
import { RacePanel } from "@/components/RacePanel";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { request } from "@/lib/api";
import { notify } from "@/lib/notify";
import type { Maze } from "@/lib/types";

const SPEED_K_MAP = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55];

const AVAILABLE_ALGS = [
  { id: "bfs", name: "BFS", color: "#4C9AFF" },
  { id: "dfs", name: "DFS", color: "#FF9F43" },
  { id: "ucs", name: "UCS", color: "#F2C94C" },
  { id: "greedy", name: "Greedy", color: "#E86AB8", defaultHeuristic: "manhattan" },
  { id: "astar", name: "A*", color: "#5BD68A", defaultHeuristic: "manhattan" },
];

export const VisualizerPage: React.FC = () => {
  const {
    maze,
    setMaze,
    selectedTool,
    setSelectedTool,
    participants,
    setParticipants,
    speed,
    setSpeed,
    updateCell,
  } = useAppStore();

  const [rows, setRows] = useState(21);
  const [cols, setCols] = useState(21);
  const [genType, setGenType] = useState("backtracker");
  const [density] = useState(0.3);
  const [diagonal, setDiagonal] = useState(false);
  const [weighted] = useState(false);
  const [hoverCell] = useState<[number, number] | null>(null);

  const expansionsPerTick = SPEED_K_MAP[speed - 1] || 5;

  const {
    raceState,
    stats,
    winnerIdx,
    startRace,
    pauseRace,
    stepRace,
    resetRace,
  } = useRace(maze, participants, expansionsPerTick);

  // Generate Maze
  const handleGenerate = async (seedOverride?: number) => {
    try {
      const generated = await request<Maze>("/api/maze/generate", {
        method: "POST",
        body: JSON.stringify({
          rows,
          cols,
          type: genType,
          density,
          diagonal,
          weighted,
          weight_fraction: 0.3,
          seed: seedOverride !== undefined ? seedOverride : Math.floor(Math.random() * 100000),
          randomize_endpoints: true,
        }),
      });
      setMaze(generated);
      resetRace();
      notify.success(`Maze ${rows}×${cols} generated (${genType})`);
    } catch (err) {
      notify.error(err);
    }
  };

  // Load Preset
  const handleLoadPreset = async (presetName: string) => {
    try {
      const presetMaze = await request<Maze>("/api/maze/preset", {
        method: "POST",
        body: JSON.stringify({ name: presetName, diagonal }),
      });
      setMaze(presetMaze);
      setRows(presetMaze.rows);
      setCols(presetMaze.cols);
      resetRace();
      notify.success(`Preset '${presetName}' loaded`);
    } catch (err) {
      notify.error(err);
    }
  };

  // Initial maze on first load
  useEffect(() => {
    if (!maze) {
      handleGenerate(42);
    }
  }, []);

  // Canvas editor handler
  const handleCellClick = (r: number, c: number) => {
    if (raceState !== "idle" && raceState !== "ready") return;
    if (!maze) return;

    if (selectedTool === "start") {
      setMaze({ ...maze, start: [r, c] });
    } else if (selectedTool === "goal") {
      setMaze({ ...maze, goal: [r, c] });
    } else {
      let code = 0;
      if (selectedTool === "wall") code = 1;
      else if (selectedTool === "sand") code = 2;
      else if (selectedTool === "water") code = 3;
      else if (selectedTool === "erase") code = 0;
      updateCell(r, c, code);
    }
  };

  const { canvasRef, handlers } = useMazeCanvas({
    maze,
    interactive: raceState === "idle" || raceState === "ready",
    onCellClick: handleCellClick,
    hoverCell,
  });

  // Hotkeys: Space (Start/Pause), S (Step), R (Reset)
  useHotkeys([
    {
      key: " ",
      handler: () => {
        if (raceState === "running") pauseRace();
        else startRace();
      },
    },
    { key: "s", handler: () => stepRace() },
    { key: "r", handler: () => resetRace() },
  ]);

  const toggleParticipant = (algId: string, defaultH?: string) => {
    const exists = participants.some((p) => p.algorithm === algId);
    if (exists) {
      if (participants.length > 1) {
        setParticipants(participants.filter((p) => p.algorithm !== algId));
      } else {
        notify.warning("At least one algorithm must be selected");
      }
    } else {
      if (participants.length < 5) {
        setParticipants([
          ...participants,
          { algorithm: algId, heuristic: defaultH || null },
        ]);
      } else {
        notify.warning("Maximum 5 participants allowed");
      }
    }
  };

  const isEditingLocked = raceState === "running" || raceState === "paused";

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
      {/* Left Sidebar Controls */}
      <aside className="w-full md:w-80 border-r border-border bg-surface p-4 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-3.5rem)] text-xs">
        {/* Race playback toolbar */}
        <div className="p-3 bg-surface-2 border border-border rounded-xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-text uppercase tracking-wider text-[11px]">Race Controls</span>
            <span className="font-mono text-[10px] text-text-muted">k = {expansionsPerTick} / tick</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {raceState === "running" ? (
              <button
                onClick={pauseRace}
                className="col-span-2 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-warning text-bg font-semibold hover:opacity-90 transition-opacity"
              >
                <Pause className="w-4 h-4 fill-current" /> Pause
              </button>
            ) : (
              <button
                onClick={startRace}
                className="col-span-2 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-accent text-bg font-semibold hover:opacity-90 transition-opacity"
              >
                <Play className="w-4 h-4 fill-current" /> {raceState === "paused" ? "Resume" : "Start Race"}
              </button>
            )}

            <button
              onClick={stepRace}
              disabled={raceState === "running"}
              className="flex items-center justify-center py-2 px-2 rounded-lg bg-surface border border-border text-text hover:bg-surface/80 disabled:opacity-40"
              title="Step 1 expansion (S)"
            >
              <StepForward className="w-4 h-4" />
            </button>

            <button
              onClick={resetRace}
              className="flex items-center justify-center py-2 px-2 rounded-lg bg-surface border border-border text-text hover:bg-surface/80"
              title="Reset Race (R)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Speed slider */}
          <div className="pt-2">
            <div className="flex justify-between text-text-muted mb-1 text-[11px]">
              <span>Speed</span>
              <span>Level {speed} / 10</span>
            </div>
            <Slider
              value={[speed]}
              min={1}
              max={10}
              step={1}
              onValueChange={([val]) => setSpeed(val)}
            />
          </div>
        </div>

        {/* Maze Config Card */}
        <div className={`p-3 bg-surface-2 border border-border rounded-xl flex flex-col gap-3 ${isEditingLocked ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-text uppercase tracking-wider text-[11px]">Maze Generation</span>
            <button
              onClick={() => handleGenerate()}
              className="flex items-center gap-1 text-accent hover:underline font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5" /> Generate
            </button>
          </div>

          {/* Size sliders */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-text-muted">
              <span>Grid Size</span>
              <span className="font-mono">{rows} × {cols}</span>
            </div>
            <Slider
              value={[rows]}
              min={9}
              max={51}
              step={2}
              onValueChange={([val]) => {
                setRows(val);
                setCols(val);
              }}
            />
          </div>

          {/* Generator selection */}
          <div className="grid grid-cols-2 gap-1.5">
            {["backtracker", "braided", "random", "weighted"].map((t) => (
              <button
                key={t}
                onClick={() => setGenType(t)}
                className={`py-1.5 px-2 rounded border text-center capitalize transition-colors ${
                  genType === t
                    ? "bg-surface border-accent text-accent font-semibold"
                    : "bg-surface/50 border-border text-text-muted hover:text-text"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Presets */}
          <div className="flex flex-col gap-1">
            <span className="text-text-muted text-[10px]">PRESET PATTERNS</span>
            <div className="grid grid-cols-2 gap-1">
              {["greedy_trap", "weighted_river", "corridor_maze", "unreachable_goal"].map((p) => (
                <button
                  key={p}
                  onClick={() => handleLoadPreset(p)}
                  className="py-1 px-1.5 rounded bg-surface border border-border text-text-muted hover:text-text text-[11px] truncate text-left"
                >
                  {p.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Diagonal switch */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-text-muted">Diagonal Moves</span>
            <Switch checked={diagonal} onCheckedChange={setDiagonal} />
          </div>
        </div>

        {/* Tools Toolbar */}
        <div className={`p-3 bg-surface-2 border border-border rounded-xl flex flex-col gap-2 ${isEditingLocked ? "opacity-50 pointer-events-none" : ""}`}>
          <span className="font-semibold text-text uppercase tracking-wider text-[11px]">Paint Tools</span>
          <div className="grid grid-cols-3 gap-1.5">
            {(["wall", "erase", "sand", "water", "start", "goal"] as ToolType[]).map((tool) => (
              <button
                key={tool}
                onClick={() => setSelectedTool(tool)}
                className={`py-1.5 px-2 rounded-lg border text-center capitalize transition-all ${
                  selectedTool === tool
                    ? "bg-accent/20 border-accent text-accent font-semibold"
                    : "bg-surface border-border text-text-muted hover:text-text"
                }`}
              >
                {tool}
              </button>
            ))}
          </div>
        </div>

        {/* Algorithms selector */}
        <div className={`p-3 bg-surface-2 border border-border rounded-xl flex flex-col gap-2 ${isEditingLocked ? "opacity-50 pointer-events-none" : ""}`}>
          <span className="font-semibold text-text uppercase tracking-wider text-[11px]">Algorithms ({participants.length}/5)</span>
          <div className="flex flex-col gap-1.5">
            {AVAILABLE_ALGS.map((alg) => {
              const selected = participants.some((p) => p.algorithm === alg.id);
              return (
                <div
                  key={alg.id}
                  onClick={() => toggleParticipant(alg.id, alg.defaultHeuristic)}
                  className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${
                    selected
                      ? "bg-surface border-border"
                      : "bg-surface/30 border-transparent text-text-muted opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: alg.color }}
                    />
                    <span className="font-medium text-text">{alg.name}</span>
                  </div>
                  <Switch checked={selected} />
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Main Workspace Stage */}
      <section className="flex-1 bg-bg p-4 md:p-6 flex flex-col overflow-y-auto">
        {/* Race Mode: Multi-panel grid */}
        {raceState !== "idle" && stats.length > 0 ? (
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-text-muted font-mono">
                RACE MODE: <span className="text-accent uppercase font-semibold">{raceState}</span>
              </div>
              {winnerIdx !== null && stats[winnerIdx] && (
                <div className="px-3 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent text-xs font-bold animate-pulse">
                  🏆 Winner by search effort: {stats[winnerIdx].algorithm.toUpperCase()} ({stats[winnerIdx].expanded} expansions)
                </div>
              )}
            </div>

            <div className={`grid gap-4 flex-1 ${
              stats.length === 1
                ? "grid-cols-1 max-w-xl mx-auto w-full"
                : stats.length === 2
                ? "grid-cols-1 md:grid-cols-2"
                : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            }`}>
              {stats.map((s, idx) => (
                <RacePanel
                  key={`${s.algorithm}_${idx}`}
                  maze={maze!}
                  stats={s}
                  isWinner={winnerIdx === idx}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Edit Mode: One large interactive canvas */
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative w-full max-w-2xl aspect-square border border-border rounded-xl overflow-hidden shadow-2xl bg-surface">
              <canvas
                ref={canvasRef}
                className="w-full h-full block cursor-crosshair touch-none select-none"
                {...handlers}
              />
            </div>
            <div className="mt-3 text-center text-xs text-text-muted font-mono">
              Click or drag to paint with tool: <span className="text-accent uppercase font-bold">{selectedTool}</span>. Press <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-text">Space</kbd> to race.
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
