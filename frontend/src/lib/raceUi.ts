export type SocketStatus = "offline" | "connecting" | "open";
export type RaceState = "idle" | "ready" | "running" | "paused" | "finished" | "disconnected";
export type UiState = "offline" | "connecting" | "ready" | "countdown" | "running" | "paused" | "finished" | "error";

export function deriveUiState(input: {
  socketStatus: SocketStatus;
  raceState: RaceState;
  error?: string | null;
  countdown?: number | null;
}): UiState {
  if (input.error) return "error";
  if (input.socketStatus === "offline" || input.raceState === "disconnected") return "offline";
  if (input.socketStatus === "connecting") return "connecting";
  if (input.countdown != null) return "countdown";
  if (input.raceState === "running") return "running";
  if (input.raceState === "paused") return "paused";
  if (input.raceState === "finished") return "finished";
  return "ready";
}

export function phaseLabel(phase?: string | null): string {
  switch (phase) {
    case "searching": return "Searching";
    case "done": return "Route found";
    case "no_route": return "No route";
    default: return "Waiting to start";
  }
}
