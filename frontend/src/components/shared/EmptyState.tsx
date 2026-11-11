import React from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-border bg-surface-2/30">
      <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-muted mb-3">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <h3 className="text-sm font-bold text-text mb-1">{title}</h3>
      <p className="text-xs text-muted max-w-sm leading-relaxed mb-4">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-3.5 py-1.5 rounded-lg bg-brand text-brand-ink text-xs font-bold shadow-xs hover:brightness-110 transition-all"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

