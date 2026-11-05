"use client";

import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  type CeremonyState,
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
      audioRef.current?.play("activation");
    });
    next.on(SERVER_EVENTS.EVENT_OPENED, (payload) => {
      if (!cues) {
        return;
      }
      const current = ceremonyRef.current;
      if (current && (payload.runId !== current.runId || payload.version < current.version)) {
        return;
      }
      audioRef.current?.play("opening");
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
