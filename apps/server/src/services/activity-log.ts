import { randomUUID } from "node:crypto";
import type { ActivityEntry, ActivityType, Role } from "@fit-expo/shared";
import type { Clock } from "../state/clock.js";
import { systemClock } from "../state/clock.js";
import { redactRecord } from "../utils/logger.js";

const DEFAULT_LIMIT = 200;

export class ActivityLog {
  private readonly entries: ActivityEntry[] = [];
  private readonly clock: Clock;
  private readonly capacity: number;

  constructor(options: { clock?: Clock; capacity?: number } = {}) {
    this.clock = options.clock ?? systemClock;
    this.capacity = options.capacity ?? DEFAULT_LIMIT;
  }

  append(input: {
    type: ActivityType;
    message: string;
    actorRole?: Role | "server" | null;
    data?: Record<string, unknown>;
  }): ActivityEntry {
    const entry: ActivityEntry = {
      id: randomUUID(),
      at: this.clock.now(),
      type: input.type,
      actorRole: input.actorRole ?? null,
      message: input.message,
      ...(input.data ? { data: redactRecord(input.data) } : {}),
    };
    this.entries.unshift(entry);
    if (this.entries.length > this.capacity) {
      this.entries.length = this.capacity;
    }
    return entry;
  }

  list(limit = 100): ActivityEntry[] {
    return this.entries.slice(0, Math.min(limit, this.capacity));
  }
}
