export type ActionErrorCode =
  | "unauthenticated"
  | "not_found"
  | "forbidden"
  | "validation"
  | "conflict"
  | "infrastructure";

export type ActionResult<T> =
  | {
      success: true;
      data: T;
      error: null;
      code: null;
    }
  | {
      success: false;
      data: null;
      error: string;
      code: ActionErrorCode;
    };

export function ok<T>(data: T): ActionResult<T> {
  return {
    success: true,
    data,
    error: null,
    code: null,
  };
}

export function fail<T>(code: ActionErrorCode, error: string): ActionResult<T> {
  return {
    success: false,
    data: null,
    error,
    code,
  };
}
