export const SESSION_COOKIE_NAME = "fit_expo_session";

/** Guest and display session lifetime (covers setup, rehearsal and the event). */
export const GUEST_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/** Admin session lifetime. */
export const ADMIN_SESSION_TTL_MS = 4 * 60 * 60 * 1000;

export const DEVICE_SESSION_STATUSES = [
  "AVAILABLE",
  "ASSIGNED",
  "CONNECTED",
  "DISCONNECTED",
  "RELEASED",
] as const;

export type DeviceSessionStatus = (typeof DEVICE_SESSION_STATUSES)[number];
