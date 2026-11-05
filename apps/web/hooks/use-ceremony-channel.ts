"use client";

import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  type CeremonyState,
  type CeremonyStatus,
  type ClientToServerEvents,
  type ClockSyncAck,
  type DeviceStatus,
  type ServerToClientEvents,
} from "@fit-expo/shared";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { CeremonyAudio } from "@/lib/ceremony-audio";
import { acceptSnapshot, estimateClockOffset, serverNow } from "@/lib/ceremony-sync";

export type CeremonyChannel = {
  ceremony: CeremonyState | null;
  devices: DeviceStatus[];
  connected: boolean;
  now: number;
  audioUnavailable: boolean;
  audioRef: { current: CeremonyAudio | null };
  socketRef: { current: Socket<ServerToClientEvents, ClientToServerEvents> | null };
};

export function useCeremonyChannel(
  enabled: boolean,
  cues = false,
  role?: "admin",
): CeremonyChannel {
  const [ceremony, setCeremony] = useState<CeremonyState | null>(null);
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [connected, setConnected] = useState(false);
  const [clientNow, setClientNow] = useState(() => Date.now());
  const [offset, setOffset] = useState(0);
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const ceremonyRef = useRef<CeremonyState | null>(null);
  const [audioUnavailable, setAudioUnavailable] = useState(false);
  const audioRef = useRef<CeremonyAudio | null>(null);
  const scheduledRun = useRef<string | null>(null);

  // Audio deduplication and run tracking
  const playedActivations = useRef<Map<string, Set<string>>>(new Map());
  const currentRunId = useRef<string | null>(null);
  const currentStatus = useRef<CeremonyStatus | null>(null);

  useEffect(() => {
    const created = new CeremonyAudio();
    created.onChange = () => setAudioUnavailable(created.unavailable);
    created.preload();
    audioRef.current = created;
    return () => {
      created.onChange = null;
      created.stop();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    ceremonyRef.current = ceremony;
  }, [ceremony]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const next = io({
      path: "/socket.io",
      withCredentials: true,
      ...(role ? { auth: { role } } : {}),
    });
    socketRef.current = next;

    const apply = (incoming: CeremonyState) => {
      const accepted = acceptSnapshot(ceremonyRef.current, incoming);
      if (!accepted) {
        return;
      }
      ceremonyRef.current = accepted;
      setCeremony(accepted);

      // Reset activation deduplication tracking if runId changes (e.g. ceremony reset)
      if (incoming.runId !== currentRunId.current) {
        currentRunId.current = incoming.runId;
        const initialSet = new Set<string>();
        // Populate existing activations without re-triggering sound effects
        if (incoming.activations) {
          for (const [roleName, act] of Object.entries(incoming.activations)) {
            if (act !== null) {
              initialSet.add(roleName);
            }
          }
        }
        playedActivations.current.set(incoming.runId, initialSet);
      }

      // Handle background audio transition on ceremony state changes
      if (cues && incoming.status !== currentStatus.current) {
        currentStatus.current = incoming.status;

        if (incoming.status === "WAITING" || incoming.status === "READY") {
          // Keep welcome / standby silent; music starts after clicking begin activations
          audioRef.current?.stopBackground(true);
        } else if (incoming.status === "COLLECTING_ACTIVATIONS") {
          void audioRef.current?.playBackground("waiting");
        } else if (incoming.status === "COUNTDOWN") {
          // Immediately mute / pause background music when countdown commences
          audioRef.current?.pauseBackground(true);
        } else if (incoming.status === "OPENED") {
          // Stop background music completely and play the one-time celebratory blast sound
          audioRef.current?.stopBackground(true);
          audioRef.current?.playCue("impact");
        } else if (incoming.status === "ABORTED") {
          audioRef.current?.stop();
        }
      }
    };

    const syncClock = () => {
      const sent = Date.now();
      next.emit(CLIENT_EVENTS.CLOCK_SYNC, { clientSentAt: sent }, (result: ClockSyncAck) => {
        if (!result.ok) {
          return;
        }
        setOffset(
          estimateClockOffset(result.data.clientSentAt, result.data.serverTime, Date.now()),
        );
      });
    };

    next.on("connect", () => {
      setConnected(true);
      syncClock();
    });
    next.on("disconnect", () => setConnected(false));
    next.on(SERVER_EVENTS.EVENT_STATE, apply);
    next.on(SERVER_EVENTS.DEVICE_STATUS, (payload) => setDevices(payload.devices));

    next.on(SERVER_EVENTS.GUEST_ACTIVATED, (payload) => {
      if (!cues) {
        return;
      }
      const current = ceremonyRef.current;
      if (current && (payload.runId !== current.runId || payload.version < current.version)) {
        return;
      }

      // Guarantee each guest activation sound is triggered only once
      let set = playedActivations.current.get(payload.runId);
      if (!set) {
        set = new Set();
        playedActivations.current.set(payload.runId, set);
      }
      if (set.has(payload.role)) {
        return;
      }
      set.add(payload.role);
      audioRef.current?.playCue("activation");

      // Stage D: Play synchronization transition cue when all 3 guests are activated
      if (payload.activatedCount === 3) {
        audioRef.current?.playCue("sync");
      }
    });

    next.on(SERVER_EVENTS.EVENT_OPENED, (payload) => {
      if (!cues) {
        return;
      }
      const current = ceremonyRef.current;
      if (current && (payload.runId !== current.runId || payload.version < current.version)) {
        return;
      }
      audioRef.current?.stopBackground(true);
      audioRef.current?.playCue("impact");
    });

    next.on(SERVER_EVENTS.EVENT_ABORTED, () => {
      audioRef.current?.stop();
      scheduledRun.current = null;
    });

    const clockTimer = setInterval(syncClock, 15_000);
    return () => {
      clearInterval(clockTimer);
      next.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [cues, enabled, role]);

  useEffect(() => {
    if (ceremony?.status !== "COUNTDOWN") {
      return;
    }
    const timer = setInterval(() => setClientNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, [ceremony?.status]);

  useEffect(() => {
    const countdown = ceremony?.countdown;
    if (!cues || !countdown || ceremony.status !== "COUNTDOWN") {
      return;
    }
    const key = `${ceremony.runId}:${countdown.startsAt}:${offset}`;
    if (scheduledRun.current === key) {
      return;
    }
    scheduledRun.current = key;
    audioRef.current?.scheduleCountdown(
      countdown.startsAt,
      countdown.durationMs,
      serverNow(offset, Date.now()),
    );
  }, [ceremony, cues, offset]);

  return {
    ceremony,
    devices,
    connected,
    now: serverNow(offset, clientNow),
    audioUnavailable,
    audioRef,
    socketRef,
  };
}
