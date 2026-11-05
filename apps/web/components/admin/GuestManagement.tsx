"use client";

import {
  GUEST_ROLES,
  type CeremonyState,
  type GuestRole,
  type RoleAvailability,
} from "@fit-expo/shared";
import { useState } from "react";
import { GENERIC_GUEST_LABELS, GUEST_LABELS } from "@/lib/guest-config";
import { ConfirmDialog } from "./ConfirmDialog";

type GuestManagementProps = {
  state: CeremonyState | null;
  availability: RoleAvailability[];
  busy: boolean;
  onReleaseRole: (role: GuestRole) => Promise<void>;
};

export function GuestManagement({
  state,
  availability,
  busy,
  onReleaseRole,
}: GuestManagementProps) {
  const [roleToRelease, setRoleToRelease] = useState<GuestRole | null>(null);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <h2 className="font-heading text-lg font-bold text-navy-blue">Guest Tablet Management</h2>
      <p className="mt-1 text-xs text-slate-500">
        Manage tablet role bindings. If a tablet was misconfigured or lost connection before
        activating, release its session here to reassign it on{" "}
        <span className="font-mono">/guest</span>.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {GUEST_ROLES.map((role) => {
          const generic = GENERIC_GUEST_LABELS[role];
          const config = GUEST_LABELS[role];
          const isActivated = Boolean(state?.activations[role]);
          const info = availability.find((a) => a.role === role);
          const isAssigned = info ? !info.available : false;

          const canRelease = isAssigned && !isActivated && !busy;

          return (
            <div
              key={role}
              data-manage-role={role}
              className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-gold uppercase tracking-wider block">
                      {generic.station}
                    </span>
                    <span className="font-heading text-sm font-bold text-navy-blue">
                      {generic.label}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      isAssigned ? "bg-blue-100 text-navy-blue" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {isAssigned ? "Assigned" : "Available"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 font-mono">{config.title}</p>

                <div className="mt-2 text-xs text-slate-600">
                  {isActivated ? (
                    <p className="text-amber-800">
                      Cannot release: this guest has already activated in the current ceremony run.
                    </p>
                  ) : isAssigned ? (
                    <p className="text-slate-500">
                      Tablet is currently assigned. You can release it for reassignment.
                    </p>
                  ) : (
                    <p className="text-slate-400">Tablet is ready to be claimed on /guest.</p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  disabled={!canRelease}
                  onClick={() => setRoleToRelease(role)}
                  className="w-full rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  Release Tablet
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        isOpen={roleToRelease !== null}
        title={`Release ${roleToRelease ? GUEST_LABELS[roleToRelease].title : "Tablet"}?`}
        description="Are you sure you want to release this tablet session? The tablet will be unassigned and can be assigned to a new role from /guest."
        confirmText="Release Session"
        isDestructive={true}
        onConfirm={async () => {
          if (roleToRelease) {
            const target = roleToRelease;
            setRoleToRelease(null);
            await onReleaseRole(target);
          }
        }}
        onCancel={() => setRoleToRelease(null)}
      />
    </section>
  );
}
