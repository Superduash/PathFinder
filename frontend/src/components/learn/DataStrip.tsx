import React from "react";
import { ArrowRight } from "lucide-react";

interface QueueItem {
  idx: number;
  g: number;
  h: number | null;
  f: number | null;
}

interface DataStripProps {
  algorithm: string;
  dataStructureTitle: string;
  cols: number;
  queues: {
    main?: QueueItem[];
    forward?: QueueItem[];
    backward?: QueueItem[];
  };
  queueSize: {
    main?: number;
    forward?: number;
    backward?: number;
  };
}

export const DataStrip: React.FC<DataStripProps> = ({
  algorithm,
  dataStructureTitle,
  cols,
  queues,
  queueSize,
}) => {
  const isBds = algorithm === "bds";

  const renderTokens = (items: QueueItem[] = [], totalCount = 0, sideColor?: string) => {
    const displayed = items.slice(0, 8);
    const overflow = Math.max(0, totalCount - displayed.length);

    if (displayed.length === 0) {
      return <div className="text-sm text-muted italic py-1">Empty (queue drained)</div>;
    }

    return (
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {displayed.map((item, idx) => {
          const r = Math.floor(item.idx / cols);
          const c = item.idx % cols;
          const isNext = idx === 0;

          let valueText = "";
          let decidingValue: React.ReactNode = null;

          if (algorithm === "astar") {
            valueText = `g ${item.g} + h ${item.h ?? 0} = `;
            decidingValue = <strong className="text-text font-bold">f {item.f ?? (item.g + (item.h ?? 0))}</strong>;
          } else if (algorithm === "greedy") {
            decidingValue = <strong className="text-text font-bold">h {item.h ?? 0}</strong>;
          } else if (algorithm === "ucs") {
            decidingValue = <strong className="text-text font-bold">g {item.g}</strong>;
          } else {
            // BFS, DFS, BDS
            decidingValue = <span className="text-text">g {item.g}</span>;
          }

          return (
            <div
              key={item.idx}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-mono transition-all ${
                isNext
                  ? "bg-brand/15 border-brand ring-1 ring-brand/40 shadow-xs"
                  : "bg-surface-2 border-border text-muted"
              }`}
              style={sideColor && isNext ? { borderColor: sideColor } : undefined}
            >
              {isNext && (
                <span className="flex items-center text-brand" title="Next cell out">
                  <ArrowRight className="w-3 h-3" />
                </span>
              )}
              <span className="text-text font-semibold">({r},{c})</span>
              <span className="text-muted text-[11px] ml-0.5">
                {valueText}
                {decidingValue}
              </span>
            </div>
          );
        })}
        {overflow > 0 && (
          <span className="text-xs text-muted font-medium px-2 py-1 bg-surface-2 border border-border rounded-lg">
            +{overflow} more
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
          Waiting Frontier
        </h4>
        <span className="text-xs text-muted font-mono">{dataStructureTitle}</span>
      </div>

      {isBds ? (
        <div className="space-y-3 pt-1">
          <div>
            <div className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Forward wave (from Start) · {queueSize.forward ?? 0} waiting
            </div>
            {renderTokens(queues.forward, queueSize.forward, "#10B981")}
          </div>
          <div>
            <div className="text-xs font-semibold text-rose-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              Backward wave (from Goal) · {queueSize.backward ?? 0} waiting
            </div>
            {renderTokens(queues.backward, queueSize.backward, "#F43F5E")}
          </div>
        </div>
      ) : (
        renderTokens(queues.main, queueSize.main)
      )}
    </div>
  );
};
