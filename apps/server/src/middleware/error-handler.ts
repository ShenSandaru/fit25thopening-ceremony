import { ERROR_HTTP_STATUS, err, type ErrorCode } from "@fit-expo/shared";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { DomainError } from "../errors/domain-error.js";
import type { Logger } from "../utils/logger.js";

export function notFoundHandler(): RequestHandler {
  return (_req, res) => {
    res.status(404).json(err("VALIDATION_ERROR", "Not found"));
  };
}

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error, _req, res, _next) => {
    if (error instanceof DomainError) {
      res.status(error.httpStatus).json(err(error.code, error.message, error.details));
      return;
    }

    if (error instanceof ZodError) {
      res.status(ERROR_HTTP_STATUS.VALIDATION_ERROR).json(
        err("VALIDATION_ERROR", "Request validation failed", {
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        }),
      );
      return;
    }

    logger.error("Unhandled request error", {
      name: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? error.message : "unknown",
    });

    const code: ErrorCode = "INTERNAL_ERROR";
    res.status(ERROR_HTTP_STATUS[code]).json(err(code, "Internal server error"));
  };
}
