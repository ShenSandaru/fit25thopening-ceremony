export const GUEST_ROLES = ["chief", "vice-chancellor", "dean"] as const;
export type GuestRole = (typeof GUEST_ROLES)[number];

export const ROLES = [...GUEST_ROLES, "display", "admin"] as const;
export type Role = (typeof ROLES)[number];

export function isGuestRole(value: string): value is GuestRole {
  return (GUEST_ROLES as readonly string[]).includes(value);
}
