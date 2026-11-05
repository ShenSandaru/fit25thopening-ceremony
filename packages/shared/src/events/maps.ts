import type { GuestRole, Role } from "../constants/roles.js";
import type { ActivityEntry } from "../types/activity.js";
import type { CeremonyState, CountdownInfo } from "../types/ceremony.js";
import type { DeviceStatus } from "../types/device.js";
import type { Result } from "../types/result.js";
import type { CLIENT_EVENTS, SERVER_EVENTS } from "./names.js";

export type GuestActivateAck = Result<{
  role: GuestRole;
  activatedAt: number;
  version: number;
}>;

export type ClockSyncAck = Result<{
  clientSentAt: number;
  serverTime: number;
}>;

export type ClientToServerEvents = {
  [CLIENT_EVENTS.GUEST_ACTIVATE]: (
    payload: Record<string, never>,
    ack: (result: GuestActivateAck) => void,
  ) => void;
  [CLIENT_EVENTS.CLOCK_SYNC]: (
    payload: { clientSentAt: number },
    ack: (result: ClockSyncAck) => void,
  ) => void;
};

export type ServerToClientEvents = {
  [SERVER_EVENTS.EVENT_STATE]: (payload: CeremonyState) => void;
  [SERVER_EVENTS.EVENT_ACTIVATION_STARTED]: (payload: {
    runId: string;
    version: number;
    startedAt: number;
  }) => void;
  [SERVER_EVENTS.GUEST_ACTIVATED]: (payload: {
    runId: string;
    version: number;
    role: GuestRole;
    activatedAt: number;
    activatedCount: number;
  }) => void;
  [SERVER_EVENTS.EVENT_COUNTDOWN_STARTED]: (
    payload: CountdownInfo & {
      runId: string;
      version: number;
      serverTime: number;
    },
  ) => void;
  [SERVER_EVENTS.EVENT_OPENED]: (payload: {
    runId: string;
    version: number;
    openedAt: number;
  }) => void;
  [SERVER_EVENTS.EVENT_ABORTED]: (payload: {
    runId: string;
    version: number;
    abortedAt: number;
    reason: string | null;
  }) => void;
  [SERVER_EVENTS.EVENT_RESET]: (payload: {
    runId: string;
    version: number;
    resetAt: number;
  }) => void;
  [SERVER_EVENTS.DEVICE_STATUS]: (payload: { devices: DeviceStatus[] }) => void;
  [SERVER_EVENTS.ACTIVITY_LOGGED]: (payload: ActivityEntry) => void;
};

export type InterServerEvents = Record<string, never>;

export type SocketData = {
  role?: Role;
  sessionId?: string;
};
