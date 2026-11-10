import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter } from "react-router-dom";
import { Route as RouteIcon } from "lucide-react";
import { ConnectionPill } from "./components/ConnectionPill";
import "./styles/globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <div className="min-h-screen bg-bg text-text flex flex-col">
          {/* Header */}
          <header className="h-14 border-b border-border bg-surface px-6 flex items-center justify-between sticky top-0 z-50">
            <div className="flex items-center gap-3">
              <RouteIcon className="w-6 h-6 text-accent" />
              <span className="font-semibold text-lg tracking-tight">PathFinder</span>
              <span className="text-xs px-2 py-0.5 rounded bg-surface-2 text-text-muted border border-border">
                AI Visualizer
              </span>
            </div>

            <div className="flex items-center gap-4">
              <ConnectionPill />
            </div>
          </header>

          {/* Main content placeholder */}
          <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="max-w-md p-6 bg-surface border border-border rounded-lg shadow-sm">
              <h1 className="text-xl font-bold mb-2">PathFinder — AI Search Algorithm Visualizer</h1>
              <p className="text-text-muted text-sm mb-4">
                Phases 1 &amp; 2 implementation complete. Backend REST core is live and passing property tests.
              </p>
              <div className="flex justify-center">
                <ConnectionPill />
              </div>
            </div>
          </main>
        </div>
      </HashRouter>
    </QueryClientProvider>
  );
}

export default App;
