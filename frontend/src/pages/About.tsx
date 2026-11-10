import React from "react";

export const AboutPage: React.FC = () => {
  return (
    <div className="flex-1 p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">About PathFinder</h1>
      <p className="text-sm text-text-muted mb-4 leading-relaxed">
        PathFinder is an interactive AI search algorithm visualizer, benchmark harness, and ML testbed designed to demonstrate the fundamental principles of classical heuristic search and machine learning integration.
      </p>
      <div className="p-4 rounded-lg bg-surface border border-border text-xs text-text-muted space-y-2">
        <div><strong>Frontend:</strong> React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand, Motion</div>
        <div><strong>Backend:</strong> FastAPI, Uvicorn, NumPy, Scikit-learn, WebSockets</div>
        <div><strong>Execution:</strong> Zero external databases, fully local in-memory jobs and WebSocket race sessions.</div>
      </div>
    </div>
  );
};

