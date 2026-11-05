"use client";

import type { DeviceRole, DeviceStatus, RoleAvailability } from "@fit-expo/shared";

type DeviceMonitoringProps = {
  devices: DeviceStatus[];
  availability: RoleAvailability[];
};

type ExpectedDevice = {
  id: string;
  name: string;
  type: string;
  role: DeviceRole;
};

const EXPECTED_DEVICES: ExpectedDevice[] = [
  {
    id: "display",
    name: "Ceremony Main Display Projector",
    type: "Projector / Audience Laptop",
    role: "display",
  },
  {
    id: "chief",
    name: "Chief Guest Tablet",
    type: "Touch Tablet Device",
    role: "chief",
  },
  {
    id: "vice-chancellor",
    name: "Vice Chancellor Tablet",
    type: "Touch Tablet Device",
    role: "vice-chancellor",
  },
  {
    id: "dean",
    name: "Dean of IT Tablet",
    type: "Touch Tablet Device",
    role: "dean",
  },
];

export function DeviceMonitoring({ devices, availability }: DeviceMonitoringProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <h2 className="font-heading text-lg font-bold text-navy-blue">
        Device Connection Monitoring
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Real-time telemetry for the 4 physical devices registered on the local ceremony network.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
            <tr>
              <th className="px-4 py-3">Device Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Assigned Role</th>
              <th className="px-4 py-3">Connection Status</th>
              <th className="px-4 py-3">Active Sockets</th>
              <th className="px-4 py-3">Last Seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {EXPECTED_DEVICES.map((item) => {
              const status = devices.find((d) => d.role === item.role);
              const isConnected = Boolean(status?.connected);
              const sockets = status?.connectionCount ?? 0;
              const roleInfo = availability.find((a) => a.role === item.role);
              const isAssigned =
                item.role === "display" ? isConnected : roleInfo ? !roleInfo.available : false;

              const lastSeenText = status?.lastSeenAt
                ? new Date(status.lastSeenAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "Never / No session";

              return (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3.5 font-bold text-navy-blue">{item.name}</td>
                  <td className="px-4 py-3.5 text-slate-600">{item.type}</td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-slate-700">{item.role}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-2 rounded-full ${
                          isConnected
                            ? "bg-emerald-500"
                            : isAssigned
                              ? "bg-red-500"
                              : "bg-slate-300"
                        }`}
                      />
                      <span
                        className={
                          isConnected
                            ? "text-emerald-800"
                            : isAssigned
                              ? "text-red-700"
                              : "text-slate-500"
                        }
                      >
                        {isConnected ? "Connected" : isAssigned ? "Disconnected" : "Unassigned"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-700">{sockets}</td>
                  <td className="px-4 py-3.5 font-mono text-slate-600">{lastSeenText}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
