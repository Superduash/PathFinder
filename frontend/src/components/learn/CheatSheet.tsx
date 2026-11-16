import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, X, ArrowRight } from "lucide-react";
import { request } from "@/lib/api";
import { ALGORITHM_LESSONS } from "@/content/algorithms";

interface AlgorithmMeta {
  id: string;
  name: string;
  full_name?: string;
  family?: string;
  informed: boolean;
  data_structure?: string;
  picks_next?: string;
  uses_hint: boolean;
}

interface MetaResponse {
  algorithms: AlgorithmMeta[];
}

export const CheatSheet: React.FC = () => {
  const { data } = useQuery<MetaResponse>({
    queryKey: ["api-meta"],
    queryFn: () => request<MetaResponse>("/api/meta"),
    staleTime: Infinity,
  });

  const algorithms = data?.algorithms || [
    { id: "bfs", name: "Breadth-First Search", family: "Uninformed (blind) search", informed: false, data_structure: "Queue (FIFO)", picks_next: "oldest waiting", uses_hint: false },
    { id: "dfs", name: "Depth-First Search", family: "Uninformed (blind) search", informed: false, data_structure: "Stack (LIFO)", picks_next: "newest waiting", uses_hint: false },
    { id: "ucs", name: "Uniform-Cost Search (Dijkstra)", family: "Uninformed (blind) search", informed: false, data_structure: "Priority queue by g", picks_next: "lowest g", uses_hint: false },
    { id: "greedy", name: "Greedy Best-First Search", family: "Informed (heuristic) search", informed: true, data_structure: "Priority queue by h", picks_next: "lowest h", uses_hint: true },
    { id: "astar", name: "A* Search", family: "Informed (heuristic) search", informed: true, data_structure: "Priority queue by f = g + h", picks_next: "lowest f = g + h", uses_hint: true },
    { id: "bds", name: "Bidirectional Search", family: "Uninformed (blind) search", informed: false, data_structure: "Two FIFO queues", picks_next: "alternates queues", uses_hint: false },
  ];

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="space-y-3 pb-6 border-b border-border">
        <h1 className="text-3xl font-extrabold font-heading text-text">
          Algorithm Comparison &amp; Cheat Sheet
        </h1>
        <p className="text-lg text-text font-medium leading-relaxed">
          Side-by-side comparison of guarantees, data structures, and heuristic properties.
        </p>
      </div>

      <div className="overflow-x-auto border border-border rounded-2xl shadow-xl">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-surface-2 border-b border-border text-xs text-muted select-none">
            <tr>
              <th className="px-4 py-3">Algorithm</th>
              <th className="px-4 py-3">Family</th>
              <th className="px-4 py-3">Data Structure</th>
              <th className="px-4 py-3 text-center">Shortest Steps?</th>
              <th className="px-4 py-3 text-center">Cheapest Cost?</th>
              <th className="px-4 py-3 text-center">Uses Hint?</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {algorithms.map((alg) => {
              const localLesson = ALGORITHM_LESSONS[alg.id];
              return (
                <tr key={alg.id} className="hover:bg-surface-2/60 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-text">
                    <div className="flex flex-col">
                      <span>{alg.full_name || alg.name}</span>
                      <span className="text-xs text-muted font-normal uppercase font-mono">({alg.id})</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                        alg.informed
                          ? "bg-brand/20 text-brand"
                          : "bg-surface-2 text-muted border border-border"
                      }`}
                    >
                      {alg.informed ? "Informed" : "Uninformed"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-text">
                    {alg.data_structure || localLesson?.structure || "—"}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {localLesson?.shortestMoves ? (
                      <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-rose-500 mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {localLesson?.shortestCost ? (
                      <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-rose-500 mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {alg.uses_hint ? (
                      <Check className="w-4 h-4 text-brand mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-muted mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      to={`/learn/${alg.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                    >
                      <span>Lesson</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
