import { describe, expect, it } from "vitest";
import {
  CEREMONY_STATUSES,
  CLIENT_EVENTS,
  DEFAULT_COUNTDOWN_DURATION_MS,
  DEFAULT_SERVER_PORT,
  GUEST_ROLES,
  MANUAL_START_CONFIRMATION,
  PROJECT_NAME,
  SERVER_EVENTS,
  guestActivatePayloadSchema,
  guestAuthBodySchema,
  isGuestRole,
  manualStartBodySchema,
} from "./index.js";

describe("@fit-expo/shared public API", () => {
  it("exports project constants", () => {
    expect(PROJECT_NAME).toBe("FIT EXPO INAUGURATION CEREMONY");
    expect(DEFAULT_SERVER_PORT).toBe(4000);
    expect(DEFAULT_COUNTDOWN_DURATION_MS).toBe(3000);
  });

  it("defines all ceremony statuses and guest roles", () => {
    expect(CEREMONY_STATUSES).toEqual([
      "WAITING",
      "READY",
      "COLLECTING_ACTIVATIONS",
      "COUNTDOWN",
      "OPENED",
      "ABORTED",
    ]);
    expect(GUEST_ROLES).toEqual(["chief", "vice-chancellor", "dean"]);
    expect(isGuestRole("dean")).toBe(true);
    expect(isGuestRole("admin")).toBe(false);
  });

  it("exposes socket event name constants", () => {
    expect(CLIENT_EVENTS.GUEST_ACTIVATE).toBe("guest:activate");
    expect(SERVER_EVENTS.EVENT_STATE).toBe("event:state");
    expect(SERVER_EVENTS.EVENT_COUNTDOWN_STARTED).toBe("event:countdown-started");
  });

  it("rejects unknown fields in guest activate payloads", () => {
    expect(guestActivatePayloadSchema.safeParse({}).success).toBe(true);
    expect(guestActivatePayloadSchema.safeParse({ role: "chief" }).success).toBe(false);
  });

  it("validates guest auth and manual-start bodies", () => {
    expect(
      guestAuthBodySchema.safeParse({ role: "chief", accessCode: "abcdefghijkl" }).success,
    ).toBe(true);
    expect(
      manualStartBodySchema.safeParse({
        confirmation: MANUAL_START_CONFIRMATION,
        password: "secret",
      }).success,
    ).toBe(true);
    expect(
      manualStartBodySchema.safeParse({
        confirmation: "wrong",
        password: "secret",
      }).success,
    ).toBe(false);
  });
});
