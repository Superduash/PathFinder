/**
 * Auto-generated OpenAPI TypeScript definitions.
 * Generated from FastAPI backend app.openapi()
 */

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
  plain?: string | any;
  shape?: string | any;
  color_key?: string | any;
}

export interface BenchmarkConfig {
  sizes: SizeSpec[];
  densities?: number[];
  types?: string[];
  mazes_per_config?: number;
  participants?: Record<string, any>[];
  repeats?: number;
  base_seed?: number;
  ensure_solvable?: boolean;
  expansion_budget?: number | any;
  diagonal?: boolean;
}

export interface ClassificationConfig {
  name?: string;
  n_mazes?: number;
  test_size?: number;
  seed?: number;
  criterion?: string;
  tolerance?: number;
}

export interface CompareEntry {
  algorithm: string;
  heuristic?: string | any;
  status: "found" | "failed";
  path_length?: number | any;
  path_cost?: number | any;
  optimality?: number | any;
  expanded_count?: number;
  timing: TimingStats;
  compute_ms?: number | any;
}

export interface CompareRequest {
  maze: Maze;
  participants: Record<string, any>[];
  repeats?: number;
}

export interface CompareResult {
  results: CompareEntry[];
  environment: EnvironmentMeta;
}

export interface EnvironmentMeta {
  platform: string;
  python_version: string;
  cpu_count?: number | any;
  repeats: number;
}

export interface EstimateResponse {
  mazes_total: number;
  runs_total: number;
  est_seconds_low: number;
  est_seconds_high: number;
  too_large: boolean;
}

export interface GenerateMazeRequest {
  rows?: number;
  cols?: number;
  type?: "empty" | "random" | "backtracker" | "braided" | "weighted";
  density?: number;
  weighted?: boolean;
  weight_fraction?: number;
  diagonal?: boolean;
  seed?: number | any;
  randomize_endpoints?: boolean;
}

export interface HTTPValidationError {
  detail?: ValidationError[];
}

export interface HealthResponse {
  status?: string;
  version?: string;
  python?: string;
  db?: "ok" | "error";
  uptime_s?: number;
  algorithms?: string[];
}

export interface JobProgress {
  done?: number;
  total?: number;
  label?: string;
}

export interface JobStatus {
  jobId: string;
  kind: string;
  status: "queued" | "running" | "done" | "error" | "cancelled";
  progress?: JobProgress;
  result?: any | any;
  error?: any | any;
}

export interface Maze {
  rows: number;
  cols: number;
  cells: number[];
  start: number[];
  goal: number[];
  diagonal?: boolean;
  seed?: number | any;
  meta?: MazeMeta;
}

export interface MazeMeta {
  generator?: string;
  seed?: number | any;
  preset?: string | any;
}

export interface MetaResponse {
  algorithms: AlgorithmMeta[];
  heuristics: any[];
  generators: any[];
  presets: any[];
  cell_types: Record<string, any>;
  limits: Record<string, any>;
  defaults: Record<string, any>;
  glossary?: Record<string, any>[];
  speed_levels?: Record<string, any>[];
}

export interface PresetMazeRequest {
  name: string;
  diagonal?: boolean;
}

export interface RandomizeEndpointsRequest {
  maze: Maze;
}

export interface RegressionConfig {
  name?: string;
  n_mazes?: number;
  samples_per_maze?: number;
  test_size?: number;
  seed?: number;
}

export interface SaveMazeRequest {
  name: string;
  maze: Maze;
  tags?: string | any;
}

export interface SearchResult {
  algorithm: string;
  heuristic?: string | any;
  status: "found" | "failed";
  reason?: string | any;
  path?: number[][] | any;
  path_length?: number | any;
  path_cost?: number | any;
  optimality?: number | any;
  expanded_count?: number;
  frontier_count?: number;
  peak_frontier?: number;
  peak_open_entries?: number;
  trace?: number[][] | any;
}

export interface SizeSpec {
  rows: number;
  cols: number;
}

export interface SolveRequest {
  maze: Maze;
  algorithm: string;
  heuristic?: string | any;
  include_trace?: boolean;
}

export interface TimingStats {
  median_ms: number;
  mean_ms: number;
  std_ms: number;
  min_ms: number;
  max_ms: number;
}

export interface UpdateMazeRequest {
  name?: string | any;
  tags?: string | any;
}

export interface ValidateMazeRequest {
  maze: Maze;
}

export interface ValidationError {
  loc: string | number[];
  msg: string;
  type: string;
  input?: any;
  ctx?: Record<string, any>;
}
