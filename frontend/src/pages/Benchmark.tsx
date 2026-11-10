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
import { Play, Download, Sparkles, AlertCircle } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useJob } from "@/hooks/useJob";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { request } from "@/lib/api";
import { notify } from "@/lib/notify";
import type { CompareResult, BenchmarkConfig } from "@/lib/types";

export const BenchmarkPage: React.FC = () => {
  const { maze, participants } = useAppStore();
  const [activeTab, setActiveTab] = useState<"single" | "batch">("single");

  // Single compare state
  const [repeats, setRepeats] = useState(5);
  const [singleResult, setSingleResult] = useState<CompareResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  // Batch benchmark state
  const [batchJobId, setBatchJobId] = useState<string | null>(null);
  const [mazesPerConfig, setMazesPerConfig] = useState(3);
  const [batchRepeats, setBatchRepeats] = useState(2);
  const [ensureSolvable, setEnsureSolvable] = useState(true);

  const { status: jobStatus, progress, result: batchResult, cancel } = useJob(batchJobId);

  // Run Single Comparison
  const handleRunSingle = async () => {
    if (!maze) {
      notify.warning("Please generate a maze in the visualizer first.");
      return;
    }

    setIsComparing(true);
    try {
      const res = await request<CompareResult>("/api/compare", {
        method: "POST",
        body: JSON.stringify({
          maze,
          participants,
          repeats,
        }),
      });
      setSingleResult(res);
      notify.success("Single comparison complete");
    } catch (err) {
      notify.error(err);
    } finally {
      setIsComparing(false);
    }
  };

  // Run Batch Benchmark Job
  const handleRunBatch = async () => {
    try {
      const config: BenchmarkConfig = {
        sizes: [
          { rows: 15, cols: 15 },
          { rows: 25, cols: 25 },
        ],
        densities: [0.2, 0.3],
        types: ["backtracker", "random"],
        mazes_per_config: mazesPerConfig,
        participants,
        repeats: batchRepeats,
        base_seed: 42,
        ensure_solvable: ensureSolvable,
        diagonal: false,
      };

      const res = await request<{ jobId: string }>("/api/benchmark/jobs", {
        method: "POST",
        body: JSON.stringify(config),
      });

      setBatchJobId(res.jobId);
      notify.info(`Started batch benchmark job: ${res.jobId}`);
    } catch (err) {
      notify.error(err);
    }
  };

  // CSV download helper
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
    <div className="flex-1 p-6 max-w-6xl mx-auto w-full flex flex-col gap-6 text-xs">
      {/* View Switcher Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold text-text">Benchmark Engine</h1>
          <p className="text-text-muted text-[11px] mt-0.5">
            Compare search algorithms across multiple iterations with pure execution timing and expansion counters.
          </p>
        </div>

        <div className="flex bg-surface-2 p-1 rounded-lg border border-border">
          <button
            onClick={() => setActiveTab("single")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === "single"
                ? "bg-surface text-accent shadow-sm"
                : "text-text-muted hover:text-text"
            }`}
          >
            Single Maze Comparison
          </button>
          <button
            onClick={() => setActiveTab("batch")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === "batch"
                ? "bg-surface text-accent shadow-sm"
                : "text-text-muted hover:text-text"
            }`}
          >
            Batch Benchmark
          </button>
        </div>
      </div>

      {/* SINGLE COMPARISON TAB */}
      {activeTab === "single" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Controls Card */}
          <div className="p-4 bg-surface border border-border rounded-xl flex flex-col gap-4 h-fit">
            <span className="font-semibold text-text uppercase tracking-wider text-[11px]">Configuration</span>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-text-muted">
                <span>Repetitions (GC isolated)</span>
                <span className="font-mono">{repeats} runs</span>
              </div>
              <Slider
                value={[repeats]}
                min={1}
                max={15}
                step={1}
                onValueChange={([val]) => setRepeats(val)}
              />
            </div>

            <div className="p-3 bg-surface-2 border border-border rounded-lg text-text-muted leading-relaxed">
              Will execute on current visualizer maze ({maze ? `${maze.rows}×${maze.cols}` : "No maze"}) across {participants.length} selected participant(s).
            </div>

            <button
              onClick={handleRunSingle}
              disabled={isComparing || !maze}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-accent text-bg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              {isComparing ? "Benchmarking..." : "Run Comparison"}
            </button>
          </div>

          {/* Results Table Card */}
          <div className="col-span-2 p-4 bg-surface border border-border rounded-xl flex flex-col gap-4">
            <span className="font-semibold text-text uppercase tracking-wider text-[11px]">Results</span>

            {singleResult ? (
              <div className="flex flex-col gap-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono border-collapse">
                    <thead>
                      <tr className="border-b border-border text-text-muted text-[10px]">
                        <th className="py-2 px-3">ALGORITHM</th>
                        <th className="py-2 px-3">STATUS</th>
                        <th className="py-2 px-3">EXPANDED</th>
                        <th className="py-2 px-3">COST</th>
                        <th className="py-2 px-3">OPTIMALITY</th>
                        <th className="py-2 px-3">MEDIAN TIME</th>
                        <th className="py-2 px-3">STD DEV</th>
                      </tr>
                    </thead>
                    <tbody>
                      {singleResult.results.map((r, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-surface-2/40">
                          <td className="py-2.5 px-3 font-semibold text-text">
                            {r.algorithm.toUpperCase()} {r.heuristic ? `(${r.heuristic})` : ""}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={r.status === "found" ? "text-success" : "text-danger"}>
                              {r.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-text">{r.expanded_count}</td>
                          <td className="py-2.5 px-3 text-text">{r.path_cost !== null ? r.path_cost : "—"}</td>
                          <td className="py-2.5 px-3 text-text">
                            {r.optimality !== null && r.optimality !== undefined
                              ? `${Math.round(r.optimality * 100)}%`
                              : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-accent font-bold">{r.timing.median_ms} ms</td>
                          <td className="py-2.5 px-3 text-text-muted">±{r.timing.std_ms} ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="text-[11px] text-text-muted p-2 rounded bg-surface-2 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-accent" />
                  Timings measured in pure Python with GC disabled during expansion. Nodes expanded is the machine-independent metric.
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-text-muted">
                No single comparison run yet. Click "Run Comparison" to benchmark the current maze.
              </div>
            )}
          </div>
        </div>
      )}

      {/* BATCH BENCHMARK TAB */}
      {activeTab === "batch" && (
        <div className="flex flex-col gap-6">
          <div className="p-4 bg-surface border border-border rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <span className="text-text-muted block text-[10px] mb-1">MAZES PER CONFIG</span>
                <Slider
                  value={[mazesPerConfig]}
                  min={1}
                  max={10}
                  step={1}
                  className="w-32"
                  onValueChange={([val]) => setMazesPerConfig(val)}
                />
              </div>

              <div>
                <span className="text-text-muted block text-[10px] mb-1">REPEATS</span>
                <Slider
                  value={[batchRepeats]}
                  min={1}
                  max={5}
                  step={1}
                  className="w-24"
                  onValueChange={([val]) => setBatchRepeats(val)}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Switch checked={ensureSolvable} onCheckedChange={setEnsureSolvable} />
                <span className="text-text-muted">Ensure Solvable</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {jobStatus === "running" ? (
                <button
                  onClick={cancel}
                  className="py-2 px-4 rounded-lg bg-red-950/80 border border-danger/40 text-danger font-semibold hover:bg-red-900/60"
                >
                  Cancel Run
                </button>
              ) : (
                <button
                  onClick={handleRunBatch}
                  className="flex items-center gap-2 py-2 px-4 rounded-lg bg-accent text-bg font-semibold hover:opacity-90"
                >
                  <Sparkles className="w-4 h-4 fill-current" /> Run Batch Benchmark
                </button>
              )}
            </div>
          </div>

          {/* Job Progress bar */}
          {jobStatus === "running" && progress && (
            <div className="p-4 bg-surface border border-border rounded-xl flex flex-col gap-2">
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-accent">{progress.label || "Running benchmark..."}</span>
                <span>{progress.done} / {progress.total}</span>
              </div>
              <Progress value={progress.total > 0 ? (progress.done / progress.total) * 100 : 0} />
            </div>
          )}

          {/* Results charts & tables */}
          {batchResult && (
            <div className="flex flex-col gap-6">
              {/* Recharts chart */}
              <div className="p-4 bg-surface border border-border rounded-xl flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text uppercase tracking-wider text-[11px]">Mean Nodes Expanded (Overall)</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadCsv("summary")}
                      className="flex items-center gap-1.5 py-1 px-2.5 rounded bg-surface-2 border border-border hover:bg-surface-2/80 font-mono text-[11px]"
                    >
                      <Download className="w-3 h-3" /> Summary CSV
                    </button>
                    <button
                      onClick={() => handleDownloadCsv("rows")}
                      className="flex items-center gap-1.5 py-1 px-2.5 rounded bg-surface-2 border border-border hover:bg-surface-2/80 font-mono text-[11px]"
                    >
                      <Download className="w-3 h-3" /> All Runs CSV
                    </button>
                  </div>
                </div>

                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2A323D" />
                      <XAxis dataKey="name" stroke="#9AA5B1" fontSize={11} />
                      <YAxis stroke="#9AA5B1" fontSize={11} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: "#151A21", borderColor: "#2A323D", borderRadius: 8 }}
                      />
                      <Bar dataKey="expansions" fill="#3DD6C6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Summary table */}
              <div className="p-4 bg-surface border border-border rounded-xl overflow-x-auto">
                <span className="font-semibold text-text uppercase tracking-wider text-[11px] block mb-3">Statistical Summary</span>
                <table className="w-full text-left font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-border text-text-muted text-[10px]">
                      <th className="py-2 px-3">ALGORITHM</th>
                      <th className="py-2 px-3">GROUP</th>
                      <th className="py-2 px-3">N MAZES</th>
                      <th className="py-2 px-3">FOUND</th>
                      <th className="py-2 px-3">MEAN EXPANDED</th>
                      <th className="py-2 px-3">STD EXPANDED</th>
                      <th className="py-2 px-3">MEAN TIME</th>
                      <th className="py-2 px-3">NOISE FLAG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchResult.summary.map((s: any, idx: number) => (
                      <tr key={idx} className="border-b border-border/50 hover:bg-surface-2/40">
                        <td className="py-2 px-3 font-semibold text-text">
                          {s.algorithm.toUpperCase()} {s.heuristic ? `(${s.heuristic})` : ""}
                        </td>
                        <td className="py-2 px-3 text-text-muted">{s.group}</td>
                        <td className="py-2 px-3">{s.n_mazes}</td>
                        <td className="py-2 px-3 text-success">{s.n_found}</td>
                        <td className="py-2 px-3 text-accent font-bold">{s.mean_expanded}</td>
                        <td className="py-2 px-3 text-text-muted">±{s.std_expanded}</td>
                        <td className="py-2 px-3">{s.mean_time_ms} ms</td>
                        <td className="py-2 px-3">
                          {s.within_noise_of_best ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-warning text-[10px] border border-warning/30">
                              within noise
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
