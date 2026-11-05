import {
  DEFAULT_COUNTDOWN_DURATION_MS,
  DEFAULT_PREPARATION_DELAY_MS,
  DEFAULT_SERVER_PORT,
} from "@fit-expo/shared";
import { z } from "zod";

const corsOriginsSchema = z
  .string()
  .trim()
  .min(1)
  .transform((value, ctx) => {
    const origins = value
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    if (origins.length === 0) {
      ctx.addIssue({ code: "custom", message: "at least one origin is required" });
      return z.NEVER;
    }
    for (const origin of origins) {
      try {
        const url = new URL(origin);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          ctx.addIssue({ code: "custom", message: `invalid origin protocol: ${origin}` });
          return z.NEVER;
        }
        if (origin.endsWith("/")) {
          ctx.addIssue({
            code: "custom",
            message: `origins must not end with a slash: ${origin}`,
          });
          return z.NEVER;
        }
      } catch {
        ctx.addIssue({ code: "custom", message: `invalid origin URL: ${origin}` });
        return z.NEVER;
      }
    }
    return origins;
  });

const sessionSecretSchema = z.string().min(32, "SESSION_SECRET must be at least 32 characters");

/** Default time a disconnected tablet keeps its guest role before the role is released. */
export const DEFAULT_SESSION_RECONNECT_GRACE_MS = 60_000;

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().trim().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(DEFAULT_SERVER_PORT),
  CORS_ORIGINS: corsOriginsSchema,
  SESSION_SECRET: sessionSecretSchema,
  COUNTDOWN_DURATION_MS: z.coerce.number().int().positive().default(DEFAULT_COUNTDOWN_DURATION_MS),
  PREPARATION_DELAY_MS: z.coerce.number().int().nonnegative().default(DEFAULT_PREPARATION_DELAY_MS),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  SESSION_RECONNECT_GRACE_MS: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(DEFAULT_SESSION_RECONNECT_GRACE_MS),
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
});

export type ServerEnv = {
  NODE_ENV: "development" | "test" | "production";
  HOST: string;
  PORT: number;
  CORS_ORIGINS: string[];
  SESSION_SECRET: string;
  COUNTDOWN_DURATION_MS: number;
  PREPARATION_DELAY_MS: number;
  LOG_LEVEL: "debug" | "info" | "warn" | "error";
  SESSION_RECONNECT_GRACE_MS: number;
  COOKIE_SECURE: boolean;
};

export class EnvValidationError extends Error {
  readonly variables: readonly string[];

  constructor(variables: readonly string[]) {
    super(`Invalid or missing environment variables: ${variables.join(", ")}`);
    this.name = "EnvValidationError";
    this.variables = variables;
  }
}

/**
 * Parses and validates server configuration. Error messages name the offending
 * variables but never include their values, so secrets cannot leak into logs.
 */
export function parseServerEnv(source: NodeJS.ProcessEnv): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    const variables = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
    throw new EnvValidationError(variables);
  }

  const data = result.data;
  return {
    NODE_ENV: data.NODE_ENV,
    HOST: data.HOST,
    PORT: data.PORT,
    CORS_ORIGINS: data.CORS_ORIGINS,
    SESSION_SECRET: data.SESSION_SECRET,
    COUNTDOWN_DURATION_MS: data.COUNTDOWN_DURATION_MS,
    PREPARATION_DELAY_MS: data.PREPARATION_DELAY_MS,
    LOG_LEVEL: data.LOG_LEVEL,
    SESSION_RECONNECT_GRACE_MS: data.SESSION_RECONNECT_GRACE_MS,
    COOKIE_SECURE:
      data.COOKIE_SECURE === "true"
        ? true
        : data.COOKIE_SECURE === "false"
          ? false
          : data.NODE_ENV === "production",
  };
}

/** Origins allowed for CORS and Socket.IO. Wildcards are rejected by the schema. */
export function isAllowedOrigin(env: ServerEnv, origin: string | undefined): boolean {
  if (origin === undefined) {
    return false;
  }
  return env.CORS_ORIGINS.includes(origin);
}
