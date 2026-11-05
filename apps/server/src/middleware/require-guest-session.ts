import { err, isGuestRole, type GuestRole } from "@fit-expo/shared";
import type { RequestHandler } from "express";
import type { GuestSessionService } from "../services/guest-session-service.js";

export type RequestWithSession = {
  guestRole?: GuestRole;
  guestSessionId?: string;
};

export function requireGuestSession(sessions: GuestSessionService): RequestHandler {
  return (req, res, next) => {
    const session = sessions.current(req.headers.cookie);
    if (!session || !isGuestRole(session.role)) {
      res.status(401).json(err("UNAUTHORIZED", "A guest device session is required."));
      return;
    }
    const augmented = req as typeof req & RequestWithSession;
    augmented.guestRole = session.role;
    augmented.guestSessionId = session.id;
    next();
  };
}
