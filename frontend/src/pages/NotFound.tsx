import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs">
      <div className="p-8 bg-surface border border-border rounded-xl flex flex-col items-center max-w-sm">
        <AlertCircle className="w-10 h-10 text-warning mb-3" />
        <h1 className="text-xl font-bold text-text mb-1">404 — Page Not Found</h1>
        <p className="text-text-muted mb-6">
          The requested coordinate or view is not part of this path.
        </p>
        <Link
          to="/"
          className="px-4 py-2 bg-accent text-bg font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          Return to Visualizer
        </Link>
      </div>
    </div>
  );
};
