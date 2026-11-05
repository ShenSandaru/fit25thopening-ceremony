import { err } from "@fit-expo/shared";
import type { RequestHandler } from "express";

type Bucket = number[];

export function createRateLimiter(options: {
  limit: number;
  windowMs: number;
  key: (req: Parameters<RequestHandler>[0]) => string;
}): RequestHandler {
  const buckets = new Map<string, Bucket>();

  return (req, res, next) => {
    const now = Date.now();
    const id = options.key(req);
    const recent = (buckets.get(id) ?? []).filter((at) => now - at < options.windowMs);
    if (recent.length >= options.limit) {
      res.status(429).json(err("RATE_LIMITED", "Too many requests. Try again shortly."));
      return;
    }
    recent.push(now);
    buckets.set(id, recent);
    next();
  };
}
