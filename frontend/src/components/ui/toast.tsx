import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { ApiError } from "@/lib/api";

export type ToastType = "success" | "info" | "warning" | "error";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id"> & { id?: string }) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let externalAddToast: ((toast: Omit<ToastItem, "id"> & { id?: string }) => void) | null = null;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ id, type, title, message, duration = 4000 }: Omit<ToastItem, "id"> & { id?: string }) => {
      // Deduplicate by message or custom id so identical toasts never stack
      const toastId = id || message.trim().toLowerCase();

      setToasts((prev) => {
        // If already present, don't duplicate; refresh timestamp by replacing
        const exists = prev.some((t) => t.id === toastId);
        if (exists) {
          return prev.map((t) => (t.id === toastId ? { ...t, type, title, message, duration } : t));
        }
        // Limit to max 3 simultaneous toasts to prevent screen pollution
        const next = [...prev, { id: toastId, type, title, message, duration }];
        return next.slice(-3);
      });

      // Auto dismiss
      if (duration > 0) {
        setTimeout(() => {
          removeToast(toastId);
        }, duration);
      }
    },
    [removeToast]
  );

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  externalAddToast = addToast;

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      {/* Toast Viewport Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-md shadow-xl text-xs transition-colors ${
                toast.type === "success"
                  ? "bg-surface/95 border-success/30 text-text shadow-success/5"
                  : toast.type === "error"
                  ? "bg-surface/95 border-danger/30 text-text shadow-danger/5"
                  : toast.type === "warning"
                  ? "bg-surface/95 border-warn/30 text-text shadow-warn/5"
                  : "bg-surface/95 border-brand/30 text-text shadow-brand/5"
              }`}
            >
              {/* Status Icon */}
              <div className="shrink-0 mt-0.5">
                {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-success" />}
                {toast.type === "error" && <AlertCircle className="w-4 h-4 text-danger" />}
                {toast.type === "warning" && <AlertTriangle className="w-4 h-4 text-warn" />}
                {toast.type === "info" && <Info className="w-4 h-4 text-brand" />}
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0 pr-1">
                {toast.title && <div className="font-semibold text-text mb-0.5">{toast.title}</div>}
                <div className="text-muted leading-relaxed font-medium">{toast.message}</div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-muted/60 hover:text-text p-1 rounded-md hover:bg-surface-2 transition-colors -mr-1 -mt-1"
                aria-label="Close toast"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

// Global notify singleton with strict deduplication
export const notify = {
  success: (message: string, title?: string) => {
    if (externalAddToast) {
      externalAddToast({ type: "success", message, title, id: `success-${message}` });
    }
  },
  info: (message: string, title?: string) => {
    if (externalAddToast) {
      externalAddToast({ type: "info", message, title, id: `info-${message}` });
    }
  },
  warning: (message: string, title?: string) => {
    if (externalAddToast) {
      externalAddToast({ type: "warning", message, title, id: `warning-${message}` });
    }
  },
  error: (err: unknown, title?: string) => {
    let msg = "An unexpected error occurred";
    let code = "ERROR";
    if (err instanceof ApiError) {
      msg = err.message;
      code = err.code;
    } else if (err instanceof Error) {
      msg = err.message;
    } else if (typeof err === "string") {
      msg = err;
    }
    if (externalAddToast) {
      externalAddToast({
        type: "error",
        title: title || code,
        message: msg,
        id: `error-${code}-${msg}`,
        duration: 6000,
      });
    }
  },
};
