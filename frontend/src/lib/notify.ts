import { toast } from "sonner";
import { ApiError } from "./api";

export const notify = {
  success: (msg: string) => toast.success(msg),
  info: (msg: string) => toast.info(msg),
  warning: (msg: string) => toast.warning(msg),
  error: (err: unknown) => {
    if (err instanceof ApiError) {
      toast.error(`${err.code}: ${err.message}`, { id: err.code });
    } else if (err instanceof Error) {
      toast.error(err.message);
    } else {
      toast.error("An unexpected error occurred");
    }
  },
  promise: <T>(
    promise: Promise<T>,
    msgs: { loading: string; success: string | ((data: T) => string); error: string | ((err: any) => string) }
  ) => toast.promise(promise, msgs),
};

