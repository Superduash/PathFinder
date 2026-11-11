import { toast } from "sonner";

/**
 * Beautiful, animated, closable toast notifications using sonner.
 * Deduplicates identical messages within a 1-second window.
 */

// Track recently-shown toast IDs to prevent flash-duplicates (React StrictMode double-fire, etc.)
const recentIds = new Set<string>();

function dedupedId(prefix: string, text: string): string {
  const id = `${prefix}:${text}`;
  if (recentIds.has(id)) return id; // already queued — sonner will coalesce via id
  recentIds.add(id);
  setTimeout(() => recentIds.delete(id), 1500);
  return id;
}

export const notify = {
  success: (message: string, title?: string) => {
    const text = message.trim();
    const label = title ? `${title}: ${text}` : text;
    toast.success(label, { id: dedupedId("ok", text) });
  },

  info: (message: string, title?: string) => {
    const text = message.trim();
    const label = title ? `${title}: ${text}` : text;
    toast.info(label, { id: dedupedId("info", text) });
  },

  warning: (message: string, title?: string) => {
    const text = message.trim();
    const label = title ? `${title}: ${text}` : text;
    toast.warning(label, { id: dedupedId("warn", text) });
  },

  error: (err: unknown, title: string = "Error") => {
    let msg = "An unexpected error occurred";
    if (typeof err === "string") {
      msg = err;
    } else if (err && typeof err === "object") {
      if (
        "message" in err &&
        typeof (err as { message: unknown }).message === "string"
      ) {
        msg = (err as { message: string }).message;
      } else {
        msg = JSON.stringify(err);
      }
    }
    const text = msg.trim();
    const label = title ? `${title}: ${text}` : text;
    toast.error(label, { id: dedupedId("err", text) });
  },

  dismiss: () => toast.dismiss(),
};
