import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // silently caught — ErrorBoundary shows inline fallback UI
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-2xl border border-danger/30 bg-danger/5 text-text space-y-3 my-4">
          <div className="flex items-center gap-2 text-danger font-bold text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{this.props.fallbackTitle || "Something went wrong loading this component"}</span>
          </div>
          {this.state.error && (
            <p className="text-xs font-mono text-muted bg-surface p-3 rounded-lg border border-border overflow-x-auto">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs font-semibold hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try again</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
