import { useEffect, useRef, useState, useCallback } from "react";
import confetti from "canvas-confetti";
import { RaceSocket } from "@/lib/ws";
import { notify } from "@/lib/notify";
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
  path?: [number, number][] | null;
}

export function useRace(maze: Maze | null, participants: Participant[], speedExpansions: number) {
  const socketRef = useRef<RaceSocket | null>(null);
  const [raceState, setRaceState] = useState<"idle" | "ready" | "running" | "paused" | "finished" | "disconnected">("idle");
  const [stats, setStats] = useState<ParticipantStats[]>([]);
  const [winnerIdx, setWinnerIdx] = useState<number | null>(null);

  const isRunningRef = useRef(false);
  const inFlightRef = useRef(false);

  // Initialize socket
  useEffect(() => {
    const socket = new RaceSocket();
    socketRef.current = socket;

    socket.on("open", () => {
      if (raceState === "disconnected") {
        setRaceState("idle");
        notify.success("Connected to race session");
      }
    });

    socket.on("close", () => {
      setRaceState("disconnected");
      isRunningRef.current = false;
      notify.error(new Error("Race socket disconnected"));
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
          if (p.delta_expanded) {
            for (const [r, c] of p.delta_expanded) {
              nextExplored.add(`${r},${c}`);
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
          confetti({ particleCount: 60, spread: 55, origin: { y: 0.6 } });
        } catch {}
      }
    });

    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, []);

  // Tick loop
  useEffect(() => {
    let timer: any = null;

    const tick = () => {
      if (isRunningRef.current && socketRef.current && !inFlightRef.current) {
        inFlightRef.current = true;
        socketRef.current.send({
          type: "race.step",
          k: speedExpansions,
        });
      }
    };

    if (raceState === "running") {
      timer = setInterval(tick, 33); // ~30 fps tick rate
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [raceState, speedExpansions]);

  const initRace = useCallback(() => {
    if (!maze || !socketRef.current) return;
    setWinnerIdx(null);
    socketRef.current.send({
      type: "race.init",
      raceId: `race_${Date.now()}`,
      maze,
      participants,
      k: speedExpansions,
    });
  }, [maze, participants, speedExpansions]);

  const startRace = () => {
    if (raceState === "ready" || raceState === "paused") {
      isRunningRef.current = true;
      setRaceState("running");
    } else if (raceState === "idle" || raceState === "finished") {
      initRace();
      setTimeout(() => {
        isRunningRef.current = true;
        setRaceState("running");
      }, 150);
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
    setStats([]);
    socketRef.current?.send({ type: "race.reset" });
  };

  return {
    raceState,
    stats,
    winnerIdx,
    startRace,
    pauseRace,
    stepRace,
    resetRace,
    initRace,
  };
}
