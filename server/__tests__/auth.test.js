import { describe, it, expect } from "vitest";
import { createAuthAgent, getCsrfAgent } from "./helpers.js";

describe("Auth — signup + login flow", () => {
  it("POST /api/auth/signup — creates user", async () => {
    const { agent, csrf } = await getCsrfAgent();
    const email = `signup-test-${Date.now()}@test.com`;
    const res = await agent
      .post("/api/auth/signup")
      .set("X-CSRF-Token", csrf)
      .send({ email, password: "TestPass123!", name: "Signup Test", tos_accepted: true });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
  });

  it("POST /api/auth/signup — rejects duplicate email", async () => {
    // First signup
    const { agent: a1, csrf: c1 } = await getCsrfAgent();
    const email = `dup-test-${Date.now()}@test.com`;
    await a1.post("/api/auth/signup").set("X-CSRF-Token", c1)
      .send({ email, password: "TestPass123!", name: "First", tos_accepted: true });

    // Second signup with same email
    const { agent: a2, csrf: c2 } = await getCsrfAgent();
    const res = await a2.post("/api/auth/signup").set("X-CSRF-Token", c2)
      .send({ email, password: "TestPass123!", name: "Duplicate", tos_accepted: true });
    expect(res.status).toBe(409);
  });

  it("POST /api/auth/signup — rejects short password", async () => {
    const { agent, csrf } = await getCsrfAgent();
    const res = await agent
      .post("/api/auth/signup")
      .set("X-CSRF-Token", csrf)
      .send({ email: `short-${Date.now()}@test.com`, password: "1234567", name: "Short", tos_accepted: true });
    expect(res.status).toBe(400);
  });

  it("GET /api/auth/me — returns user when authenticated", async () => {
    const { agent } = await createAuthAgent();
    const res = await agent.get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("user");
    expect(res.body.user).toHaveProperty("email");
    expect(res.body.user).toHaveProperty("name");
  });

  it("POST /api/auth/logout — ends session", async () => {
    const { agent, csrf } = await createAuthAgent();
    const logoutRes = await agent.post("/api/auth/logout").set("X-CSRF-Token", csrf);
    expect(logoutRes.status).toBe(200);

    const meRes = await agent.get("/api/auth/me");
    expect(meRes.body.user).toBeFalsy();
  });

  it("PUT /api/auth/profile — updates name", async () => {
    const { agent, csrf } = await createAuthAgent();
    const res = await agent
      .put("/api/auth/profile")
      .set("X-CSRF-Token", csrf)
      .send({ name: "Updated Name" });
    expect(res.status).toBe(200);

    const me = await agent.get("/api/auth/me");
    expect(me.body.user.name).toBe("Updated Name");
  });
});

describe("Auth — password management", () => {
  it("PUT /api/auth/change-password — changes password", async () => {
    const { agent, csrf, password } = await createAuthAgent();
    const res = await agent
      .put("/api/auth/change-password")
      .set("X-CSRF-Token", csrf)
      .send({ currentPassword: password, newPassword: "NewPass456!" });
    expect(res.status).toBe(200);
  });

  it("PUT /api/auth/change-password — rejects wrong current password", async () => {
    const { agent, csrf } = await createAuthAgent();
    const res = await agent
      .put("/api/auth/change-password")
      .set("X-CSRF-Token", csrf)
      .send({ currentPassword: "WrongPass!", newPassword: "NewPass456!" });
    expect(res.status).toBe(400);
  });

  it("POST /api/auth/forgot-password — accepts any email (no leak)", async () => {
    const { agent, csrf } = await getCsrfAgent();
    const res = await agent
      .post("/api/auth/forgot-password")
      .set("X-CSRF-Token", csrf)
      .send({ email: "nonexistent@test.com" });
    expect(res.status).toBe(200);
  });
});
