import React from "react";
import { Link } from "react-router-dom";
import { Route as RouteIcon } from "lucide-react";

export const SiteFooter: React.FC = () => {
  return (
    <footer className="border-t border-border bg-surface mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 text-xs text-muted">
        <div className="flex flex-col gap-2 max-w-sm">
          <div className="flex items-center gap-2 text-text font-bold text-sm">
            <RouteIcon className="w-4 h-4 text-brand" /> PathFinder
          </div>
          <p className="leading-relaxed">
            An open educational platform to study, visualize, and benchmark classical AI search algorithms and learned heuristics.
          </p>
        </div>

        <div className="flex flex-wrap gap-8">
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-text uppercase tracking-wider text-[11px]">Pages</span>
            <Link to="/visualizer" className="hover:text-text transition-colors">Visualizer</Link>
            <Link to="/benchmark" className="hover:text-text transition-colors">Benchmark</Link>
            <Link to="/lab" className="hover:text-text transition-colors">ML Lab</Link>
            <Link to="/about" className="hover:text-text transition-colors">About</Link>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-semibold text-text uppercase tracking-wider text-[11px]">Tech</span>
            <span>React &amp; Vite</span>
            <span>FastAPI &amp; Uvicorn</span>
            <span>Scikit-learn</span>
            <span>WebSockets</span>
          </div>
        </div>

        <div className="text-muted/80 max-w-xs">
          Built as a college mini-project · Designed for clear understanding and fair comparison.
        </div>
      </div>
    </footer>
  );
};
