import type { ServerEnv } from "../config/env.js";

const LEVEL_ORDER = { debug: 10, info: 20, warn: 30, error: 40 } as const;

export type LogLevel = keyof typeof LEVEL_ORDER;

const SECRET_KEY_PATTERN =
  /(password|accesscode|access_code|secret|token|cookie|authorization|credential)/i;

function redactValue(key: string, value: unknown): unknown {
  if (SECRET_KEY_PATTERN.test(key)) {
    return "[REDACTED]";
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => redactValue(String(index), item));
  }
  if (value !== null && typeof value === "object") {
    return redactRecord(value as Record<string, unknown>);
  }
  return value;
}

export function redactRecord(input: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    output[key] = redactValue(key, value);
  }
  return output;
}

export type Logger = {
  debug: (message: string, data?: Record<string, unknown>) => void;
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
};

export function createLogger(env: Pick<ServerEnv, "LOG_LEVEL" | "NODE_ENV">): Logger {
  const minimum = LEVEL_ORDER[env.LOG_LEVEL];

  function write(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (LEVEL_ORDER[level] < minimum) {
      return;
    }
    const entry = {
      level,
      time: new Date().toISOString(),
      message,
      ...(data ? { data: redactRecord(data) } : {}),
    };
    const line = JSON.stringify(entry);
    if (level === "error") {
      console.error(line);
    } else if (level === "warn") {
      console.warn(line);
    } else {
      console.info(line);
    }
  }

  return {
    debug: (message, data) => write("debug", message, data),
    info: (message, data) => write("info", message, data),
    warn: (message, data) => write("warn", message, data),
    error: (message, data) => write("error", message, data),
  };
}
