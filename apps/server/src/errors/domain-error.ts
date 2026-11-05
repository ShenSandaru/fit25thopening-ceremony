import { ERROR_HTTP_STATUS, type ErrorCode } from "@fit-expo/shared";

export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly details?: unknown;
  readonly httpStatus: number;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.details = details;
    this.httpStatus = ERROR_HTTP_STATUS[code];
  }
}
