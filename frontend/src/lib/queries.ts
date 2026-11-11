import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "@/lib/api";
import type { Maze } from "@/lib/types";

export interface MetaData {
  algorithms: {
    id: string;
    name: string;
    description: string;
    plain: string;
    pros: string[];
    cons: string[];
    time_complexity: string;
    space_complexity: string;
    optimal: boolean;
    complete: boolean;
    color: string;
    color_key: string;
    shape: string;
  }[];
  heuristics: {
    key: string;
    label: string;
    description: string;
    admissible: boolean;
    requires_diagonal: boolean;
  }[];
  generators: string[];
  presets: {
    key: string;
    name: string;
    description: string;
    rows: number;
    cols: number;
    diagonal: boolean;
    difficulty: string;
  }[];
  glossary: {
    term: string;
    plain: string;
    technical: string;
  }[];
  defaults: Record<string, any>;
}

export function useMetaQuery() {
  return useQuery<MetaData>({
    queryKey: ["meta"],
    queryFn: () => request<MetaData>("/api/meta"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSettingsQuery() {
  return useQuery<Record<string, any>>({
    queryKey: ["settings"],
    queryFn: () => request<Record<string, any>>("/api/settings"),
    staleTime: 60 * 1000,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newSettings: Record<string, any>) =>
      request("/api/settings", {
        method: "PUT",
        body: JSON.stringify(newSettings),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

export interface SavedMazeItem {
  id: number;
  name: string;
  rows: number;
  cols: number;
  diagonal: boolean;
  tags?: string;
  created_at?: string;
  maze_data?: Maze;
}

export function useLibraryQuery() {
  return useQuery<{ mazes: SavedMazeItem[] }>({
    queryKey: ["library"],
    queryFn: () => request<{ mazes: SavedMazeItem[] }>("/api/library/mazes"),
    staleTime: 30 * 1000,
  });
}

export interface RaceHistoryItem {
  id: number;
  created_at: string;
  winner_algorithm: string;
  participants_count: number;
  maze_rows: number;
  maze_cols: number;
  winner_expanded: number;
  winner_path_len: number;
}

export function useHistoryQuery() {
  return useQuery<{ races: RaceHistoryItem[] }>({
    queryKey: ["history"],
    queryFn: () => request<{ races: RaceHistoryItem[] }>("/api/history/races"),
    staleTime: 15 * 1000,
  });
}

export function useBenchmarkRunsQuery() {
  return useQuery<{ runs: any[] }>({
    queryKey: ["benchmark-runs"],
    queryFn: () => request<{ runs: any[] }>("/api/benchmark/runs"),
    staleTime: 15 * 1000,
  });
}

