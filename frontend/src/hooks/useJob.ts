import { useQuery } from "@tanstack/react-query";
import { request } from "@/lib/api";
import type { JobStatus } from "@/lib/types";

export function useJob(jobId: string | null) {
  const query = useQuery<JobStatus>({
    queryKey: ["job", jobId],
    queryFn: () => request<JobStatus>(`/api/jobs/${jobId}`),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "done" || status === "error" || status === "cancelled") {
        return false;
      }
      // Poll every 300ms during active benchmark for smoother progress
      return 300;
    },
  });

  const cancel = async () => {
    if (!jobId) return;
    await request<JobStatus>(`/api/jobs/${jobId}/cancel`, { method: "POST" });
  };

  return {
    ...query,
    job: query.data,
    status: query.data?.status,
    progress: query.data?.progress,
    result: query.data?.result,
    cancel,
  };
}

