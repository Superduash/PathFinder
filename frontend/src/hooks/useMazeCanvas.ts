import { useRef, useEffect, useCallback } from "react";
import type { Maze } from "@/lib/types";

interface UseMazeCanvasOptions {
  maze: Maze | null;
  exploredSet?: Set<string>;
  frontierSet?: Set<string>;
  path?: [number, number][] | null;
  heatmap?: { r: number; c: number; h: number }[] | null;
  interactive?: boolean;
  onCellClick?: (r: number, c: number) => void;
  hoverCell?: [number, number] | null;
}

export function useMazeCanvas({
  maze,
  exploredSet,
  frontierSet,
  path,
  heatmap,
  interactive = false,
  onCellClick,
  hoverCell,
}: UseMazeCanvasOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPointerDownRef = useRef(false);

  // Bresenham interpolation to avoid gaps when dragging
  const drawLineCells = useCallback(
    (r0: number, c0: number, r1: number, c1: number, fn: (r: number, c: number) => void) => {
      const dr = Math.abs(r1 - r0);
      const dc = Math.abs(c1 - c0);
      const sr = r0 < r1 ? 1 : -1;
      const sc = c0 < c1 ? 1 : -1;
      let err = dr - dc;

      let currR = r0;
      let currC = c0;

      while (true) {
        fn(currR, currC);
        if (currR === r1 && currC === c1) break;
        const e2 = 2 * err;
        if (e2 > -dc) {
          err -= dc;
          currR += sr;
        }
        if (e2 < dr) {
          err += dr;
          currC += sc;
        }
      }
    },
    []
  );

  const lastCellRef = useRef<[number, number] | null>(null);

  // Redraw canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !maze) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#0E1116";
    ctx.fillRect(0, 0, width, height);

    const cellW = width / maze.cols;
    const cellH = height / maze.rows;

    // 1. Draw static cells
    for (let r = 0; r < maze.rows; r++) {
      for (let c = 0; c < maze.cols; c++) {
        const code = maze.cells[r * maze.cols + c];
        const x = c * cellW;
        const y = r * cellH;

        if (code === 1) {
          // Wall
          ctx.fillStyle = "#2A323D";
          ctx.fillRect(x, y, cellW, cellH);
        } else if (code === 2) {
          // Sand (cost 3)
          ctx.fillStyle = "#2B261D";
          ctx.fillRect(x, y, cellW, cellH);
          ctx.fillStyle = "#D4A373";
          ctx.fillRect(x + cellW * 0.4, y + cellH * 0.4, cellW * 0.2, cellH * 0.2);
        } else if (code === 3) {
          // Water (cost 5)
          ctx.fillStyle = "#162836";
          ctx.fillRect(x, y, cellW, cellH);
          ctx.fillStyle = "#457B9D";
          ctx.fillRect(x + cellW * 0.3, y + cellH * 0.4, cellW * 0.4, cellH * 0.2);
        }
      }
    }

    // 2. Heatmap overlay (if available)
    if (heatmap && heatmap.length > 0) {
      let maxH = 0;
      for (const item of heatmap) if (item.h > maxH) maxH = item.h;
      for (const item of heatmap) {
        const x = item.c * cellW;
        const y = item.r * cellH;
        const ratio = maxH > 0 ? item.h / maxH : 0;
        ctx.fillStyle = `rgba(61, 214, 198, ${Math.min(0.6, ratio * 0.8)})`;
        ctx.fillRect(x, y, cellW, cellH);
      }
    }

    // 3. Explored & Frontier overlays
    if (exploredSet) {
      ctx.fillStyle = "rgba(76, 154, 255, 0.35)"; // BFS/Explored blue tint
      for (const key of exploredSet) {
        const [r, c] = key.split(",").map(Number);
        ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
      }
    }

    if (frontierSet) {
      ctx.fillStyle = "rgba(242, 201, 76, 0.6)"; // Frontier gold tint
      for (const key of frontierSet) {
        const [r, c] = key.split(",").map(Number);
        ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
      }
    }

    // 4. Subtle Grid Lines
    ctx.strokeStyle = "rgba(42, 50, 61, 0.4)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let r = 0; r <= maze.rows; r++) {
      ctx.moveTo(0, r * cellH);
      ctx.lineTo(width, r * cellH);
    }
    for (let c = 0; c <= maze.cols; c++) {
      ctx.moveTo(c * cellW, 0);
      ctx.lineTo(c * cellW, height);
    }
    ctx.stroke();

    // 5. Solution Path
    if (path && path.length > 0) {
      ctx.strokeStyle = "#5BD68A";
      ctx.lineWidth = Math.max(2, Math.min(cellW, cellH) * 0.35);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (let i = 0; i < path.length; i++) {
        const [pr, pc] = path[i];
        const cx = pc * cellW + cellW / 2;
        const cy = pr * cellH + cellH / 2;
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    // 6. Start & Goal markers
    const [sr, sc] = maze.start;
    const [gr, gc] = maze.goal;

    // Start (Circle S)
    const sx = sc * cellW + cellW / 2;
    const sy = sr * cellH + cellH / 2;
    const radius = Math.min(cellW, cellH) * 0.35;

    ctx.fillStyle = "#3DD6C6";
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0E1116";
    ctx.font = `bold ${Math.max(10, Math.floor(radius))}px Inter Variable, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("S", sx, sy);

    // Goal (Diamond G)
    const gx = gc * cellW + cellW / 2;
    const gy = gr * cellH + cellH / 2;
    ctx.fillStyle = "#FF6B6B";
    ctx.beginPath();
    ctx.moveTo(gx, gy - radius);
    ctx.lineTo(gx + radius, gy);
    ctx.lineTo(gx, gy + radius);
    ctx.lineTo(gx - radius, gy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#0E1116";
    ctx.fillText("G", gx, gy);

    // 7. Hover Cell Highlight Ring
    if (hoverCell) {
      const [hr, hc] = hoverCell;
      if (hr >= 0 && hr < maze.rows && hc >= 0 && hc < maze.cols) {
        ctx.strokeStyle = "#3DD6C6";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(hc * cellW + 1, hr * cellH + 1, cellW - 2, cellH - 2);
      }
    }

    ctx.restore();
  }, [maze, exploredSet, frontierSet, path, heatmap, hoverCell]);

  // Request Animation Frame loop for smooth painting
  useEffect(() => {
    let animId: number;
    const loop = () => {
      render();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [render]);

  // Pointer event handlers
  const getCellFromEvent = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] | null => {
    const canvas = canvasRef.current;
    if (!canvas || !maze) return null;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const c = Math.floor((x / rect.width) * maze.cols);
    const r = Math.floor((y / rect.height) * maze.rows);
    if (r >= 0 && r < maze.rows && c >= 0 && c < maze.cols) {
      return [r, c];
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isPointerDownRef.current = true;
    const cell = getCellFromEvent(e);
    if (cell && onCellClick) {
      lastCellRef.current = cell;
      onCellClick(cell[0], cell[1]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive || !isPointerDownRef.current) return;
    const cell = getCellFromEvent(e);
    if (cell && onCellClick && lastCellRef.current) {
      const [r0, c0] = lastCellRef.current;
      const [r1, c1] = cell;
      if (r0 !== r1 || c0 !== c1) {
        drawLineCells(r0, c0, r1, c1, (r, c) => onCellClick(r, c));
        lastCellRef.current = cell;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    isPointerDownRef.current = false;
    lastCellRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  return {
    canvasRef,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
    },
  };
}
