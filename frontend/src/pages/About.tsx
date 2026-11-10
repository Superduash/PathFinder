import React from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export const AboutPage: React.FC = () => {
  return (
    <div className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full flex flex-col gap-6 text-xs text-text">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">About PathFinder</h1>
        <p className="text-text-muted text-sm mt-1">
          College AI Search Algorithm Visualizer, Benchmark Suite, and Machine Learning Testbed.
        </p>
      </div>

      <Accordion type="single" collapsible defaultValue="algorithms" className="w-full">
        {/* Algorithms Breakdown */}
        <AccordionItem value="algorithms">
          <AccordionTrigger>Search Algorithm Theoretical Foundations</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-3 text-text-muted leading-relaxed">
            <div>
              <strong className="text-text">Breadth-First Search (BFS):</strong> Explores nodes in strict order of distance from start using a FIFO queue. Guarantees the shortest path on unweighted uniform grids ($O(V+E)$).
            </div>
            <div>
              <strong className="text-text">Depth-First Search (DFS):</strong> Explores down deep branches using a LIFO stack. Non-optimal, but minimal memory usage in corridor structures.
            </div>
            <div>
              <strong className="text-text">Uniform-Cost Search (UCS / Dijkstra):</strong> Expands lowest cumulative cost $g(n)$ first with a Priority Queue. Optimal for arbitrary non-negative terrain edge costs.
            </div>
            <div>
              <strong className="text-text">Greedy Best-First Search:</strong> Evaluates nodes using purely $h(n)$ (distance to goal). Fast, but vulnerable to U-shaped traps and non-optimal.
            </div>
            <div>
              <strong className="text-text">A* Search:</strong> Combines actual cost $g(n)$ and estimated remaining cost $h(n)$ via $f(n) = g(n) + h(n)$. Guaranteed optimal when $h(n)$ is admissible ($h(n) \le h^*(n)$) and consistent.
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Heuristics & Admissibility */}
        <AccordionItem value="heuristics">
          <AccordionTrigger>Heuristics &amp; Admissibility Rules</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-3 text-text-muted leading-relaxed">
            <div>
              <strong className="text-text">Manhattan Distance:</strong> |dr| + |dc|. Admissible for 4-direction cardinal movement. Not admissible for 8-way diagonal moves.
            </div>
            <div>
              <strong className="text-text">Euclidean Distance:</strong> &radic;(dr&sup2; + dc&sup2;). Straight-line distance; always admissible for any geometric grid.
            </div>
            <div>
              <strong className="text-text">Chebyshev Distance:</strong> max(|dr|, |dc|). Admissible exclusively when diagonal moves cost 1.
            </div>
            <div>
              <strong className="text-text">Octile Distance:</strong> Combines straight and diagonal costs (max + (&radic;2 - 1)min). Standard admissible heuristic for diagonal grids without corner cutting.
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Optimality Metric */}
        <AccordionItem value="optimality">
          <AccordionTrigger>Optimality Metric Calculation ($C^* / C$)</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-2 text-text-muted leading-relaxed">
            <p>
              Optimality is calculated against the ground truth optimal path cost $C^*$ established by Dijkstra's algorithm:
            </p>
            <div className="p-3 bg-surface-2 border border-border rounded font-mono text-text">
              Optimality = C* / C_found (1.0 = 100% optimal)
            </div>
            <p>
              If an algorithm fails to reach the goal or if the goal is unreachable, optimality is 0.0 or undefined respectively.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Keyboard Shortcuts */}
        <AccordionItem value="shortcuts">
          <AccordionTrigger>Keyboard Shortcuts</AccordionTrigger>
          <AccordionContent className="text-text-muted leading-relaxed">
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div><kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-text">Space</kbd> Start / Pause Race</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-text">S</kbd> Step 1 expansion</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-text">R</kbd> Reset Race</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-text">1-5</kbd> Select Algorithms</div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
