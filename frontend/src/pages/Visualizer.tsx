import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { useRace } from "@/hooks/useRace";
import { useMazeCanvas, type OverlayMode } from "@/hooks/useMazeCanvas";
import { useHotkeys } from "@/hooks/useHotkeys";
import { RacePanel } from "@/components/RacePanel";
import { TilePalette } from "@/components/visualizer/TilePalette";
import { RacersSidebar } from "@/components/visualizer/RacersSidebar";
import { VisualizerToolbar } from "@/components/visualizer/VisualizerToolbar";
import { ResultStrip } from "@/components/visualizer/ResultStrip";
import { MazeSettingsModal, type MazeConfig } from "@/components/visualizer/MazeSettingsModal";
import { NarratorBar } from "@/components/maze/NarratorBar";
import { WinnerBanner } from "@/components/maze/WinnerBanner";
import { startVisualizerTour } from "@/lib/tour";
import { request } from "@/lib/api";
import { notify } from "@/lib/notify";
import type { Maze } from "@/lib/types";

export const VisualizerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
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

  const [viewMode, setViewMode] = useState<"edit" | "race">(() => {
    const saved = localStorage.getItem("pathfinder-view-mode");
    return (saved as "edit" | "race") || "race";
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const generationIdRef = useRef(0);

  // Overlay Mode and Heuristic Map state (§4.3)
  const [overlayMode, setOverlayMode] = useState<OverlayMode>(() => {
    const saved = localStorage.getItem("pathfinder-overlay-mode");
    return (saved as OverlayMode) || "off";
  });
  const [showHintMap, setShowHintMap] = useState<boolean>(() => {
    const saved = localStorage.getItem("pathfinder-show-hint-map");
    return saved === "true";
  });
  const [heuristicMap, setHeuristicMap] = useState<number[] | null>(null);

  const [mazeConfig, setMazeConfig] = useState<MazeConfig>(() => {
    const saved = localStorage.getItem("pathfinder-maze-config");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      rows: 21,
      cols: 21,
      genType: "backtracker",
      density: 0.25,
      diagonal: false,
      weighted: false,
      weightFraction: 0.3,
      seed: 42,
    };
  });

  const {
    raceState,
    stats,
    winnerIdx,
    winnerReason,
    insights,
    serverNote,
    stepCount,
    startRace,
    pauseRace,
    stepRace,
    resetRace,
  } = useRace(maze, participants, speed);

  // Deep-linking params support (?preset=...&racers=bfs,astar)
  useEffect(() => {
    const presetParam = searchParams.get("preset");
    const racersParam = searchParams.get("racers");

    if (presetParam) {
      handleLoadPreset(presetParam);
    }
    if (racersParam) {
      const algs = racersParam.split(",").map((s) => s.trim().toLowerCase());
      if (algs.length > 0) {
        setParticipants(
          algs.slice(0, 6).map((alg) => ({
            algorithm: alg,
            heuristic: alg === "greedy" || alg === "astar" ? "manhattan" : null,
          }))
        );
      }
    }
  }, [searchParams]);

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem("pathfinder-view-mode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem("pathfinder-overlay-mode", overlayMode);
  }, [overlayMode]);

  useEffect(() => {
    localStorage.setItem("pathfinder-show-hint-map", String(showHintMap));
  }, [showHintMap]);

  useEffect(() => {
    localStorage.setItem("pathfinder-maze-config", JSON.stringify(mazeConfig));
  }, [mazeConfig]);

  // First-visit interactive tour
  useEffect(() => {
    const seen = localStorage.getItem("pathfinder_tour_seen");
    if (!seen) {
      localStorage.setItem("pathfinder_tour_seen", "true");
      const timer = setTimeout(() => {
        startVisualizerTour();
      }, 900);
      return () => clearTimeout(timer);
    }
  }, []);

  // Fetch heuristic distance gradient when enabled or when maze changes
  useEffect(() => {
    if (!showHintMap || !maze) {
      setHeuristicMap(null);
      return;
    }

    const primaryHeuristic =
      participants.find((p) => p.heuristic)?.heuristic || "manhattan";

    request<{ values: (number | null)[] }>("/api/maze/heuristic-map", {
      method: "POST",
      body: JSON.stringify({
        maze,
        heuristic: primaryHeuristic,
      }),
    })
      .then((res) => {
        if (res && res.values) {
          setHeuristicMap(res.values.map((v) => (v === null ? -1 : v)));
        }
      })
      .catch(() => {
        setHeuristicMap(null);
      });
  }, [showHintMap, maze, participants]);

  // Generate maze from config
  const handleGenerate = async (cfg: MazeConfig, suppressToast: boolean = false) => {
    if (isGenerating) return; // Prevent concurrent requests
    
    setIsGenerating(true);
    const requestId = ++generationIdRef.current;
    
    try {
      const generated = await request<Maze>("/api/maze/generate", {
        method: "POST",
        body: JSON.stringify({
          rows: cfg.rows,
          cols: cfg.cols,
          type: cfg.genType,
          density: cfg.density,
          diagonal: cfg.diagonal,
          weighted: cfg.weighted,
          weight_fraction: cfg.weightFraction,
          seed: cfg.seed,
          randomize_endpoints: true,
        }),
      });
      
      // Ignore stale responses
      if (requestId !== generationIdRef.current) {
        return;
      }
      
      setMaze(generated);
      resetRace();
      setActivePreset(null);
      
      // Update config with actual seed from generated maze if available
      if (generated.seed !== undefined && generated.seed !== cfg.seed) {
        setMazeConfig(prev => ({ ...prev, seed: generated.seed }));
      }
      
      // Validate solvability and warn user
      try {
        const validation = await request<{ valid: boolean; solvable: boolean }>("/api/maze/validate", {
          method: "POST",
          body: JSON.stringify({ maze: generated }),
        });
        
        if (!validation.solvable && !suppressToast) {
          notify.warning("⚠️ No path exists! Try: lower density, different seed, or click 'New maze'");
        } else if (!suppressToast) {
          if (cfg.genType === "empty") {
            notify.info(`Empty ${cfg.rows}×${cfg.cols} grid (no obstacles)`);
          } else {
            notify.success(`Maze ${cfg.rows}×${cfg.cols} generated (${cfg.genType})`);
          }
        }
      } catch {
        // Validation failed, still show generated maze
        if (!suppressToast) {
          notify.success(`Maze ${cfg.rows}×${cfg.cols} generated (${cfg.genType})`);
        }
      }
    } catch (err) {
      notify.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  // 1-click re-roll: generates new maze with different seed, keeping all other settings
  const handleNewMaze = () => {
    // Generate guaranteed different seed
    let newSeed;
    do {
      newSeed = Math.floor(Math.random() * 900000) + 100000;
    } while (newSeed === mazeConfig.seed);
    
    const nextCfg = { 
      ...mazeConfig, 
      seed: newSeed
    };
    
    setMazeConfig(nextCfg);
    setActivePreset(null); // Leave preset mode when generating
    handleGenerate(nextCfg);
  };

  // Load Preset
  const handleLoadPreset = async (presetName: string) => {
    try {
      const presetMaze = await request<Maze>("/api/maze/preset", {
        method: "POST",
        body: JSON.stringify({ name: presetName, diagonal: mazeConfig.diagonal }),
      });
      setMaze(presetMaze);
      setMazeConfig((prev) => ({
        ...prev,
        rows: presetMaze.rows,
        cols: presetMaze.cols,
      }));
      resetRace();
      setActivePreset(presetName);
      notify.success(`Loaded preset '${presetName}'`);
    } catch (err) {
      notify.error(err);
    }
  };

  useEffect(() => {
    if (!maze) {
      handleGenerate(mazeConfig, true);
    }
  }, []);

  // Cell drawing click handler for editor mode
  const handleCellClick = (r: number, c: number) => {
    // Allow editing in edit mode when race is idle or ready
    if (viewMode !== "edit") return;
    if (raceState === "running") return;
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
    interactive: viewMode === "edit" && raceState !== "running",
    onCellClick: handleCellClick,
  });

  // Hotkeys
  useHotkeys([
    {
      key: " ",
      handler: () => {
        if (raceState === "running") pauseRace();
        else {
          setViewMode("race");
          startRace();
        }
      },
    },
    { key: "s", handler: () => stepRace() },
    { key: "r", handler: () => resetRace() },
    { key: "[", handler: () => setSpeed(Math.max(1, speed - 1)) },
    { key: "]", handler: () => setSpeed(Math.min(6, speed + 1)) },
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
      if (participants.length < 6) {
        setParticipants([
          ...participants,
          {
            algorithm: algId,
            heuristic: algId === "greedy" || algId === "astar" ? "manhattan" : null,
          },
        ]);
      } else {
        notify.warning("Maximum 6 participants allowed");
      }
    }
  };

  const handleUpdateHeuristic = (algId: string, heuristic: string) => {
    setParticipants(
      participants.map((p) =>
        p.algorithm === algId ? { ...p, heuristic } : p
      )
    );
  };

  const handleStartRace = () => {
    setViewMode("race");
    startRace();
  };

  const maxExpandedSeen = Math.max(1, ...stats.map((s) => s.expanded));

  // Determine stage grid class based on participants count
  const getGridColsClass = () => {
    const count = participants.length;
    if (count <= 1) return "grid-cols-1 max-w-lg mx-auto";
    if (count === 2) return "grid-cols-1 sm:grid-cols-2";
    if (count === 3) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    if (count === 4) return "grid-cols-1 sm:grid-cols-2";
    return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  };

  const winnerParticipant = winnerIdx !== null ? stats[winnerIdx] : null;

  return (
    <div className="flex-1 flex flex-col w-full max-w-[1700px] mx-auto px-4 py-3 gap-3">
      {/* 1. Header Toolbar */}
      <VisualizerToolbar
        raceState={raceState}
        onStart={handleStartRace}
        onPause={pauseRace}
        onStep={stepRace}
        onReset={resetRace}
        speed={speed}
        onSpeedChange={setSpeed}
        onSelectPreset={handleLoadPreset}
        activePreset={activePreset}
        onNewMaze={handleNewMaze}
        onOpenSettings={() => setIsSettingsOpen(true)}
        viewMode={viewMode}
        onToggleViewMode={() =>
          setViewMode((prev) => (prev === "edit" ? "race" : "edit"))
        }
        stepsCount={stepCount}
        overlayMode={overlayMode}
        onOverlayModeChange={setOverlayMode}
        showHintMap={showHintMap}
        onToggleHintMap={() => setShowHintMap((v) => !v)}
        disabled={isGenerating}
      />

      {/* Narrator Banner (§5.4) */}
      <NarratorBar
        stats={stats}
        raceState={raceState}
        serverNote={serverNote}
      />

      {/* Winner Banner (§5.3) */}
      {raceState === "finished" && winnerParticipant && (
        <WinnerBanner
          winner={winnerParticipant}
          winnerReason={winnerReason}
          insights={insights}
          onRaceAgain={handleStartRace}
          onNewMaze={handleNewMaze}
        />
      )}

      {/* 2. Middle Row: [Toolbox] | [Stage] | [Racers] */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-[460px] items-stretch">
        {/* Left: Tile Palette & Legend (§3.5) */}
        <div id="toolbox-step" className="shrink-0">
          <TilePalette
            selectedTool={selectedTool}
            onSelectTool={(tool) => {
              setSelectedTool(tool);
              setViewMode("edit");
            }}
            disabled={raceState === "running"}
          />
        </div>

        {/* Center: Stage Viewport (§3.4) */}
        <main className="flex-1 flex flex-col bg-surface border border-border rounded-xl p-3 shadow-xs min-h-[420px] overflow-hidden">
          {viewMode === "edit" ? (
            /* Large Single Canvas Editor */
            <div className="flex-1 flex flex-col items-center justify-center relative w-full h-full">
              <div className="w-full max-w-[580px] aspect-square rounded-xl overflow-hidden border border-border shadow-xs bg-bg relative">
                <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" {...handlers} />
              </div>
              <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-surface-2 border border-border text-[11px] text-muted font-medium select-none">
                Click & drag to draw · Switch to Race View to compare
              </div>
            </div>
          ) : (
            /* Head-to-Head Multi-Racer Grid (1 to 6 Panels) */
            <div
              className={`flex-1 grid gap-3 w-full h-full content-center ${getGridColsClass()}`}
            >
              {participants.map((p, idx) => {
                const s = stats[idx] || {
                  algorithm: p.algorithm,
                  heuristic: p.heuristic,
                  status: "init",
                  expanded: 0,
                  frontier: 0,
                  peakFrontier: 0,
                  computeMs: 0,
                  exploredSet: new Set<string>(),
                  frontierSet: new Set<string>(),
                };
                return (
                  <div key={p.algorithm} className="w-full flex justify-center">
                    <div className="w-full max-w-[340px]">
                      {maze && (
                        <RacePanel
                          maze={maze}
                          stats={s}
                          isWinner={winnerIdx === idx}
                          maxExpandedSeen={maxExpandedSeen}
                          overlayMode={overlayMode}
                          heuristicMap={heuristicMap}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Right: Racers Sidebar (§3.3) */}
        <div id="racers-step" className="shrink-0">
          <RacersSidebar
            participants={participants}
            onToggleParticipant={toggleParticipant}
            onUpdateHeuristic={handleUpdateHeuristic}
            diagonal={mazeConfig.diagonal}
          />
        </div>
      </div>

      {/* 3. Bottom Row: Compact Results Strip (§5.2) */}
      <div id="results-step">
        <ResultStrip
          stats={stats}
          winnerIdx={winnerIdx}
          maxExpandedSeen={maxExpandedSeen}
        />
      </div>

      {/* Settings Modal (§3.2) */}
      <MazeSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={mazeConfig}
        onApply={(newCfg) => {
          setMazeConfig(newCfg);
          handleGenerate(newCfg);
        }}
      />
    </div>
  );
};

export default VisualizerPage;
