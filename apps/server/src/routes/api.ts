import { Router } from "express";
import type { ServerEnv } from "../config/env.js";
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
import type { GuestSessionService } from "../services/guest-session-service.js";
import type { CeremonyService } from "../state/ceremony-service.js";
import type { Clock } from "../state/clock.js";

export function createApiRouter(deps: {
  env: ServerEnv;
  ceremony: CeremonyService;
  sessions: GuestSessionService;
  clock: Clock;
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
  return router;
}
