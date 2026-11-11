import React, { useState, useEffect } from "react";
import {
  BrainCircuit,
  Binary,
  Sparkles,
  Play,
  CheckCircle,
  XCircle,
  FolderArchive,
  Check,
  Trash2,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useJob } from "@/hooks/useJob";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { request } from "@/lib/api";
import { notify } from "@/lib/notify";

export const MLLabPage: React.FC = () => {
  const { maze } = useAppStore();

  const [activeTab, setActiveTab] = useState("regression");
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

  // Model Library State
  const [modelsList, setModelsList] = useState<any[]>([]);

  const { status: regStatus, progress: regProgress, result: regJobResult } = useJob(regJobId);
  const { status: clsStatus, progress: clsProgress, result: clsJobResult } = useJob(clsJobId);

  // Load ML Status and Models
  const loadStatus = async () => {
    try {
      const res = await request<any>("/api/ml/status");
      setMlStatus(res);
    } catch {}
  };

  const loadModels = async () => {
    try {
      const res = await request<{ models: any[] }>("/api/ml/models");
      if (res && res.models) setModelsList(res.models);
    } catch {}
  };

  useEffect(() => {
    loadStatus();
    loadModels();
  }, []);

  const handleActivateModel = async (id: number) => {
    try {
      await request(`/api/ml/models/${id}/activate`, { method: "POST" });
      notify.success(`Activated model #${id}`);
      loadModels();
      loadStatus();
    } catch (err) {
      notify.error(err);
    }
  };

  const handleDeleteModel = async (id: number) => {
    try {
      await request(`/api/ml/models/${id}`, { method: "DELETE" });
      notify.info(`Deleted model #${id}`);
      loadModels();
      loadStatus();
    } catch (err) {
      notify.error(err);
    }
  };

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
      notify.info("Regression training job started");
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
      notify.info("Classification training job started");
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
      notify.success("Algorithm winner predicted for current maze");
    } catch (err) {
      notify.error(err);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Machine Learning Laboratory</h1>
          <p className="text-muted text-sm mt-1">
            Can a model learn to search better? Train learned distance heuristics and predictive classifiers.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
          <TabsList className="bg-surface-2 p-1 rounded-xl">
            <TabsTrigger value="regression" className="gap-2">
              <BrainCircuit className="w-3.5 h-3.5" /> 1. Learn a Hint
            </TabsTrigger>
            <TabsTrigger value="classification" className="gap-2">
              <Binary className="w-3.5 h-3.5" /> 2. Pick Best Algorithm
            </TabsTrigger>
            <TabsTrigger value="models" className="gap-2">
              <FolderArchive className="w-3.5 h-3.5" /> 3. Model Library
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 1. LEARN A HINT (REGRESSION) */}
      {activeTab === "regression" && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Parameters & Train Card */}
            <Card className="h-fit">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Train Heuristic Model</CardTitle>
                  {mlStatus?.regression && <Chip variant="success">Trained</Chip>}
                </div>
                <CardDescription>
                  Extracts topological features from random grids and trains regression estimators against ground truth Dijkstra distances.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs text-muted">
                    <span>Training Mazes</span>
                    <span className="font-mono text-text font-bold">{regMazes}</span>
                  </div>
                  <Slider
                    value={[regMazes]}
                    min={30}
                    max={150}
                    step={10}
                    onValueChange={([val]) => setRegMazes(val)}
                  />
                </div>

                <Button
                  onClick={handleTrainRegression}
                  disabled={regStatus === "running"}
                  className="gap-2 font-bold w-full"
                >
                  <Sparkles className="w-4 h-4 fill-current" />
                  {regStatus === "running" ? "Training Models..." : "Train Heuristic Regressors"}
                </Button>

                {regStatus === "running" && regProgress && (
                  <div className="flex flex-col gap-1.5 pt-2">
                    <div className="flex justify-between font-mono text-[11px] text-muted">
                      <span>{regProgress.label}</span>
                      <span>{regProgress.done}/{regProgress.total}</span>
                    </div>
                    <Progress value={regProgress.total > 0 ? (regProgress.done / regProgress.total) * 100 : 0} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Evaluation Metrics Card */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Model Performance vs Manhattan Baseline</CardTitle>
                <CardDescription>
                  GroupShuffleSplit on unseen mazes. Overestimation can violate admissibility ($h(n) &gt; h^*(n)$).
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                {regResult ? (
                  <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-3 gap-3">
                      {regResult.metrics.map((m: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-xl border border-border bg-surface-2 flex flex-col gap-1">
                          <span className="text-xs text-muted block">{m.model}</span>
                          <span className="text-xl font-bold text-text tabular-nums">{m.mae} MAE</span>
                          <span className="text-[11px] text-warn tabular-nums mt-1 font-mono">
                            {m.overestimate_pct}% overestimates
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Compare on current maze */}
                    <div className="p-4 rounded-xl border border-border bg-surface-2/60 flex flex-col gap-3">
                      <span className="text-xs font-semibold uppercase text-muted tracking-wider">
                        Live Heuristic Test on Current Maze
                      </span>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleAstarCompare("tree")}
                          className="font-medium text-xs"
                        >
                          Run A* with Decision Tree Heuristic
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleAstarCompare("linear")}
                          className="font-medium text-xs"
                        >
                          Run A* with Linear Heuristic
                        </Button>
                      </div>

                      {astarCompareResult && (
                        <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono">
                          <div className="p-3 rounded-lg border border-border bg-surface">
                            <span className="text-muted block text-[10px]">STANDARD A* (MANHATTAN)</span>
                            <div className="text-sm font-bold text-text mt-1">
                              Checked: {astarCompareResult.standard_astar.expanded}
                            </div>
                            <div className="text-text mt-0.5">Cost: {astarCompareResult.standard_astar.cost}</div>
                          </div>
                          <div className="p-3 rounded-lg border border-brand/40 bg-brand/10">
                            <span className="text-brand block text-[10px]">LEARNED HEURISTIC A*</span>
                            <div className="text-sm font-bold text-brand mt-1">
                              Checked: {astarCompareResult.learned_astar.expanded}
                            </div>
                            <div className="text-text mt-0.5">Cost: {astarCompareResult.learned_astar.cost}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted text-sm">
                    No models trained yet. Click "Train Heuristic Regressors" to generate training sets and fit models.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 2. PICK THE BEST ALGORITHM (CLASSIFICATION) */}
      {activeTab === "classification" && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="h-fit">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Train Classifier</CardTitle>
                  <div className="flex items-center gap-1.5">
                    {mlStatus?.classification && <Chip variant="success">Trained</Chip>}
                    {mlStatus?.classification?.classes && !mlStatus.classification.classes.includes("bds") && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px] font-bold">
                        Old Model (no BDS) — Retrain
                      </span>
                    )}
                  </div>
                </div>
                <CardDescription>
                  Trains a decision tree to classify which algorithm expands the fewest nodes on unseen mazes.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs text-muted">
                    <span>Training Mazes</span>
                    <span className="font-mono text-text font-bold">{clsMazes}</span>
                  </div>
                  <Slider
                    value={[clsMazes]}
                    min={30}
                    max={150}
                    step={10}
                    onValueChange={([val]) => setClsMazes(val)}
                  />
                </div>

                <Button
                  onClick={handleTrainClassification}
                  disabled={clsStatus === "running"}
                  className="gap-2 font-bold w-full"
                >
                  <Sparkles className="w-4 h-4 fill-current" />
                  {clsStatus === "running" ? "Training Classifier..." : "Train Recommendation Tree"}
                </Button>

                {clsStatus === "running" && clsProgress && (
                  <div className="flex flex-col gap-1.5 pt-2">
                    <div className="flex justify-between font-mono text-[11px] text-muted">
                      <span>{clsProgress.label}</span>
                      <span>{clsProgress.done}/{clsProgress.total}</span>
                    </div>
                    <Progress value={clsProgress.total > 0 ? (clsProgress.done / clsProgress.total) * 100 : 0} />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Decision Tree Accuracy vs Majority Baseline</CardTitle>
                <CardDescription>
                  Evaluated on unseen validation mazes generated by independent seeds.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                {clsResult ? (
                  <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-brand/40 bg-brand/10">
                        <span className="text-xs text-muted block">Decision Tree Accuracy</span>
                        <span className="text-2xl font-bold text-brand tabular-nums">
                          {Math.round(clsResult.metrics.accuracy * 100)}%
                        </span>
                      </div>
                      <div className="p-4 rounded-xl border border-border bg-surface-2">
                        <span className="text-xs text-muted block">Majority Baseline (Zero-Intelligence)</span>
                        <span className="text-2xl font-bold text-text tabular-nums">
                          {Math.round(clsResult.baseline_accuracy * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Predict on current visualizer maze */}
                    <div className="p-4 rounded-xl border border-border bg-surface-2/60 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase text-muted tracking-wider">
                          Predict Optimal Algorithm for Active Maze
                        </span>
                        <Button size="sm" onClick={handlePredict} className="gap-1.5 text-xs font-semibold">
                          <Play className="w-3.5 h-3.5 fill-current" /> Predict &amp; Verify
                        </Button>
                      </div>

                      {predictResult && (
                        <div className="p-3 rounded-lg border border-border bg-surface flex items-center justify-between font-mono text-xs">
                          <div>
                            <span className="text-muted block text-[10px]">PREDICTED WINNER:</span>
                            <span className="font-bold text-brand text-sm uppercase">
                              {predictResult.predicted_algorithm}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted block text-[10px]">ACTUAL RACE WINNER:</span>
                            <span className="font-bold text-text text-sm uppercase">
                              {predictResult.actual_winner}
                            </span>
                          </div>
                          <div>
                            {predictResult.is_correct ? (
                              <span className="flex items-center gap-1.5 text-success font-bold text-xs">
                                <CheckCircle className="w-4 h-4" /> Correct Prediction
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-danger font-bold text-xs">
                                <XCircle className="w-4 h-4" /> Incorrect Prediction
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted text-sm">
                    No classifier trained yet. Click "Train Recommendation Tree" to begin training.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 3. MODEL LIBRARY */}
      {activeTab === "models" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Model Artifact Library</CardTitle>
                <CardDescription>
                  View, activate, or delete trained scikit-learn models stored in the database.
                </CardDescription>
              </div>
              <Button size="sm" variant="secondary" onClick={loadModels} className="text-xs">
                Refresh Models
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {modelsList.length === 0 ? (
              <div className="py-12 text-center text-muted text-xs">
                No trained models in registry. Train a heuristic regressor or classification tree to see it here!
              </div>
            ) : (
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface-2/60 text-muted">
                      <th className="py-2.5 px-3">ID / NAME</th>
                      <th className="py-2.5 px-3">KIND</th>
                      <th className="py-2.5 px-3">CREATED</th>
                      <th className="py-2.5 px-3">STATUS</th>
                      <th className="py-2.5 px-3">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelsList.map((m) => (
                      <tr key={m.id} className="border-b border-border/50 hover:bg-surface-2/40">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-text">#{m.id} - {m.name}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded uppercase font-bold text-[10px] bg-brand/15 text-brand">
                            {m.kind}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-muted text-[11px]">{m.created_at || "—"}</td>
                        <td className="py-2.5 px-3">
                          {m.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold">
                              <Check className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="text-muted text-[10px]">Inactive</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            {!m.is_active && (
                              <button
                                onClick={() => handleActivateModel(m.id)}
                                className="px-2.5 py-1 rounded bg-surface border border-border text-[11px] text-text hover:bg-surface-2 font-medium"
                              >
                                Activate
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteModel(m.id)}
                              className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Delete model"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
