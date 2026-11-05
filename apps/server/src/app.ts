import express, { type Express } from "express";
import type { ServerEnv } from "./config/env.js";
import { corsMiddleware } from "./middleware/cors.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { createApiRouter } from "./routes/api.js";
import type { GuestSessionService } from "./services/guest-session-service.js";
import type { CeremonyService } from "./state/ceremony-service.js";
import type { Clock } from "./state/clock.js";
import type { Logger } from "./utils/logger.js";

export type AppDependencies = {
  env: ServerEnv;
  ceremony: CeremonyService;
  sessions: GuestSessionService;
  clock: Clock;
  logger: Logger;
};

export function createApp(deps: AppDependencies): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(corsMiddleware(deps.env));
  app.use(express.json({ limit: "10kb" }));
  app.use("/api", createApiRouter(deps));
  app.use(notFoundHandler());
  app.use(errorHandler(deps.logger));
  return app;
}
