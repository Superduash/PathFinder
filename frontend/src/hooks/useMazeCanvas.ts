import { useRef, useEffect, useCallback } from "react";
import type { Maze } from "@/lib/types";
import type { CellInfo } from "@/hooks/useRace";

export type OverlayMode = "off" | "order" | "g" | "h" | "f";

interface UseMazeCanvasOptions {
  maze: Maze | null;
  algorithmColor?: string; // Single hue owned by the participant (e.g. #38BDF8)
  exploredSet?: Set<string>;
  frontierSet?: Set<string>;
  cellInfoMap?: Map<string, CellInfo>;
  overlayMode?: OverlayMode;
  currentNode?: [number, number] | null;
  path?: [number, number][] | null;
  heatmap?: { r: number; c: number; h: number }[] | null;
  heuristicMap?: number[] | null;
  interactive?: boolean;
  onCellClick?: (r: number, c: number) => void;
  hoverCell?: [number, number] | null;
  onHoverCell?: (info: { r: number; c: number; x: number; y: number } | null) => void;
}

export function useMazeCanvas({
  maze,
  algorithmColor = "#2DD4BF",
  exploredSet,
  frontierSet,
  cellInfoMap,
  overlayMode = "off",
  currentNode,
  path,
  heatmap,
  heuristicMap,
  interactive = false,
  onCellClick,
  hoverCell,
  onHoverCell,
}: UseMazeCanvasOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPointerDownRef = useRef(false);
  const lastCellRef = useRef<[number, number] | null>(null);

  // Per-cell fade-in and recency tracking
  const birthMapRef = useRef<Map<string, number>>(new Map());
  const pathAnimProgressRef = useRef(0);
  const staticCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const staticKeyRef = useRef<string>("");
  
  // Memoized cells signature to avoid expensive recomputation on every frame
  const cellsSignatureRef = useRef<string>("");
  const lastCellsArrayRef = useRef<number[] | null>(null);

  // Register births for newly checked cells
  useEffect(() => {
    if (!exploredSet) return;
    const now = performance.now();
    for (const key of exploredSet) {
      if (!birthMapRef.current.has(key)) {
        birthMapRef.current.set(key, now);
      }
    }
  }, [exploredSet]);
  
  // Clear animation history when maze changes
  useEffect(() => {
    if (!maze) return;
    // Reset birth tracking when cells array changes
    if (lastCellsArrayRef.current !== maze.cells) {
      birthMapRef.current.clear();
      pathAnimProgressRef.current = 0;
      lastCellsArrayRef.current = maze.cells;
      // Recompute cells signature
      cellsSignatureRef.current = maze.cells.join('');
    }
  }, [maze]);

  // Bresenham interpolation to avoid gaps when dragging fast
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

  // Main high-performance render function
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

    // Dark/Light aware background
    const isDark = document.documentElement.classList.contains("dark");
    ctx.fillStyle = isDark ? "#0A0D14" : "#FAFAF7";
    ctx.fillRect(0, 0, width, height);

    const cellW = width / maze.cols;
    const cellH = height / maze.rows;
    const now = performance.now();

    // 1. Static Layer: Walls, Sand, Water, Floor (Cached to Offscreen Canvas for maximum FPS)
    // Use complete cells signature to detect any layout changes
    const currentKey = `${maze.rows}x${maze.cols}_${Math.round(width)}x${Math.round(height)}_${dpr}_${isDark ? 1 : 0}_${cellsSignatureRef.current}`;
    if (!staticCanvasRef.current || staticKeyRef.current !== currentKey) {
      if (!staticCanvasRef.current) {
        staticCanvasRef.current = document.createElement("canvas");
      }
      staticCanvasRef.current.width = width * dpr;
      staticCanvasRef.current.height = height * dpr;
      const sCtx = staticCanvasRef.current.getContext("2d");
      if (sCtx) {
        sCtx.scale(dpr, dpr);
        for (let r = 0; r < maze.rows; r++) {
          for (let c = 0; c < maze.cols; c++) {
            const code = maze.cells[r * maze.cols + c];
            const x = c * cellW;
            const y = r * cellH;

            if (code === 1) {
              // Wall: rounded block with 2px inset
              sCtx.fillStyle = isDark ? "#232A3A" : "#CBD0DA";
              const inset = Math.max(1, Math.min(cellW, cellH) * 0.08);
              sCtx.beginPath();
              sCtx.roundRect(x + inset, y + inset, cellW - inset * 2, cellH - inset * 2, 4);
              sCtx.fill();
            } else if (code === 2) {
              // Sand (slow, cost 3): warm stipple pattern
              sCtx.fillStyle = isDark ? "#282218" : "#F4EBD9";
              sCtx.fillRect(x, y, cellW, cellH);
              sCtx.fillStyle = isDark ? "#D97706" : "#B45309";
              const dotR = Math.max(1, Math.min(cellW, cellH) * 0.12);
              sCtx.beginPath();
              sCtx.arc(x + cellW * 0.35, y + cellH * 0.35, dotR, 0, Math.PI * 2);
              sCtx.arc(x + cellW * 0.65, y + cellH * 0.65, dotR, 0, Math.PI * 2);
              sCtx.fill();
            } else if (code === 3) {
              // Water (slower, cost 5): blue wave lines
              sCtx.fillStyle = isDark ? "#122538" : "#E0F2FE";
              sCtx.fillRect(x, y, cellW, cellH);
              sCtx.strokeStyle = isDark ? "#38BDF8" : "#0284C7";
              sCtx.lineWidth = 1.5;
              sCtx.beginPath();
              sCtx.moveTo(x + cellW * 0.2, y + cellH * 0.5);
              sCtx.lineTo(x + cellW * 0.8, y + cellH * 0.5);
              sCtx.stroke();
            }
          }
        }
      }
      staticKeyRef.current = currentKey;
    }

    if (staticCanvasRef.current) {
      ctx.drawImage(staticCanvasRef.current, 0, 0, width, height);
    }

    // 2. Heuristic Map Gradient Overlay (if active)
    if (heuristicMap && heuristicMap.length > 0) {
      let maxH = 1;
      for (const v of heuristicMap) {
        if (v !== null && v !== undefined && v > maxH) maxH = v;
      }
      for (let r = 0; r < maze.rows; r++) {
        for (let c = 0; c < maze.cols; c++) {
          const idx = r * maze.cols + c;
          const hVal = heuristicMap[idx];
          if (hVal !== null && hVal !== undefined && maze.cells[idx] !== 1) {
            const ratio = 1 - Math.min(1, hVal / maxH);
            const x = c * cellW;
            const y = r * cellH;
            ctx.fillStyle = `rgba(45, 212, 191, ${0.08 + ratio * 0.35})`;
            ctx.fillRect(x, y, cellW, cellH);
          }
        }
      }
    }

    // 3. Heatmap overlay (if ML active)
    if (heatmap && heatmap.length > 0) {
      let maxH = 0;
      for (const item of heatmap) if (item.h > maxH) maxH = item.h;
      for (const item of heatmap) {
        const x = item.c * cellW;
        const y = item.r * cellH;
        const ratio = maxH > 0 ? item.h / maxH : 0;
        ctx.fillStyle = `rgba(45, 212, 191, ${Math.min(0.55, ratio * 0.75)})`;
        ctx.fillRect(x, y, cellW, cellH);
      }
    }

    // 4. Checked Cells (Explored): Single Algorithm Hue at ~22% alpha with cell fade-in
    // For BDS: use different colors for forward/backward waves
    if (exploredSet && exploredSet.size > 0) {
      for (const key of exploredSet) {
        const [r, c] = key.split(",").map(Number);
        const x = c * cellW;
        const y = r * cellH;
        const birth = birthMapRef.current.get(key) || now;
        const age = now - birth;
        const fadeProgress = Math.min(1, age / 220); // 220 ms fade in

        // Check if this cell is from backward wave (BDS)
        const cellInfo = cellInfoMap?.get(key);
        const side = cellInfo?.side;
        
        // Recency heat (comet tail for newest cells)
        const isRecent = age < 300;
        const alpha = isRecent ? 0.35 : 0.22 * fadeProgress;

        // Use complementary color for backward wave
        let fillColor = algorithmColor;
        if (side === "backward") {
          // For BDS backward wave, use orange/amber instead of the algorithm color
          fillColor = "#FB923C"; // Tailwind orange-400
        }

        ctx.fillStyle = fillColor;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        const inset = 1;
        ctx.roundRect(x + inset, y + inset, cellW - inset * 2, cellH - inset * 2, 3);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
    }

    // 5. Waiting Cells (Frontier): 2px Ring Only, Algorithm Hue, NO Fill
    // For BDS: use different colors for forward/backward wave frontiers
    if (frontierSet && frontierSet.size > 0) {
      ctx.lineWidth = 1.75;
      for (const key of frontierSet) {
        const [r, c] = key.split(",").map(Number);
        const x = c * cellW;
        const y = r * cellH;
        const inset = 2;
        
        // Check if this frontier cell is from backward wave
        const cellInfo = cellInfoMap?.get(key);
        const side = cellInfo?.side;
        
        if (side === "backward") {
          ctx.strokeStyle = "#FB923C"; // Orange-400 for backward wave
        } else {
          ctx.strokeStyle = algorithmColor;
        }
        
        ctx.strokeRect(x + inset, y + inset, cellW - inset * 2, cellH - inset * 2);
      }
    }

    // 6. Looking at now (Current Node): Solid Dot + Pulsing Halo
    if (currentNode) {
      const [cr, cc] = currentNode;
      const cx = cc * cellW + cellW / 2;
      const cy = cr * cellH + cellH / 2;
      const radius = Math.min(cellW, cellH) * 0.35;
      const pulse = 1 + 0.2 * Math.sin(now / 150);

      // Halo
      ctx.fillStyle = algorithmColor;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.5 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Solid center
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. Numbers on Cells Overlay (Order, g, h, f)
    if (overlayMode && overlayMode !== "off" && cellInfoMap && cellInfoMap.size > 0) {
      const minDimension = Math.min(cellW, cellH);
      if (minDimension >= 10) {
        ctx.font = `600 ${Math.max(8, Math.floor(minDimension * 0.42))}px "Inter Variable", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        for (const [key, info] of cellInfoMap.entries()) {
          const [r, c] = key.split(",").map(Number);
          const cx = c * cellW + cellW / 2;
          const cy = r * cellH + cellH / 2;

          let valStr = "";
          if (overlayMode === "order") {
            valStr = String(info.order);
          } else if (overlayMode === "g") {
            valStr = String(Math.round(info.g * 10) / 10);
          } else if (overlayMode === "h") {
            valStr = info.h !== null ? String(Math.round(info.h * 10) / 10) : "";
          } else if (overlayMode === "f") {
            const fVal = info.h !== null ? info.g + info.h : info.g;
            valStr = String(Math.round(fVal * 10) / 10);
          }

          if (valStr) {
            ctx.fillStyle = isDark ? "#0A0D14" : "#FFFFFF";
            ctx.shadowColor = isDark ? "#000000" : "#FFFFFF";
            ctx.shadowBlur = 3;
            ctx.fillText(valStr, cx, cy);
            ctx.shadowBlur = 0;
            ctx.fillStyle = isDark ? "#F2F4F8" : "#14161B";
            ctx.fillText(valStr, cx, cy);
          }
        }
      }
    }

    // 8. Subtle Grid Lines (6% opacity)
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)";
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

    // 9. Final Shortest Route Found: White Core + Algorithm Hue Outline
    if (path && path.length > 0) {
      pathAnimProgressRef.current = Math.min(1, pathAnimProgressRef.current + 0.04);
      const visibleCount = Math.max(1, Math.floor(path.length * pathAnimProgressRef.current));

      // Outline
      ctx.strokeStyle = algorithmColor;
      ctx.lineWidth = Math.max(3, Math.min(cellW, cellH) * 0.45);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (let i = 0; i < visibleCount; i++) {
        const [pr, pc] = path[i];
        const cx = pc * cellW + cellW / 2;
        const cy = pr * cellH + cellH / 2;
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();

      // Inner white line
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = Math.max(1.5, Math.min(cellW, cellH) * 0.25);
      ctx.beginPath();
      for (let i = 0; i < visibleCount; i++) {
        const [pr, pc] = path[i];
        const cx = pc * cellW + cellW / 2;
        const cy = pr * cellH + cellH / 2;
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    } else {
      pathAnimProgressRef.current = 0;
    }

    // 10. Start (Green Circle Flag) & Goal (Coral Bullseye Target)
    const [sr, sc] = maze.start;
    const [gr, gc] = maze.goal;
    const markerRadius = Math.min(cellW, cellH) * 0.38;

    // Start
    const sx = sc * cellW + cellW / 2;
    const sy = sr * cellH + cellH / 2;
    ctx.fillStyle = "#16A34A";
    ctx.beginPath();
    ctx.arc(sx, sy, markerRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(sx - markerRadius * 0.35, sy - markerRadius * 0.5, 2, markerRadius);
    ctx.beginPath();
    ctx.moveTo(sx - markerRadius * 0.35 + 2, sy - markerRadius * 0.5);
    ctx.lineTo(sx + markerRadius * 0.4, sy - markerRadius * 0.2);
    ctx.lineTo(sx - markerRadius * 0.35 + 2, sy + markerRadius * 0.1);
    ctx.closePath();
    ctx.fill();

    // Goal
    const gx = gc * cellW + cellW / 2;
    const gy = gr * cellH + cellH / 2;
    const goalPulse = 1 + 0.08 * Math.sin(now / 350);

    ctx.strokeStyle = "#DC2626";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(gx, gy, markerRadius * goalPulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#DC2626";
    ctx.beginPath();
    ctx.arc(gx, gy, markerRadius * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // 11. Hover Cell Highlight Ring
    if (hoverCell) {
      const [hr, hc] = hoverCell;
      if (hr >= 0 && hr < maze.rows && hc >= 0 && hc < maze.cols) {
        // Resolve CSS variable to actual color
        const brandColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--brand').trim() || "#2DD4BF";
        ctx.strokeStyle = brandColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(hc * cellW + 1, hr * cellH + 1, cellW - 2, cellH - 2);
      }
    }

    ctx.restore();
  }, [
    maze,
    algorithmColor,
    exploredSet,
    frontierSet,
    cellInfoMap,
    overlayMode,
    currentNode,
    path,
    heatmap,
    heuristicMap,
    hoverCell,
  ]);

  // Unified RequestAnimationFrame render loop
  useEffect(() => {
    let animId: number;
    const loop = () => {
      render();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [render]);

  // Pointer event handlers with Bresenham dragging & hover tracking
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
    const cell = getCellFromEvent(e);
    if (onHoverCell) {
      if (cell) {
        onHoverCell({ r: cell[0], c: cell[1], x: e.clientX, y: e.clientY });
      } else {
        onHoverCell(null);
      }
    }

    if (!interactive || !isPointerDownRef.current) return;
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

  const handlePointerLeave = () => {
    if (onHoverCell) onHoverCell(null);
  };

  return {
    canvasRef,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerLeave: handlePointerLeave,
    },
  };
}
