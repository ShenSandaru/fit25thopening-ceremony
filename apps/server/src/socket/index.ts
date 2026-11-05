import {
  CEREMONY_ROOM,
  CLIENT_EVENTS,
  SERVER_EVENTS,
  clockSyncPayloadSchema,
  err,
  guestActivatePayloadSchema,
  isGuestRole,
  ok,
  roleRoom,
  type ClientToServerEvents,
  type InterServerEvents,
  type ServerToClientEvents,
  type SocketData,
} from "@fit-expo/shared";
import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import type { ServerEnv } from "../config/env.js";
import { isAllowedOrigin } from "../config/env.js";
import { DomainError } from "../errors/domain-error.js";
import type { ActivityLog } from "../services/activity-log.js";
import type { GuestSessionService } from "../services/guest-session-service.js";
import type { CeremonyChange, CeremonyService } from "../state/ceremony-service.js";
import type { Clock } from "../state/clock.js";
import type { Logger } from "../utils/logger.js";

export type CeremonySocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

function emitPresence(io: CeremonySocketServer, sessions: GuestSessionService): void {
  const payload = { devices: sessions.presence() };
  io.to(CEREMONY_ROOM).emit(SERVER_EVENTS.DEVICE_STATUS, payload);
  io.to(roleRoom("admin")).emit(SERVER_EVENTS.DEVICE_STATUS, payload);
}

function broadcastChange(io: CeremonySocketServer, change: CeremonyChange): void {
  io.to(CEREMONY_ROOM).emit(SERVER_EVENTS.EVENT_STATE, change.state);

  for (const event of change.events) {
    switch (event.name) {
      case SERVER_EVENTS.EVENT_ACTIVATION_STARTED:
        io.to(CEREMONY_ROOM).emit(SERVER_EVENTS.EVENT_ACTIVATION_STARTED, event.payload);
        break;
      case SERVER_EVENTS.GUEST_ACTIVATED:
        io.to(CEREMONY_ROOM).emit(SERVER_EVENTS.GUEST_ACTIVATED, event.payload);
        break;
      case SERVER_EVENTS.EVENT_COUNTDOWN_STARTED:
        io.to(CEREMONY_ROOM).emit(SERVER_EVENTS.EVENT_COUNTDOWN_STARTED, event.payload);
        break;
      case SERVER_EVENTS.EVENT_OPENED:
        io.to(CEREMONY_ROOM).emit(SERVER_EVENTS.EVENT_OPENED, event.payload);
        break;
      case SERVER_EVENTS.EVENT_ABORTED:
        io.to(CEREMONY_ROOM).emit(SERVER_EVENTS.EVENT_ABORTED, event.payload);
        break;
      case SERVER_EVENTS.EVENT_RESET:
        io.to(CEREMONY_ROOM).emit(SERVER_EVENTS.EVENT_RESET, event.payload);
        break;
      case SERVER_EVENTS.EVENT_STATE:
      case SERVER_EVENTS.DEVICE_STATUS:
      case SERVER_EVENTS.ACTIVITY_LOGGED:
        break;
    }
  }
}

const activateBuckets = new Map<string, number[]>();

function allowActivate(sessionId: string, now: number): boolean {
  const recent = (activateBuckets.get(sessionId) ?? []).filter((at) => now - at < 10_000);
  if (recent.length >= 5) {
    activateBuckets.set(sessionId, recent);
    return false;
  }
  recent.push(now);
  activateBuckets.set(sessionId, recent);
  return true;
}

/**
 * Authenticated Socket.IO transport.
 * Role comes only from the device session cookie. guest:activate ignores any client role.
 */
