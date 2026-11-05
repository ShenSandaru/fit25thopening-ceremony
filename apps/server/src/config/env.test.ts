import { describe, expect, it } from "vitest";
import { EnvValidationError, parseServerEnv } from "./env.js";

describe("parseServerEnv", () => {
  it("applies documented defaults when variables are absent", () => {
    expect(parseServerEnv({})).toEqual({
      NODE_ENV: "development",
      HOST: "0.0.0.0",
      PORT: 4000,
    });
  });

  it("parses provided values", () => {
    expect(parseServerEnv({ NODE_ENV: "production", HOST: "127.0.0.1", PORT: "5050" })).toEqual({
      NODE_ENV: "production",
      HOST: "127.0.0.1",
      PORT: 5050,
    });
  });

  it("rejects an invalid port and names the variable without its value", () => {
    const parse = () => parseServerEnv({ PORT: "not-a-port-secret" });
    expect(parse).toThrow(EnvValidationError);
    expect(parse).toThrow("PORT");
    expect(parse).not.toThrow("not-a-port-secret");
  });

  it("rejects an unknown NODE_ENV", () => {
    expect(() => parseServerEnv({ NODE_ENV: "staging" })).toThrow("NODE_ENV");
  });
});
