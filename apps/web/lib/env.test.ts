import { describe, expect, it } from "vitest";
import { PublicEnvValidationError, parsePublicEnv } from "./env";

describe("parsePublicEnv", () => {
  it("accepts an http server URL", () => {
    expect(parsePublicEnv({ NEXT_PUBLIC_SERVER_URL: "http://192.168.1.20:4000" })).toEqual({
      NEXT_PUBLIC_SERVER_URL: "http://192.168.1.20:4000",
    });
  });

  it("accepts an https server URL", () => {
    expect(parsePublicEnv({ NEXT_PUBLIC_SERVER_URL: "https://ceremony.example" })).toHaveProperty(
      "NEXT_PUBLIC_SERVER_URL",
      "https://ceremony.example",
    );
  });

  it("rejects a missing server URL", () => {
    expect(() => parsePublicEnv({})).toThrow(PublicEnvValidationError);
    expect(() => parsePublicEnv({})).toThrow("NEXT_PUBLIC_SERVER_URL");
  });

  it("rejects non-http protocols", () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_SERVER_URL: "ftp://server:4000" })).toThrow(
      "NEXT_PUBLIC_SERVER_URL",
    );
  });
});
