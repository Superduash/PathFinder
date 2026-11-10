import { create } from "zustand";
import type { Maze, Participant } from "@/lib/types";

export type ToolType = "wall" | "erase" | "start" | "goal" | "sand" | "water";

interface AppState {
  maze: Maze | null;
  selectedTool: ToolType;
  participants: Participant[];
  speed: number;
  isRaceMode: boolean;
  setMaze: (maze: Maze) => void;
  setSelectedTool: (tool: ToolType) => void;
  setParticipants: (participants: Participant[]) => void;
  setSpeed: (speed: number) => void;
  setIsRaceMode: (isRace: boolean) => void;
  updateCell: (r: number, c: number, code: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  maze: null,
  selectedTool: "wall",
  participants: [
    { algorithm: "bfs" },
    { algorithm: "astar", heuristic: "manhattan" },
  ],
  speed: 5,
  isRaceMode: false,
  setMaze: (maze) => set({ maze }),
  setSelectedTool: (selectedTool) => set({ selectedTool }),
  setParticipants: (participants) => set({ participants }),
  setSpeed: (speed) => set({ speed }),
  setIsRaceMode: (isRaceMode) => set({ isRaceMode }),
  updateCell: (r, c, code) =>
    set((state) => {
      if (!state.maze) return state;
      const idx = r * state.maze.cols + c;
      const newCells = [...state.maze.cells];
      newCells[idx] = code;
      return { maze: { ...state.maze, cells: newCells } };
    }),
}));

