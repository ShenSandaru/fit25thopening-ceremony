"use client";

import {
  GUEST_ROLES,
  type CeremonyState,
  type DeviceStatus,
  type RoleAvailability,
} from "@fit-expo/shared";
import { GUEST_LABELS } from "@/lib/guest-config";

type GuestMonitoringProps = {
  state: CeremonyState | null;
  devices: DeviceStatus[];
  availability: RoleAvailability[];
};

export function GuestMonitoring({ state, devices, availability }: GuestMonitoringProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <h2 className="font-heading text-lg font-bold text-navy-blue">Guest Activation Status</h2>
      <p className="mt-1 text-xs text-slate-500">
        Live activation and tablet assignment states for the three dignitary roles.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        {GUEST_ROLES.map((role) => {
          const config = GUEST_LABELS[role];
          const activation = state?.activations[role];
          const isActivated = Boolean(activation);
          const activationTime = activation
            ? new Date(activation.activatedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })
            : null;

          const device = devices.find((d) => d.role === role);
          const isConnected = Boolean(device?.connected);

          const roleInfo = availability.find((a) => a.role === role);
          const isAssigned = roleInfo ? !roleInfo.available : false;

          let connectionStatusLabel = "Not assigned";
          let connectionStatusColor = "text-slate-500 bg-slate-100";
          if (isAssigned) {
            if (isConnected) {
              connectionStatusLabel = "Connected";
              connectionStatusColor = "text-emerald-800 bg-emerald-100";
            } else {
              connectionStatusLabel = "Disconnected";
              connectionStatusColor = "text-red-800 bg-red-100";
            }
          }

          return (
            <div
              key={role}
              data-guest-card={role}
              className={`flex flex-col justify-between rounded-xl border p-5 transition-shadow ${
                isActivated
                  ? "border-emerald-300 bg-emerald-50/40 shadow-xs"
                  : "border-slate-200 bg-slate-50/60"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading text-base font-bold text-navy-blue">
                    {config.title}
                  </h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      isActivated ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {isActivated ? "Activated" : "Waiting"}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Device Assignment:</span>
                    <span className="font-medium text-slate-800">
                      {isAssigned ? "Tablet Assigned" : "Available / Unassigned"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Live Connection:</span>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${connectionStatusColor}`}
                    >
                      {connectionStatusLabel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Activation Status:</span>
                    <span
                      className={`font-semibold ${
                        isActivated ? "text-emerald-700" : "text-slate-600"
                      }`}
                    >
                      {isActivated ? "Accepted by Server" : "Pending activation"}
                    </span>
                  </div>

                  {activationTime && (
                    <div className="flex items-center justify-between border-t border-slate-200/80 pt-2">
                      <span className="text-slate-500">Activated At:</span>
                      <span className="font-mono text-slate-700">{activationTime}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 border-t border-slate-200/60 pt-3">
                <span className="text-[11px] text-slate-400">
                  Role: <span className="font-mono">{role}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
