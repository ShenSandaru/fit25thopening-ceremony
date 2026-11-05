import type { RequestHandler } from "express";
import type { ServerEnv } from "../config/env.js";
import { isAllowedOrigin } from "../config/env.js";

export function corsMiddleware(env: ServerEnv): RequestHandler {
  return (req, res, next) => {
    const origin = req.header("origin");
    if (origin !== undefined && isAllowedOrigin(env, origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    }

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  };
}
