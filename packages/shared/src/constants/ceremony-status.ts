export const CEREMONY_STATUSES = [
  "WAITING",
  "READY",
  "COLLECTING_ACTIVATIONS",
  "COUNTDOWN",
  "OPENED",
  "ABORTED",
] as const;

export type CeremonyStatus = (typeof CEREMONY_STATUSES)[number];
