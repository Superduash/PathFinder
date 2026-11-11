import React from "react";
import { Sparkles } from "lucide-react";

interface InsightCardProps {
  title: string;
  description: string;
  tag?: string;
  icon?: React.ReactNode;
}

export const InsightCard: React.FC<InsightCardProps> = ({
  title,
  description,
  tag,
  icon,
}) => {
  return (
    <div className="p-3.5 rounded-xl border border-border bg-surface-2/60 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-brand/15 border border-brand/20 flex items-center justify-center text-brand shrink-0 mt-0.5">
        {icon || <Sparkles className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-text">{title}</span>
          {tag && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border text-muted">
              {tag}
            </span>
          )}
        </div>
        <p className="text-xs text-muted mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
};

