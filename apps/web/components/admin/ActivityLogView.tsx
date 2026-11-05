"use client";

import type { ActivityEntry, ActivityType } from "@fit-expo/shared";

type ActivityLogViewProps = {
  entries: ActivityEntry[];
  onRefresh: () => Promise<void>;
  busy: boolean;
};

const BADGE_COLORS: Record<ActivityType, { bg: string; text: string }> = {
  STATE_CHANGED: { bg: "bg-blue-100", text: "text-navy-blue" },
  ACTIVATION_ACCEPTED: { bg: "bg-emerald-100", text: "text-emerald-900" },
  ACTIVATION_REJECTED: { bg: "bg-red-100", text: "text-red-900" },
  DEVICE_CONNECTED: { bg: "bg-slate-100", text: "text-slate-800" },
  DEVICE_DISCONNECTED: { bg: "bg-amber-100", text: "text-amber-900" },
  ADMIN_ACTION: { bg: "bg-purple-100", text: "text-purple-900" },
};

export function ActivityLogView({ entries, onRefresh, busy }: ActivityLogViewProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg font-bold text-navy-blue">Ceremony Activity Log</h2>
          <p className="mt-1 text-xs text-slate-500">
            Real-time chronological audit trail of all ceremony transitions, guest activations, and
            operator actions.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onRefresh()}
          className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          Refresh Log
        </button>
      </div>

      <div className="mt-4 max-h-96 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/50">
        {entries.length === 0 ? (
          <p className="p-6 text-center text-xs text-slate-400">
            No activity entries recorded yet.
          </p>
        ) : (
          entries.map((entry) => {
            const timeString = new Date(entry.at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
            const badge = BADGE_COLORS[entry.type] ?? {
              bg: "bg-slate-100",
              text: "text-slate-700",
            };

            return (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-4 p-3 text-xs hover:bg-white"
              >
                <div className="flex items-start gap-3">
                  <span className="font-mono text-slate-400 select-none">{timeString}</span>
                  <span
                    className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${badge.bg} ${badge.text}`}
                  >
                    {entry.type}
                  </span>
                  <p className="font-medium text-slate-800">{entry.message}</p>
                </div>

                {entry.actorRole && (
                  <span className="font-mono text-[11px] text-slate-400 shrink-0">
                    actor: {entry.actorRole}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
