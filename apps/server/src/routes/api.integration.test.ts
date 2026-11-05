import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createRuntime, type Runtime } from "../create-runtime.js";
import { createTestEnv } from "../test/test-env.js";

describe("REST API foundation", () => {
  let runtime: Runtime | undefined;

  afterEach(() => {
    runtime?.dispose();
    runtime = undefined;
  });

  it("GET /api/health returns status without secrets", async () => {
    runtime = createRuntime(createTestEnv());
    const response = await request(runtime.app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: true,
      data: {
        status: "ok",
        environment: "test",
        serverTime: expect.any(Number),
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("SESSION_SECRET");
    expect(JSON.stringify(response.body)).not.toContain("test-session-secret");
  });

  it("GET /api/event/state requires a guest device session", async () => {
    runtime = createRuntime(createTestEnv());
    const denied = await request(runtime.app).get("/api/event/state");
    expect(denied.status).toBe(401);

    const assigned = await request(runtime.app)
      .post("/api/guest-sessions/assign")
      .send({ role: "chief" });
    expect(assigned.status).toBe(200);
    const cookie = assigned.headers["set-cookie"];
    const allowed = await request(runtime.app)
      .get("/api/event/state")
      .set("Cookie", Array.isArray(cookie) ? cookie : [cookie ?? ""]);
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.status).toBe("WAITING");
  });

  it("rejects a second assignment of the same guest role", async () => {
    runtime = createRuntime(createTestEnv());
    const first = await request(runtime.app)
      .post("/api/guest-sessions/assign")
      .send({ role: "dean" });
    const second = await request(runtime.app)
      .post("/api/guest-sessions/assign")
      .send({ role: "dean" });
    expect(first.status).toBe(200);
    expect(second.status).toBe(403);
    expect(second.body.error.code).toBe("FORBIDDEN");
  });

  it("releases a device session", async () => {
    runtime = createRuntime(createTestEnv());
    const assigned = await request(runtime.app)
      .post("/api/guest-sessions/assign")
      .send({ role: "vice-chancellor" });
    const cookie = assigned.headers["set-cookie"];
    const released = await request(runtime.app)
      .post("/api/guest-sessions/release")
      .set("Cookie", Array.isArray(cookie) ? cookie : [cookie ?? ""])
      .send({});
    expect(released.status).toBe(200);
    const again = await request(runtime.app)
      .post("/api/guest-sessions/assign")
      .send({ role: "vice-chancellor" });
    expect(again.status).toBe(200);
  });

  it("unknown routes return a structured validation error", async () => {
    runtime = createRuntime(createTestEnv());
    const response = await request(runtime.app).get("/api/missing");
    expect(response.status).toBe(404);
    expect(response.body.ok).toBe(false);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("allows configured CORS origins and rejects others", async () => {
    runtime = createRuntime(createTestEnv());
    const allowed = await request(runtime.app)
      .get("/api/health")
      .set("Origin", "http://localhost:3000");
    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(allowed.headers["access-control-allow-credentials"]).toBe("true");

    const denied = await request(runtime.app)
      .get("/api/health")
      .set("Origin", "http://evil.example");
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("does not expose guest activation or admin command routes", async () => {
    runtime = createRuntime(createTestEnv());
    const activate = await request(runtime.app).post("/api/guest/activate");
    const prepare = await request(runtime.app).post("/api/event/prepare");
    expect(activate.status).toBe(404);
    expect(prepare.status).toBe(404);
  });
});
