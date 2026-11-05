import type { CeremonyState, GuestRole } from "@fit-expo/shared";

export const GUEST_LABELS: Record<GuestRole, { title: string; honorific: string }> = {
  chief: { title: "Chief Guest", honorific: "Chief Guest" },
  "vice-chancellor": { title: "Vice Chancellor", honorific: "Vice Chancellor" },
  dean: { title: "Dean of Information Technology", honorific: "Dean" },
};

export const GENERIC_GUEST_LABELS: Record<
  GuestRole,
  { label: string; position: "Left" | "Center" | "Right"; station: string; index: number }
> = {
  chief: { label: "Guest 1", position: "Left", station: "STATION 01", index: 1 },
  "vice-chancellor": { label: "Guest 2", position: "Center", station: "STATION 02", index: 2 },
  dean: { label: "Guest 3", position: "Right", station: "STATION 03", index: 3 },
};

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
