/**
 * Pacing levels aligned with /api/meta defaults.speeds
 * 0.25× = 1 step per 640ms, ..., Max = 55 steps per 33ms
 */
export interface PacingLevel {
  level: number;
  label: string;
  k: number;
  intervalMs: number;
}

export const PACING_LEVELS: PacingLevel[] = [
  { level: 1, label: "0.25×", k: 1, intervalMs: 640 },
  { level: 2, label: "0.5×", k: 1, intervalMs: 320 },
  { level: 3, label: "1×", k: 1, intervalMs: 160 },
  { level: 4, label: "2×", k: 2, intervalMs: 80 },
  { level: 5, label: "4×", k: 4, intervalMs: 40 },
  { level: 6, label: "Max", k: 55, intervalMs: 33 },
];

export function getPacing(level: number): PacingLevel {
  const clamped = Math.max(1, Math.min(PACING_LEVELS.length, Math.round(level)));
  return PACING_LEVELS[clamped - 1] || PACING_LEVELS[2];
}
