import type { ServerEnv } from "../config/env.js";
import { parseServerEnv } from "../config/env.js";

export function createTestEnv(overrides: Record<string, string> = {}): ServerEnv {
  return parseServerEnv({
    NODE_ENV: "test",
    HOST: "127.0.0.1",
    PORT: "4010",
    CORS_ORIGINS: "http://localhost:3000",
    SESSION_SECRET: "test-session-secret-at-least-32-chars",
    COUNTDOWN_DURATION_MS: "3000",
    PREPARATION_DELAY_MS: "0",
    LOG_LEVEL: "error",
    ...overrides,
  });
}
