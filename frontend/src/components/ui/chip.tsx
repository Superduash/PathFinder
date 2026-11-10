import * as React from "react";
import { cn } from "./button";

export interface ChipProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "brand" | "outline" | "success" | "warning";
}

export const Chip = React.forwardRef<HTMLDivElement, ChipProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-surface-2 text-muted border-border",
      brand: "bg-brand/15 text-brand border-brand/30 font-semibold",
      outline: "border-border text-text bg-transparent",
      success: "bg-success/15 text-success border-success/30 font-semibold",
      warning: "bg-warn/15 text-warn border-warn/30 font-semibold",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Chip.displayName = "Chip";
