import { createServer, type Server as HttpServer } from "node:http";
import type { Express } from "express";
import { createApp } from "./app.js";
import type { ServerEnv } from "./config/env.js";
import { ActivityLog } from "./services/activity-log.js";
import { GuestSessionService } from "./services/guest-session-service.js";
import { CeremonyService } from "./state/ceremony-service.js";
import { systemClock, type Clock } from "./state/clock.js";
import { createSocketServer, type CeremonySocketServer } from "./socket/index.js";
import { createLogger, type Logger } from "./utils/logger.js";

export type Runtime = {
  env: ServerEnv;
  app: Express;
  httpServer: HttpServer;
  io: CeremonySocketServer;
  ceremony: CeremonyService;
  sessions: GuestSessionService;
  activityLog: ActivityLog;
  clock: Clock;
  logger: Logger;
  dispose: () => void;
};

export function createRuntime(env: ServerEnv, options: { clock?: Clock } = {}): Runtime {
  const clock = options.clock ?? systemClock;
  const logger = createLogger(env);
  const ceremony = new CeremonyService({
    countdownDurationMs: env.COUNTDOWN_DURATION_MS,
    preparationDelayMs: env.PREPARATION_DELAY_MS,
    clock,
  });
  const sessions = new GuestSessionService({
    reconnectGraceMs: env.SESSION_RECONNECT_GRACE_MS,
    clock,
    secret: env.SESSION_SECRET,
  });
  const activityLog = new ActivityLog({ clock });
  const app = createApp({ env, ceremony, sessions, clock, logger });
  const httpServer = createServer(app);
  const io = createSocketServer({
    httpServer,
    env,
    ceremony,
    sessions,
    activityLog,
    clock,
    logger,
  });

  return {
    env,
    app,
    httpServer,
    io,
    ceremony,
    sessions,
    activityLog,
    clock,
    logger,
    dispose: () => {
      ceremony.dispose();
      sessions.dispose();
      void io.close();
    },
  };
}
