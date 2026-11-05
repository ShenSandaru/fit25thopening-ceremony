import type { GuestRole, Role } from "../constants/roles.js";
import type { DeviceSessionStatus } from "../constants/session.js";

export type DeviceRole = GuestRole | "display";

export type DeviceStatus = {
  role: Role;
  connected: boolean;
  connectionCount: number;
  lastSeenAt: number | null;
};

export type RoleAvailability = {
  role: GuestRole;
  status: DeviceSessionStatus;
  available: boolean;
};
