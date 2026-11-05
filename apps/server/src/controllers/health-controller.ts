import type { RequestHandler } from "express";
import type { ServerEnv } from "../config/env.js";
import type { Clock } from "../state/clock.js";

export function createHealthHandler(env: ServerEnv, clock: Clock): RequestHandler {
  return (_req, res) => {
    res.status(200).json({
      ok: true,
      data: {
        status: "ok",
        environment: env.NODE_ENV,
        serverTime: clock.now(),
      },
    });
  };
}
