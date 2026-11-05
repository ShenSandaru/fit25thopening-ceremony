"use client";

import { PROJECT_NAME, type CeremonyState, type DeviceStatus } from "@fit-expo/shared";

type CeremonyOverviewProps = {
  state: CeremonyState | null;
  devices: DeviceStatus[];
  connected: boolean;
};

const STATUS_CONFIG: Record<
  CeremonyState["status"],
  { label: string; bg: string; text: string; dot: string }
> = {
  WAITING: {
    label: "Waiting to Prepare",
    bg: "bg-slate-100",
    text: "text-slate-800",
    dot: "bg-slate-400",
  },
  READY: {
    label: "Ready for Activations",
    bg: "bg-amber-100",
    text: "text-amber-900",
    dot: "bg-amber-500",
  },
  COLLECTING_ACTIVATIONS: {
    label: "Collecting Guest Activations",
    bg: "bg-blue-100",
    text: "text-navy-blue",
    dot: "bg-navy-blue",
  },
  COUNTDOWN: {
    label: "Countdown in Progress",
    bg: "bg-purple-100",
    text: "text-purple-900",
    dot: "bg-purple-600",
  },
  OPENED: {
    label: "Officially Open",
    bg: "bg-emerald-100",
    text: "text-emerald-900",
    dot: "bg-emerald-600",
  },
  ABORTED: {
    label: "Ceremony Aborted",
    bg: "bg-red-100",
    text: "text-red-900",
    dot: "bg-red-600",
  },
};

export function CeremonyOverview({ state, devices, connected }: CeremonyOverviewProps) {
  const status = state?.status ?? "WAITING";
  const badge = STATUS_CONFIG[status];
  const activations = state?.activations;
  const activatedCount = activations
    ? (activations.chief ? 1 : 0) +
      (activations["vice-chancellor"] ? 1 : 0) +
      (activations.dean ? 1 : 0)
    : 0;

  const displayDevice = devices.find((d) => d.role === "display");
  const isDisplayConnected = Boolean(displayDevice?.connected);

  return (
    <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-navy-blue uppercase">
            Faculty of Information Technology · University of Moratuwa
          </p>
          <h1 className="font-heading mt-1 text-2xl font-bold text-navy-blue md:text-3xl">
            {PROJECT_NAME} · Organizer Dashboard
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Authorized operator console · Ceremony Run ID:{" "}
            <span className="font-mono text-slate-700">{state?.runId ?? "connecting…"}</span> ·
            Version: <span className="font-mono text-slate-700">{state?.version ?? 0}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold ${badge.bg} ${badge.text}`}
          >
            <span className={`size-2.5 rounded-full ${badge.dot}`} />
            {badge.label}
          </div>

          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
              connected ? "bg-slate-100 text-slate-700" : "bg-red-100 text-red-800"
            }`}
          >
            <span
              className={`size-2 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"}`}
            />
            {connected ? "Server Live" : "Reconnecting"}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 xl:grid-cols-4">
        <div className="rounded-lg bg-slate-50 p-3.5 min-w-0">
          <p className="text-xs font-medium text-slate-500">Ceremony State</p>
          <p
            className="mt-1 font-heading text-sm sm:text-base xl:text-lg font-bold text-navy-blue"
            title={status}
          >
            {status === "COLLECTING_ACTIVATIONS" ? (
              <span className="flex flex-col sm:inline sm:space-x-1">
                <span>COLLECTING</span>
                <span className="text-xs font-mono font-medium text-navy-blue/80 uppercase">
                  ACTIVATIONS
                </span>
              </span>
            ) : (
              status
            )}
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 p-3.5 min-w-0">
          <p className="text-xs font-medium text-slate-500">Guest Activations</p>
          <p className="mt-1 font-heading text-base xl:text-lg font-bold text-navy-blue truncate">
            <span className={activatedCount === 3 ? "text-emerald-700" : ""}>{activatedCount}</span>{" "}
            / 3 Ready
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 p-3.5 min-w-0">
          <p className="text-xs font-medium text-slate-500">Main Projector Display</p>
          <p
            className={`mt-1 font-heading text-base xl:text-lg font-bold truncate ${
              isDisplayConnected ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {isDisplayConnected ? "Connected" : "Not Connected"}
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 p-3.5 min-w-0">
          <p className="text-xs font-medium text-slate-500">Countdown Status</p>
          <p className="mt-1 font-heading text-base xl:text-lg font-bold text-navy-blue truncate">
            {status === "COUNTDOWN"
              ? `${(state?.countdown?.durationMs ?? 5000) / 1000}s Running`
              : status === "OPENED"
                ? "Completed"
                : "Idle"}
          </p>
        </div>
      </div>
    </header>
  );
}
