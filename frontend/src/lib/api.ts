import type { ApiErrorEnvelope } from "./types";

export class ApiError extends Error {
  code: string;
  details?: unknown;
  status: number;

  constructor(code: string, message: string, details?: unknown, status: number = 400) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(endpoint, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    let code = "UNKNOWN_ERROR";
    let message = `Request failed with status ${res.status}`;
    let details: unknown = undefined;

    try {
      const errData = (await res.json()) as ApiErrorEnvelope;
      if (errData?.error) {
        code = errData.error.code || code;
        message = errData.error.message || message;
        details = errData.error.details;
      }
    } catch {
      // not JSON error envelope
    }
    throw new ApiError(code, message, details, res.status);
  }

  return (await res.json()) as T;
}

