import { useEffect, useRef, useState, useCallback } from "react";
import confetti from "canvas-confetti";
import { RaceSocket } from "@/lib/ws";
import { getPacing } from "@/lib/pacing";
import type { Maze, Participant } from "@/lib/types";
import type { InsightItem } from "@/components/maze/WinnerBanner";

export interface CellInfo {
  g: number;
  h: number | null;
  order: number;
  side?: string;
}

export interface ParticipantStats {
  algorithm: string;
  heuristic?: string | null;
  status: "init" | "running" | "found" | "failed";
  expanded: number;
  frontier: number;
  peakFrontier: number;
  pathLength?: number | null;
  pathCost?: number | null;
  optimality?: number | null;
  computeMs: number;
  rank?: number;
  exploredSet: Set<string>;
  frontierSet: Set<string>;
  cellInfoMap: Map<string, CellInfo>;
  currentNode?: [number, number] | null;
  path?: [number, number][] | null;
  note?: string | null;
}

export function useRace(maze: Maze | null, participants: Participant[], speedLevel: number) {
  const socketRef = useRef<RaceSocket | null>(null);
  const [raceState, setRaceState] = useState<"idle" | "ready" | "running" | "paused" | "finished" | "disconnected">("idle");
  const [stats, setStats] = useState<ParticipantStats[]>([]);
  const [winnerIdx, setWinnerIdx] = useState<number | null>(null);
  const [winnerReason, setWinnerReason] = useState<string | null>(null);
  const [insights, setInsights] = useState<(string | InsightItem)[]>([]);
  const [serverNote, setServerNote] = useState<string | null>(null);
  const [countdown, _setCountdown] = useState<number | null>(null);
  const [stepCount, setStepCount] = useState<number>(0);

  const isRunningRef = useRef(false);
  const inFlightRef = useRef(false);
  const timerRef = useRef<any>(null);
  const colsRef = useRef(maze?.cols || 21);
  const confettiFiredRef = useRef(false);
  const currentRaceIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (maze?.cols) colsRef.current = maze.cols;
  }, [maze?.cols]);

  const pacing = getPacing(speedLevel);

  // Initialize socket
  useEffect(() => {
    const socket = new RaceSocket();
    socketRef.current = socket;

    socket.on("open", () => {
      setRaceState((prev) => (prev === "disconnected" ? "idle" : prev));
    });

    socket.on("close", () => {
      setRaceState("disconnected");
      isRunningRef.current = false;
    });

    socket.on("race.ready", (msg: any) => {
      const initialStats: ParticipantStats[] = msg.participants.map((p: any) => ({
        algorithm: p.algorithm,
        heuristic: p.heuristic,
        status: p.status,
        expanded: p.expanded,
        frontier: p.frontier,
        peakFrontier: p.peak_frontier,
        computeMs: p.compute_ms,
        exploredSet: new Set<string>(),
        frontierSet: new Set<string>(),
        cellInfoMap: new Map<string, CellInfo>(),
        currentNode: null,
        path: null,
        note: null,
      }));
      setStats(initialStats);
      setWinnerIdx(null);
      setWinnerReason(null);
      setInsights([]);
      setStepCount(0);
      setRaceState(isRunningRef.current ? "running" : "ready");
      // Reset confetti flag for new race
      confettiFiredRef.current = false;
    });

    socket.on("race.update", (msg: any) => {
      inFlightRef.current = false;
      setStepCount((prev) => prev + 1);

      setStats((prev) => {
        return prev.map((item, idx) => {
          const p = msg.participants[idx];
          if (!p) return item;

          const nextExplored = new Set(item.exploredSet);
          let lastNode: [number, number] | null = item.currentNode || null;

          if (p.delta_expanded) {
            for (const [r, c] of p.delta_expanded) {
              nextExplored.add(`${r},${c}`);
              lastNode = [r, c];
            }
          }

          const nextFrontier = new Set(item.frontierSet);
          if (p.delta_discovered) {
            for (const [r, c] of p.delta_discovered) {
              nextFrontier.add(`${r},${c}`);
            }
          }
          if (p.delta_expanded) {
            for (const [r, c] of p.delta_expanded) {
              nextFrontier.delete(`${r},${c}`);
            }
          }

          const nextCellInfo = new Map(item.cellInfoMap);
          if (p.info && Array.isArray(p.info)) {
            const cols = colsRef.current;
            for (const [cellIdx, gVal, hVal, orderVal, sideVal] of p.info) {
              const r = Math.floor(cellIdx / cols);
              const c = cellIdx % cols;
              nextCellInfo.set(`${r},${c}`, {
                g: gVal,
                h: hVal,
                order: orderVal,
                side: sideVal,
              });
            }
          }

          if (p.note && idx === 0) {
            setServerNote(p.note);
          }

          return {
            ...item,
            status: p.status,
            expanded: p.expanded,
            frontier: p.frontier,
            peakFrontier: p.peak_frontier,
            computeMs: p.compute_ms,
            pathLength: p.path_length,
            pathCost: p.path_cost,
            optimality: p.optimality,
            path: p.path || item.path,
            currentNode: lastNode,
            exploredSet: nextExplored,
            frontierSet: nextFrontier,
            cellInfoMap: nextCellInfo,
            note: p.note || item.note,
          };
        });
      });

      if (msg.all_done) {
        isRunningRef.current = false;
        setRaceState("finished");
      }
    });

    socket.on("race.summary", (msg: any) => {
      if (msg.ranking && msg.ranking.length > 0) {
        setWinnerIdx(msg.ranking[0]);
        if (msg.winner_reason) setWinnerReason(msg.winner_reason);
        if (msg.insights) setInsights(msg.insights);
      }
    });

    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, []);

  // Chained setTimeout pacing loop
  useEffect(() => {
    let active = true;

    const scheduleTick = () => {
      if (!active || !isRunningRef.current || !socketRef.current) return;

      if (!inFlightRef.current) {
        inFlightRef.current = true;
        socketRef.current.send({
          type: "race.step",
          k: pacing.k,
        });
      }

      timerRef.current = setTimeout(scheduleTick, pacing.intervalMs);
    };

    if (raceState === "running") {
      scheduleTick();
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
    }

    return () => {
      active = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [raceState, pacing.intervalMs, pacing.k]);

  // Fire confetti once when race finishes with a winner
  useEffect(() => {
    if (raceState === "finished" && winnerIdx !== null && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      try {
        confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
      } catch {}
    }
  }, [raceState, winnerIdx]);

  const initRace = useCallback(() => {
    if (!maze || !socketRef.current) return;
    setWinnerIdx(null);
    setWinnerReason(null);
    setInsights([]);
    setStepCount(0);
    confettiFiredRef.current = false; // Reset confetti flag for new race
    socketRef.current.send({
      type: "race.init",
      raceId: `race_${Date.now()}`,
      maze,
      participants,
      k: pacing.k,
      options: { show_values: true, narrate: true },
    });
  }, [maze, participants, pacing.k]);

  const startRace = () => {
    if (raceState === "ready" || raceState === "paused") {
      isRunningRef.current = true;
      setRaceState("running");
    } else {
      initRace();
      isRunningRef.current = true;
      setRaceState("running");
    }
  };

  const pauseRace = () => {
    isRunningRef.current = false;
    setRaceState("paused");
  };

  const stepRace = () => {
    if (!socketRef.current) return;
    if (raceState === "idle" || raceState === "finished") {
      initRace();
      setTimeout(() => {
        socketRef.current?.send({ type: "race.step", k: 1 });
      }, 100);
    } else {
      socketRef.current.send({ type: "race.step", k: 1 });
    }
  };

  const resetRace = () => {
    isRunningRef.current = false;
    setRaceState("idle");
    setWinnerIdx(null);
    setWinnerReason(null);
    setInsights([]);
    setStepCount(0);
    setStats([]);
    confettiFiredRef.current = false; // Reset confetti flag
  };

  return {
    raceState,
    stats,
    winnerIdx,
    winnerReason,
    insights,
    serverNote,
    countdown,
    stepCount,
    pacing,
    startRace,
    pauseRace,
    stepRace,
    resetRace,
  };
}
