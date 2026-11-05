import { randomUUID } from "node:crypto";
import {
  DEFAULT_COUNTDOWN_DURATION_MS,
  DEFAULT_PREPARATION_DELAY_MS,
  GUEST_ROLES,
  SERVER_EVENTS,
  type CeremonyActivations,
  type CeremonyState,
  type CountdownInfo,
  type CountdownTrigger,
  type GuestRole,
  type ServerToClientEvents,
} from "@fit-expo/shared";
import { DomainError } from "../errors/domain-error.js";
import { systemClock, type Clock, type TimeoutHandle } from "./clock.js";
import { canTransition } from "./transitions.js";

export type CeremonyDomainEvent = {
  [K in keyof ServerToClientEvents]: {
    name: K;
    payload: Parameters<ServerToClientEvents[K]>[0];
  };
}[keyof ServerToClientEvents];

export type CeremonyChange = {
  state: CeremonyState;
  events: CeremonyDomainEvent[];
};

export type CeremonyListener = (change: CeremonyChange) => void;

export type CeremonyServiceOptions = {
  countdownDurationMs?: number;
  preparationDelayMs?: number;
  clock?: Clock;
  createRunId?: () => string;
};

type InternalState = {
  runId: string;
  version: number;
  status: CeremonyState["status"];
  activations: CeremonyActivations;
  countdown: CountdownInfo | null;
  openedAt: number | null;
  abortedAt: number | null;
  updatedAt: number;
};

function emptyActivations(): CeremonyActivations {
  return {
    chief: null,
    "vice-chancellor": null,
    dean: null,
  };
}

function createInitialState(now: number, createRunId: () => string): InternalState {
  return {
    runId: createRunId(),
    version: 0,
    status: "WAITING",
    activations: emptyActivations(),
    countdown: null,
    openedAt: null,
    abortedAt: null,
    updatedAt: now,
  };
}

function countActivations(activations: CeremonyActivations): number {
  return GUEST_ROLES.reduce((count, role) => count + (activations[role] ? 1 : 0), 0);
}

function allActivated(activations: CeremonyActivations): boolean {
  return GUEST_ROLES.every((role) => activations[role] !== null);
}

/**
 * Single source of truth for ceremony state. Decision methods are synchronous:
 * no await between validation and mutation, which guarantees exactly-once countdown
 * under nearly simultaneous activations on one Node process.
 */
export class CeremonyService {
  private readonly countdownDurationMs: number;
  private readonly preparationDelayMs: number;
  private readonly clock: Clock;
  private readonly createRunId: () => string;
  private readonly listeners = new Set<CeremonyListener>();
  private state: InternalState;
  private openingTimer: TimeoutHandle | null = null;

  constructor(options: CeremonyServiceOptions = {}) {
    this.countdownDurationMs = options.countdownDurationMs ?? DEFAULT_COUNTDOWN_DURATION_MS;
    this.preparationDelayMs = options.preparationDelayMs ?? DEFAULT_PREPARATION_DELAY_MS;
    this.clock = options.clock ?? systemClock;
    this.createRunId = options.createRunId ?? (() => randomUUID());
    this.state = createInitialState(this.clock.now(), this.createRunId);
  }

  subscribe(listener: CeremonyListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): CeremonyState {
    return this.toSnapshot(this.clock.now());
  }

  prepare(): CeremonyState {
    this.assertCan("prepare");
    return this.commit({ status: "READY" }, []);
  }

  start(): CeremonyState {
    this.assertCan("start");
    const startedAt = this.clock.now();
    return this.commit({ status: "COLLECTING_ACTIVATIONS" }, [
      {
        name: SERVER_EVENTS.EVENT_ACTIVATION_STARTED,
        payload: {
          runId: this.state.runId,
          version: this.state.version + 1,
          startedAt,
        },
      },
    ]);
  }

  activate(role: GuestRole): CeremonyState {
    this.assertCan("activate");

    const existing = this.state.activations[role];
    if (existing !== null) {
      throw new DomainError("ALREADY_ACTIVATED", `${role} has already activated`, {
        activatedAt: existing.activatedAt,
      });
    }

    const activatedAt = this.clock.now();
    const activations: CeremonyActivations = {
      ...this.state.activations,
      [role]: { activatedAt },
    };

    let state = this.commit({ activations }, [
      {
        name: SERVER_EVENTS.GUEST_ACTIVATED,
        payload: {
          runId: this.state.runId,
          version: this.state.version + 1,
          role,
          activatedAt,
          activatedCount: countActivations(activations),
        },
      },
    ]);

    if (allActivated(activations)) {
      state = this.beginCountdown("ALL_ACTIVATED");
    }

    return state;
  }

