import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Play, Download, Sparkles, ChevronRight, Check } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useJob } from "@/hooks/useJob";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { request } from "@/lib/api";
import { notify } from "@/lib/notify";
import { RacerPicker } from "@/components/shared/RacerPicker";
import { useBenchmarkRunsQuery } from "@/lib/queries";
import type { CompareResult, BenchmarkConfig } from "@/lib/types";

const PRESET_BENCHMARKS = [
  { id: "quick", name: "Quick Test", desc: "2 sizes × 2 mazes each", sizes: [{ rows: 15, cols: 15 }, { rows: 21, cols: 21 }], count: 2, repeats: 1 },
  { id: "standard", name: "Standard", desc: "3 sizes × 4 mazes each", sizes: [{ rows: 15, cols: 15 }, { rows: 25, cols: 25 }, { rows: 35, cols: 35 }], count: 4, repeats: 2 },
  { id: "thorough", name: "Thorough", desc: "4 sizes × 6 mazes each", sizes: [{ rows: 15, cols: 15 }, { rows: 25, cols: 25 }, { rows: 35, cols: 35 }, { rows: 45, cols: 45 }], count: 6, repeats: 3 },
];

export const BenchmarkPage: React.FC = () => {
  const { maze, participants, setParticipants } = useAppStore();
  const [activeTab, setActiveTab] = useState<"current" | "wizard" | "runs">("wizard");
  const { data: pastRunsData, isLoading: isLoadingRuns } = useBenchmarkRunsQuery();

  // Single compare state
  const [repeats, setRepeats] = useState(5);
  const [singleResult, setSingleResult] = useState<CompareResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  // Batch Wizard State
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedPreset, setSelectedPreset] = useState("quick");
  const [batchJobId, setBatchJobId] = useState<string | null>(null);
  const [ensureSolvable, setEnsureSolvable] = useState(true);

  const { status: jobStatus, progress, result: batchResult, cancel } = useJob(batchJobId);

  const handleRunSingle = async () => {
    if (!maze) {
      notify.warning("Please generate a maze in the visualizer first.");
      return;
    }

    setIsComparing(true);
    try {
      const res = await request<CompareResult>("/api/compare", {
        method: "POST",
        body: JSON.stringify({ maze, participants, repeats }),
      });
      setSingleResult(res);
      notify.success("Single comparison complete");
    } catch (err) {
      notify.error(err);
    } finally {
      setIsComparing(false);
    }
  };

  const handleRunBatchWizard = async () => {
    try {
      const preset = PRESET_BENCHMARKS.find((p) => p.id === selectedPreset) || PRESET_BENCHMARKS[0];
      const config: BenchmarkConfig = {
        sizes: preset.sizes,
        densities: [0.2, 0.3],
        types: ["backtracker", "random"],
        mazes_per_config: preset.count,
        participants,
        repeats: preset.repeats,
        base_seed: 42,
        ensure_solvable: ensureSolvable,
        diagonal: false,
      };

      const res = await request<{ jobId: string }>("/api/benchmark/jobs", {
        method: "POST",
        body: JSON.stringify(config),
      });

      setBatchJobId(res.jobId);
      setWizardStep(3);
      notify.info(`Started benchmark job: ${res.jobId}`);
    } catch (err) {
      notify.error(err);
    }
  };

  const handleDownloadCsv = (table: "summary" | "rows") => {
    if (!batchJobId) return;
    window.open(`/api/jobs/${batchJobId}/csv?table=${table}`, "_blank");
  };

  const chartData =
    batchResult?.summary
      ?.filter((s: any) => s.group === "overall")
      .map((s: any) => ({
        name: `${s.algorithm.toUpperCase()}${s.heuristic ? ` (${s.heuristic})` : ""}`,
        expansions: s.mean_expanded,
        timeMs: s.mean_time_ms,
      })) || [];

  return (
    <div className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Benchmark Engine</h1>
          <p className="text-muted text-sm mt-1">
            Run the racers across many mazes to see who is reliably better.
          </p>
        </div>

        <div className="flex bg-surface-2 p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab("wizard")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "wizard"
                ? "bg-brand text-brand-ink shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            Batch Benchmark Wizard
          </button>
          <button
            onClick={() => setActiveTab("current")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "current"
                ? "bg-brand text-brand-ink shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            Current Maze Comparison
          </button>
          <button
            onClick={() => setActiveTab("runs")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "runs"
                ? "bg-brand text-brand-ink shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            Past Runs
          </button>
        </div>
      </div>

      {/* TAB 1: 3-STEP WIZARD */}
      {activeTab === "wizard" && (
        <div className="flex flex-col gap-8">
          {/* 3-Step Wizard Stepper */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { step: 1, title: "1. Choose Mazes", desc: "Select scale & presets" },
              { step: 2, title: "2. Confirm Racers", desc: `${participants.length} algorithms selected` },
              { step: 3, title: "3. Run & Results", desc: "Metrics & charts" },
            ].map((s) => (
              <div
                key={s.step}
                onClick={() => setWizardStep(s.step)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  wizardStep === s.step
                    ? "border-brand bg-brand/10 shadow-sm"
                    : wizardStep > s.step
                    ? "border-border bg-surface-2/60 text-text"
                    : "border-border/60 bg-surface-2/20 text-muted opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-text">{s.title}</span>
                  {wizardStep > s.step && <Check className="w-4 h-4 text-brand" />}
                </div>
                <span className="text-xs text-muted mt-0.5 block">{s.desc}</span>
              </div>
            ))}
          </div>

          {/* Step 1: Preset Selection */}
          {wizardStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Select Benchmark Scale</CardTitle>
                <CardDescription>
                  Pre-configured benchmark templates designed to give clear statistical signals.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PRESET_BENCHMARKS.map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => setSelectedPreset(preset.id)}
                      className={`p-5 rounded-xl border cursor-pointer transition-all ${
                        selectedPreset === preset.id
                          ? "border-brand bg-brand/10 ring-1 ring-brand/40"
                          : "border-border bg-surface-2/60 hover:border-brand/40"
                      }`}
                    >
                      <span className="font-bold text-base text-text block">{preset.name}</span>
                      <span className="text-xs text-muted block mt-1">{preset.desc}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Switch checked={ensureSolvable} onCheckedChange={setEnsureSolvable} />
                    <span className="text-sm font-medium text-text">Ensure all mazes are solvable</span>
                  </div>
                  <Button onClick={() => setWizardStep(2)} className="gap-1.5 font-semibold">
                    Next: Confirm Racers <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Confirm Racers */}
          {wizardStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Select & Configure Benchmark Racers</CardTitle>
                <CardDescription>
                  These algorithms will race identically on every generated benchmark maze.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <RacerPicker
                  selected={participants}
                  onChange={(p) => setParticipants(p)}
                  max={6}
                />

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Button variant="secondary" onClick={() => setWizardStep(1)}>
                    Back
                  </Button>
                  <Button onClick={handleRunBatchWizard} className="gap-2 font-bold">
                    <Sparkles className="w-4 h-4 fill-current" /> Execute Benchmark
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Running Progress & Results */}
          {wizardStep === 3 && (
            <div className="flex flex-col gap-6">
              {jobStatus === "running" && progress && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base text-brand">Running Benchmark Protocol</CardTitle>
                      <Button variant="danger" size="sm" onClick={cancel}>Cancel Run</Button>
                    </div>
                    <CardDescription>{progress.label || "Executing algorithm sweeps..."}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <Progress value={progress.total > 0 ? (progress.done / progress.total) * 100 : 0} />
                    <div className="flex justify-between text-xs text-muted mt-2 font-mono">
                      <span>Completed mazes: {progress.done} / {progress.total}</span>
                      <span>{Math.round(progress.total > 0 ? (progress.done / progress.total) * 100 : 0)}%</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {(jobStatus === "queued" || jobStatus === "running") && !batchResult && (
                <Card>
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center justify-center gap-4 text-center">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-surface-2 border-t-brand rounded-full animate-spin" />
                        <Sparkles className="w-6 h-6 text-brand absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-text">
                          {jobStatus === "queued" ? "Preparing benchmark..." : "Benchmark in progress"}
                        </p>
                        <p className="text-sm text-muted mt-1">
                          Running algorithms across multiple maze configurations
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {jobStatus === "error" && (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center">
                      <p className="text-lg font-bold text-danger">Benchmark Failed</p>
                      <p className="text-sm text-muted mt-2">An error occurred during the benchmark run.</p>
                      <Button onClick={() => setWizardStep(1)} className="mt-4">
                        Start Over
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {jobStatus === "cancelled" && (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center">
                      <p className="text-lg font-bold text-warn">Benchmark Cancelled</p>
                      <p className="text-sm text-muted mt-2">The benchmark run was cancelled by user.</p>
                      <Button onClick={() => setWizardStep(1)} className="mt-4">
                        Start New Benchmark
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {jobStatus === "done" && batchResult?.elapsed_s && (
                <Card>
                  <CardContent className="py-6">
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-center">
                        <span className="text-xs text-muted uppercase tracking-wide block">Benchmark Completed</span>
                        <span className="text-2xl font-bold text-brand mt-1 block">
                          {Math.floor(batchResult.elapsed_s / 60)}m {Math.round(batchResult.elapsed_s % 60)}s
                        </span>
                      </div>
                      <div className="h-12 w-px bg-border" />
                      <div className="text-center">
                        <span className="text-xs text-muted uppercase tracking-wide block">Total Runs</span>
                        <span className="text-2xl font-bold text-text mt-1 block">
                          {batchResult.dataset_size || "—"}
                        </span>
                      </div>
                      <div className="h-12 w-px bg-border" />
                      <div className="text-center">
                        <span className="text-xs text-muted uppercase tracking-wide block">Algorithms Tested</span>
                        <span className="text-2xl font-bold text-text mt-1 block">
                          {participants.length}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {batchResult && (
                <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                  {/* Headline Insights - Generated from actual results */}
                  {(() => {
                    const overallSummary = batchResult.summary?.filter((s: any) => s.group === "overall") || [];
                    if (overallSummary.length === 0) return null;

                    // Find algorithm with fewest expansions
                    const bestExpansion = overallSummary.reduce((prev: any, curr: any) => 
                      curr.mean_expanded < prev.mean_expanded ? curr : prev
                    );

                    // Find optimal algorithms (100% optimality)
                    const optimalAlgs = overallSummary
                      .filter((s: any) => s.mean_optimality && s.mean_optimality >= 0.999)
                      .map((s: any) => `${s.algorithm.toUpperCase()}${s.heuristic ? ` (${s.heuristic})` : ""}`)
                      .join(", ");

                    // Find fastest algorithm
                    const fastestAlg = overallSummary.reduce((prev: any, curr: any) => 
                      curr.mean_time_ms < prev.mean_time_ms ? curr : prev
                    );

                    // Count how many are within noise
                    const withinNoiseCount = overallSummary.filter((s: any) => s.within_noise_of_best).length;

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-5 rounded-xl border border-brand/40 bg-brand/10">
                          <span className="text-xs uppercase font-semibold text-brand tracking-wider block">Effort Champion</span>
                          <span className="text-lg font-bold text-text mt-1 block">
                            {bestExpansion.algorithm.toUpperCase()}{bestExpansion.heuristic ? ` (${bestExpansion.heuristic})` : ""}
                          </span>
                          <p className="text-xs text-muted mt-1 leading-relaxed">
                            Average {Math.round(bestExpansion.mean_expanded)} cells expanded per maze
                          </p>
                        </div>
                        <div className="p-5 rounded-xl border border-border bg-surface">
                          <span className="text-xs uppercase font-semibold text-success tracking-wider block">Shortest Route</span>
                          <span className="text-lg font-bold text-text mt-1 block">
                            {optimalAlgs || "No optimal paths found"}
                          </span>
                          <p className="text-xs text-muted mt-1 leading-relaxed">
                            {optimalAlgs ? "Guaranteed optimal paths (100% optimality)" : "Check algorithm configurations"}
                          </p>
                        </div>
                        <div className="p-5 rounded-xl border border-border bg-surface">
                          <span className="text-xs uppercase font-semibold text-warn tracking-wider block">Runtime Speed</span>
                          <span className="text-lg font-bold text-text mt-1 block">
                            {fastestAlg.algorithm.toUpperCase()}{fastestAlg.heuristic ? ` (${fastestAlg.heuristic})` : ""} - {fastestAlg.mean_time_ms.toFixed(2)}ms
                          </span>
                          <p className="text-xs text-muted mt-1 leading-relaxed">
                            {withinNoiseCount > 1 ? `${withinNoiseCount} algorithms within noise margin` : "Clear performance winner"}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Chart */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Who Did the Least Work?</CardTitle>
                          <CardDescription>Mean nodes expanded across overall benchmark runs.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="secondary" size="sm" onClick={() => handleDownloadCsv("summary")} className="gap-1.5 text-xs">
                            <Download className="w-3.5 h-3.5" /> Summary CSV
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => handleDownloadCsv("rows")} className="gap-1.5 text-xs">
                            <Download className="w-3.5 h-3.5" /> All Runs CSV
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="w-full h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="name" stroke="var(--muted)" fontSize={12} />
                            <YAxis stroke="var(--muted)" fontSize={12} />
                            <RechartsTooltip
                              contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", borderRadius: 12 }}
                            />
                            <Bar dataKey="expansions" fill="var(--brand)" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Summary Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Statistical Summary Table</CardTitle>
                      <CardDescription>Aggregated metrics across configurations.</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      <table className="w-full text-left font-mono text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border text-muted">
                            <th className="py-2.5 px-3">ALGORITHM</th>
                            <th className="py-2.5 px-3">GROUP</th>
                            <th className="py-2.5 px-3">MAZES</th>
                            <th className="py-2.5 px-3">FOUND</th>
                            <th className="py-2.5 px-3">MEAN EXPANDED</th>
                            <th className="py-2.5 px-3">MEAN TIME</th>
                            <th className="py-2.5 px-3">NOISE FLAG</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchResult.summary.map((s: any, idx: number) => (
                            <tr key={idx} className="border-b border-border/50 hover:bg-surface-2/40">
                              <td className="py-2.5 px-3 font-semibold text-text uppercase">
                                {s.algorithm} {s.heuristic ? `(${s.heuristic})` : ""}
                              </td>
                              <td className="py-2.5 px-3 text-muted">{s.group}</td>
                              <td className="py-2.5 px-3">{s.n_mazes}</td>
                              <td className="py-2.5 px-3 text-success font-semibold">{s.n_found}</td>
                              <td className="py-2.5 px-3 font-bold text-brand">{s.mean_expanded}</td>
                              <td className="py-2.5 px-3">{s.mean_time_ms} ms</td>
                              <td className="py-2.5 px-3">
                                {s.within_noise_of_best ? (
                                  <Chip variant="warning">within noise</Chip>
                                ) : (
                                  "—"
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CURRENT MAZE COMPARISON */}
      {activeTab === "current" && (
        <Card>
          <CardHeader>
            <CardTitle>Current Maze Head-to-Head Comparison</CardTitle>
            <CardDescription>
              Executes timed runs with GC disabled on the maze currently loaded in the visualizer.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-text">
                    Repetitions: <span className="font-mono text-brand">{repeats}</span> runs
                  </label>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[repeats]}
                      min={1}
                      max={15}
                      step={1}
                      className="w-48"
                      onValueChange={([val]) => setRepeats(val)}
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => setRepeats(1)}
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          repeats === 1 
                            ? "border-brand bg-brand/10 text-brand font-bold" 
                            : "border-border bg-surface-2 text-muted hover:text-text"
                        }`}
                      >
                        1
                      </button>
                      <button
                        onClick={() => setRepeats(5)}
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          repeats === 5 
                            ? "border-brand bg-brand/10 text-brand font-bold" 
                            : "border-border bg-surface-2 text-muted hover:text-text"
                        }`}
                      >
                        5
                      </button>
                      <button
                        onClick={() => setRepeats(10)}
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          repeats === 10 
                            ? "border-brand bg-brand/10 text-brand font-bold" 
                            : "border-border bg-surface-2 text-muted hover:text-text"
                        }`}
                      >
                        10
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted">
                    Each algorithm runs {repeats} {repeats === 1 ? "time" : "times"}, median result shown
                  </p>
                </div>
              </div>

              <Button onClick={handleRunSingle} disabled={isComparing || !maze} className="gap-2 font-semibold">
                <Play className="w-4 h-4 fill-current" />
                {isComparing ? "Running..." : "Run Comparison"}
              </Button>
            </div>

            {singleResult && (
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface-2/60 text-muted">
                      <th className="py-2.5 px-3">ALGORITHM</th>
                      <th className="py-2.5 px-3">STATUS</th>
                      <th className="py-2.5 px-3">CHECKED</th>
                      <th className="py-2.5 px-3">ROUTE COST</th>
                      <th className="py-2.5 px-3">QUALITY</th>
                      <th className="py-2.5 px-3">MEDIAN TIME</th>
                    </tr>
                  </thead>
                  <tbody>
                    {singleResult.results.map((r, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2.5 px-3 font-bold text-text uppercase">
                          {r.algorithm} {r.heuristic ? `(${r.heuristic})` : ""}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={r.status === "found" ? "text-success font-semibold" : "text-danger"}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-brand">{r.expanded_count}</td>
                        <td className="py-2.5 px-3 text-text">{r.path_cost !== null ? r.path_cost : "—"}</td>
                        <td className="py-2.5 px-3 font-semibold text-text">
                          {r.optimality !== null && r.optimality !== undefined ? `${Math.round(r.optimality * 100)}%` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-text font-bold">{r.timing.median_ms} ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: PAST RUNS */}
      {activeTab === "runs" && (
        <Card>
          <CardHeader>
            <CardTitle>Historical Benchmark Runs</CardTitle>
            <CardDescription>
              Previously executed batch benchmark runs saved in the local database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingRuns ? (
              <div className="py-12 text-center text-muted text-xs">Loading past benchmark runs...</div>
            ) : pastRunsData?.runs && pastRunsData.runs.length > 0 ? (
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-border bg-surface-2 text-muted">
                      <th className="p-3">ID / DATE</th>
                      <th className="p-3">MAZES</th>
                      <th className="p-3">REPEATS</th>
                      <th className="p-3">STATUS</th>
                      <th className="p-3">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastRunsData.runs.map((run: any) => (
                      <tr key={run.id} className="border-b border-border/50 hover:bg-surface-2/40">
                        <td className="p-3">
                          <div className="font-bold text-text">#{run.id}</div>
                          <div className="text-[10px] text-muted">{run.created_at || "—"}</div>
                        </td>
                        <td className="p-3 font-bold text-brand">{run.mazes_total || run.mazes_count || "—"}</td>
                        <td className="p-3 text-text">{run.repeats || 1}×</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                            Completed
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => window.open(`/api/benchmark/runs/${run.id}/csv?table=summary`, "_blank")}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface border border-border text-[11px] text-brand hover:brightness-110"
                          >
                            <Download className="w-3 h-3" /> Export CSV
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-muted text-xs">
                No past benchmark runs found. Execute a batch run in the Wizard tab!
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
