import type { ErrorCode } from "../constants/error-codes.js";

export type ApiError = {
  code: ErrorCode;
  message: string;
  details?: unknown;
};

export type OkResult<T> = { ok: true; data: T };
export type ErrResult = { ok: false; error: ApiError };
export type Result<T> = OkResult<T> | ErrResult;

export function ok<T>(data: T): OkResult<T> {
  return { ok: true, data };
}

export function err(code: ErrorCode, message: string, details?: unknown): ErrResult {
  return details === undefined
    ? { ok: false, error: { code, message } }
    : { ok: false, error: { code, message, details } };
}
