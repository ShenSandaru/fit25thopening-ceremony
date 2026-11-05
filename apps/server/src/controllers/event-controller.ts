import { err, ok } from "@fit-expo/shared";
import type { RequestHandler } from "express";
import { DomainError } from "../errors/domain-error.js";
import type { GuestSessionService } from "../services/guest-session-service.js";
import type { CeremonyService } from "../state/ceremony-service.js";

export function createEventStateHandler(ceremony: CeremonyService): RequestHandler {
  return (_req, res) => {
    res.status(200).json(ok(ceremony.getState()));
  };
}

/**
 * Interim activation-phase start for the display, until the admin dashboard exists.
 * Idempotent while already collecting. Does not start the countdown.
 */
export function createBeginActivationsHandler(
  ceremony: CeremonyService,
  sessions: GuestSessionService,
): RequestHandler {
  return (req, res, next) => {
    const session = sessions.current(req.headers.cookie);
    if (!session) {
      res.status(401).json(err("UNAUTHORIZED", "A display session is required."));
      return;
    }
    if (session.role !== "display") {
      res.status(403).json(err("FORBIDDEN", "Only the display can begin activations."));
      return;
    }
    try {
      const status = ceremony.getState().status;
      if (status === "WAITING") {
        ceremony.prepare();
      }
      const prepared = ceremony.getState().status;
      if (prepared === "READY") {
        ceremony.start();
      } else if (prepared !== "COLLECTING_ACTIVATIONS") {
        throw new DomainError(
          "INVALID_TRANSITION",
          `Cannot begin activations while ceremony is ${prepared}`,
          { status: prepared },
        );
      }
      res.status(200).json(ok(ceremony.getState()));
    } catch (error) {
      next(error);
    }
  };
}
