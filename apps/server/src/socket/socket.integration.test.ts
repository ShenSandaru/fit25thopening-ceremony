import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  type CeremonyState,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "@fit-expo/shared";
import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { io as createClient, type Socket } from "socket.io-client";
import { createRuntime, type Runtime } from "../create-runtime.js";
import { createTestEnv } from "../test/test-env.js";

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

function connect(
  url: string,
  cookie?: string,
  origin = "http://localhost:3000",
): Socket<ServerToClientEvents, ClientToServerEvents> {
  return createClient(url, {
    transports: ["websocket"],
    extraHeaders: {
      Origin: origin,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    forceNew: true,
  });
}

async function assign(
  runtime: Runtime,
  role: "chief" | "vice-chancellor" | "dean",
): Promise<string> {
  const response = await request(runtime.app).post("/api/guest-sessions/assign").send({ role });
  const setCookie = response.headers["set-cookie"];
  const header = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!header) {
    throw new Error("missing session cookie");
  }
  return header.split(";")[0] ?? header;
}

async function connectWithInitialState(
  url: string,
  cookie: string,
): Promise<{
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  state: CeremonyState;
}> {
  const socket = connect(url, cookie);
  const state = await new Promise<CeremonyState>((resolve, reject) => {
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
  return { socket, state };
}

describe("Socket.IO foundation", () => {
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

  it("delivers event:state on connection", async () => {
    runtime = createRuntime(createTestEnv());
    const url = await listen(runtime);
    const cookie = await assign(runtime, "chief");
    const { socket, state } = await connectWithInitialState(url, cookie);
    sockets.push(socket);

    expect(state.status).toBe("WAITING");
    expect(state.version).toBe(0);
  });

  it("broadcasts state updates after ceremony transitions", async () => {
    runtime = createRuntime(createTestEnv());
    const url = await listen(runtime);
    const cookie = await assign(runtime, "dean");
    const { socket } = await connectWithInitialState(url, cookie);
    sockets.push(socket);

    const nextState = new Promise<CeremonyState>((resolve) => {
      socket.on(SERVER_EVENTS.EVENT_STATE, (payload) => {
        if (payload.status === "READY") {
          resolve(payload);
        }
      });
    });

    runtime.ceremony.prepare();
    await expect(nextState).resolves.toMatchObject({ status: "READY", version: 1 });
  });

  it("answers clock:sync and rejects invalid payloads", async () => {
    runtime = createRuntime(createTestEnv());
    const url = await listen(runtime);
    const cookie = await assign(runtime, "vice-chancellor");
    const { socket } = await connectWithInitialState(url, cookie);
    sockets.push(socket);

    const okResult = await new Promise((resolve) => {
      socket.emit(CLIENT_EVENTS.CLOCK_SYNC, { clientSentAt: 123 }, resolve);
    });
    expect(okResult).toEqual({
      ok: true,
      data: { clientSentAt: 123, serverTime: expect.any(Number) },
    });

    const badResult = await new Promise((resolve) => {
      socket.emit(
        CLIENT_EVENTS.CLOCK_SYNC,
        { clientSentAt: "nope" } as unknown as { clientSentAt: number },
        resolve,
      );
    });
    expect(badResult).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_ERROR" },
    });
  });

  it("rejects a socket without a device session", async () => {
    runtime = createRuntime(createTestEnv());
    const url = await listen(runtime);
    const socket = connect(url);
    sockets.push(socket);
    await expect(
      new Promise((resolve, reject) => {
        socket.on("connect", () => reject(new Error("should not connect")));
        socket.on("connect_error", (error) => resolve(error.message));
      }),
    ).resolves.toContain("UNAUTHORIZED");
  });

  it("activates only the session role and ignores a forged role field", async () => {
    runtime = createRuntime(createTestEnv());
    const url = await listen(runtime);
    const cookie = await assign(runtime, "chief");
    const { socket } = await connectWithInitialState(url, cookie);
    sockets.push(socket);
    runtime.ceremony.prepare();
    runtime.ceremony.start();

    const forged = await new Promise((resolve) => {
      socket.emit(
        CLIENT_EVENTS.GUEST_ACTIVATE,
        { role: "dean" } as unknown as Record<string, never>,
        resolve,
      );
    });
    expect(forged).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });

    const accepted = await new Promise((resolve) => {
      socket.emit(CLIENT_EVENTS.GUEST_ACTIVATE, {}, resolve);
    });
    expect(accepted).toMatchObject({ ok: true, data: { role: "chief" } });
    expect(runtime.ceremony.getState().activations.chief).not.toBeNull();
    expect(runtime.ceremony.getState().activations.dean).toBeNull();
  });
});
