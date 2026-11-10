import React from "react";

export const Marquee: React.FC<{ items: string[] }> = ({ items }) => {
  return (
    <div className="w-full overflow-hidden whitespace-nowrap py-4 border-y border-border/40 bg-surface/40">
      <div className="inline-flex items-center gap-12 animate-marquee">
        {items.concat(items).map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 text-xs font-medium text-muted hover:text-text transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

