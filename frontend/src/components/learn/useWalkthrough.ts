import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/lib/api";
import type { CellInfo } from "@/hooks/useRace";
import type { OverlayMode } from "@/hooks/useMazeCanvas";

export interface WalkthroughFrame {
  i: number;
  expanded: number[];
  current: number | null;
  side: "forward" | "backward" | null;
  discovered: [number, number, number | null, number | null, string | null][];
  queues: {
    main?: Array<{ idx: number; g: number; h: number | null; f: number | null }>;
    forward?: Array<{ idx: number; g: number; h: number | null; f: number | null }>;
    backward?: Array<{ idx: number; g: number; h: number | null; f: number | null }>;
  };
  queue_size: {
    main?: number;
    forward?: number;
    backward?: number;
  };
  note: string;
}

export interface Walkthrough {
  scenario: {
    key: string;
    title: string;
    rows: number;
    cols: number;
    cells: number[];
    start: [number, number];
    goal: [number, number];
  };
  algorithm: string;
  heuristic: string | null;
  found: boolean;
  route: [number, number][] | null;
  route_steps: number | null;
  route_cost: number | null;
  c_star: number | null;
  checked: number;
  frames: WalkthroughFrame[];
}

export interface ScenarioMeta {
  key: string;
  title: string;
  blurb: string;
}

export function foldFrames(data: Walkthrough, upTo: number) {
  const cols = data.scenario.cols;
  const key = (i: number) => `${Math.floor(i / cols)},${i % cols}`;
  const explored = new Set<string>();
  const frontier = new Set<string>();
  const info = new Map<string, CellInfo>();
  let order = 0;

  for (let n = 0; n <= upTo && n < data.frames.length; n++) {
    const f = data.frames[n];
    for (const [idx, g, h, fv, side] of f.discovered) {
      const k = key(idx);
      if (!explored.has(k)) frontier.add(k);
      info.set(k, {
        g,
        h,
        order: null as any,
        side: (side as any) || null,
        f: fv,
      } as any);
    }
    for (const idx of f.expanded) {
      const k = key(idx);
      frontier.delete(k);
      explored.add(k);
      const c = info.get(k);
      if (c) c.order = ++order;
    }
  }

  return { explored, frontier, info };
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export function useWalkthrough(algorithm: string, initialScenario = "open") {
  const [scenario, setScenario] = useState<string>(initialScenario);
  const [frameIdx, setFrameIdx] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [overlayMode, setOverlayMode] = useState<OverlayMode>("off");

  // Fetch scenarios list
  const { data: scenarios = [] } = useQuery<ScenarioMeta[]>({
    queryKey: ["walkthrough-scenarios"],
    queryFn: () => request<ScenarioMeta[]>("/api/learn/scenarios"),
    staleTime: Infinity,
  });

  // Fetch walkthrough data
  const { data, isLoading, isError } = useQuery<Walkthrough>({
    queryKey: ["walkthrough", algorithm, scenario],
    queryFn: () =>
      request<Walkthrough>(`/api/learn/walkthrough?algorithm=${algorithm}&scenario=${scenario}`),
    staleTime: Infinity,
  });

  // Reset to step 0 and pause when scenario or algorithm changes
  useEffect(() => {
    setFrameIdx(0);
    setPlaying(false);
  }, [algorithm, scenario]);

  const total = data ? Math.max(0, data.frames.length - 1) : 0;
  const base = clamp(total > 0 ? 22000 / total : 300, 60, 450);
  const interval = Math.max(30, base / speed);

  // Playback timer
  useEffect(() => {
    if (!playing) return;
    if (frameIdx >= total) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => {
      setFrameIdx((i) => Math.min(total, i + 1));
    }, interval);
    return () => clearTimeout(t);
  }, [playing, frameIdx, interval, total]);

  // Controls
  const handlePlayPause = useCallback(() => {
    if (frameIdx >= total) {
      // Replay
      setFrameIdx(0);
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
  }, [frameIdx, total]);

  const handlePrev = useCallback(() => {
    setPlaying(false);
    setFrameIdx((i) => Math.max(0, i - 1));
  }, []);

  const handleNext = useCallback(() => {
    setPlaying(false);
    setFrameIdx((i) => Math.min(total, i + 1));
  }, [total]);

  const handleReset = useCallback(() => {
    setPlaying(false);
    setFrameIdx(0);
  }, []);

  const handleJumpToEnd = useCallback(() => {
    setPlaying(false);
    setFrameIdx(total);
  }, [total]);

  // Folded frame state
  const folded = useMemo(() => {
    if (!data) return { explored: new Set<string>(), frontier: new Set<string>(), info: new Map<string, CellInfo>() };
    return foldFrames(data, frameIdx);
  }, [data, frameIdx]);

  return {
    scenario,
    setScenario,
    scenarios,
    data,
    isLoading,
    isError,
    frameIdx,
    setFrameIdx,
    total,
    playing,
    speed,
    setSpeed,
    overlayMode,
    setOverlayMode,
    folded,
    handlePlayPause,
    handlePrev,
    handleNext,
    handleReset,
    handleJumpToEnd,
  };
}
