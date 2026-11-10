import React, { useState, useEffect } from "react";
import {
  BrainCircuit,
  Binary,
  Sparkles,
  Play,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useJob } from "@/hooks/useJob";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { request } from "@/lib/api";
import { notify } from "@/lib/notify";

export const MLLabPage: React.FC = () => {
  const { maze } = useAppStore();

  // Status restored on load
  const [mlStatus, setMlStatus] = useState<any>(null);

  // Regression Job State
  const [regJobId, setRegJobId] = useState<string | null>(null);
  const [regMazes, setRegMazes] = useState(80);
  const [regResult, setRegResult] = useState<any>(null);
  const [astarCompareResult, setAstarCompareResult] = useState<any>(null);

  // Classification Job State
  const [clsJobId, setClsJobId] = useState<string | null>(null);
  const [clsMazes, setClsMazes] = useState(80);
  const [clsResult, setClsResult] = useState<any>(null);
  const [predictResult, setPredictResult] = useState<any>(null);

  const { status: regStatus, progress: regProgress, result: regJobResult } = useJob(regJobId);
  const { status: clsStatus, progress: clsProgress, result: clsJobResult } = useJob(clsJobId);

  // Restore latest models on mount
  const loadStatus = async () => {
    try {
      const res = await request<any>("/api/ml/status");
      setMlStatus(res);
    } catch {}
  };

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (regJobResult) {
      setRegResult(regJobResult);
      loadStatus();
    }
  }, [regJobResult]);

  useEffect(() => {
    if (clsJobResult) {
      setClsResult(clsJobResult);
      loadStatus();
    }
  }, [clsJobResult]);

  // Train Regression
  const handleTrainRegression = async () => {
    try {
      const res = await request<{ jobId: string }>("/api/ml/regression/train", {
        method: "POST",
        body: JSON.stringify({
          n_mazes: regMazes,
          samples_per_maze: 10,
          test_size: 0.2,
          seed: 42,
        }),
      });
      setRegJobId(res.jobId);
      notify.info("Regression training started");
    } catch (err) {
      notify.error(err);
    }
  };

  // Compare A* Heuristics
  const handleAstarCompare = async (model: "linear" | "tree") => {
    if (!maze) {
      notify.warning("Please create or generate a maze first");
      return;
    }
    try {
      const res = await request<any>("/api/ml/regression/astar-compare", {
        method: "POST",
        body: JSON.stringify({ maze, model }),
      });
      setAstarCompareResult(res);
      notify.success("A* comparison with learned heuristic complete");
    } catch (err) {
      notify.error(err);
    }
  };

  // Train Classification
  const handleTrainClassification = async () => {
    try {
      const res = await request<{ jobId: string }>("/api/ml/classification/train", {
        method: "POST",
        body: JSON.stringify({
          n_mazes: clsMazes,
          test_size: 0.2,
          seed: 42,
          criterion: "gini",
        }),
      });
      setClsJobId(res.jobId);
      notify.info("Classification training started");
    } catch (err) {
      notify.error(err);
    }
  };

  // Predict winner for current maze
  const handlePredict = async () => {
    if (!maze) {
      notify.warning("Please create or generate a maze first");
      return;
    }
    try {
      const res = await request<any>("/api/ml/classification/predict", {
        method: "POST",
        body: JSON.stringify({ maze, run_actual: true }),
      });
      setPredictResult(res);
      notify.success("Winner predicted for current maze");
    } catch (err) {
      notify.error(err);
    }
  };

  return (
    <div className="flex-1 p-6 max-w-6xl mx-auto w-full flex flex-col gap-6 text-xs">
      {/* Header banner */}
      <div className="border-b border-border pb-4">
        <h1 className="text-xl font-bold text-text">Machine Learning Laboratory</h1>
        <p className="text-text-muted text-[11px] mt-0.5">
          Train learned cost heuristics (regression) and optimal algorithm recommendation classifiers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. REGRESSION CARD */}
        <div className="p-4 bg-surface border border-border rounded-xl flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-accent" />
              <span className="font-semibold text-text uppercase tracking-wider text-[11px]">
                Heuristic Cost Regression
              </span>
            </div>
            {mlStatus?.regression && (
              <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-success text-[10px] border border-success/30">
                Model Ready
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-text-muted">
              <span>Training Mazes</span>
              <span className="font-mono">{regMazes} mazes</span>
            </div>
            <Slider
              value={[regMazes]}
              min={30}
              max={150}
              step={10}
              onValueChange={([val]) => setRegMazes(val)}
            />
          </div>

          <button
            onClick={handleTrainRegression}
            disabled={regStatus === "running"}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-accent text-bg font-semibold hover:opacity-90 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            {regStatus === "running" ? "Training..." : "Train Regression Models"}
          </button>

          {regStatus === "running" && regProgress && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between font-mono text-[10px] text-text-muted">
                <span>{regProgress.label}</span>
                <span>{regProgress.done}/{regProgress.total}</span>
              </div>
              <Progress value={regProgress.total > 0 ? (regProgress.done / regProgress.total) * 100 : 0} />
            </div>
          )}

          {/* Metrics Table */}
          {regResult && (
            <div className="flex flex-col gap-3 pt-2">
              <span className="font-semibold text-[10px] text-text-muted uppercase">Model Evaluation</span>
              <table className="w-full text-left font-mono border-collapse">
                <thead>
                  <tr className="border-b border-border text-text-muted text-[10px]">
                    <th className="py-1.5 px-2">MODEL</th>
                    <th className="py-1.5 px-2">MAE</th>
                    <th className="py-1.5 px-2">R²</th>
                    <th className="py-1.5 px-2">OVERESTIMATE</th>
                  </tr>
                </thead>
                <tbody>
                  {regResult.metrics.map((m: any, idx: number) => (
                    <tr key={idx} className="border-b border-border/40">
                      <td className="py-1.5 px-2 font-medium">{m.model}</td>
                      <td className="py-1.5 px-2 text-accent font-bold">{m.mae}</td>
                      <td className="py-1.5 px-2">{m.r2}</td>
                      <td className="py-1.5 px-2 text-warning">{m.overestimate_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Demo button */}
              <div className="p-3 bg-surface-2 border border-border rounded-lg flex flex-col gap-2">
                <span className="font-semibold text-text">Compare A* on Current Maze</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAstarCompare("tree")}
                    className="py-1.5 px-3 rounded bg-surface border border-border text-text hover:bg-surface/80 text-[11px]"
                  >
                    Run Decision Tree Heuristic
                  </button>
                  <button
                    onClick={() => handleAstarCompare("linear")}
                    className="py-1.5 px-3 rounded bg-surface border border-border text-text hover:bg-surface/80 text-[11px]"
                  >
                    Run Linear Heuristic
                  </button>
                </div>

                {astarCompareResult && (
                  <div className="pt-2 font-mono text-[11px] grid grid-cols-2 gap-2">
                    <div className="p-2 bg-surface rounded border border-border">
                      <span className="text-text-muted block text-[10px]">STANDARD A* (MANHATTAN)</span>
                      <div>Expanded: {astarCompareResult.standard_astar.expanded}</div>
                      <div>Cost: {astarCompareResult.standard_astar.cost}</div>
                    </div>
                    <div className="p-2 bg-surface rounded border border-border">
                      <span className="text-accent block text-[10px]">LEARNED HEURISTIC A*</span>
                      <div>Expanded: {astarCompareResult.learned_astar.expanded}</div>
                      <div>Cost: {astarCompareResult.learned_astar.cost}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. CLASSIFICATION CARD */}
        <div className="p-4 bg-surface border border-border rounded-xl flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Binary className="w-4 h-4 text-accent" />
              <span className="font-semibold text-text uppercase tracking-wider text-[11px]">
                Algorithm Recommendation
              </span>
            </div>
            {mlStatus?.classification && (
              <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-success text-[10px] border border-success/30">
                Classifier Ready
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-text-muted">
              <span>Training Mazes</span>
              <span className="font-mono">{clsMazes} mazes</span>
            </div>
            <Slider
              value={[clsMazes]}
              min={30}
              max={150}
              step={10}
              onValueChange={([val]) => setClsMazes(val)}
            />
          </div>

          <button
            onClick={handleTrainClassification}
            disabled={clsStatus === "running"}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-accent text-bg font-semibold hover:opacity-90 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            {clsStatus === "running" ? "Training..." : "Train Recommendation Classifier"}
          </button>

          {clsStatus === "running" && clsProgress && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between font-mono text-[10px] text-text-muted">
                <span>{clsProgress.label}</span>
                <span>{clsProgress.done}/{clsProgress.total}</span>
              </div>
              <Progress value={clsProgress.total > 0 ? (clsProgress.done / clsProgress.total) * 100 : 0} />
            </div>
          )}

          {/* Classification Metrics */}
          {clsResult && (
            <div className="flex flex-col gap-3 pt-2">
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="p-2.5 bg-surface-2 border border-border rounded-lg">
                  <span className="text-text-muted block text-[10px]">TREE ACCURACY</span>
                  <span className="text-accent font-bold text-sm">{clsResult.metrics.accuracy * 100}%</span>
                </div>
                <div className="p-2.5 bg-surface-2 border border-border rounded-lg">
                  <span className="text-text-muted block text-[10px]">MAJORITY BASELINE</span>
                  <span className="text-text-muted font-bold text-sm">{clsResult.baseline_accuracy * 100}%</span>
                </div>
              </div>

              {/* Predict for current maze */}
              <div className="p-3 bg-surface-2 border border-border rounded-lg flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text">Predict Optimal Algorithm</span>
                  <button
                    onClick={handlePredict}
                    className="flex items-center gap-1.5 py-1 px-2.5 rounded bg-surface border border-border text-accent font-semibold text-[11px] hover:bg-surface/80"
                  >
                    <Play className="w-3 h-3 fill-current" /> Predict
                  </button>
                </div>

                {predictResult && (
                  <div className="pt-2 font-mono text-[11px] flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Predicted:</span>
                      <span className="text-accent font-bold uppercase">{predictResult.predicted_algorithm}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Actual Race Winner:</span>
                      <span className="text-text font-bold uppercase">{predictResult.actual_winner}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-border">
                      <span className="text-text-muted">Outcome:</span>
                      {predictResult.is_correct ? (
                        <span className="flex items-center gap-1 text-success font-bold">
                          <CheckCircle className="w-3.5 h-3.5" /> Correct
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-danger font-bold">
                          <XCircle className="w-3.5 h-3.5" /> Incorrect
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
