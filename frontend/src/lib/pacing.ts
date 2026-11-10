export interface PacingLevel {
  level: number;
  label: string;
  k: number;
  intervalMs: number;
  description: string;
}

export const PACING_LEVELS: PacingLevel[] = [
  { level: 1, label: "Teaching", k: 1, intervalMs: 420, description: "Teaching (about 2 cells/s)" },
  { level: 2, label: "Slow", k: 1, intervalMs: 220, description: "Slow (about 4.5 cells/s)" },
  { level: 3, label: "Relaxed", k: 1, intervalMs: 120, description: "Relaxed (default, about 8 cells/s)" },
  { level: 4, label: "Normal", k: 2, intervalMs: 100, description: "Normal (about 20 cells/s)" },
  { level: 5, label: "Brisk", k: 3, intervalMs: 80, description: "Brisk (about 37 cells/s)" },
  { level: 6, label: "Fast", k: 5, intervalMs: 60, description: "Fast (about 83 cells/s)" },
  { level: 7, label: "Very Fast", k: 8, intervalMs: 50, description: "Very Fast (about 160 cells/s)" },
  { level: 8, label: "Turbo", k: 13, intervalMs: 40, description: "Turbo (about 325 cells/s)" },
  { level: 9, label: "Blazing", k: 21, intervalMs: 33, description: "Blazing (about 640 cells/s)" },
  { level: 10, label: "Skip Ahead", k: 55, intervalMs: 33, description: "Instant Skip (maximum speed)" },
];

export function getPacing(level: number): PacingLevel {
  const clamped = Math.max(1, Math.min(10, Math.round(level)));
  return PACING_LEVELS[clamped - 1] || PACING_LEVELS[2];
}

