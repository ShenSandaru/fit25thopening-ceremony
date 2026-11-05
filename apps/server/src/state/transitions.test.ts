import { CEREMONY_STATUSES, type CeremonyStatus } from "@fit-expo/shared";
import { describe, expect, it } from "vitest";
import { ALLOWED_TRANSITIONS, canTransition, type CeremonyAction } from "./transitions.js";

const ACTIONS = Object.keys(ALLOWED_TRANSITIONS) as CeremonyAction[];

describe("transition table", () => {
  it("allows only the documented transitions", () => {
    const expected: Record<CeremonyAction, CeremonyStatus[]> = {
      prepare: ["WAITING"],
      start: ["READY"],
      activate: ["COLLECTING_ACTIVATIONS"],
      manualStart: ["COLLECTING_ACTIVATIONS"],
      open: ["COUNTDOWN"],
      abort: ["READY", "COLLECTING_ACTIVATIONS", "COUNTDOWN"],
      reset: ["READY", "COLLECTING_ACTIVATIONS", "OPENED", "ABORTED"],
    };

    for (const action of ACTIONS) {
      expect([...ALLOWED_TRANSITIONS[action]].sort()).toEqual([...expected[action]].sort());
    }
  });

  it("rejects every undocumented status/action pair", () => {
    for (const status of CEREMONY_STATUSES) {
      for (const action of ACTIONS) {
        const allowed = expectedAllowed(action, status);
        expect(canTransition(action, status)).toBe(allowed);
      }
    }
  });
});

function expectedAllowed(action: CeremonyAction, status: CeremonyStatus): boolean {
  return ALLOWED_TRANSITIONS[action].has(status);
}
