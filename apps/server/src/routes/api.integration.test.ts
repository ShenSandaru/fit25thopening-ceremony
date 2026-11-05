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

  it("does not expose guest activation over REST", async () => {
    runtime = createRuntime(createTestEnv());
    const activate = await request(runtime.app).post("/api/guest/activate");
    expect(activate.status).toBe(404);
  });

  describe("Admin ceremony lifecycle endpoints", () => {
    it("prepares and starts ceremony", async () => {
      runtime = createRuntime(createTestEnv());
      const prepRes = await request(runtime.app).post("/api/event/prepare").send({});
      expect(prepRes.status).toBe(200);
      expect(prepRes.body.data.status).toBe("READY");

      const startRes = await request(runtime.app).post("/api/event/start").send({});
      expect(startRes.status).toBe(200);
      expect(startRes.body.data.status).toBe("COLLECTING_ACTIVATIONS");
    });

    it("rejects invalid state transitions", async () => {
      runtime = createRuntime(createTestEnv());
      // Calling start when WAITING is invalid
      const res = await request(runtime.app).post("/api/event/start").send({});
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("INVALID_TRANSITION");
    });

    it("aborts and resets ceremony", async () => {
      runtime = createRuntime(createTestEnv());
      await request(runtime.app).post("/api/event/prepare").send({});
      const abortRes = await request(runtime.app)
        .post("/api/event/abort")
        .send({ reason: "Organizer pause" });
      expect(abortRes.status).toBe(200);
      expect(abortRes.body.data.status).toBe("ABORTED");

      const resetRes = await request(runtime.app).post("/api/event/reset").send({});
      expect(resetRes.status).toBe(200);
      expect(resetRes.body.data.status).toBe("WAITING");
    });

    it("retrieves activity logs and device status", async () => {
      runtime = createRuntime(createTestEnv());
      await request(runtime.app).post("/api/event/prepare").send({});

      const activityRes = await request(runtime.app).get("/api/event/activity?limit=10");
      expect(activityRes.status).toBe(200);
      expect(activityRes.body.data.entries.length).toBeGreaterThan(0);
      expect(activityRes.body.data.entries[0].type).toBe("ADMIN_ACTION");

      const devicesRes = await request(runtime.app).get("/api/devices/status");
      expect(devicesRes.status).toBe(200);
      expect(devicesRes.body.data.devices).toBeDefined();
      expect(devicesRes.body.data.availability).toBeDefined();
    });

    it("releases assigned guest role and prevents release if activated", async () => {
      runtime = createRuntime(createTestEnv());
      await request(runtime.app).post("/api/guest-sessions/assign").send({ role: "chief" });

      const releaseRes = await request(runtime.app)
        .post("/api/guest-sessions/release-role")
        .send({ role: "chief" });
      expect(releaseRes.status).toBe(200);
      expect(releaseRes.body.data.released).toBe(true);

      // Re-assign chief
      await request(runtime.app).post("/api/guest-sessions/assign").send({ role: "chief" });
      // Transition to COLLECTING_ACTIVATIONS and activate chief
      runtime.ceremony.prepare();
      runtime.ceremony.start();
      runtime.ceremony.activate("chief");

      // Attempting to release chief now must fail
      const blockedRes = await request(runtime.app)
        .post("/api/guest-sessions/release-role")
        .send({ role: "chief" });
      expect(blockedRes.status).toBe(409);
      expect(blockedRes.body.error.code).toBe("INVALID_TRANSITION");
    });
  });
});
