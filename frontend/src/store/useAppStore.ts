import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Maze, Participant } from "@/lib/types";

export type ToolType = "wall" | "erase" | "start" | "goal" | "sand" | "water";

interface HistoryEntry {
  cells: number[];
  start: [number, number];
  goal: [number, number];
}

interface AppState {
  version: number;
  maze: Maze | null;
  selectedTool: ToolType;
  participants: Participant[];
  speed: number;
  isRaceMode: boolean;
  history: HistoryEntry[];
  historyIndex: number;
  setMaze: (maze: Maze) => void;
  setSelectedTool: (tool: ToolType) => void;
  setParticipants: (participants: Participant[]) => void;
  setSpeed: (speed: number) => void;
  setIsRaceMode: (isRace: boolean) => void;
  updateCell: (r: number, c: number, code: number) => void;
  clearMaze: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  pushHistory: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      version: 2,
      maze: null,
      selectedTool: "wall",
      participants: [
        { algorithm: "bfs" },
        { algorithm: "astar", heuristic: "manhattan" },
      ],
      speed: 5,
      isRaceMode: false,
      history: [],
      historyIndex: -1,
      
      setMaze: (maze) => set({ maze, history: [], historyIndex: -1 }),
      
      setSelectedTool: (selectedTool) => set({ selectedTool }),
      
      setParticipants: (participants) => set({ participants }),
      
      setSpeed: (speed) => set({ speed }),
      
      setIsRaceMode: (isRaceMode) => set({ isRaceMode }),
      
      pushHistory: () => {
        const state = get();
        if (!state.maze) return;
        
        const entry: HistoryEntry = {
          cells: [...state.maze.cells],
          start: [...state.maze.start] as [number, number],
          goal: [...state.maze.goal] as [number, number],
        };
        
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(entry);
        
        // Limit history to 50 entries
        if (newHistory.length > 50) {
          newHistory.shift();
        }
        
        set({
          history: newHistory,
          historyIndex: newHistory.length - 1,
        });
      },
      
      updateCell: (r, c, code) =>
        set((state) => {
          if (!state.maze) return state;
          const idx = r * state.maze.cols + c;
          const newCells = [...state.maze.cells];
          newCells[idx] = code;
          return { maze: { ...state.maze, cells: newCells } };
        }),
      
      clearMaze: () =>
        set((state) => {
          if (!state.maze) return state;
          
          // Save current state to history before clearing
          const entry: HistoryEntry = {
            cells: [...state.maze.cells],
            start: [...state.maze.start] as [number, number],
            goal: [...state.maze.goal] as [number, number],
          };
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(entry);
          
          // Clear all cells to floor (0)
          const clearedCells = new Array(state.maze.rows * state.maze.cols).fill(0);
          
          return {
            maze: { ...state.maze, cells: clearedCells },
            history: newHistory,
            historyIndex: newHistory.length - 1,
          };
        }),
      
      undo: () =>
        set((state) => {
          if (!state.maze || state.historyIndex < 0) return state;
          
          const entry = state.history[state.historyIndex];
          return {
            maze: {
              ...state.maze,
              cells: [...entry.cells],
              start: [...entry.start],
              goal: [...entry.goal],
            },
            historyIndex: state.historyIndex - 1,
          };
        }),
      
      redo: () =>
        set((state) => {
          if (!state.maze || state.historyIndex >= state.history.length - 1) return state;
          
          const entry = state.history[state.historyIndex + 2];
          if (!entry) return state;
          
          return {
            maze: {
              ...state.maze,
              cells: [...entry.cells],
              start: [...entry.start],
              goal: [...entry.goal],
            },
            historyIndex: state.historyIndex + 1,
          };
        }),
      
      canUndo: () => {
        const state = get();
        return state.historyIndex >= 0;
      },
      
      canRedo: () => {
        const state = get();
        return state.historyIndex < state.history.length - 1;
      },
    }),
    {
      name: "pathfinder-app-storage",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          return {
            ...persistedState,
            maze: null,
            version: 2,
            history: [],
            historyIndex: -1,
          };
        }
        return persistedState;
      },
      partialize: (state) => ({
        version: state.version,
        maze: state.maze,
        participants: state.participants,
        speed: state.speed,
        selectedTool: state.selectedTool,
      }),
    }
  )
);

