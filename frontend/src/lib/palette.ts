/**
 * PathFinder color palette helper (fixes B1).
 * HTML/canvas cannot resolve `var(...)` strings in CanvasRenderingContext2D.
 * This file provides concrete hex/rgba strings for all algorithms and terrain.
 */

export interface AlgorithmVisual {
  key: string;
  short: string;
  fullName: string;
  shape: "circle" | "diamond" | "square" | "triangle" | "star" | "hexagon";
  colorDark: string;
  colorLight: string;
  softDark: string;
  softLight: string;
}

export const ALGORITHM_VISUALS: Record<string, AlgorithmVisual> = {
  bfs: {
    key: "bfs",
    short: "BFS",
    fullName: "Breadth-First Search",
    shape: "circle",
    colorDark: "#38BDF8",
    colorLight: "#0284C7",
    softDark: "rgba(56, 189, 248, 0.22)",
    softLight: "rgba(2, 132, 199, 0.15)",
  },
  dfs: {
    key: "dfs",
    short: "DFS",
    fullName: "Depth-First Search",
    shape: "diamond",
    colorDark: "#FB923C",
    colorLight: "#EA580C",
    softDark: "rgba(251, 146, 60, 0.22)",
    softLight: "rgba(234, 88, 12, 0.15)",
  },
  ucs: {
    key: "ucs",
    short: "UCS",
    fullName: "Uniform-Cost Search",
    shape: "square",
    colorDark: "#A78BFA",
    colorLight: "#7C3AED",
    softDark: "rgba(167, 139, 250, 0.22)",
    softLight: "rgba(124, 58, 237, 0.15)",
  },
  greedy: {
    key: "greedy",
    short: "Greedy",
    fullName: "Greedy Best-First",
    shape: "triangle",
    colorDark: "#F472B6",
    colorLight: "#DB2777",
    softDark: "rgba(244, 114, 182, 0.22)",
    softLight: "rgba(219, 39, 119, 0.15)",
  },
  astar: {
    key: "astar",
    short: "A*",
    fullName: "A* Search",
    shape: "star",
    colorDark: "#34D399",
    colorLight: "#059669",
    softDark: "rgba(52, 211, 153, 0.22)",
    softLight: "rgba(5, 150, 105, 0.15)",
  },
  bds: {
    key: "bds",
    short: "BDS",
    fullName: "Bidirectional Search",
    shape: "hexagon",
    colorDark: "#FACC15",
    colorLight: "#CA8A04",
    softDark: "rgba(250, 204, 21, 0.22)",
    softLight: "rgba(202, 138, 4, 0.15)",
  },
};

export const TERRAIN_PALETTE = {
  floor: { dark: "#171C28", light: "#FFFFFF", cost: 1, name: "Floor" },
  sand: { dark: "#78350F", light: "#FEF3C7", cost: 3, name: "Sand" },
  water: { dark: "#1E3A8A", light: "#DBEAFE", cost: 5, name: "Water" },
  wall: { dark: "#0A0D14", light: "#E2E8F0", cost: Infinity, name: "Wall" },
  start: { dark: "#22C55E", light: "#16A34A", name: "Start" },
  goal: { dark: "#EF4444", light: "#DC2626", name: "Goal" },
};

export function getAlgorithmColor(key: string, isDark: boolean = true): string {
  const meta = ALGORITHM_VISUALS[key.toLowerCase()];
  if (!meta) return isDark ? "#38BDF8" : "#0284C7";
  return isDark ? meta.colorDark : meta.colorLight;
}

export function getAlgorithmSoftColor(key: string, isDark: boolean = true): string {
  const meta = ALGORITHM_VISUALS[key.toLowerCase()];
  if (!meta) return isDark ? "rgba(56, 189, 248, 0.22)" : "rgba(2, 132, 199, 0.15)";
  return isDark ? meta.softDark : meta.softLight;
}

export function readPalette(isDark: boolean = true) {
  return {
    isDark,
    background: isDark ? "#0A0D14" : "#FAFAF7",
    surface: isDark ? "#11151F" : "#FFFFFF",
    surface2: isDark ? "#171C28" : "#F3F2EE",
    border: isDark ? "#232A3A" : "#E7E5DF",
    text: isDark ? "#F2F4F8" : "#14161B",
    muted: isDark ? "#8B94A7" : "#5F6675",
    brand: isDark ? "#2DD4BF" : "#0D9488",
    algorithms: Object.fromEntries(
      Object.entries(ALGORITHM_VISUALS).map(([k, v]) => [
        k,
        {
          color: isDark ? v.colorDark : v.colorLight,
          soft: isDark ? v.softDark : v.softLight,
          shape: v.shape,
          fullName: v.fullName,
          short: v.short,
        },
      ])
    ),
    terrain: TERRAIN_PALETTE,
  };
}
