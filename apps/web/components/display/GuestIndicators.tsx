import {
  GUEST_ROLES,
  type CeremonyState,
  type DeviceStatus,
  type GuestRole,
} from "@fit-expo/shared";
import { GUEST_LABELS } from "@/lib/guest-config";
import { guestIndicatorStatus, type GuestIndicatorStatus } from "@/lib/ceremony-sync";

const COPY: Record<GuestIndicatorStatus, string> = {
  waiting: "Waiting",
  connected: "Connected",
  activated: "Activated",
  disconnected: "Disconnected",
};

export function GuestIndicators({
  state,
  devices,
}: {
  state: CeremonyState | null;
  devices: readonly DeviceStatus[];
}) {
  return (
    <ul className="grid w-full max-w-6xl grid-cols-3 gap-6">
      {GUEST_ROLES.map((role) => {
        const status = guestIndicatorStatus(role, state, devices);
        return <GuestLamp key={role} role={role} status={status} />;
      })}
    </ul>
  );
}

function GuestLamp({ role, status }: { role: GuestRole; status: GuestIndicatorStatus }) {
  const lit = status === "activated";
  return (
    <li
      data-guest={role}
      data-guest-status={status}
      className="flex flex-col items-center gap-4 text-center"
    >
      <span
        aria-hidden="true"
        className={`size-8 rounded-full border-2 ${
          lit
            ? "border-gold bg-gold shadow-[0_0_2.5rem_color-mix(in_srgb,var(--color-gold)_70%,transparent)]"
            : status === "connected"
              ? "border-white bg-white/80"
              : "border-white/40 bg-transparent"
        }`}
      />
      <p className="font-heading text-5xl font-semibold text-white">{GUEST_LABELS[role].title}</p>
      <p className="text-3xl text-white/80">{COPY[status]}</p>
    </li>
  );
}
