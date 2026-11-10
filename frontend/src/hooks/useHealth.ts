import { useQuery } from "@tanstack/react-query";
import { request } from "@/lib/api";
import type { HealthResponse } from "@/lib/types";

export function useHealth() {
  return useQuery<HealthResponse>({
    queryKey: ["health"],
    queryFn: () => request<HealthResponse>("/api/health"),
    refetchInterval: 5000,
    retry: 1,
  });
}
