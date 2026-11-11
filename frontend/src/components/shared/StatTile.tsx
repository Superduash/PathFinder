import React from "react";

interface StatTileProps {
  label: string;
  value: string | number;
  sublabel?: string;
  badge?: string;
  badgeColor?: string;
  icon?: React.ReactNode;
}

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  sublabel,
  badge,
  badgeColor = "text-brand bg-brand/10",
  icon,
}) => {
  return (
    <div className="flex flex-col gap-1 p-3.5 rounded-xl border border-border bg-surface shadow-2xs">
      <div className="flex items-center justify-between text-muted text-xs">
        <span className="font-medium">{label}</span>
        {icon && <span className="opacity-70">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2 mt-0.5">
        <span className="text-xl font-bold font-mono text-text tracking-tight">
          {value}
        </span>
        {badge && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>
      {sublabel && (
        <span className="text-[11px] text-muted leading-tight">{sublabel}</span>
      )}
    </div>
  );
};
