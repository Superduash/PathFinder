import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  Dices,
  Layers,
  Flag,
  Target,
  Eraser,
  Square,
  Waves,
} from "lucide-react";
import { useAppStore, type ToolType } from "@/store/useAppStore";
import { useRace } from "@/hooks/useRace";
import { useMazeCanvas } from "@/hooks/useMazeCanvas";
import { useHotkeys } from "@/hooks/useHotkeys";
import { RacePanel } from "@/components/RacePanel";
import { Legend } from "@/components/maze/Legend";
import { NarratorBar } from "@/components/maze/NarratorBar";
import { WinnerBanner } from "@/components/maze/WinnerBanner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { request } from "@/lib/api";
import { notify } from "@/lib/notify";
import type { Maze } from "@/lib/types";

const PRESET_CARDS = [
  { id: "open_field", name: "Open Field", desc: "No obstacles. Compares pure exploration spread." },
  { id: "wall_with_gap", name: "Wall with a Gap", desc: "Tests ability to navigate through narrow apertures." },
  { id: "greedy_trap", name: "Greedy Trap", desc: "U-shaped trap that lures distance-heuristic searches." },
  { id: "weighted_river", name: "River Crossing", desc: "Weighted water & sand terrain favoring UCS over BFS." },
  { id: "corridor_maze", name: "Twisty Corridors", desc: "Narrow maze passages where DFS searches deep." },
  { id: "unreachable_goal", name: "Impossible Goal", desc: "Walled-off goal testing exhaustive search limits." },
];

