import { describe, expect, it } from "vitest";
import { EnvValidationError, isAllowedOrigin, parseServerEnv } from "./env.js";

const validBase = {
  CORS_ORIGINS: "http://localhost:3000",
  SESSION_SECRET: "a".repeat(32),
};

describe("parseServerEnv", () => {
  it("applies documented defaults when optional variables are absent", () => {
    expect(parseServerEnv(validBase)).toEqual({
      NODE_ENV: "development",
      HOST: "0.0.0.0",
      PORT: 4000,
      CORS_ORIGINS: ["http://localhost:3000"],
      SESSION_SECRET: "a".repeat(32),
      COUNTDOWN_DURATION_MS: 5000,
      PREPARATION_DELAY_MS: 0,
      LOG_LEVEL: "info",
      SESSION_RECONNECT_GRACE_MS: 60_000,
      COOKIE_SECURE: false,
    });
  });

  it("parses provided values including multiple CORS origins", () => {
    expect(
      parseServerEnv({
        ...validBase,
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT: "5050",
        CORS_ORIGINS: "http://localhost:3000, https://display.example",
        COUNTDOWN_DURATION_MS: "7000",
        PREPARATION_DELAY_MS: "250",
        LOG_LEVEL: "warn",
      }),
    ).toEqual({
      NODE_ENV: "production",
      HOST: "127.0.0.1",
      PORT: 5050,
      CORS_ORIGINS: ["http://localhost:3000", "https://display.example"],
      SESSION_SECRET: "a".repeat(32),
      COUNTDOWN_DURATION_MS: 7000,
      PREPARATION_DELAY_MS: 250,
      LOG_LEVEL: "warn",
      SESSION_RECONNECT_GRACE_MS: 60_000,
      COOKIE_SECURE: true,
    });
  });

  it("rejects an invalid port and names the variable without its value", () => {
    const parse = () => parseServerEnv({ ...validBase, PORT: "not-a-port-secret" });
    expect(parse).toThrow(EnvValidationError);
    expect(parse).toThrow("PORT");
    expect(parse).not.toThrow("not-a-port-secret");
  });

  it("requires CORS_ORIGINS and SESSION_SECRET", () => {
    expect(() => parseServerEnv({ SESSION_SECRET: "a".repeat(32) })).toThrow("CORS_ORIGINS");
    expect(() => parseServerEnv({ CORS_ORIGINS: "http://localhost:3000" })).toThrow(
      "SESSION_SECRET",
    );
    expect(() =>
      parseServerEnv({ CORS_ORIGINS: "http://localhost:3000", SESSION_SECRET: "short" }),
    ).toThrow("SESSION_SECRET");
  });

  it("rejects wildcard and trailing-slash CORS origins", () => {
    expect(() => parseServerEnv({ ...validBase, CORS_ORIGINS: "*" })).toThrow("CORS_ORIGINS");
    expect(() => parseServerEnv({ ...validBase, CORS_ORIGINS: "http://localhost:3000/" })).toThrow(
      "CORS_ORIGINS",
    );
  });
});

describe("isAllowedOrigin", () => {
  it("matches only configured origins", () => {
    const env = parseServerEnv(validBase);
    expect(isAllowedOrigin(env, "http://localhost:3000")).toBe(true);
    expect(isAllowedOrigin(env, "http://evil.example")).toBe(false);
    expect(isAllowedOrigin(env, undefined)).toBe(false);
  });
});
