import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  type CeremonyState,
  type ClientToServerEvents,
  type GuestRole,
  type ServerToClientEvents,
} from "@fit-expo/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { io as createClient, type Socket } from "socket.io-client";
import { createRuntime, type Runtime } from "../create-runtime.js";
import { createTestEnv } from "../test/test-env.js";
import type { Clock, TimeoutHandle } from "../state/clock.js";

function fakeClock(start = 1_700_000_000_000) {
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

async function listen(runtime: Runtime): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    runtime.httpServer.once("error", reject);
    runtime.httpServer.listen(0, "127.0.0.1", () => resolve());
  });
  const address = runtime.httpServer.address();
  if (address === null || typeof address === "string") {
    throw new Error("Failed to bind test server");
  }
  return `http://127.0.0.1:${address.port}`;
}

function cookieFrom(response: request.Response): string {
  const setCookie = response.headers["set-cookie"];
  const header = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!header) {
    throw new Error("missing session cookie");
  }
  return header.split(";")[0] ?? header;
}

function connect(url: string, cookie: string): Socket<ServerToClientEvents, ClientToServerEvents> {
  return createClient(url, {
    transports: ["websocket"],
    extraHeaders: { Origin: "http://localhost:3000", Cookie: cookie },
    forceNew: true,
  });
}

async function initialState(
  socket: Socket<ServerToClientEvents, ClientToServerEvents>,
): Promise<CeremonyState> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("state timeout")), 5000);
    socket.on(SERVER_EVENTS.EVENT_STATE, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
    socket.on("connect_error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function activate(socket: Socket<ServerToClientEvents, ClientToServerEvents>) {
  return new Promise((resolve) => {
    socket.emit(CLIENT_EVENTS.GUEST_ACTIVATE, {}, resolve);
  });
}

describe("ceremony display flow", () => {
  let runtime: Runtime | undefined;
  const sockets: Socket[] = [];

  afterEach(async () => {
    for (const socket of sockets.splice(0)) {
      socket.disconnect();
    }
    if (runtime) {
      await new Promise<void>((resolve) => {
        runtime?.httpServer.close(() => resolve());
      });
      runtime.dispose();
      runtime = undefined;
    }
  });

  it("starts the countdown once on the third activation and opens from the server clock", async () => {
    const time = fakeClock();
    runtime = createRuntime(createTestEnv(), { clock: time.clock });
    const url = await listen(runtime);
    const display = await request(runtime.app).post("/api/display-sessions/claim");
    expect(display.status).toBe(200);
    const displaySocket = connect(url, cookieFrom(display));
    sockets.push(displaySocket);
    await initialState(displaySocket);

    const begun = await request(runtime.app)
      .post("/api/event/begin-activations")
      .set("Cookie", cookieFrom(display));
    expect(begun.body.data.status).toBe("COLLECTING_ACTIVATIONS");

    const roles: GuestRole[] = ["chief", "vice-chancellor", "dean"];
    const clients = [];
    for (const role of roles) {
      const assigned = await request(runtime.app).post("/api/guest-sessions/assign").send({ role });
      const socket = connect(url, cookieFrom(assigned));
      sockets.push(socket);
      clients.push(socket);
      await initialState(socket);
    }

    const countdown = new Promise<CeremonyState>((resolve) => {
      displaySocket.on(SERVER_EVENTS.EVENT_STATE, (payload) => {
        if (payload.status === "COUNTDOWN") {
          resolve(payload);
        }
      });
    });
    const opened = new Promise<CeremonyState>((resolve) => {
      displaySocket.on(SERVER_EVENTS.EVENT_OPENED, () => {
        resolve(runtime!.ceremony.getState());
      });
    });

    expect(await activate(clients[0]!)).toMatchObject({ ok: true });
    expect(await activate(clients[0]!)).toMatchObject({
      ok: false,
      error: { code: "ALREADY_ACTIVATED" },
    });
    expect(await activate(clients[1]!)).toMatchObject({ ok: true });
    expect(runtime.ceremony.getState().status).toBe("COLLECTING_ACTIVATIONS");
    expect(await activate(clients[2]!)).toMatchObject({ ok: true });
    const countdownState = await countdown;
    expect(countdownState.countdown).toMatchObject({ trigger: "ALL_ACTIVATED", durationMs: 5000 });
    expect(await activate(clients[0]!)).toMatchObject({
      ok: false,
      error: { code: "INVALID_TRANSITION" },
    });

    time.advance(4999);
    expect(runtime.ceremony.getState().status).toBe("COUNTDOWN");
    time.advance(1);
    await expect(opened).resolves.toMatchObject({ status: "OPENED" });
  });

  it("keeps an activation when the tablet disconnects and reconnects", async () => {
    const time = fakeClock();
    runtime = createRuntime(createTestEnv(), { clock: time.clock });
    const url = await listen(runtime);
    runtime.ceremony.prepare();
    runtime.ceremony.start();
    const assigned = await request(runtime.app)
      .post("/api/guest-sessions/assign")
      .send({ role: "chief" });
    const cookie = cookieFrom(assigned);
    const socket = connect(url, cookie);
    sockets.push(socket);
    await initialState(socket);
    expect(await activate(socket)).toMatchObject({ ok: true });
    socket.disconnect();
    await vi.waitFor(() => {
      expect(runtime?.sessions.presence().find((row) => row.role === "chief")?.connected).toBe(
        false,
      );
    });
    expect(runtime.ceremony.getState().activations.chief).not.toBeNull();
    expect(runtime.sessions.presence().find((row) => row.role === "chief")?.connected).toBe(false);

    const again = connect(url, cookie);
    sockets.push(again);
    const restored = await initialState(again);
    expect(restored.activations.chief).not.toBeNull();
    expect(restored.status).toBe("COLLECTING_ACTIVATIONS");
  });

  it("does not open after an abort during countdown", async () => {
    const time = fakeClock();
    runtime = createRuntime(createTestEnv(), { clock: time.clock });
    const url = await listen(runtime);
    runtime.ceremony.prepare();
    runtime.ceremony.start();
    const roles: GuestRole[] = ["chief", "vice-chancellor", "dean"];
    for (const role of roles) {
      const assigned = await request(runtime.app).post("/api/guest-sessions/assign").send({ role });
      const socket = connect(url, cookieFrom(assigned));
      sockets.push(socket);
      await initialState(socket);
      expect(await activate(socket)).toMatchObject({ ok: true });
    }
    expect(runtime.ceremony.getState().status).toBe("COUNTDOWN");
    runtime.ceremony.abort("rehearsal");
    time.advance(10_000);
    expect(runtime.ceremony.getState().status).toBe("ABORTED");
    expect(runtime.ceremony.getState().openedAt).toBeNull();
  });

  it("refuses activation from the display session and from a guest before collection", async () => {
    runtime = createRuntime(createTestEnv());
    const url = await listen(runtime);
    const display = await request(runtime.app).post("/api/display-sessions/claim");
    const socket = connect(url, cookieFrom(display));
    sockets.push(socket);
    await initialState(socket);
    expect(await activate(socket)).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });

    const dean = await request(runtime.app)
      .post("/api/guest-sessions/assign")
      .send({ role: "dean" });
    const guestDenied = await request(runtime.app)
      .post("/api/event/begin-activations")
      .set("Cookie", cookieFrom(dean));
    expect(guestDenied.status).toBe(403);
  });
});
