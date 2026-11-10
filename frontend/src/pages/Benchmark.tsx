import React from "react";

export const BenchmarkPage: React.FC = () => {
  return (
    <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
      <div className="max-w-md p-6 bg-surface border border-border rounded-lg">
        <h2 className="text-xl font-bold mb-2">Benchmark Engine</h2>
        <p className="text-text-muted text-sm mb-4">
          Multi-algorithm statistical benchmarking connected to the in-memory background job manager.
        </p>
      </div>
    </div>
  );
};

