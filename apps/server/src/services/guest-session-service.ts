import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { parse as parseCookie, serialize } from "cookie";
import {
  GUEST_ROLES,
  GUEST_SESSION_TTL_MS,
  SESSION_COOKIE_NAME,
  isGuestRole,
  type DeviceSessionStatus,
  type DeviceStatus,
  type GuestRole,
} from "@fit-expo/shared";
import type { Response } from "express";
import type { ServerEnv } from "../config/env.js";
import { DomainError } from "../errors/domain-error.js";
import { systemClock, type Clock, type TimeoutHandle } from "../state/clock.js";

export type DeviceRole = GuestRole | "display";

export type DeviceSession = {
  id: string;
  role: DeviceRole;
  status: Exclude<DeviceSessionStatus, "AVAILABLE">;
  createdAt: number;
  expiresAt: number;
  disconnectedAt: number | null;
  lastSeenAt: number | null;
};

export type RoleAvailability = {
  role: GuestRole;
  status: DeviceSessionStatus;
  available: boolean;
};

type GuestSessionServiceOptions = {
  reconnectGraceMs: number;
  clock?: Clock;
  sessionTtlMs?: number;
  secret: string;
};

/**
 * In-memory guest device sessions. A process restart drops every session.
 * Ceremony activations live in CeremonyService and are not cleared here.
 */
export class GuestSessionService {
  private readonly sessions = new Map<string, DeviceSession>();
  private readonly graceTimers = new Map<string, TimeoutHandle>();
  private readonly connectionCounts = new Map<string, number>();
  private readonly clock: Clock;
  private readonly reconnectGraceMs: number;
  private readonly sessionTtlMs: number;
  private readonly secret: string;

  constructor(options: GuestSessionServiceOptions) {
    this.clock = options.clock ?? systemClock;
    this.reconnectGraceMs = options.reconnectGraceMs;
    this.sessionTtlMs = options.sessionTtlMs ?? GUEST_SESSION_TTL_MS;
    this.secret = options.secret;
  }

