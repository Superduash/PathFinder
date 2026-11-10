/**
 * Contract types matching plan.md §11 and backend/app/models.py
 */

export type CellCode = 0 | 1 | 2 | 3;

export interface MazeMeta {
  generator?: string;
  seed?: number | null;
  preset?: string | null;
}

export interface Maze {
  rows: int;
  cols: int;
  cells: number[];
  start: [number, number];
  goal: [number, number];
  diagonal: boolean;
  seed?: number | null;
  meta: MazeMeta;
}

export type int = number;

export interface TimingStats {
  median_ms: number;
  mean_ms: number;
  std_ms: number;
  min_ms: number;
  max_ms: number;
}

export interface SearchResult {
  algorithm: string;
  heuristic?: string | null;
  status: "found" | "failed";
  reason?: "no_path" | "budget_exceeded" | string | null;
  path?: [number, number][] | null;
  path_length?: number | null;
  path_cost?: number | null;
  optimality?: number | null;
  expanded_count: number;
  frontier_count: number;
  peak_frontier: number;
  peak_open_entries: number;
  trace?: [number, number][] | null;
}

export interface Participant {
  algorithm: string;
  heuristic?: string | null;
}

export interface CompareRequest {
  maze: Maze;
  participants: Participant[];
  repeats: number;
}

export interface CompareEntry {
  algorithm: string;
  heuristic?: string | null;
  status: "found" | "failed";
  path_length?: number | null;
  path_cost?: number | null;
  optimality?: number | null;
  expanded_count: number;
  timing: TimingStats;
  compute_ms?: number | null;
}

export interface EnvironmentMeta {
  platform: string;
  python_version: string;
  cpu_count?: number | null;
  repeats: number;
}

export interface CompareResult {
  results: CompareEntry[];
  environment: EnvironmentMeta;
}

export interface HealthResponse {
  status: "ok";
  version: string;
  algorithms: string[];
  uptime_s: number;
}

export interface AlgorithmMeta {
  id: string;
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  time_complexity: string;
  space_complexity: string;
  optimal: boolean;
  complete: boolean;
  color: string;
}

export interface MetaResponse {
  algorithms: AlgorithmMeta[];
  heuristics: string[];
  generators: string[];
  presets: string[];
  cell_types: Record<string, { name: string; cost: number | null; color: string }>;
  limits: {
    min_rows: number;
    max_rows: number;
    min_cols: number;
    max_cols: number;
    max_participants: number;
    max_repeats: number;
    max_benchmark_mazes: number;
  };
  defaults: {
    rows: number;
    cols: number;
    generator: string;
    density: number;
    weighted: boolean;
    weight_fraction: number;
    diagonal: boolean;
    repeats: number;
  };
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

