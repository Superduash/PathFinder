import { toast } from "sonner";

/**
 * Beautiful, animated, closable toast notifications using sonner.
 * Automatically deduplicates repeated identical messages.
 */
export const notify = {
  success: (message: string, title?: string) => {
    const text = message.trim();
    toast.success(title ? `${title}: ${text}` : text, {
      id: `toast-${text}`,
    });
  },

  info: (message: string, title?: string) => {
    const text = message.trim();
    toast.info(title ? `${title}: ${text}` : text, {
      id: `toast-${text}`,
    });
  },

  warning: (message: string, title?: string) => {
    const text = message.trim();
    toast.warning(title ? `${title}: ${text}` : text, {
      id: `toast-${text}`,
    });
  },

  error: (err: unknown, title: string = "Error") => {
    let msg = "An unexpected error occurred";
    if (typeof err === "string") {
      msg = err;
    } else if (err && typeof err === "object") {
      if ("message" in err && typeof (err as { message: unknown }).message === "string") {
        msg = (err as { message: string }).message;
      } else {
        msg = JSON.stringify(err);
      }
    }
    const text = msg.trim();
    toast.error(title ? `${title}: ${text}` : text, {
      id: `toast-err-${text}`,
    });
  },
};
