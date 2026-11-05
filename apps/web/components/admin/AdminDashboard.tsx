"use client";

import {
  SERVER_EVENTS,
  type ActivityEntry,
  type DeviceStatus,
  type GuestRole,
  type RoleAvailability,
} from "@fit-expo/shared";
import { useCallback, useEffect, useState } from "react";
import { useCeremonyChannel } from "@/hooks/use-ceremony-channel";
import { ActivityLogView } from "./ActivityLogView";
import { CeremonyControls } from "./CeremonyControls";
import { CeremonyOverview } from "./CeremonyOverview";
import { DeviceMonitoring } from "./DeviceMonitoring";
import { GuestManagement } from "./GuestManagement";
import { GuestMonitoring } from "./GuestMonitoring";

export function AdminDashboard() {
  const channel = useCeremonyChannel(true, false, "admin");
  const [availability, setAvailability] = useState<RoleAvailability[]>([]);
  const [fetchedDevices, setFetchedDevices] = useState<DeviceStatus[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(
    null,
  );

  const devices = channel.devices.length > 0 ? channel.devices : fetchedDevices;

  const refreshTelemetry = useCallback(async () => {
    try {
      const [devRes, actRes] = await Promise.all([
        fetch("/api/devices/status"),
        fetch("/api/event/activity?limit=50"),
      ]);

      if (devRes.ok) {
        const body = (await devRes.json()) as {
          data: { devices: DeviceStatus[]; availability: RoleAvailability[] };
        };
        setFetchedDevices(body.data.devices);
        setAvailability(body.data.availability);
      }

      if (actRes.ok) {
        const body = (await actRes.json()) as { data: { entries: ActivityEntry[] } };
        setActivities(body.data.entries);
      }
    } catch {
      // Background telemetry failure will be retried on socket sync
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [devRes, actRes] = await Promise.all([
          fetch("/api/devices/status"),
          fetch("/api/event/activity?limit=50"),
        ]);
        if (cancelled) return;
        if (devRes.ok) {
          const body = (await devRes.json()) as {
            data: { devices: DeviceStatus[]; availability: RoleAvailability[] };
          };
          if (!cancelled) {
            setFetchedDevices(body.data.devices);
            setAvailability(body.data.availability);
          }
        }
        if (actRes.ok) {
          const body = (await actRes.json()) as { data: { entries: ActivityEntry[] } };
          if (!cancelled) {
            setActivities(body.data.entries);
          }
        }
      } catch {
        // Ignored
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Listen for real-time live activity entries over socket
  useEffect(() => {
    const socket = channel.socketRef.current;
    if (!socket) {
      return;
    }

    const onActivity = (entry: ActivityEntry) => {
      setActivities((prev) => {
        if (prev.some((e) => e.id === entry.id)) {
          return prev;
        }
        return [entry, ...prev];
      });
      void refreshTelemetry();
    };

    socket.on(SERVER_EVENTS.ACTIVITY_LOGGED, onActivity);
    return () => {
      socket.off(SERVER_EVENTS.ACTIVITY_LOGGED, onActivity);
    };
  }, [channel.socketRef, refreshTelemetry]);

  // Action dispatchers
  async function performAction(
    url: string,
    options: RequestInit,
    successMessage: string,
  ): Promise<void> {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options,
      });
      const body = (await response.json()) as {
        ok: boolean;
        error?: { code: string; message: string };
      };
      if (!response.ok || !body.ok) {
        setFeedback({
          type: "error",
          message: body.error?.message ?? `Operation failed (${response.status})`,
        });
        return;
      }
      setFeedback({ type: "success", message: successMessage });
      await refreshTelemetry();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Network error performing action.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handlePrepare() {
    await performAction(
      "/api/event/prepare",
      { method: "POST", body: "{}" },
      "Ceremony successfully prepared for activations.",
    );
  }

  async function handleStart() {
    await performAction(
      "/api/event/start",
      { method: "POST", body: "{}" },
      "Activation phase started. Guest tablets are now active.",
    );
  }

  async function handleAbort(reason?: string) {
    await performAction(
      "/api/event/abort",
      { method: "POST", body: JSON.stringify({ reason }) },
      "Ceremony aborted.",
    );
  }

  async function handleReset() {
    await performAction(
      "/api/event/reset",
      { method: "POST", body: "{}" },
      "Ceremony reset to waiting state with a new run ID.",
    );
  }

  async function handleReleaseRole(role: GuestRole) {
    await performAction(
      "/api/guest-sessions/release-role",
      { method: "POST", body: JSON.stringify({ role }) },
      `Tablet session for ${role} released successfully.`,
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Global Feedback Alert */}
        {feedback && (
          <div
            role="alert"
            className={`flex items-center justify-between rounded-lg p-4 text-sm font-medium ${
              feedback.type === "error"
                ? "bg-red-50 text-red-900 border border-red-200"
                : "bg-emerald-50 text-emerald-900 border border-emerald-200"
            }`}
          >
            <span>{feedback.message}</span>
            <button
              type="button"
              className="text-xs underline hover:no-underline"
              onClick={() => setFeedback(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        <CeremonyOverview
          state={channel.ceremony}
          devices={devices}
          connected={channel.connected}
        />

        <CeremonyControls
          status={channel.ceremony?.status ?? "WAITING"}
          busy={busy}
          onPrepare={handlePrepare}
          onStart={handleStart}
          onAbort={handleAbort}
          onReset={handleReset}
        />

        <GuestMonitoring state={channel.ceremony} devices={devices} availability={availability} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <DeviceMonitoring devices={devices} availability={availability} />
          <GuestManagement
            state={channel.ceremony}
            availability={availability}
            busy={busy}
            onReleaseRole={handleReleaseRole}
          />
        </div>

        <ActivityLogView entries={activities} onRefresh={refreshTelemetry} busy={busy} />
      </div>
    </div>
  );
}
