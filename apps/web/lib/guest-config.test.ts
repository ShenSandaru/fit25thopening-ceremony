import {
  GENERIC_GUEST_LABELS,
  formatGuestRole,
  guestNumberToRole,
  roleToGuestRoute,
  viewFromCeremony,
} from "./guest-config";
import type { CeremonyState } from "@fit-expo/shared";
import { describe, expect, it } from "vitest";

const base: CeremonyState = {
  runId: "run",
  version: 1,
  status: "WAITING",
  activations: { chief: null, "vice-chancellor": null, dean: null },
  countdown: null,
  openedAt: null,
  abortedAt: null,
  updatedAt: 1,
  serverTime: 1,
};

describe("viewFromCeremony", () => {
  it("waits until the server is collecting activations", () => {
    expect(viewFromCeremony(base, "chief", false, true)).toBe("waiting");
  });

  it("is ready only while collecting and this guest has not activated", () => {
    expect(
      viewFromCeremony({ ...base, status: "COLLECTING_ACTIVATIONS" }, "dean", false, true),
    ).toBe("ready");
  });

  it("shows activated only from server state, not while submitting", () => {
    expect(
      viewFromCeremony({ ...base, status: "COLLECTING_ACTIVATIONS" }, "chief", true, true),
    ).toBe("submitting");
    expect(
      viewFromCeremony(
        {
          ...base,
          status: "COLLECTING_ACTIVATIONS",
          activations: { ...base.activations, chief: { activatedAt: 5 } },
        },
        "chief",
        false,
        true,
      ),
    ).toBe("activated");
  });

  it("keeps an accepted activation visible after disconnect when state is known", () => {
    expect(
      viewFromCeremony(
        {
          ...base,
          status: "COLLECTING_ACTIVATIONS",
          activations: { ...base.activations, dean: { activatedAt: 9 } },
        },
        "dean",
        false,
        false,
      ),
    ).toBe("activated");
  });

  it("maps internal roles to generic labels and routes consistently", () => {
    expect(GENERIC_GUEST_LABELS.chief).toEqual({
      label: "Guest 1",
      position: "Left",
      station: "STATION 01",
      index: 1,
      route: "/guest/1",
    });
    expect(GENERIC_GUEST_LABELS["vice-chancellor"]).toEqual({
      label: "Guest 2",
      position: "Center",
      station: "STATION 02",
      index: 2,
      route: "/guest/2",
    });
    expect(GENERIC_GUEST_LABELS.dean).toEqual({
      label: "Guest 3",
      position: "Right",
      station: "STATION 03",
      index: 3,
      route: "/guest/3",
    });
    expect(roleToGuestRoute("chief")).toBe("/guest/1");
    expect(roleToGuestRoute("vice-chancellor")).toBe("/guest/2");
    expect(roleToGuestRoute("dean")).toBe("/guest/3");
    expect(guestNumberToRole("1")).toBe("chief");
    expect(guestNumberToRole("2")).toBe("vice-chancellor");
    expect(guestNumberToRole("3")).toBe("dean");
    expect(formatGuestRole("chief")).toBe("Guest 1");
    expect(formatGuestRole("vice-chancellor")).toBe("Guest 2");
    expect(formatGuestRole("dean")).toBe("Guest 3");
  });
});
