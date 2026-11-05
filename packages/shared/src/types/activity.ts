import type { Role } from "../constants/roles.js";

export const ACTIVITY_TYPES = [
  "STATE_CHANGED",
  "ACTIVATION_ACCEPTED",
  "ACTIVATION_REJECTED",
  "DEVICE_CONNECTED",
  "DEVICE_DISCONNECTED",
  "ADMIN_ACTION",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type ActivityEntry = {
  id: string;
  at: number;
  type: ActivityType;
  actorRole: Role | "server" | null;
  message: string;
  data?: Record<string, unknown>;
};