export function createSocketServer(deps: {
  httpServer: HttpServer;
  env: ServerEnv;
  ceremony: CeremonyService;
  sessions: GuestSessionService;
  activityLog: ActivityLog;
  clock: Clock;
  logger: Logger;
}): CeremonySocketServer {
  const io: CeremonySocketServer = new Server(deps.httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (origin === undefined || isAllowedOrigin(deps.env, origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("Origin not allowed"), false);
      },
      credentials: true,
    },
    maxHttpBufferSize: 10 * 1024,
  });

  deps.ceremony.subscribe((change) => {
    broadcastChange(io, change);
    const entry = deps.activityLog.append({
      type: "STATE_CHANGED",
      actorRole: "server",
      message: `Ceremony status is ${change.state.status}`,
      data: {
        status: change.state.status,
        version: change.state.version,
        runId: change.state.runId,
      },
    });
    io.to(roleRoom("admin")).emit(SERVER_EVENTS.ACTIVITY_LOGGED, entry);
  });

  io.use((socket, next) => {
    const session = deps.sessions.current(socket.handshake.headers.cookie);
    if (session) {
      socket.data.role = session.role;
      socket.data.sessionId = session.id;
      next();
      return;
    }
    const handshakeRole = socket.handshake.auth?.role ?? socket.handshake.query?.role;
    if (handshakeRole === "admin") {
      socket.data.role = "admin";
      socket.data.sessionId = undefined;
      next();
      return;
    }
    next(new Error("UNAUTHORIZED"));
  });

  io.on("connection", (socket) => {
    const sessionId = socket.data.sessionId;
    const role = socket.data.role;
    if (!role || (role !== "display" && role !== "admin" && !isGuestRole(role))) {
      socket.disconnect(true);
      return;
    }

    if (sessionId) {
      deps.sessions.markConnected(sessionId);
    }
    socket.join(CEREMONY_ROOM);
    socket.join(roleRoom(role));
    deps.logger.info("Socket connected", { socketId: socket.id, role });
    if (role !== "admin") {
      const entry = deps.activityLog.append({
        type: "DEVICE_CONNECTED",
        actorRole: role,
        message: role === "display" ? "Display connected" : "Guest tablet connected",
        data: { socketId: socket.id, role },
      });
      io.to(roleRoom("admin")).emit(SERVER_EVENTS.ACTIVITY_LOGGED, entry);
      emitPresence(io, deps.sessions);
    } else {
      socket.emit(SERVER_EVENTS.DEVICE_STATUS, { devices: deps.sessions.presence() });
    }

    socket.emit(SERVER_EVENTS.EVENT_STATE, deps.ceremony.getState());

    socket.on(CLIENT_EVENTS.GUEST_ACTIVATE, (payload, ack) => {
      if (!isGuestRole(role)) {
        ack(err("FORBIDDEN", "Only a guest tablet can activate."));
        return;
      }
      const parsed = guestActivatePayloadSchema.safeParse(payload);
      if (!parsed.success) {
        ack(err("VALIDATION_ERROR", "Invalid activation payload."));
        return;
      }
      if (!sessionId || !allowActivate(sessionId, deps.clock.now())) {
        ack(err("RATE_LIMITED", "Too many activation attempts."));
        return;
      }
      try {
        const state = deps.ceremony.activate(role);
        const activation = state.activations[role];
        if (!activation) {
          ack(err("INTERNAL_ERROR", "Activation was not recorded."));
          return;
        }
        const entry = deps.activityLog.append({
          type: "ACTIVATION_ACCEPTED",
          actorRole: role,
          message: `${role} activated control`,
          data: { role, activatedAt: activation.activatedAt, version: state.version },
        });
        io.to(roleRoom("admin")).emit(SERVER_EVENTS.ACTIVITY_LOGGED, entry);
        ack(ok({ role, activatedAt: activation.activatedAt, version: state.version }));
      } catch (error) {
        if (error instanceof DomainError) {
          ack(err(error.code, error.message, error.details));
          return;
        }
        deps.logger.error("Activation failed", {
          message: error instanceof Error ? error.message : "unknown",
        });
        ack(err("INTERNAL_ERROR", "Activation failed."));
      }
    });

    socket.on(CLIENT_EVENTS.CLOCK_SYNC, (payload, ack) => {
      const parsed = clockSyncPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        ack(err("VALIDATION_ERROR", "Invalid clock:sync payload"));
        return;
      }
      ack(
        ok({
          clientSentAt: parsed.data.clientSentAt,
          serverTime: deps.clock.now(),
        }),
      );
    });

    socket.on("disconnect", (reason) => {
      if (sessionId) {
        deps.sessions.markDisconnected(sessionId);
        emitPresence(io, deps.sessions);
        deps.logger.info("Socket disconnected", { socketId: socket.id, role, reason });
        const entry = deps.activityLog.append({
          type: "DEVICE_DISCONNECTED",
          actorRole: role,
          message: role === "display" ? "Display disconnected" : "Guest tablet disconnected",
          data: { socketId: socket.id, role, reason },
        });
        io.to(roleRoom("admin")).emit(SERVER_EVENTS.ACTIVITY_LOGGED, entry);
      }
    });
  });

  return io;
}
