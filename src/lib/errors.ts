import type { ActionErrorCode } from "@/lib/action-result";

export class AppError extends Error {
  constructor(public readonly code: ActionErrorCode, message: string) {
    super(message);
    this.name = "AppError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
