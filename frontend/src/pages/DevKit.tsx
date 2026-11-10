import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

export const DevKitPage: React.FC = () => {
  return (
    <TooltipProvider>
      <div className="p-10 max-w-5xl mx-auto flex flex-col gap-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Design System &amp; Component Kit</h1>
          <p className="text-muted text-sm mt-1">Verification palette for light &amp; dark themes, typography scale, and components.</p>
        </div>

        {/* Algorithm Color Tokens */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Algorithm Hues &amp; Shapes</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { id: "BFS", color: "var(--alg-bfs)", shape: "●", role: "Unweighted Ring Search" },
              { id: "DFS", color: "var(--alg-dfs)", shape: "▲", role: "Deep Branch Explorer" },
              { id: "UCS", color: "var(--alg-ucs)", shape: "■", role: "Lowest-Cost First" },
              { id: "Greedy", color: "var(--alg-greedy)", shape: "◆", role: "Heuristic-Only Beam" },
              { id: "A*", color: "var(--alg-astar)", shape: "★", role: "Optimal Heuristic Search" },
            ].map((alg) => (
              <div key={alg.id} className="p-4 rounded-xl border border-border bg-surface flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base" style={{ color: alg.color }}>
                    {alg.shape} {alg.id}
                  </span>
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: alg.color }} />
                </div>
                <span className="text-xs text-muted leading-tight">{alg.role}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Buttons & Chips */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Buttons &amp; Chips</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="default">Primary Brand</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="outline">Outline Action</Button>
            <Button variant="ghost">Ghost Option</Button>
            <Button variant="danger">Destructive Action</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Chip variant="brand">Guarantees shortest path</Chip>
            <Chip variant="success">Optimal</Chip>
            <Chip variant="warning">Sub-optimal</Chip>
            <Chip variant="default">Heuristic: Manhattan</Chip>
            <Chip variant="outline">21 × 21 grid</Chip>
          </div>
        </section>

        {/* Cards & Controls */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Interactive Controls</CardTitle>
              <CardDescription>Sliders, switches, and accessible tooltips.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div>
                <span className="text-xs text-muted block mb-2 font-medium">Progress Indicator</span>
                <Progress value={65} />
              </div>
              <div>
                <span className="text-xs text-muted block mb-2 font-medium">Continuous Slider</span>
                <Slider defaultValue={[5]} min={1} max={10} step={1} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text font-medium">Diagonal Movements</span>
                <Switch defaultChecked />
              </div>
              <div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm">Hover for Tooltip</Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Explains search mechanics clearly without technical jargon.
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Typography &amp; Readability</CardTitle>
              <CardDescription>Inter Variable with tabular digits enabled.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <p className="text-muted leading-relaxed">
                Body copy is set to a calm, comfortable 16 px base line-height for effortless legibility.
              </p>
              <div className="p-3 bg-surface-2 rounded-lg border border-border flex justify-between items-center tabular-nums font-medium">
                <span>Visited cells:</span>
                <span className="text-brand font-bold text-base">142</span>
              </div>
              <div className="p-3 bg-surface-2 rounded-lg border border-border flex justify-between items-center tabular-nums font-medium">
                <span>Optimality metric:</span>
                <span className="text-success font-bold text-base">100.0%</span>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </TooltipProvider>
  );
};