const AVAILABLE_RACERS = [
  { id: "bfs", name: "BFS", desc: "Checks cells ring by ring", color: "var(--alg-bfs)", shape: "●" },
  { id: "dfs", name: "DFS", desc: "Dives deep along single corridors", color: "var(--alg-dfs)", shape: "▲" },
  { id: "ucs", name: "UCS (Dijkstra)", desc: "Always expands lowest cost route", color: "var(--alg-ucs)", shape: "■" },
  { id: "greedy", name: "Greedy", desc: "Rushes directly towards goal", color: "var(--alg-greedy)", shape: "◆", hasHeuristic: true },
  { id: "astar", name: "A*", desc: "Balances cost so far + distance hint", color: "var(--alg-astar)", shape: "★", hasHeuristic: true },
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

  const [activeTab, setActiveTab] = useState("maze");
  const [rows, setRows] = useState(21);
  const [cols, setCols] = useState(21);
  const [genType, setGenType] = useState("backtracker");
  const [density] = useState(0.25);
  const [diagonal, setDiagonal] = useState(false);
  const [weighted, setWeighted] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(1);

  const {
    raceState,
    stats,
    winnerIdx,
    countdown,
    pacing,
    startRace,
    pauseRace,
    stepRace,
    resetRace,
  } = useRace(maze, participants, speed);

  // Generate Maze
  const handleGenerate = async (seedOverride?: number, suppressToast: boolean = false) => {
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
      setCurrentStepIndex(2);
      if (!suppressToast) {
        notify.success(`Maze ${rows}×${cols} generated (${genType})`);
      }
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
      setCurrentStepIndex(2);
      notify.success(`Loaded preset '${presetName}'`);
    } catch (err) {
      notify.error(err);
    }
  };

  useEffect(() => {
    if (!maze) {
      handleGenerate(42, true);
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
  });

  // Hotkeys
  useHotkeys([
    {
      key: " ",
      handler: () => {
        if (raceState === "running") pauseRace();
        else {
          setCurrentStepIndex(3);
          startRace();
        }
      },
    },
    { key: "s", handler: () => stepRace() },
    { key: "r", handler: () => resetRace() },
  ]);

  const toggleParticipant = (algId: string) => {
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
          { algorithm: algId, heuristic: algId === "greedy" || algId === "astar" ? "manhattan" : null },
        ]);
      } else {
        notify.warning("Maximum 5 participants allowed");
      }
    }
  };

  const maxExpandedSeen = Math.max(1, ...stats.map((s) => s.expanded));

  return (
    <div className="flex-1 flex flex-col max-w-[1600px] w-full mx-auto px-6 py-6 gap-6">
      {/* 5.1 Step Indicator Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Visualizer</h1>
          <p className="text-muted text-xs mt-0.5">
            Stepwise algorithm comparison with real-time expansion counters and continuous canvas editing.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          {[
            { num: 1, label: "Build maze" },
            { num: 2, label: "Choose racers" },
            { num: 3, label: "Race" },
          ].map((s) => (
            <div
              key={s.num}
              onClick={() => {
                if (s.num === 1) setActiveTab("maze");
                if (s.num === 2) setActiveTab("racers");
                if (s.num === 3) setActiveTab("race");
                setCurrentStepIndex(s.num);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer transition-all ${
                currentStepIndex === s.num
                  ? "bg-brand text-brand-ink shadow-sm"
                  : currentStepIndex > s.num
                  ? "bg-brand/15 text-brand border border-brand/30"
                  : "bg-surface-2 text-muted border border-border"
              }`}
            >
              <span>{s.num}</span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="flex flex-col xl:flex-row gap-8 items-start">
        {/* Left Control Panel (380px, sticky) */}
        <aside className="w-full xl:w-[380px] shrink-0 sticky top-20 flex flex-col gap-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-11 bg-surface-2 p-1 rounded-xl">
              <TabsTrigger value="maze">1. Maze</TabsTrigger>
              <TabsTrigger value="racers">2. Racers</TabsTrigger>
              <TabsTrigger value="race">3. Playback</TabsTrigger>
            </TabsList>

            {/* TAB 1: MAZE */}
            <TabsContent value="maze" className="flex flex-col gap-4 mt-3">
              {/* Presets Grid */}
              <div className="p-4 rounded-2xl border border-border bg-surface flex flex-col gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Quick Presets
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_CARDS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleLoadPreset(p.id)}
                      className="p-2.5 rounded-xl border border-border bg-surface-2/60 hover:bg-surface-2 hover:border-brand/40 text-left transition-all"
                    >
                      <span className="font-semibold text-text text-xs block">{p.name}</span>
                      <span className="text-[11px] text-muted line-clamp-1 mt-0.5">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Maze Generator Form */}
              <div className="p-4 rounded-2xl border border-border bg-surface flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Generate Maze
                  </span>
                  <span className="font-mono text-xs text-brand">{rows} × {cols}</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted">Size: {rows} × {cols}</span>
                  <Slider
                    value={[rows]}
                    min={11}
                    max={45}
                    step={2}
                    onValueChange={([v]) => {
                      setRows(v);
                      setCols(v);
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "backtracker", label: "Twisty Corridors" },
                    { id: "braided", label: "Loops (Braided)" },
                    { id: "random", label: "Random Walls" },
                    { id: "weighted", label: "Terrain Blobs" },
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setGenType(style.id)}
                      className={`p-2 rounded-lg border text-xs font-medium text-center transition-colors ${
                        genType === style.id
                          ? "bg-brand text-brand-ink border-brand font-semibold"
                          : "bg-surface-2 border-border text-muted hover:text-text"
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted">Diagonal Movement</span>
                  <Switch checked={diagonal} onCheckedChange={setDiagonal} />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Sand &amp; Water Terrain</span>
                  <Switch checked={weighted} onCheckedChange={setWeighted} />
                </div>

                <Button onClick={() => handleGenerate()} className="w-full gap-2 mt-1">
                  <Dices className="w-4 h-4" /> Generate New Maze
                </Button>
              </div>

              {/* Painting Tools Toolbar */}
              <div className="p-4 rounded-2xl border border-border bg-surface flex flex-col gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Draw Tools
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "wall", label: "Wall", icon: Square },
                    { id: "erase", label: "Erase", icon: Eraser },
                    { id: "start", label: "Start", icon: Flag },
                    { id: "goal", label: "Goal", icon: Target },
                    { id: "sand", label: "Sand", icon: Layers },
                    { id: "water", label: "Water", icon: Waves },
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSelected = selectedTool === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTool(t.id as ToolType)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs gap-1 transition-all ${
                          isSelected
                            ? "bg-brand/15 border-brand text-brand font-bold"
                            : "bg-surface-2 border-border text-muted hover:text-text"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: RACERS */}
            <TabsContent value="racers" className="flex flex-col gap-3 mt-3">
              <div className="p-4 rounded-2xl border border-border bg-surface flex flex-col gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Choose Racers ({participants.length}/5)
                </span>

                <div className="flex flex-col gap-2">
                  {AVAILABLE_RACERS.map((racer) => {
                    const selected = participants.some((p) => p.algorithm === racer.id);
                    return (
                      <div
                        key={racer.id}
                        className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                          selected
                            ? "border-border bg-surface-2"
                            : "border-border/40 bg-surface-2/30 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg" style={{ color: racer.color }}>
                            {racer.shape}
                          </span>
                          <div>
                            <span className="font-bold text-sm text-text block">{racer.name}</span>
                            <span className="text-xs text-muted">{racer.desc}</span>
                          </div>
                        </div>
                        <Switch checked={selected} onCheckedChange={() => toggleParticipant(racer.id)} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: PLAYBACK */}
            <TabsContent value="race" className="flex flex-col gap-4 mt-3">
              <div className="p-4 rounded-2xl border border-border bg-surface flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Speed Pacing
                  </span>
                  <span className="text-xs font-semibold text-brand">{pacing.description}</span>
                </div>

                <Slider
                  value={[speed]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={([val]) => setSpeed(val)}
                />

                <div className="grid grid-cols-4 gap-2 pt-2">
                  {raceState === "running" ? (
                    <Button variant="danger" onClick={pauseRace} className="col-span-2 gap-1.5">
                      <Pause className="w-4 h-4 fill-current" /> Pause
                    </Button>
                  ) : (
                    <Button onClick={startRace} className="col-span-2 gap-1.5 font-bold">
                      <Play className="w-4 h-4 fill-current" />
                      {raceState === "paused" ? "Resume" : "Start Race"}
                    </Button>
                  )}

                  <Button variant="secondary" onClick={stepRace} title="Step 1 expansion">
                    <StepForward className="w-4 h-4" />
                  </Button>

                  <Button variant="outline" onClick={resetRace} title="Reset race">
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </aside>

        {/* Right Stage (flex-1) */}
        <section className="flex-1 w-full flex flex-col gap-6">
          {/* Narrator Bar */}
          <NarratorBar stats={stats} raceState={raceState} />

          {/* Winner Banner on finish */}
          {raceState === "finished" && winnerIdx !== null && stats[winnerIdx] && (
            <WinnerBanner
              winner={stats[winnerIdx]}
              totalParticipants={stats.length}
              onRaceAgain={startRace}
              onNewMaze={() => handleGenerate()}
            />
          )}

          {/* Canvas Viewport or Multi-Panel Grid */}
          {raceState !== "idle" && stats.length > 0 ? (
            <div
              className={`grid gap-6 w-full ${
                stats.length === 1
                  ? "grid-cols-1 max-w-2xl mx-auto"
                  : stats.length === 2
                  ? "grid-cols-1 md:grid-cols-2"
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {stats.map((s, idx) => (
                <RacePanel
                  key={`${s.algorithm}_${idx}`}
                  maze={maze!}
                  stats={s}
                  isWinner={winnerIdx === idx}
                  maxExpandedSeen={maxExpandedSeen}
                />
              ))}
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              <div className="relative w-full max-w-3xl aspect-square rounded-2xl border border-border bg-surface overflow-hidden shadow-xl">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full block cursor-crosshair touch-none select-none"
                  {...handlers}
                />
                {/* 3-2-1 Countdown Overlay */}
                {countdown !== null && (
                  <div className="absolute inset-0 bg-bg/75 flex items-center justify-center z-30">
                    <span className="text-7xl font-extrabold text-brand animate-ping">
                      {countdown}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Maze Legend Always Visible */}
          <Legend />
        </section>
      </div>
    </div>
  );
};
