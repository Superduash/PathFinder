import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Home, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs">
      <div className="p-8 bg-surface border border-border rounded-2xl flex flex-col items-center max-w-sm shadow-xl">
        <div className="w-12 h-12 rounded-full bg-warn/15 border border-warn/30 flex items-center justify-center text-warn mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-text mb-1.5">404 — Page Not Found</h1>
        <p className="text-muted mb-6 leading-relaxed">
          The requested coordinate or view is not part of this search space.
        </p>
        <div className="flex items-center gap-3 w-full">
          <Link to="/" className="flex-1">
            <Button variant="secondary" className="w-full gap-1.5 text-xs">
              <Home className="w-3.5 h-3.5" /> Home
            </Button>
          </Link>
          <Link to="/visualizer" className="flex-1">
            <Button className="w-full gap-1.5 text-xs">
              <Play className="w-3.5 h-3.5" /> Visualizer
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

