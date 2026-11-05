import { describe, expect, it } from "vitest";
import { DEFAULT_SERVER_PORT, PROJECT_NAME } from "./index.js";

describe("@fit-expo/shared public API", () => {
  it("exports the project name", () => {
    expect(PROJECT_NAME).toBe("FIT Expo Opening Ceremony");
  });

  it("exports the documented default server port", () => {
    expect(DEFAULT_SERVER_PORT).toBe(4000);
  });
});
