import { describe, expect, it } from "vitest";
import { redactRecord } from "./logger.js";

describe("redactRecord", () => {
  it("redacts secret-like keys without leaking values", () => {
    expect(
      redactRecord({
        password: "hunter2",
        accessCode: "tablet-code",
        SESSION_SECRET: "super-secret",
        role: "admin",
        nested: { token: "abc", ok: true },
      }),
    ).toEqual({
      password: "[REDACTED]",
      accessCode: "[REDACTED]",
      SESSION_SECRET: "[REDACTED]",
      role: "admin",
      nested: { token: "[REDACTED]", ok: true },
    });
  });
});
