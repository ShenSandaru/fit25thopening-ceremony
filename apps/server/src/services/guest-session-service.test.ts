import { GUEST_SESSION_TTL_MS } from "@fit-expo/shared";
import { describe, expect, it } from "vitest";
import { DomainError } from "../errors/domain-error.js";
import { GuestSessionService } from "./guest-session-service.js";
import type { Clock, TimeoutHandle } from "../state/clock.js";

function fakeClock(start = 1_000_000) {
  let now = start;
  let nextId = 1;
  const timers = new Map<number, { fireAt: number; callback: () => void }>();
  const clock: Clock = {
    now: () => now,
    setTimeout: (callback, delayMs) => {
      const id = nextId++;
      timers.set(id, { fireAt: now + delayMs, callback });
      return { id } satisfies TimeoutHandle;
    },
    clearTimeout: (handle) => {
      timers.delete(handle.id as number);
    },
  };
  return {
    clock,
    advance(ms: number) {
      const target = now + ms;
      while (true) {
        const due = [...timers.entries()]
          .filter(([, timer]) => timer.fireAt <= target)
          .sort((a, b) => a[1].fireAt - b[1].fireAt);
        if (due.length === 0) {
          now = target;
          return;
        }
        const [id, timer] = due[0]!;
        now = timer.fireAt;
        timers.delete(id);
        timer.callback();
      }
    },
  };
}

function service(graceMs = 1_000) {
  const time = fakeClock();
  const sessions = new GuestSessionService({
    reconnectGraceMs: graceMs,
    clock: time.clock,
    secret: "test-secret-at-least-32-characters",
  });
  return { sessions, ...time };
}

describe("GuestSessionService", () => {
  it("assigns each role once and rejects a second tablet", () => {
    const { sessions } = service();
    const chief = sessions.assign("chief", undefined);
    const dean = sessions.assign("dean", undefined);
    expect(chief.role).toBe("chief");
    expect(dean.role).toBe("dean");
    expect(() => sessions.assign("chief", undefined)).toThrow(DomainError);
  });

  it("recovers the same tablet refreshing its cookie", () => {
    const { sessions } = service();
    const first = sessions.assign("vice-chancellor", undefined);
    const cookie = `fit_expo_session=${sessions.sign(first.id)}`;
    const again = sessions.assign("vice-chancellor", cookie);
    expect(again.id).toBe(first.id);
  });

  it("rejects a forged cookie signature", () => {
    const { sessions } = service();
    const first = sessions.assign("chief", undefined);
    const forged = `fit_expo_session=${first.id}.deadbeef`;
    expect(sessions.current(forged)).toBeNull();
  });

  it("keeps the role during the grace period and releases it afterwards", () => {
    const { sessions, advance } = service(1_000);
    const session = sessions.assign("dean", undefined);
    sessions.markConnected(session.id);
    sessions.markDisconnected(session.id);
    expect(sessions.availability().find((row) => row.role === "dean")?.available).toBe(false);
    advance(999);
    expect(sessions.current(`fit_expo_session=${sessions.sign(session.id)}`)?.status).toBe(
      "DISCONNECTED",
    );
    advance(1);
    expect(sessions.availability().find((row) => row.role === "dean")?.available).toBe(true);
  });

  it("reconnects before the grace period expires", () => {
    const { sessions, advance } = service(5_000);
    const session = sessions.assign("chief", undefined);
    sessions.markConnected(session.id);
    sessions.markDisconnected(session.id);
    advance(1_000);
    const restored = sessions.markConnected(session.id);
    expect(restored.status).toBe("CONNECTED");
    advance(10_000);
    expect(sessions.current(`fit_expo_session=${sessions.sign(session.id)}`)?.status).toBe(
      "CONNECTED",
    );
  });

  it("rejects an expired session", () => {
    const { sessions, advance } = service();
    const session = sessions.assign("chief", undefined);
    const cookie = `fit_expo_session=${sessions.sign(session.id)}`;
    advance(GUEST_SESSION_TTL_MS + 1);
    expect(sessions.current(cookie)).toBeNull();
    expect(sessions.availability().find((row) => row.role === "chief")?.available).toBe(true);
  });

  it("releases a session explicitly", () => {
    const { sessions } = service();
    const session = sessions.assign("dean", undefined);
    sessions.release(session.id);
    expect(sessions.availability().find((row) => row.role === "dean")?.available).toBe(true);
  });

  it("allows multiple displays to connect concurrently and aggregates display presence", () => {
    const { sessions } = service();
    const display1 = sessions.claimDisplay(undefined);
    const cookie1 = `fit_expo_session=${sessions.sign(display1.id)}`;
    expect(sessions.claimDisplay(cookie1).id).toBe(display1.id);

    const display2 = sessions.claimDisplay(undefined);
    expect(display2.id).not.toBe(display1.id);
    sessions.markConnected(display1.id);
    sessions.markConnected(display2.id);

    const displayPresence = sessions.presence().find((row) => row.role === "display");
    expect(displayPresence).toMatchObject({ connected: true, connectionCount: 2 });

    const chief = sessions.assign("chief", undefined);
    sessions.markConnected(chief.id);
    sessions.markDisconnected(chief.id);
    const presence = sessions.presence().find((row) => row.role === "chief");
    expect(presence).toMatchObject({ connected: false, connectionCount: 0 });
    expect(presence?.lastSeenAt).not.toBeNull();
  });

  it("refuses to turn a guest tablet into the display", () => {
    const { sessions } = service();
    const chief = sessions.assign("chief", undefined);
    const cookie = `fit_expo_session=${sessions.sign(chief.id)}`;
    expect(() => sessions.claimDisplay(cookie)).toThrow(DomainError);
  });

  it("releases an assigned display session if it never connects within the grace period", () => {
    const { sessions, advance } = service(1_000);
    const first = sessions.claimDisplay(undefined);
    const cookie = `fit_expo_session=${sessions.sign(first.id)}`;
    advance(1_000);
    expect(sessions.current(cookie)).toBeNull();
  });
});
