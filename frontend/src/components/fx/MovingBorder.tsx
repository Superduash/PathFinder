import React from "react";
import { cn } from "@/components/ui/button";

export const MovingBorderButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}> = ({ children, onClick, className = "" }) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative p-[1.5px] overflow-hidden rounded-2xl group cursor-pointer inline-flex",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-brand via-brand/40 to-brand rounded-2xl animate-spin [animation-duration:4s]" />
      <div className="relative px-8 py-4 bg-surface rounded-[14px] text-text font-semibold text-sm hover:bg-surface-2 transition-colors flex items-center justify-center gap-2">
        {children}
      </div>
    </div>
  );
};

