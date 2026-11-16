import React from "react";
import { Link } from "react-router-dom";
import {
  Check,
  X as XIcon,
  ExternalLink,
  Lightbulb,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { ALGORITHM_LESSONS } from "@/content/algorithms";
import { Walkthrough } from "./Walkthrough";
import { Tex } from "./Tex";
import { CodeBlock } from "./CodeBlock";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import bfsCode from "@/content/snippets/bfs.py?raw";
import dfsCode from "@/content/snippets/dfs.py?raw";
import ucsCode from "@/content/snippets/ucs.py?raw";
import greedyCode from "@/content/snippets/greedy.py?raw";
import astarCode from "@/content/snippets/astar.py?raw";
import bdsCode from "@/content/snippets/bds.py?raw";

const SNIPPET_MAP: Record<string, string> = {
  bfs: bfsCode,
  dfs: dfsCode,
  ucs: ucsCode,
  greedy: greedyCode,
  astar: astarCode,
  bds: bdsCode,
};

const WHAT_CHANGED_MAP: Record<string, string> = {
  dfs: "Replaces FIFO queue with a LIFO stack (waiting.pop() instead of popleft()), exploring deep branches first.",
  ucs: "Replaces queue with a priority queue ordered by path cost g(n) via heapq, updating cheaper routes when discovered.",
  greedy: "Replaces queue with a priority queue ordered solely by the goal distance hint h(n), ignoring path cost.",
  astar: "Combines cost so far g(n) and goal hint h(n), prioritizing cells by the lowest f(n) = g(n) + h(n).",
  bds: "Alternates between two BFS queues (forward from Start, backward from Goal) until the wavefronts touch.",
};

interface AlgorithmLessonProps {
  algorithmId: string;
}

export const AlgorithmLesson: React.FC<AlgorithmLessonProps> = ({ algorithmId }) => {
  const meta = ALGORITHM_LESSONS[algorithmId] || ALGORITHM_LESSONS.bfs;
  const snippet = SNIPPET_MAP[algorithmId] || bfsCode;
  const whatChanged = WHAT_CHANGED_MAP[algorithmId];

  return (
    <div className="space-y-8 max-w-5xl">
      {/* 1. Header */}
      <div className="space-y-3 pb-6 border-b border-border">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold font-heading text-text">
            {meta.fullName} ({meta.name})
          </h1>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${
              meta.informed
                ? "bg-brand text-brand-ink shadow-xs"
                : "bg-surface-2 text-muted border border-border"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{meta.informed ? "Informed Search" : "Uninformed Search"}</span>
          </span>
        </div>
        <p className="text-lg text-text font-medium leading-relaxed">
          {meta.idea}
        </p>
        <div className="p-3.5 rounded-xl bg-surface-2 border border-border flex items-start gap-2.5 text-sm">
          <Lightbulb className="w-4 h-4 text-brand shrink-0 mt-0.5" />
          <span className="text-muted">
            <strong className="text-text font-semibold">Analogy:</strong> {meta.analogy}
          </span>
        </div>
      </div>

      {/* 2. Interactive Walkthrough */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold font-heading text-text">Interactive Walkthrough</h2>
          <span className="text-xs text-muted">21×21 interactive laboratory</span>
        </div>
        <ErrorBoundary fallbackTitle="Walkthrough unavailable">
          <Walkthrough algorithm={algorithmId} meta={meta} />
        </ErrorBoundary>
      </div>

      {/* 3. How it decides */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold font-heading text-text">How it decides</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-surface border border-border space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              Evaluation Function
            </span>
            <div className="text-lg font-bold font-mono text-brand pt-1">
              <Tex>{meta.formulaTex}</Tex>
            </div>
            <p className="text-xs text-muted">Formula evaluated for each candidate node.</p>
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-border space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              Data Structure
            </span>
            <div className="text-base font-bold text-text pt-1">{meta.structure}</div>
            <p className="text-xs text-muted">Frontier container governing exploration order.</p>
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-border space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              Picks Next
            </span>
            <div className="text-base font-bold text-text pt-1">{meta.picksNext}</div>
            <p className="text-xs text-muted">Deterministic selection criterion at each tick.</p>
          </div>
        </div>
      </div>

      {/* 4. Fact Chips */}
      <div className="p-5 rounded-2xl bg-surface-2 border border-border space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted">Key guarantees</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2">
            {meta.shortestMoves ? (
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <XIcon className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <span className="text-text">Fewest moves {meta.shortestMoves ? "guaranteed" : "no"}</span>
          </div>

          <div className="flex items-center gap-2">
            {meta.shortestCost ? (
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <XIcon className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <span className="text-text">Cheapest cost {meta.shortestCost ? "guaranteed" : "no"}</span>
          </div>

          <div className="flex items-center gap-2">
            {meta.complete ? (
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <XIcon className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <span className="text-text">Complete (finds route)</span>
          </div>

          <div className="flex items-center gap-2">
            {meta.usesHint ? (
              <Check className="w-4 h-4 text-brand shrink-0" />
            ) : (
              <XIcon className="w-4 h-4 text-muted shrink-0" />
            )}
            <span className="text-text">{meta.usesHint ? "Uses heuristic hint" : "No hint (blind)"}</span>
          </div>
        </div>
      </div>

      {/* 5. Pros and Cons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Strengths & Advantages</span>
          </h3>
          <ul className="space-y-2 text-sm text-muted">
            {meta.pros.map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>Weaknesses & Limitations</span>
          </h3>
          <ul className="space-y-2 text-sm text-muted">
            {meta.cons.map((c, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 6. Real Life & When to use / avoid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-brand" />
            <span>Real-World Applications</span>
          </h3>
          <ul className="space-y-2 text-sm text-muted">
            {meta.realLife.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-brand font-bold">→</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text">When to Use & Avoid</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-emerald-500 font-semibold mr-1.5">Use when:</span>
              <span className="text-muted">{meta.whenToUse.join("; ")}.</span>
            </div>
            <div>
              <span className="text-rose-500 font-semibold mr-1.5">Avoid when:</span>
              <span className="text-muted">{meta.avoidWhen.join("; ")}.</span>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Complexity */}
      <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted">Theoretical Complexity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-mono">
          <div className="p-3.5 rounded-xl bg-surface-2 border border-border flex items-center justify-between">
            <span className="text-muted">Time Complexity:</span>
            <span className="text-text font-bold">
              <Tex>{meta.timeTex}</Tex>
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-2 border border-border flex items-center justify-between">
            <span className="text-muted">Space Complexity:</span>
            <span className="text-text font-bold">
              <Tex>{meta.spaceTex}</Tex>
            </span>
          </div>
        </div>
      </div>

      {/* 8. Python Code */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold font-heading text-text">Canonical Python Implementation</h2>
        <p className="text-sm text-muted">
          Tested and verified against the backend engine. Uses only Python standard library.
        </p>
        <CodeBlock
          code={snippet}
          filename={`${algorithmId}.py`}
          whatChanged={whatChanged}
        />
      </div>

      {/* 9. Try it in Visualizer Button */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-brand/10 to-transparent border border-brand/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-text">Ready to test it in the arena?</h3>
          <p className="text-sm text-muted mt-0.5">
            Run {meta.name} head-to-head against other algorithms on custom mazes.
          </p>
        </div>
        <Link
          to={`/visualizer?racers=${algorithmId}`}
          className="h-11 px-5 rounded-xl bg-brand text-brand-ink font-bold flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0 text-sm shadow-md"
        >
          <span>Try {meta.name} in Visualizer</span>
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
