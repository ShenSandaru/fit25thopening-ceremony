import type { CeremonyState, DeviceStatus } from "@fit-expo/shared";
import { describe, expect, it } from "vitest";
import {
  acceptSnapshot,
  countdownCueDelays,
  countdownSecondsRemaining,
  displayView,
  estimateClockOffset,
  guestIndicatorStatus,
  serverNow,
} from "./ceremony-sync";

const state = (patch: Partial<CeremonyState>): CeremonyState => ({
  runId: "run-1",
  version: 1,
  status: "WAITING",
  activations: { chief: null, "vice-chancellor": null, dean: null },
  countdown: null,
  openedAt: null,
  abortedAt: null,
  updatedAt: 1_000,
  serverTime: 1_000,
  ...patch,
});

describe("ceremony sync", () => {
  it("drops stale versions and accepts a new run", () => {
    const current = state({ version: 4 });
    expect(acceptSnapshot(current, state({ version: 3 }))).toBeNull();
    expect(acceptSnapshot(current, state({ version: 4 }))?.version).toBe(4);
    expect(acceptSnapshot(current, state({ runId: "run-2", version: 1 }))?.runId).toBe("run-2");
  });

  it("estimates the server clock from the round trip", () => {
    expect(estimateClockOffset(1_000, 5_000, 1_200)).toBe(3_900);
    expect(serverNow(3_900, 2_000)).toBe(5_900);
  });

  it("derives countdown seconds from opensAt", () => {
    expect(countdownSecondsRemaining(10_500, 6_000)).toBe(5);
    expect(countdownSecondsRemaining(10_000, 9_100)).toBe(1);
    expect(countdownSecondsRemaining(10_000, 10_000)).toBe(0);
    expect(countdownSecondsRemaining(10_000, 11_000)).toBe(0);
  });

  it("skips countdown cues that already passed", () => {
    expect(countdownCueDelays(0, 5_000, 0)).toEqual([0, 1_000, 2_000, 3_000, 4_000]);
    expect(countdownCueDelays(0, 5_000, 2_500)).toEqual([500, 1_500]);
  });

  it("maps backend status to a display view", () => {
    expect(displayView({ state: null, connected: false, now: 0 })).toBe("reconnecting");
    expect(displayView({ state: state({}), connected: true, now: 0 })).toBe("welcome");
    expect(
      displayView({
        state: state({ status: "COLLECTING_ACTIVATIONS" }),
        connected: true,
        now: 0,
      }),
    ).toBe("waiting-for-activations");
    expect(
      displayView({
        state: state({ status: "ABORTED" }),
        connected: false,
        now: 0,
      }),
    ).toBe("aborted");
  });

  it("shows the all-ready beat only at the start of a countdown", () => {
    const countdown = {
      trigger: "ALL_ACTIVATED" as const,
      acceptedAt: 1_000,
      startsAt: 1_000,
      durationMs: 5_000,
      opensAt: 6_000,
    };
    expect(
      displayView({
        state: state({ status: "COUNTDOWN", countdown }),
        connected: true,
        now: 1_200,
      }),
    ).toBe("all-activated");
    expect(
      displayView({
        state: state({ status: "COUNTDOWN", countdown }),
        connected: true,
        now: 3_000,
      }),
    ).toBe("countdown");
  });

  it("keeps an activated guest lit after the tablet disconnects", () => {
    const devices: DeviceStatus[] = [
      { role: "chief", connected: false, connectionCount: 0, lastSeenAt: 50 },
    ];
    expect(
      guestIndicatorStatus(
        "chief",
        state({
          status: "COLLECTING_ACTIVATIONS",
          activations: {
            chief: { activatedAt: 40 },
            "vice-chancellor": null,
            dean: null,
          },
        }),
        devices,
      ),
    ).toBe("activated");
    expect(guestIndicatorStatus("dean", state({}), devices)).toBe("waiting");
    expect(guestIndicatorStatus("chief", state({}), devices)).toBe("disconnected");
  });
});
