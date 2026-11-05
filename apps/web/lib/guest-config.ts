import type { CeremonyState, GuestRole } from "@fit-expo/shared";

export const GENERIC_GUEST_LABELS: Record<
  GuestRole,
  {
    label: string;
    position: "Left" | "Center" | "Right";
    station: string;
    index: number;
    route: string;
  }
> = {
  chief: {
    label: "Guest 1",
    position: "Left",
    station: "STATION 01",
    index: 1,
    route: "/guest/1",
  },
  "vice-chancellor": {
    label: "Guest 2",
    position: "Center",
    station: "STATION 02",
    index: 2,
    route: "/guest/2",
  },
  dean: {
    label: "Guest 3",
    position: "Right",
    station: "STATION 03",
    index: 3,
    route: "/guest/3",
  },
};

export const GUEST_LABELS: Record<GuestRole, { title: string; honorific: string }> = {
  chief: { title: "Guest 1", honorific: "Guest 1" },
  "vice-chancellor": { title: "Guest 2", honorific: "Guest 2" },
  dean: { title: "Guest 3", honorific: "Guest 3" },
};

export function roleToGuestRoute(role: GuestRole): string {
  return GENERIC_GUEST_LABELS[role]?.route ?? "/guest";
}

export function guestNumberToRole(numberOrId: string | number): GuestRole | null {
  const normalized = String(numberOrId).trim().toLowerCase();
  if (normalized === "1" || normalized === "chief") return "chief";
  if (normalized === "2" || normalized === "vice-chancellor" || normalized === "vc") {
    return "vice-chancellor";
  }
  if (normalized === "3" || normalized === "dean") return "dean";
  return null;
}

export function formatGuestRole(role: string): string {
  if (role === "chief") return "Guest 1";
  if (role === "vice-chancellor") return "Guest 2";
  if (role === "dean") return "Guest 3";
  if (role === "display") return "Display";
  if (role === "admin") return "Admin";
  return role;
}

export type GuestView =
  | "loading"
  | "unassigned"
  | "wrong-role"
  | "waiting"
  | "ready"
  | "submitting"
  | "activated"
  | "countdown"
  | "completed"
  | "aborted"
  | "error"
  | "disconnected";

export function viewFromCeremony(
  state: CeremonyState | null,
  role: GuestRole,
  submitting: boolean,
  connected: boolean,
): GuestView {
  if (!connected && state === null) {
    return "disconnected";
  }
  if (submitting) {
    return "submitting";
  }
  if (!state) {
    return "loading";
  }
  const activated = state.activations[role] !== null;
  if (state.status === "OPENED") {
    return "completed";
  }
  if (state.status === "ABORTED") {
    return "aborted";
  }
  if (state.status === "COUNTDOWN") {
    return activated ? "countdown" : "waiting";
  }
  if (activated) {
    return "activated";
  }
  if (state.status === "COLLECTING_ACTIVATIONS") {
    return "ready";
  }
  return "waiting";
}
