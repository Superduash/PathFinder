import React from "react";
import type { Maze } from "@/lib/types";
import type { CellInfo } from "@/hooks/useRace";

export interface HoverCellData {
  r: number;
  c: number;
  x: number;
  y: number;
}

interface CellInspectorProps {
  data: HoverCellData | null;
  maze: Maze | null;
  cellInfo?: CellInfo;
  algorithm: string;
  heuristic?: string | null;
}

export const CellInspector: React.FC<CellInspectorProps> = ({
  data,
  maze,
  cellInfo,
  algorithm,
  heuristic,
}) => {
  if (!data || !maze) return null;

  const { r, c, x, y } = data;
  if (r < 0 || r >= maze.rows || c < 0 || c >= maze.cols) return null;

  const cellCode = maze.cells[r * maze.cols + c];
  const isStart = maze.start[0] === r && maze.start[1] === c;
  const isGoal = maze.goal[0] === r && maze.goal[1] === c;

  let terrainName = "Floor";
  let terrainCost = 1;
  if (isStart) {
    terrainName = "Start";
  } else if (isGoal) {
    terrainName = "Goal";
  } else if (cellCode === 1) {
    terrainName = "Wall";
    terrainCost = Infinity;
  } else if (cellCode === 2) {
    terrainName = "Sand";
    terrainCost = 3;
  } else if (cellCode === 3) {
    terrainName = "Water";
    terrainCost = 5;
  }

  const algKey = algorithm.toLowerCase();

  // "Why" explanatory line
  let why = "Evaluated according to graph search rules.";
  if (algKey === "bfs") {
    why = "BFS expands cells evenly ring-by-ring using a FIFO queue.";
  } else if (algKey === "dfs") {
    why = "DFS dives deep along one corridor using a LIFO stack.";
  } else if (algKey === "ucs") {
    why = "UCS always checks the waiting cell with the smallest path cost g.";
  } else if (algKey === "greedy") {
    why = "Greedy best-first checks the cell with the smallest estimated distance h.";
  } else if (algKey === "astar") {
    why = "A* balances cost so far g + heuristic distance hint h (smallest f).";
  } else if (algKey === "bds") {
    why = cellInfo?.side
      ? `Bidirectional search wave progressing from the ${cellInfo.side}.`
      : "Bidirectional search wave advancing from start and goal simultaneously.";
  }

  return (
    <div
      style={{
        left: `${Math.min(window.innerWidth - 260, x + 16)}px`,
        top: `${Math.min(window.innerHeight - 220, y + 16)}px`,
      }}
      className="fixed z-50 w-64 p-3 bg-surface/95 backdrop-blur-md border border-border rounded-xl shadow-2xl text-xs pointer-events-none select-none animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-2"
    >
      {/* Title */}
      <div className="flex items-center justify-between pb-1 border-b border-border">
        <span className="font-bold text-text">
          Cell ({r}, {c})
        </span>
        <span className="text-[11px] font-mono text-brand uppercase font-bold">
          {algorithm.toUpperCase()}
        </span>
      </div>

      {/* Terrain & Status */}
      <div className="flex flex-col gap-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-muted">Terrain:</span>
          <span className="font-semibold text-text">
            {terrainName}{" "}
            {terrainCost !== Infinity && terrainCost > 0
              ? `(costs ${terrainCost})`
              : terrainCost === Infinity
              ? "(blocked)"
              : ""}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Status:</span>
          <span className="font-medium text-text">
            {cellInfo
              ? `Checked (#${cellInfo.order})`
              : isStart
              ? "Start Point"
              : isGoal
              ? "Goal Target"
              : "Unvisited"}
          </span>
        </div>
      </div>

      {/* Values (g, h, f) */}
      {cellInfo && (
        <div className="flex flex-col gap-1 pt-1 border-t border-border/60 text-[11px] font-mono">
          {(algKey === "ucs" || algKey === "astar" || algKey === "bds") && (
            <div className="flex justify-between">
              <span className="text-muted font-sans">g (cost so far):</span>
              <span className="font-bold text-text">{Math.round(cellInfo.g * 10) / 10}</span>
            </div>
          )}
          {(algKey === "greedy" || algKey === "astar") && cellInfo.h !== null && (
            <div className="flex justify-between">
              <span className="text-muted font-sans">
                h ({heuristic || "hint"}):
              </span>
              <span className="font-bold text-brand">{Math.round(cellInfo.h * 10) / 10}</span>
            </div>
          )}
          {algKey === "astar" && cellInfo.h !== null && (
            <div className="flex justify-between font-bold">
              <span className="text-muted font-sans">f (g + h):</span>
              <span className="text-amber-500">
                {Math.round((cellInfo.g + cellInfo.h) * 10) / 10}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Why explanation */}
      <div className="pt-1 border-t border-border/40 text-[10px] text-muted leading-relaxed italic">
        {why}
      </div>
    </div>
  );
};

