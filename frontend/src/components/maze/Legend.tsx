import React, { useState } from "react";
import { Info } from "lucide-react";

interface LegendItem {
  id: string;
  name: string;
  desc: string;
  draw: (ctx: CanvasRenderingContext2D, size: number) => void;
}

const LEGEND_ITEMS: LegendItem[] = [
  {
    id: "start",
    name: "Start",
    desc: "Starting coordinate for all algorithm search explorations.",
    draw: (ctx, s) => {
      ctx.fillStyle = "#16A34A";
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(s * 0.35, s * 0.25, 2, s * 0.5);
      ctx.beginPath();
      ctx.moveTo(s * 0.35 + 2, s * 0.25);
      ctx.lineTo(s * 0.75, s * 0.4);
      ctx.lineTo(s * 0.35 + 2, s * 0.55);
      ctx.closePath();
      ctx.fill();
    },
  },
  {
    id: "goal",
    name: "Goal",
    desc: "Target destination. Exploration halts when goal is expanded.",
    draw: (ctx, s) => {
      ctx.strokeStyle = "#DC2626";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#DC2626";
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  {
    id: "wall",
    name: "Wall",
    desc: "Impassable obstacle with infinite movement cost (∞).",
    draw: (ctx, s) => {
      ctx.fillStyle = "#232A3A";
      ctx.beginPath();
      ctx.roundRect(2, 2, s - 4, s - 4, 3);
      ctx.fill();
    },
  },
  {
    id: "checked",
    name: "Checked",
    desc: "Cells already inspected and popped from the search frontier.",
    draw: (ctx, s) => {
      ctx.fillStyle = "rgba(45, 212, 191, 0.28)";
      ctx.beginPath();
      ctx.roundRect(2, 2, s - 4, s - 4, 3);
      ctx.fill();
    },
  },
  {
    id: "waiting",
    name: "Waiting",
    desc: "Cells discovered on the frontier waiting to be evaluated.",
    draw: (ctx, s) => {
      ctx.strokeStyle = "#2DD4BF";
      ctx.lineWidth = 2;
      ctx.strokeRect(3, 3, s - 6, s - 6);
    },
  },
  {
    id: "route",
    name: "Route",
    desc: "Final shortest route reconstructed backward from goal to start.",
    draw: (ctx, s) => {
      ctx.strokeStyle = "#2DD4BF";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(3, s / 2);
      ctx.lineTo(s - 3, s / 2);
      ctx.stroke();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.stroke();
    },
  },
  {
    id: "sand",
    name: "Sand (cost 3)",
    desc: "Slow movement terrain. Costs 3.0× standard open floor.",
    draw: (ctx, s) => {
      ctx.fillStyle = "#282218";
      ctx.fillRect(1, 1, s - 2, s - 2);
      ctx.fillStyle = "#D97706";
      ctx.beginPath();
      ctx.arc(s * 0.35, s * 0.35, 1.5, 0, Math.PI * 2);
      ctx.arc(s * 0.65, s * 0.65, 1.5, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  {
    id: "water",
    name: "Water (cost 5)",
    desc: "Deep water hazard. Costs 5.0× standard open floor.",
    draw: (ctx, s) => {
      ctx.fillStyle = "#122538";
      ctx.fillRect(1, 1, s - 2, s - 2);
      ctx.strokeStyle = "#38BDF8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(3, s / 2);
      ctx.lineTo(s - 3, s / 2);
      ctx.stroke();
    },
  },
];

export const Legend: React.FC = () => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  return (
    <div className="w-full p-2.5 rounded-xl border border-border bg-surface flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-1.5 text-muted font-medium">
        <Info className="w-3.5 h-3.5 text-brand" />
        <span className="text-[11px] uppercase tracking-wider font-semibold">Legend:</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {LEGEND_ITEMS.map((item) => (
          <div
            key={item.id}
            className="relative flex items-center gap-1.5 cursor-pointer group"
            onMouseEnter={() => setActiveTooltip(item.id)}
            onMouseLeave={() => setActiveTooltip(null)}
          >
            <canvas
              width={16}
              height={16}
              className="w-4 h-4 rounded"
              ref={(canvas) => {
                if (canvas) {
                  const ctx = canvas.getContext("2d");
                  if (ctx) {
                    ctx.clearRect(0, 0, 16, 16);
                    item.draw(ctx, 16);
                  }
                }
              }}
            />
            <span className="text-text group-hover:text-brand font-medium transition-colors text-xs">
              {item.name}
            </span>

            {/* Hover Explainer Tooltip */}
            {activeTooltip === item.id && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-lg border border-border bg-surface-2 text-text text-[11px] shadow-lg whitespace-nowrap">
                {item.desc}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
