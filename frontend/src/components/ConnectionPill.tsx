import React from "react";
import { useHealth } from "@/hooks/useHealth";

export const ConnectionPill: React.FC = () => {
  const { data, isError, isLoading } = useHealth();

  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-surface-2 text-text-muted border border-border">
        <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
        Connecting...
      </div>
    );
  }

  if (isError || !data || data.status !== "ok") {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-red-950/40 text-danger border border-danger/30">
        <span className="w-2 h-2 rounded-full bg-danger" />
        Disconnected
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-emerald-950/40 text-success border border-success/30">
      <span className="w-2 h-2 rounded-full bg-success" />
      Connected (v{data.version})
    </div>
  );
};

