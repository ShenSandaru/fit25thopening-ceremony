import type { CeremonyStatus } from "../constants/ceremony-status.js";
import type { GuestRole } from "../constants/roles.js";

export type CountdownTrigger = "ALL_ACTIVATED" | "MANUAL";

export type GuestActivation = { activatedAt: number } | null;

export type CountdownInfo = {
  trigger: CountdownTrigger;
  acceptedAt: number;
  startsAt: number;
  durationMs: number;
  opensAt: number;
};

export type CeremonyActivations = Record<GuestRole, GuestActivation>;

export type CeremonyState = {
  runId: string;
  version: number;
  status: CeremonyStatus;
  activations: CeremonyActivations;
  countdown: CountdownInfo | null;
  openedAt: number | null;
  abortedAt: number | null;
  updatedAt: number;
  serverTime: number;
};
