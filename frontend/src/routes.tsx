import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { LandingPage } from "@/pages/Landing";

const VisualizerPage = lazy(() => import("@/pages/Visualizer").then(m => ({ default: m.VisualizerPage })));
const BenchmarkPage = lazy(() => import("@/pages/Benchmark").then(m => ({ default: m.BenchmarkPage })));
const MLLabPage = lazy(() => import("@/pages/MLLab").then(m => ({ default: m.MLLabPage })));
const AboutPage = lazy(() => import("@/pages/About").then(m => ({ default: m.AboutPage })));
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
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

