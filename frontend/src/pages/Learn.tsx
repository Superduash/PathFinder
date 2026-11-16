import React, { useEffect } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Compass,
  Coins,
  Lightbulb,
  Circle,
  Triangle,
  Square,
  Diamond,
  Star,
  Hexagon,
  Table,
  BookOpen,
} from "lucide-react";
import { StartHere } from "@/components/learn/StartHere";
import { CostsLesson } from "@/components/learn/CostsLesson";
import { HintsLesson } from "@/components/learn/HintsLesson";
import { AlgorithmLesson } from "@/components/learn/AlgorithmLesson";
import { CheatSheet } from "@/components/learn/CheatSheet";
import { Glossary } from "@/components/learn/Glossary";

const NAV_ITEMS = [
  { id: "start", label: "Start here", icon: Compass },
  { id: "costs", label: "Costs (g, h, f)", icon: Coins },
  { id: "hints", label: "Distance Hints", icon: Lightbulb },
  { id: "bfs", label: "Breadth-First (BFS)", icon: Circle },
  { id: "dfs", label: "Depth-First (DFS)", icon: Triangle },
  { id: "ucs", label: "Uniform-Cost (UCS)", icon: Square },
  { id: "greedy", label: "Greedy Best-First", icon: Diamond },
  { id: "astar", label: "A* Search", icon: Star },
  { id: "bds", label: "Bidirectional (BDS)", icon: Hexagon },
  { id: "compare", label: "Compare & Cheat Sheet", icon: Table },
  { id: "glossary", label: "Glossary & Credits", icon: BookOpen },
];

export const LearnPage: React.FC = () => {
  const { lesson } = useParams<{ lesson?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Redirect legacy query param ?lesson=xyz -> /learn/xyz
  useEffect(() => {
    const legacyLesson = searchParams.get("lesson");
    if (legacyLesson) {
      navigate(`/learn/${legacyLesson}`, { replace: true });
    }
  }, [searchParams, navigate]);

  const activeLesson = lesson || "start";

  const renderContent = () => {
    switch (activeLesson) {
      case "start":
        return <StartHere />;
      case "costs":
        return <CostsLesson />;
      case "hints":
        return <HintsLesson />;
      case "bfs":
      case "dfs":
      case "ucs":
      case "greedy":
      case "astar":
      case "bds":
        return <AlgorithmLesson algorithmId={activeLesson} />;
      case "compare":
        return <CheatSheet />;
      case "glossary":
        return <Glossary />;
      default:
        return <StartHere />;
    }
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 flex flex-col lg:flex-row gap-8 items-start">
      {/* Mobile / Tablet Lesson Select (< 1024px) */}
      <div className="w-full lg:hidden p-4 rounded-2xl bg-surface border border-border">
        <label htmlFor="lesson-select" className="text-xs font-bold uppercase tracking-wider text-muted block mb-2">
          Select Lesson
        </label>
        <select
          id="lesson-select"
          value={activeLesson}
          onChange={(e) => navigate(`/learn/${e.target.value}`)}
          className="w-full h-11 px-3 rounded-xl bg-surface-2 border border-border text-sm font-semibold text-text focus:outline-none focus:ring-2 focus:ring-brand"
        >
          {NAV_ITEMS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop Sidebar (>= 1024px, 240px wide, sticky) */}
      <aside className="hidden lg:block w-[240px] shrink-0 sticky top-20 space-y-1 p-2 rounded-2xl bg-surface border border-border">
        <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted">
          Lessons &amp; Topics
        </div>
        <nav className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeLesson === item.id;
            return (
              <Link
                key={item.id}
                to={`/learn/${item.id}`}
                className={`flex items-center gap-3 px-3 h-[44px] rounded-xl text-[15px] font-medium transition-all ${
                  isActive
                    ? "bg-brand/15 text-brand font-bold border-l-4 border-brand shadow-xs"
                    : "text-muted hover:text-text hover:bg-surface-2 border-l-4 border-transparent"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 w-full">{renderContent()}</main>
    </div>
  );
};

export default LearnPage;
