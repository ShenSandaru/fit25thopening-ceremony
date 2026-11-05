import { viewFromCeremony } from "./guest-config";
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
});
