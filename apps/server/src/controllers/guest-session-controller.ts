import { assignGuestSessionBodySchema, err, ok } from "@fit-expo/shared";
import type { RequestHandler } from "express";
import type { ServerEnv } from "../config/env.js";
import { DomainError } from "../errors/domain-error.js";
import type { GuestSessionService } from "../services/guest-session-service.js";

export function createAssignHandler(sessions: GuestSessionService, env: ServerEnv): RequestHandler {
  return (req, res, next) => {
    const parsed = assignGuestSessionBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(err("VALIDATION_ERROR", "Request validation failed."));
      return;
    }
    try {
      const session = sessions.assign(parsed.data.role, req.headers.cookie);
      sessions.writeCookie(res, env, session.id);
      res.status(200).json(
        ok({
          role: session.role,
          status: session.status,
          expiresAt: session.expiresAt,
        }),
      );
    } catch (error) {
      next(error);
    }
  };
}

export function createCurrentHandler(sessions: GuestSessionService): RequestHandler {
  return (req, res) => {
    const session = sessions.current(req.headers.cookie);
    if (!session) {
      res.status(401).json(err("UNAUTHORIZED", "No active guest device session."));
      return;
    }
    res.status(200).json(
      ok({
        role: session.role,
        status: session.status,
        expiresAt: session.expiresAt,
        availability: sessions.availability(),
      }),
    );
  };
}

export function createClaimDisplayHandler(
  sessions: GuestSessionService,
  env: ServerEnv,
): RequestHandler {
  return (req, res, next) => {
    try {
      const session = sessions.claimDisplay(req.headers.cookie);
      sessions.writeCookie(res, env, session.id);
      res.status(200).json(
        ok({
          role: session.role,
          status: session.status,
          expiresAt: session.expiresAt,
        }),
      );
    } catch (error) {
      next(error);
    }
  };
}

export function createReleaseHandler(
  sessions: GuestSessionService,
  env: ServerEnv,
): RequestHandler {
  return (req, res) => {
    const session = sessions.current(req.headers.cookie);
    if (!session) {
      res.status(401).json(err("UNAUTHORIZED", "No active guest device session."));
      return;
    }
    sessions.release(session.id);
    sessions.clearCookie(res, env);
    res.status(200).json(ok({ released: true }));
  };
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
