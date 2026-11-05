import type { CeremonyState, DeviceStatus, GuestRole } from "@fit-expo/shared";

export type DisplayView =
  | "reconnecting"
  | "welcome"
  | "waiting-for-activations"
  | "all-activated"
  | "countdown"
  | "opened"
  | "aborted";

/** Brief visual confirmation after the server starts the countdown. Not a ceremony state. */
export const ALL_READY_BEAT_MS = 800;

export type GuestIndicatorStatus = "waiting" | "connected" | "activated" | "disconnected";

export function acceptSnapshot<T extends { runId: string; version: number }>(
  current: T | null,
  incoming: T,
): T | null {
  if (current && incoming.runId === current.runId && incoming.version < current.version) {
    return null;
  }
  return incoming;
}

export function estimateClockOffset(
  clientSentAt: number,
  serverTime: number,
  clientReceivedAt: number,
): number {
  const rtt = Math.max(0, clientReceivedAt - clientSentAt);
  return serverTime - (clientSentAt + rtt / 2);
}

export function serverNow(offsetMs: number, clientNow: number): number {
  return clientNow + offsetMs;
}

export function countdownSecondsRemaining(opensAt: number, now: number): number {
  const remaining = opensAt - now;
  if (remaining <= 0) {
    return 0;
  }
  return Math.ceil(remaining / 1000);
}

/**
 * Delays until each countdown cue, measured from serverNow.
 * Cues that already passed by more than 200 ms are omitted so a refresh does not replay them.
 */
export function countdownCueDelays(startsAt: number, durationMs: number, now: number): number[] {
  const seconds = Math.ceil(durationMs / 1000);
  const delays: number[] = [];
  for (let index = 0; index < seconds; index += 1) {
    const delay = startsAt + index * 1000 - now;
    if (delay >= -200) {
      delays.push(Math.max(0, delay));
    }
  }
  return delays;
}

export function displayView(input: {
  state: CeremonyState | null;
  connected: boolean;
  now: number;
}): DisplayView {
  if (!input.state) {
    return input.connected ? "welcome" : "reconnecting";
  }
  switch (input.state.status) {
    case "WAITING":
    case "READY":
      return "welcome";
    case "COLLECTING_ACTIVATIONS":
      return "waiting-for-activations";
    case "COUNTDOWN": {
      const countdown = input.state.countdown;
      if (!countdown) {
        return "countdown";
      }
      const elapsed = input.now - countdown.startsAt;
      if (
        elapsed >= 0 &&
        elapsed < ALL_READY_BEAT_MS &&
        countdown.durationMs > ALL_READY_BEAT_MS &&
        input.now < countdown.opensAt
      ) {
        return "all-activated";
      }
      return "countdown";
    }
    case "OPENED":
      return "opened";
    case "ABORTED":
      return "aborted";
    default:
      return "welcome";
  }
}

export function guestIndicatorStatus(
  role: GuestRole,
  state: CeremonyState | null,
  devices: readonly DeviceStatus[],
): GuestIndicatorStatus {
  if (state?.activations[role]) {
    return "activated";
  }
  const device = devices.find((entry) => entry.role === role);
  if (device?.connected) {
    return "connected";
  }
  if (device?.lastSeenAt) {
    return "disconnected";
  }
  return "waiting";
}