  manualStart(): CeremonyState {
    this.assertCan("manualStart");
    return this.beginCountdown("MANUAL");
  }

  abort(reason?: string): CeremonyState {
    this.assertCan("abort");
    this.clearOpeningTimer();
    const abortedAt = this.clock.now();
    return this.commit(
      {
        status: "ABORTED",
        abortedAt,
        countdown: null,
      },
      [
        {
          name: SERVER_EVENTS.EVENT_ABORTED,
          payload: {
            runId: this.state.runId,
            version: this.state.version + 1,
            abortedAt,
            reason: reason ?? null,
          },
        },
      ],
    );
  }

  reset(): CeremonyState {
    this.assertCan("reset");
    this.clearOpeningTimer();
    const resetAt = this.clock.now();
    const nextRunId = this.createRunId();
    const state = this.commit(
      {
        runId: nextRunId,
        status: "WAITING",
        activations: emptyActivations(),
        countdown: null,
        openedAt: null,
        abortedAt: null,
      },
      [
        {
          name: SERVER_EVENTS.EVENT_RESET,
          payload: {
            runId: nextRunId,
            version: this.state.version + 1,
            resetAt,
          },
        },
      ],
    );
    return state;
  }

  /** Test helper: clears listeners and any pending timer. */
  dispose(): void {
    this.clearOpeningTimer();
    this.listeners.clear();
  }

  private beginCountdown(trigger: CountdownTrigger): CeremonyState {
    const acceptedAt = this.clock.now();
    const startsAt = acceptedAt + this.preparationDelayMs;
    const opensAt = startsAt + this.countdownDurationMs;
    const countdown: CountdownInfo = {
      trigger,
      acceptedAt,
      startsAt,
      durationMs: this.countdownDurationMs,
      opensAt,
    };

    const state = this.commit({ status: "COUNTDOWN", countdown }, [
      {
        name: SERVER_EVENTS.EVENT_COUNTDOWN_STARTED,
        payload: {
          runId: this.state.runId,
          version: this.state.version + 1,
          serverTime: acceptedAt,
          ...countdown,
        },
      },
    ]);

    this.scheduleOpening(state.runId, opensAt);
    return state;
  }

  private scheduleOpening(runId: string, opensAt: number): void {
    this.clearOpeningTimer();
    const delayMs = Math.max(0, opensAt - this.clock.now());
    this.openingTimer = this.clock.setTimeout(() => {
      this.onOpeningTimer(runId);
    }, delayMs);
  }

  private onOpeningTimer(expectedRunId: string): void {
    this.openingTimer = null;
    if (this.state.status !== "COUNTDOWN" || this.state.runId !== expectedRunId) {
      return;
    }
    this.open();
  }

  private open(): CeremonyState {
    this.assertCan("open");
    this.clearOpeningTimer();
    const openedAt = this.clock.now();
    return this.commit(
      {
        status: "OPENED",
        openedAt,
      },
      [
        {
          name: SERVER_EVENTS.EVENT_OPENED,
          payload: {
            runId: this.state.runId,
            version: this.state.version + 1,
            openedAt,
          },
        },
      ],
    );
  }

  private clearOpeningTimer(): void {
    if (this.openingTimer !== null) {
      this.clock.clearTimeout(this.openingTimer);
      this.openingTimer = null;
    }
  }

  private assertCan(action: Parameters<typeof canTransition>[0]): void {
    if (!canTransition(action, this.state.status)) {
      throw new DomainError(
        "INVALID_TRANSITION",
        `Cannot ${action} while ceremony is ${this.state.status}`,
        { status: this.state.status },
      );
    }
  }

  private commit(patch: Partial<InternalState>, events: CeremonyDomainEvent[]): CeremonyState {
    const updatedAt = this.clock.now();
    this.state = {
      ...this.state,
      ...patch,
      version: this.state.version + 1,
      updatedAt,
    };
    const snapshot = this.toSnapshot(updatedAt);
    this.emit({ state: snapshot, events });
    return snapshot;
  }

  private emit(change: CeremonyChange): void {
    for (const listener of this.listeners) {
      listener(change);
    }
  }

  private toSnapshot(serverTime: number): CeremonyState {
    return {
      runId: this.state.runId,
      version: this.state.version,
      status: this.state.status,
      activations: {
        chief: this.state.activations.chief,
        "vice-chancellor": this.state.activations["vice-chancellor"],
        dean: this.state.activations.dean,
      },
      countdown: this.state.countdown,
      openedAt: this.state.openedAt,
      abortedAt: this.state.abortedAt,
      updatedAt: this.state.updatedAt,
      serverTime,
    };
  }
}
