import { create } from "zustand";

export interface ParticipantRaceState {
  algorithm: string;
  heuristic?: string | null;
  status: "running" | "found" | "failed" | "init";
  expanded: number;
  frontier: number;
  peakFrontier: number;
  pathLength?: number | null;
  pathCost?: number | null;
  optimality?: number | null;
  computeMs: number;
  rank?: number;
}

export type RaceStatus = "idle" | "initing" | "ready" | "running" | "paused" | "finished" | "disconnected";

interface RaceStore {
  status: RaceStatus;
  tick: number;
  participants: ParticipantRaceState[];
  winnerRank: number[];
  setStatus: (status: RaceStatus) => void;
  setTick: (tick: number) => void;
  setParticipants: (p: ParticipantRaceState[]) => void;
  setWinnerRank: (ranks: number[]) => void;
  resetRace: () => void;
}

export const useRaceStore = create<RaceStore>((set) => ({
  status: "idle",
  tick: 0,
  participants: [],
  winnerRank: [],
  setStatus: (status) => set({ status }),
  setTick: (tick) => set({ tick }),
  setParticipants: (participants) => set({ participants }),
  setWinnerRank: (winnerRank) => set({ winnerRank }),
  resetRace: () =>
    set({
      status: "idle",
      tick: 0,
      participants: [],
      winnerRank: [],
    }),
}));

