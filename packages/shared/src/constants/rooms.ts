import type { Role } from "./roles.js";

export const CEREMONY_ROOM = "ceremony";

export function roleRoom(role: Role): `role:${Role}` {
  return `role:${role}`;
}
