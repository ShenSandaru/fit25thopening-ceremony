import type { Role } from "../constants/roles.js";

export type DeviceStatus = {
  role: Role;
  connected: boolean;
  connectionCount: number;
  lastSeenAt: number | null;
};
