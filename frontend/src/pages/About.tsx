import React from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export const AboutPage: React.FC = () => {
  return (
    <div className="flex-1 p-6 md:p-12 max-w-5xl mx-auto w-full flex flex-col gap-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text">About PathFinder</h1>
        <p className="text-muted text-base mt-2 leading-relaxed">
          PathFinder is an open interactive AI search algorithm visualizer, benchmark harness, and machine learning testbed designed to explain and compare classical heuristic search algorithms against learned models.
        </p>
      </div>

      <Accordion type="single" collapsible defaultValue="algorithms" className="w-full space-y-4">
        {/* Algorithms */}
        <AccordionItem value="algorithms" className="border border-border rounded-2xl bg-surface px-6">
          <AccordionTrigger className="text-base font-bold text-text hover:no-underline">
            The Five Racers &amp; Search Strategies
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4 text-sm text-muted leading-relaxed pt-2">
            <div>
              <strong className="text-text">● Breadth-First Search (BFS):</strong> Explores cells in concentric rings using a FIFO queue. Guarantees the shortest path on unweighted grids ($O(V + E)$).
            </div>
            <div>
              <strong className="text-text">▲ Depth-First Search (DFS):</strong> Plunges deep down individual corridors using a LIFO stack. Non-optimal, but uses minimal memory when corridors are narrow.
            </div>
            <div>
              <strong className="text-text">■ Uniform-Cost Search (UCS / Dijkstra):</strong> Prioritizes nodes with lowest cumulative cost $g(n)$ using a Priority Queue. Mathematically optimal on arbitrary terrain.
            </div>
            <div>
              <strong className="text-text">◆ Greedy Best-First Search:</strong> Evaluates nodes based purely on distance to target $h(n)$. Extremely fast in open fields, but easily trapped in U-shaped obstacles.
            </div>
            <div>
              <strong className="text-text">★ A* Search:</strong> Combines actual cost $g(n)$ with remaining distance estimate $h(n)$ via evaluation function $f(n) = g(n) + h(n)$. Optimal and optimally efficient.
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Heuristics */}
        <AccordionItem value="heuristics" className="border border-border rounded-2xl bg-surface px-6">
          <AccordionTrigger className="text-base font-bold text-text hover:no-underline">
            Distance Hints (Heuristics) &amp; Admissibility
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-3 text-sm text-muted leading-relaxed pt-2">
            <p>
              A heuristic is <strong>admissible</strong> if it never overestimates the true cost to reach the goal ($h(n) \le h^*(n)$).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-xl border border-border bg-surface-2">
                <span className="font-bold text-text block mb-1">Manhattan Distance</span>
                <span>|dr| + |dc|. Admissible for 4-direction movements. Overestimates if diagonal moves are allowed.</span>
              </div>
              <div className="p-4 rounded-xl border border-border bg-surface-2">
                <span className="font-bold text-text block mb-1">Euclidean Distance</span>
                <span>&radic;(dr&sup2; + dc&sup2;). Straight-line geometry. Always admissible for geometric grids.</span>
              </div>
              <div className="p-4 rounded-xl border border-border bg-surface-2">
                <span className="font-bold text-text block mb-1">Chebyshev Distance</span>
                <span>max(|dr|, |dc|). Admissible when diagonal steps have cost 1.0.</span>
              </div>
              <div className="p-4 rounded-xl border border-border bg-surface-2">
                <span className="font-bold text-text block mb-1">Octile Distance</span>
                <span>Standard diagonal metric balancing cardinal and (&radic;2 - 1) diagonal edge steps.</span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Optimality Formula */}
        <AccordionItem value="optimality" className="border border-border rounded-2xl bg-surface px-6">
          <AccordionTrigger className="text-base font-bold text-text hover:no-underline">
            Quality vs Best Formula ($C^* / C$)
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-3 text-sm text-muted leading-relaxed pt-2">
            <p>
              PathFinder measures solution quality against the true optimal path cost $C^*$ established by an independent Dijkstra sweep:
            </p>
            <div className="p-4 rounded-xl bg-surface-2 font-mono text-sm text-brand font-bold border border-border">
              Optimality = C* / C_found (1.0 = 100% optimal)
            </div>
            <p>
              If a search fails or if no path exists, optimality is 0.0 or null respectively.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Keyboard Shortcuts */}
        <AccordionItem value="shortcuts" className="border border-border rounded-2xl bg-surface px-6">
          <AccordionTrigger className="text-base font-bold text-text hover:no-underline">
            Keyboard Shortcuts
          </AccordionTrigger>
          <AccordionContent className="grid grid-cols-2 gap-3 text-xs font-mono pt-2">
            <div className="p-3 rounded-lg border border-border bg-surface-2 flex justify-between">
              <span className="text-text">Start / Pause Race</span>
              <span className="px-2 py-0.5 rounded bg-surface border border-border text-brand font-bold">Space</span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-surface-2 flex justify-between">
              <span className="text-text">Step 1 Expansion</span>
              <span className="px-2 py-0.5 rounded bg-surface border border-border text-brand font-bold">S</span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-surface-2 flex justify-between">
              <span className="text-text">Reset Current Race</span>
              <span className="px-2 py-0.5 rounded bg-surface border border-border text-brand font-bold">R</span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-surface-2 flex justify-between">
              <span className="text-text">Draw Walls</span>
              <span className="px-2 py-0.5 rounded bg-surface border border-border text-brand font-bold">Click + Drag</span>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
