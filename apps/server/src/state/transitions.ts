import type { CeremonyStatus } from "@fit-expo/shared";

export type CeremonyAction =
  "prepare" | "start" | "activate" | "manualStart" | "open" | "abort" | "reset";

/**
 * Allowed transitions as data. Exhaustively tested in ceremony-service.test.ts.
 * Anything not listed is rejected with INVALID_TRANSITION.
 */
export const ALLOWED_TRANSITIONS: Readonly<Record<CeremonyAction, ReadonlySet<CeremonyStatus>>> = {
  prepare: new Set(["WAITING"]),
  start: new Set(["READY"]),
  activate: new Set(["COLLECTING_ACTIVATIONS"]),
  manualStart: new Set(["COLLECTING_ACTIVATIONS"]),
  open: new Set(["COUNTDOWN"]),
  abort: new Set(["READY", "COLLECTING_ACTIVATIONS", "COUNTDOWN"]),
  reset: new Set(["READY", "COLLECTING_ACTIVATIONS", "OPENED", "ABORTED"]),
};

export function canTransition(action: CeremonyAction, status: CeremonyStatus): boolean {
  return ALLOWED_TRANSITIONS[action].has(status);
}
