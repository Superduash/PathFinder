import React from "react";
import { cn } from "@/components/ui/button";

export const BentoGrid: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto w-full", className)}>
      {children}
    </div>
  );
};

export const BentoCard: React.FC<{
  title: string;
  description: string;
  header?: React.ReactNode;
  className?: string;
}> = ({ title, description, header, className = "" }) => {
  return (
    <div
      className={cn(
        "row-span-1 rounded-2xl group/bento hover:shadow-xl transition duration-200 shadow-input dark:shadow-none p-6 bg-surface border border-border justify-between flex flex-col space-y-4 hover:-translate-y-1 hover:border-brand/40",
        className
      )}
    >
      {header && <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl overflow-hidden">{header}</div>}
      <div className="group-hover/bento:translate-x-1 transition duration-200">
        <h3 className="font-bold text-text text-base mb-1">{title}</h3>
        <p className="font-normal text-muted text-xs leading-relaxed">{description}</p>
      </div>
    </div>
  );
};