  assign(role: GuestRole, currentCookie: string | undefined): DeviceSession {
    this.sweep();
    const current = this.readCookie(currentCookie);

    if (current && current.status !== "RELEASED" && current.role === role) {
      return current;
    }

    if (current && current.status !== "RELEASED" && current.role !== role) {
      this.release(current.id);
    }

    const holder = this.activeSessionForRole(role);
    if (holder) {
      throw new DomainError("FORBIDDEN", "This guest role is already assigned to another tablet.", {
        role,
        status: holder.status,
      });
    }

    const now = this.clock.now();
    const session: DeviceSession = {
      id: randomBytes(32).toString("hex"),
      role,
      status: "ASSIGNED",
      createdAt: now,
      expiresAt: now + this.sessionTtlMs,
      disconnectedAt: null,
      lastSeenAt: null,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * One projector session. A browser that already holds a guest role is rejected
   * so a tablet cannot silently become the display.
   */
  claimDisplay(currentCookie: string | undefined): DeviceSession {
    this.sweep();
    const current = this.readCookie(currentCookie);
    if (current && current.status !== "RELEASED" && isGuestRole(current.role)) {
      throw new DomainError(
        "FORBIDDEN",
        "This browser is assigned to a guest. Release it before using the display.",
      );
    }
    if (current && current.status !== "RELEASED" && current.role === "display") {
      return current;
    }
    const holder = this.activeSessionForRole("display");
    if (holder) {
      throw new DomainError("FORBIDDEN", "The display is already open on another screen.", {
        role: "display",
        status: holder.status,
      });
    }
    const now = this.clock.now();
    const session: DeviceSession = {
      id: randomBytes(32).toString("hex"),
      role: "display",
      status: "ASSIGNED",
      createdAt: now,
      expiresAt: now + this.sessionTtlMs,
      disconnectedAt: null,
      lastSeenAt: null,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  current(cookieHeader: string | undefined): DeviceSession | null {
    this.sweep();
    const session = this.readCookie(cookieHeader);
    if (!session || session.status === "RELEASED" || session.expiresAt <= this.clock.now()) {
      return null;
    }
    return session;
  }

  release(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.status === "RELEASED") {
      return;
    }
    this.clearGrace(sessionId);
    this.connectionCounts.delete(sessionId);
    session.status = "RELEASED";
    session.disconnectedAt = null;
  }

  releaseFromCookie(cookieHeader: string | undefined): void {
    const session = this.readCookie(cookieHeader);
    if (session) {
      this.release(session.id);
    }
  }

  markConnected(sessionId: string): DeviceSession {
    const session = this.requireActive(sessionId);
    this.clearGrace(sessionId);
    const count = (this.connectionCounts.get(sessionId) ?? 0) + 1;
    this.connectionCounts.set(sessionId, count);
    session.status = "CONNECTED";
    session.disconnectedAt = null;
    session.lastSeenAt = this.clock.now();
    return session;
  }

  markDisconnected(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.status === "RELEASED") {
      return;
    }
    const count = Math.max(0, (this.connectionCounts.get(sessionId) ?? 1) - 1);
    this.connectionCounts.set(sessionId, count);
    if (count > 0) {
      return;
    }
    session.status = "DISCONNECTED";
    session.disconnectedAt = this.clock.now();
    session.lastSeenAt = session.disconnectedAt;
    this.clearGrace(sessionId);
    const timer = this.clock.setTimeout(() => {
      this.graceTimers.delete(sessionId);
      const current = this.sessions.get(sessionId);
      if (current && current.status === "DISCONNECTED") {
        current.status = "RELEASED";
      }
    }, this.reconnectGraceMs);
    this.graceTimers.set(sessionId, timer);
  }

  presence(): DeviceStatus[] {
    this.sweep();
    const roles: DeviceRole[] = [...GUEST_ROLES, "display"];
    return roles.map((role) => {
      const holder = this.activeSessionForRole(role);
      const connectionCount = holder ? (this.connectionCounts.get(holder.id) ?? 0) : 0;
      return {
        role,
        connected: connectionCount > 0,
        connectionCount,
        lastSeenAt: holder?.lastSeenAt ?? null,
      };
    });
  }

  availability(): RoleAvailability[] {
    this.sweep();
    return GUEST_ROLES.map((role) => {
      const holder = this.activeSessionForRole(role);
      return {
        role,
        status: holder?.status ?? "AVAILABLE",
        available: holder === undefined,
      };
    });
  }

  sign(sessionId: string): string {
    const signature = createHmac("sha256", this.secret).update(sessionId).digest("hex");
    return `${sessionId}.${signature}`;
  }

  writeCookie(res: Response, env: Pick<ServerEnv, "COOKIE_SECURE">, sessionId: string): void {
    res.appendHeader(
      "Set-Cookie",
      serialize(SESSION_COOKIE_NAME, this.sign(sessionId), {
        httpOnly: true,
        sameSite: "lax",
        secure: env.COOKIE_SECURE,
        path: "/",
        maxAge: Math.floor(this.sessionTtlMs / 1000),
      }),
    );
  }

  clearCookie(res: Response, env: Pick<ServerEnv, "COOKIE_SECURE">): void {
    res.appendHeader(
      "Set-Cookie",
      serialize(SESSION_COOKIE_NAME, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: env.COOKIE_SECURE,
        path: "/",
        maxAge: 0,
      }),
    );
  }

  dispose(): void {
    for (const timer of this.graceTimers.values()) {
      this.clock.clearTimeout(timer);
    }
    this.graceTimers.clear();
  }

  private requireActive(sessionId: string): DeviceSession {
    this.sweep();
    const session = this.sessions.get(sessionId);
    if (!session || session.status === "RELEASED" || session.expiresAt <= this.clock.now()) {
      throw new DomainError("UNAUTHORIZED", "Device session is not valid.");
    }
    return session;
  }

  private readCookie(cookieHeader: string | undefined): DeviceSession | null {
    if (!cookieHeader) {
      return null;
    }
    const raw = parseCookie(cookieHeader)[SESSION_COOKIE_NAME];
    if (!raw) {
      return null;
    }
    const dot = raw.lastIndexOf(".");
    if (dot <= 0) {
      return null;
    }
    const sessionId = raw.slice(0, dot);
    const signature = raw.slice(dot + 1);
    const expected = createHmac("sha256", this.secret).update(sessionId).digest("hex");
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      return null;
    }
    return this.sessions.get(sessionId) ?? null;
  }

  private activeSessionForRole(role: DeviceRole): DeviceSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.role !== role || session.status === "RELEASED") {
        continue;
      }
      if (session.expiresAt <= this.clock.now()) {
        continue;
      }
      if (
        session.status === "DISCONNECTED" &&
        session.disconnectedAt !== null &&
        this.clock.now() - session.disconnectedAt >= this.reconnectGraceMs
      ) {
        continue;
      }
      return session;
    }
    return undefined;
  }

  private sweep(): void {
    const now = this.clock.now();
    for (const session of this.sessions.values()) {
      if (session.status === "RELEASED") {
        continue;
      }
      if (session.expiresAt <= now) {
        session.status = "RELEASED";
        this.clearGrace(session.id);
      }
    }
  }

  private clearGrace(sessionId: string): void {
    const timer = this.graceTimers.get(sessionId);
    if (timer) {
      this.clock.clearTimeout(timer);
      this.graceTimers.delete(sessionId);
    }
  }
}

export function isGuestSessionRole(value: string | undefined): value is GuestRole {
  return value !== undefined && isGuestRole(value);
}
