import { GUEST_ROLES, SERVER_EVENTS, type GuestRole } from "@fit-expo/shared";
import { describe, expect, it } from "vitest";
import { DomainError } from "../errors/domain-error.js";
import { CeremonyService } from "./ceremony-service.js";
import type { Clock, TimeoutHandle } from "./clock.js";

function createFakeClock(start = 1_000_000): {
  clock: Clock;
  advance: (ms: number) => void;
} {
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

  const advance = (ms: number): void => {
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
  };

  return { clock, advance };
}

function collectingService(options?: {
  durationMs?: number;
  delayMs?: number;
  runIds?: string[];
}): {
  service: CeremonyService;
  advance: (ms: number) => void;
} {
  const { clock, advance } = createFakeClock();
  const runIds = options?.runIds ?? ["run-1", "run-2", "run-3"];
  let index = 0;
  const service = new CeremonyService({
    clock,
    countdownDurationMs: options?.durationMs ?? 3000,
    preparationDelayMs: options?.delayMs ?? 0,
    createRunId: () => runIds[index++] ?? `run-${index}`,
  });
  service.prepare();
  service.start();
  return { service, advance };
}

describe("CeremonyService", () => {
  it("starts in WAITING with version 0 and empty activations", () => {
    const { clock } = createFakeClock();
    const service = new CeremonyService({
      clock,
      createRunId: () => "run-initial",
    });
    expect(service.getState()).toMatchObject({
      runId: "run-initial",
      version: 0,
      status: "WAITING",
      activations: { chief: null, "vice-chancellor": null, dean: null },
      countdown: null,
      openedAt: null,
      abortedAt: null,
    });
  });

  it("prepare moves WAITING to READY", () => {
    const { clock } = createFakeClock();
    const service = new CeremonyService({ clock, createRunId: () => "run-1" });
    expect(service.prepare().status).toBe("READY");
    expect(() => service.prepare()).toThrow(DomainError);
  });

  it("start moves READY to COLLECTING_ACTIVATIONS", () => {
    const { service } = collectingService();
    expect(service.getState().status).toBe("COLLECTING_ACTIVATIONS");
  });

  it("one or two activations do not start the countdown", () => {
    const { service } = collectingService();
    service.activate("chief");
    expect(service.getState().status).toBe("COLLECTING_ACTIVATIONS");
    service.activate("dean");
    expect(service.getState().status).toBe("COLLECTING_ACTIVATIONS");
    expect(service.getState().countdown).toBeNull();
  });

  it("the third activation starts the countdown exactly once and opens on schedule", () => {
    const { service, advance } = collectingService();
    const changes: string[] = [];
    service.subscribe((change) => {
      for (const event of change.events) {
        changes.push(event.name);
      }
    });

    service.activate("chief");
    service.activate("vice-chancellor");
    const state = service.activate("dean");

    expect(state.status).toBe("COUNTDOWN");
    expect(state.countdown).toMatchObject({
      trigger: "ALL_ACTIVATED",
      durationMs: 3000,
    });
    expect(state.countdown?.opensAt).toBe((state.countdown?.acceptedAt ?? 0) + 3000);
    expect(changes.filter((name) => name === SERVER_EVENTS.EVENT_COUNTDOWN_STARTED)).toHaveLength(
      1,
    );

    advance(2999);
    expect(service.getState().status).toBe("COUNTDOWN");
    advance(1);
    expect(service.getState().status).toBe("OPENED");
    expect(service.getState().openedAt).not.toBeNull();
  });

  it("rejects duplicate activation without changing version", () => {
    const { service } = collectingService();
    const first = service.activate("chief");
    try {
      service.activate("chief");
      expect.unreachable("expected ALREADY_ACTIVATED");
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).code).toBe("ALREADY_ACTIVATED");
      expect((error as DomainError).details).toEqual({
        activatedAt: first.activations.chief?.activatedAt,
      });
    }
    expect(service.getState().version).toBe(first.version);
  });

  it("starts countdown exactly once under simultaneous activations", () => {
    for (let i = 0; i < 1000; i += 1) {
      const { service } = collectingService({ runIds: [`run-${i}`, `next-${i}`] });
      const order = [...GUEST_ROLES].sort(() => Math.random() - 0.5) as GuestRole[];
      let countdownEvents = 0;
      service.subscribe((change) => {
        countdownEvents += change.events.filter(
          (event) => event.name === SERVER_EVENTS.EVENT_COUNTDOWN_STARTED,
        ).length;
      });
      for (const role of order) {
        service.activate(role);
      }
      expect(service.getState().status).toBe("COUNTDOWN");
      expect(countdownEvents).toBe(1);
      expect(() => service.activate(order[0]!)).toThrow(DomainError);
      service.dispose();
    }
  });

  it("rejects activation outside COLLECTING_ACTIVATIONS", () => {
    const { clock } = createFakeClock();
    const service = new CeremonyService({ clock, createRunId: () => "run-1" });
    expect(() => service.activate("chief")).toThrow(/WAITING/);
    service.prepare();
    expect(() => service.activate("chief")).toThrow(/READY/);
  });

  it("abort during countdown cancels opening", () => {
    const { service, advance } = collectingService();
    service.activate("chief");
    service.activate("vice-chancellor");
    service.activate("dean");
    const aborted = service.abort("rehearsal stop");
    expect(aborted.status).toBe("ABORTED");
    expect(aborted.abortedAt).not.toBeNull();
    expect(aborted.countdown).toBeNull();
    advance(10_000);
    expect(service.getState().status).toBe("ABORTED");
    expect(service.getState().openedAt).toBeNull();
  });

  it("reset clears activations and issues a new runId", () => {
    const { service } = collectingService({ runIds: ["run-a", "run-b"] });
    service.activate("chief");
    const reset = service.reset();
    expect(reset).toMatchObject({
      status: "WAITING",
      runId: "run-b",
      activations: { chief: null, "vice-chancellor": null, dean: null },
      countdown: null,
    });
  });

  it("rejects reset from WAITING and COUNTDOWN", () => {
    const { service, advance } = collectingService({ runIds: ["run-a", "run-b", "run-c"] });
    service.reset();
    expect(() => service.reset()).toThrow(/WAITING/);

    service.prepare();
    service.start();
    service.activate("chief");
    service.activate("vice-chancellor");
    service.activate("dean");
    expect(() => service.reset()).toThrow(/COUNTDOWN/);
    advance(3000);
    expect(service.reset().status).toBe("WAITING");
  });

  it("manual start requires COLLECTING_ACTIVATIONS and uses MANUAL trigger", () => {
    const { clock } = createFakeClock();
    const service = new CeremonyService({ clock, createRunId: () => "run-1" });
    expect(() => service.manualStart()).toThrow(/WAITING/);
    service.prepare();
    expect(() => service.manualStart()).toThrow(/READY/);
    service.start();
    const state = service.manualStart();
    expect(state.status).toBe("COUNTDOWN");
    expect(state.countdown?.trigger).toBe("MANUAL");
    expect(() => service.manualStart()).toThrow(/COUNTDOWN/);
  });

  it("increments version on every accepted change", () => {
    const { service } = collectingService();
    expect(service.getState().version).toBe(2);
    service.activate("chief");
    expect(service.getState().version).toBe(3);
  });

  it("ignores a stale opening timer after abort and reset", () => {
    const { service, advance } = collectingService({
      runIds: ["run-old", "run-new", "run-extra"],
    });
    service.activate("chief");
    service.activate("vice-chancellor");
    service.activate("dean");
    service.abort();
    service.reset();
    advance(10_000);
    expect(service.getState().status).toBe("WAITING");
    expect(service.getState().openedAt).toBeNull();
  });

  it("applies preparation delay to startsAt", () => {
    const { service } = collectingService({ delayMs: 1000, durationMs: 3000 });
    service.activate("chief");
    service.activate("vice-chancellor");
    const state = service.activate("dean");
    expect(state.countdown?.startsAt).toBe((state.countdown?.acceptedAt ?? 0) + 1000);
    expect(state.countdown?.opensAt).toBe((state.countdown?.acceptedAt ?? 0) + 4000);
  });
});
