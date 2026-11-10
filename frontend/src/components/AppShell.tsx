import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Route as RouteIcon, Play, BarChart2, Cpu, HelpCircle } from "lucide-react";
import { ConnectionPill } from "@/components/ConnectionPill";
import { useHealth } from "@/hooks/useHealth";

const NAV_ITEMS = [
  { path: "/visualizer", label: "Visualizer", icon: Play },
  { path: "/benchmark", label: "Benchmark", icon: BarChart2 },
  { path: "/lab", label: "ML Lab", icon: Cpu },
  { path: "/about", label: "About", icon: HelpCircle },
];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { isError, data } = useHealth();
  const isDisconnected = isError || !data || data.status !== "ok";

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col font-sans">
      {/* Top Disconnected Alert Banner */}
      {isDisconnected && (
        <div className="bg-red-950/80 border-b border-danger/30 text-danger text-xs px-4 py-2 flex items-center justify-between">
          <span>Backend not reachable. Start the server with <code className="bg-surface px-1.5 py-0.5 rounded text-text font-mono">python run.py</code> to run searches and benchmarks.</span>
          <span className="font-semibold cursor-pointer underline hover:opacity-80" onClick={() => window.location.reload()}>Retry</span>
        </div>
      )}

      {/* Header bar */}
      <header className="h-14 border-b border-border bg-surface px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <RouteIcon className="w-5 h-5 text-accent" />
            <span className="font-bold text-base tracking-tight">PathFinder</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-surface-2 text-accent"
                      : "text-text-muted hover:text-text hover:bg-surface-2/50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <ConnectionPill />
        </div>
      </header>

      {/* Main workspace */}
      <main className="flex-1 flex flex-col">{children}</main>

      {/* Footer */}
      <footer className="h-10 border-t border-border bg-surface px-6 flex items-center justify-between text-xs text-text-muted">
        <div>PathFinder — AI Search Algorithm Visualizer &amp; Benchmark</div>
        <div className="font-mono">v1.0.0 (Local Backend)</div>
      </footer>
    </div>
  );
};

