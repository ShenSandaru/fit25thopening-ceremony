import {
  abortEventBodySchema,
  activityQuerySchema,
  err,
  isGuestRole,
  ok,
  prepareEventBodySchema,
  releaseRoleSessionBodySchema,
  resetEventBodySchema,
  startEventBodySchema,
  type ActivityEntry,
} from "@fit-expo/shared";
import type { RequestHandler } from "express";
import { DomainError } from "../errors/domain-error.js";
import type { ActivityLog } from "../services/activity-log.js";
import type { GuestSessionService } from "../services/guest-session-service.js";
import type { CeremonyService } from "../state/ceremony-service.js";

export function createPrepareHandler(
  ceremony: CeremonyService,
  activityLog: ActivityLog,
  onActivity?: (entry: ActivityEntry) => void,
): RequestHandler {
  return (req, res, next) => {
    const parsed = prepareEventBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json(err("VALIDATION_ERROR", "Invalid request body."));
      return;
    }
    try {
      const state = ceremony.prepare();
      const entry = activityLog.append({
        type: "ADMIN_ACTION",
        actorRole: "admin",
        message: "Organizer prepared ceremony for activations",
        data: { status: state.status, runId: state.runId, version: state.version },
      });
      onActivity?.(entry);
      res.status(200).json(ok(state));
    } catch (error) {
      next(error);
    }
  };
}

export function createStartHandler(
  ceremony: CeremonyService,
  activityLog: ActivityLog,
  onActivity?: (entry: ActivityEntry) => void,
): RequestHandler {
  return (req, res, next) => {
    const parsed = startEventBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json(err("VALIDATION_ERROR", "Invalid request body."));
      return;
    }
    try {
      const state = ceremony.start();
      const entry = activityLog.append({
        type: "ADMIN_ACTION",
        actorRole: "admin",
        message: "Organizer started activation phase",
        data: { status: state.status, runId: state.runId, version: state.version },
      });
      onActivity?.(entry);
      res.status(200).json(ok(state));
    } catch (error) {
      next(error);
    }
  };
}

export function createAbortHandler(
  ceremony: CeremonyService,
  activityLog: ActivityLog,
  onActivity?: (entry: ActivityEntry) => void,
): RequestHandler {
  return (req, res, next) => {
    const parsed = abortEventBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json(err("VALIDATION_ERROR", "Invalid request body."));
      return;
    }
    try {
      const state = ceremony.abort(parsed.data.reason);
      const entry = activityLog.append({
        type: "ADMIN_ACTION",
        actorRole: "admin",
        message: parsed.data.reason
          ? `Organizer aborted ceremony: ${parsed.data.reason}`
          : "Organizer aborted ceremony",
        data: {
          status: state.status,
          runId: state.runId,
          version: state.version,
          reason: parsed.data.reason ?? null,
        },
      });
      onActivity?.(entry);
      res.status(200).json(ok(state));
    } catch (error) {
      next(error);
    }
  };
}

export function createResetHandler(
  ceremony: CeremonyService,
  activityLog: ActivityLog,
  onActivity?: (entry: ActivityEntry) => void,
): RequestHandler {
  return (req, res, next) => {
    const parsed = resetEventBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json(err("VALIDATION_ERROR", "Invalid request body."));
      return;
    }
    try {
      const state = ceremony.reset();
      const entry = activityLog.append({
        type: "ADMIN_ACTION",
        actorRole: "admin",
        message: "Organizer reset ceremony to waiting state",
        data: { status: state.status, runId: state.runId, version: state.version },
      });
      onActivity?.(entry);
      res.status(200).json(ok(state));
    } catch (error) {
      next(error);
    }
  };
}

export function createActivityListHandler(activityLog: ActivityLog): RequestHandler {
  return (req, res, next) => {
    const parsed = activityQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json(err("VALIDATION_ERROR", "Invalid query parameters."));
      return;
    }
    try {
      const entries = activityLog.list(parsed.data.limit);
      res.status(200).json(ok({ entries }));
    } catch (error) {
      next(error);
    }
  };
}

export function createDeviceStatusHandler(sessions: GuestSessionService): RequestHandler {
  return (_req, res, next) => {
    try {
      res.status(200).json(
        ok({
          devices: sessions.presence(),
          availability: sessions.availability(),
        }),
      );
    } catch (error) {
      next(error);
    }
  };
}

export function createReleaseRoleHandler(
  sessions: GuestSessionService,
  ceremony: CeremonyService,
  activityLog: ActivityLog,
  onPresenceChange?: () => void,
  onActivity?: (entry: ActivityEntry) => void,
): RequestHandler {
  return (req, res, next) => {
    const parsed = releaseRoleSessionBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(err("VALIDATION_ERROR", "Invalid request body."));
      return;
    }
    try {
      const role = parsed.data.role;
      if (!isGuestRole(role)) {
        res.status(400).json(err("VALIDATION_ERROR", "Only guest roles can be released."));
        return;
      }

      const ceremonyState = ceremony.getState();
      if (ceremonyState.activations[role] !== null) {
        throw new DomainError(
          "INVALID_TRANSITION",
          `Cannot release tablet session for ${role}: this guest has already activated in the ceremony run.`,
          { role },
        );
      }

      const released = sessions.releaseRole(role);
      if (!released) {
        res.status(404).json(err("VALIDATION_ERROR", `No active session found for role ${role}.`));
        return;
      }

      onPresenceChange?.();

      const entry = activityLog.append({
        type: "ADMIN_ACTION",
        actorRole: "admin",
        message: `Organizer released tablet session for ${role}`,
        data: { role },
      });
      onActivity?.(entry);

      res.status(200).json(ok({ released: true, role }));
    } catch (error) {
      next(error);
    }
  };
}

