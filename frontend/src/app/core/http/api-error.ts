import { HttpErrorResponse } from '@angular/common/http';

/** Error body returned by every backend service (common-lib ApiError). */
export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  fieldErrors?: Record<string, string>;
}

export function apiErrorOf(err: unknown): ApiError | null {
  if (err instanceof HttpErrorResponse && err.error && typeof err.error === 'object' && 'status' in err.error) {
    return err.error as ApiError;
  }
  return null;
}

/** The server's message, safe to show to users, or a fallback. */
export function apiMessage(err: unknown, fallback = 'Something went wrong. Try again.'): string {
  return apiErrorOf(err)?.message ?? fallback;
}

/** Per-field validation messages, keyed by request field name, for showing next to form controls. */
export function apiFieldErrors(err: unknown): Record<string, string> {
  return apiErrorOf(err)?.fieldErrors ?? {};
}
