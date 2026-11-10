import { useEffect, useRef, useState, useCallback } from "react";
import confetti from "canvas-confetti";
import { RaceSocket } from "@/lib/ws";
import { getPacing } from "@/lib/pacing";
import type { Maze, Participant } from "@/lib/types";

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
  currentNode?: [number, number] | null;
  path?: [number, number][] | null;
}

export function useRace(maze: Maze | null, participants: Participant[], speedLevel: number) {
  const socketRef = useRef<RaceSocket | null>(null);
  const [raceState, setRaceState] = useState<"idle" | "ready" | "running" | "paused" | "finished" | "disconnected">("idle");
  const [stats, setStats] = useState<ParticipantStats[]>([]);
  const [winnerIdx, setWinnerIdx] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const isRunningRef = useRef(false);
  const inFlightRef = useRef(false);
  const timerRef = useRef<any>(null);

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
        currentNode: null,
        path: null,
      }));
      setStats(initialStats);
      setRaceState("ready");
    });

    socket.on("race.update", (msg: any) => {
      inFlightRef.current = false;

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
        const topWinner = msg.ranking[0];
        setWinnerIdx(topWinner);
        try {
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        } catch {}
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

  const initRace = useCallback(() => {
    if (!maze || !socketRef.current) return;
    setWinnerIdx(null);
    socketRef.current.send({
      type: "race.init",
      raceId: `race_${Date.now()}`,
      maze,
      participants,
      k: pacing.k,
    });
  }, [maze, participants, pacing.k]);

  // Start with 3-2-1 countdown overlay
  const startRaceWithCountdown = () => {
    if (raceState === "ready" || raceState === "paused") {
      isRunningRef.current = true;
      setRaceState("running");
    } else {
      initRace();
      setCountdown(3);
      const cTimer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(cTimer);
            setCountdown(null);
            isRunningRef.current = true;
            setRaceState("running");
            return null;
          }
          return prev - 1;
        });
      }, 600);
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
    setCountdown(null);
    setStats([]);
    socketRef.current?.send({ type: "race.reset" });
  };

  return {
    raceState,
    stats,
    winnerIdx,
    countdown,
    pacing,
    startRace: startRaceWithCountdown,
    pauseRace,
    stepRace,
    resetRace,
    initRace,
  };
}
