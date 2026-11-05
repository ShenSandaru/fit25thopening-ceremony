import { Router } from "express";
import type { ActivityEntry } from "@fit-expo/shared";
import type { ServerEnv } from "../config/env.js";
import {
  createAbortHandler,
  createActivityListHandler,
  createDeviceStatusHandler,
  createPrepareHandler,
  createReleaseRoleHandler,
  createResetHandler,
  createStartHandler,
} from "../controllers/admin-controller.js";
import {
  createAssignHandler,
  createClaimDisplayHandler,
  createCurrentHandler,
  createReleaseHandler,
} from "../controllers/guest-session-controller.js";
import {
  createBeginActivationsHandler,
  createEventStateHandler,
} from "../controllers/event-controller.js";
import { createHealthHandler } from "../controllers/health-controller.js";
import { createRateLimiter } from "../middleware/rate-limit.js";
import { requireGuestSession } from "../middleware/require-guest-session.js";
import type { ActivityLog } from "../services/activity-log.js";
import type { GuestSessionService } from "../services/guest-session-service.js";
import type { CeremonyService } from "../state/ceremony-service.js";
import type { Clock } from "../state/clock.js";

export function createApiRouter(deps: {
  env: ServerEnv;
  ceremony: CeremonyService;
  sessions: GuestSessionService;
  activityLog: ActivityLog;
  clock: Clock;
  onPresenceChange?: () => void;
  onActivityLogged?: (entry: ActivityEntry) => void;
}): Router {
  const router = Router();
  const limitAssign = createRateLimiter({
    limit: 20,
    windowMs: 60_000,
    key: (req) => req.ip ?? "unknown",
  });

  router.get("/health", createHealthHandler(deps.env, deps.clock));
  router.post("/guest-sessions/assign", limitAssign, createAssignHandler(deps.sessions, deps.env));
  router.post(
    "/display-sessions/claim",
    limitAssign,
    createClaimDisplayHandler(deps.sessions, deps.env),
  );
  router.get("/guest-sessions/current", createCurrentHandler(deps.sessions));
  router.post("/guest-sessions/release", createReleaseHandler(deps.sessions, deps.env));
  router.post(
    "/guest-sessions/release-role",
    limitAssign,
    createReleaseRoleHandler(
      deps.sessions,
      deps.ceremony,
      deps.activityLog,
      deps.onPresenceChange,
      deps.onActivityLogged,
    ),
  );
  router.get(
    "/event/state",
    requireGuestSession(deps.sessions),
    createEventStateHandler(deps.ceremony),
  );
  router.post(
    "/event/begin-activations",
    limitAssign,
    createBeginActivationsHandler(deps.ceremony, deps.sessions),
  );
  router.post(
    "/event/prepare",
    limitAssign,
    createPrepareHandler(deps.ceremony, deps.activityLog, deps.onActivityLogged),
  );
  router.post(
    "/event/start",
    limitAssign,
    createStartHandler(deps.ceremony, deps.activityLog, deps.onActivityLogged),
  );
  router.post(
    "/event/abort",
    limitAssign,
    createAbortHandler(deps.ceremony, deps.activityLog, deps.onActivityLogged),
  );
  router.post(
    "/event/reset",
    limitAssign,
    createResetHandler(deps.ceremony, deps.activityLog, deps.onActivityLogged),
  );
  router.get("/event/activity", createActivityListHandler(deps.activityLog));
  router.get("/devices/status", createDeviceStatusHandler(deps.sessions));
  return router;
}
