import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { LandingPage } from "@/pages/Landing";

const VisualizerPage = lazy(() => import("@/pages/Visualizer").then(m => ({ default: m.VisualizerPage })));
const BenchmarkPage = lazy(() => import("@/pages/Benchmark").then(m => ({ default: m.BenchmarkPage })));
const MLLabPage = lazy(() => import("@/pages/MLLab").then(m => ({ default: m.MLLabPage })));
const LearnPage = lazy(() => import("@/pages/Learn").then(m => ({ default: m.LearnPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFound").then(m => ({ default: m.NotFoundPage })));

export function AppRoutes() {
  return (
    <AppShell>
      <Suspense fallback={<div className="flex-1 flex items-center justify-center text-xs text-muted">Loading view...</div>}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/visualizer" element={<VisualizerPage />} />
          <Route path="/benchmark" element={<BenchmarkPage />} />
          <Route path="/lab" element={<MLLabPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/learn/:lesson" element={<LearnPage />} />
          {/* Redirect legacy /about → /learn */}
          <Route path="/about" element={<Navigate to="/learn" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
