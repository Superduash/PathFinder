import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Compass, Check } from "lucide-react";

interface PresetsPopoverProps {
  onSelectPreset: (presetId: string) => void;
  activePreset?: string | null;
}

const PRESET_CARDS = [
  {
    id: "open_field",
    name: "Open Field",
    desc: "Unobstructed grid comparing raw search wavefront expansion.",
  },
  {
    id: "wall_with_gap",
    name: "Wall with a Gap",
    desc: "Narrow aperture testing detour navigation and funneling.",
  },
  {
    id: "greedy_trap",
    name: "Greedy Trap",
    desc: "U-shaped concavity that tricks distance heuristics.",
  },
  {
    id: "weighted_river",
    name: "River Crossing",
    desc: "High cost terrain showcasing Dijkstra/A* cost optimization.",
  },
  {
    id: "corridor_maze",
    name: "Twisty Corridors",
    desc: "Classic maze testing DFS deep probes vs BFS ring search.",
  },
  {
    id: "unreachable_goal",
    name: "Impossible Goal",
    desc: "Walled-off goal demonstrating complete exhaustive search.",
  },
];

export const PresetsPopover: React.FC<PresetsPopoverProps> = ({
  onSelectPreset,
  activePreset,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-2 hover:bg-surface text-text text-xs font-semibold transition-colors shadow-2xs"
      >
        <Compass className="w-3.5 h-3.5 text-brand" />
        <span>Presets</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted transition-transform duration-200" style={{ transform: isOpen ? "rotate(180deg)" : "none" }} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 sm:w-96 p-3 bg-surface border border-border rounded-xl shadow-xl z-50 flex flex-col gap-2">
          <div className="flex items-center justify-between pb-1 border-b border-border">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Choose Preset Maze
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {PRESET_CARDS.map((p) => {
              const isSelected = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectPreset(p.id);
                    setIsOpen(false);
                  }}
                  className={`flex flex-col text-left p-2 rounded-lg border transition-all text-xs ${
                    isSelected
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border bg-surface-2 hover:border-brand/40 text-text"
                  }`}
                >
                  <div className="flex items-center justify-between w-full font-bold">
                    <span>{p.name}</span>
                    {isSelected && <Check className="w-3 h-3 text-brand" />}
                  </div>
                  <span className="text-[10px] text-muted line-clamp-2 mt-0.5 leading-tight">
                    {p.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
