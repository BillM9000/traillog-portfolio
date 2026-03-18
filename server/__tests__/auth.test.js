import { describe, it, expect } from "vitest";
import { createAuthAgent, getRequest } from "./helpers.js";
import request from "supertest";
import { getApp } from "./helpers.js";

describe("Auth — signup + login flow", () => {
  it("POST /api/auth/signup — creates user and returns session", async () => {
    const app = await getApp();
    const agent = request.agent(app);

    // Get CSRF
    const initRes = await agent.get("/api/public-settings");
    const cookies = initRes.headers["set-cookie"] || [];
    const xsrf = (Array.isArray(cookies) ? cookies : [cookies])
      .find((c) => c.startsWith("XSRF-TOKEN="));
    const csrf = xsrf ? xsrf.split("=")[1].split(";")[0] : "";

    const email = `signup-test-${Date.now()}@test.com`;
    const res = await agent
      .post("/api/auth/signup")
      .set("X-CSRF-Token", csrf)
      .send({ email, password: "TestPass123!", name: "Signup Test" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("user");
    expect(res.body.user.email).toBe(email);
  });

  it("POST /api/auth/signup — rejects duplicate email", async () => {
    const { agent, email, csrf } = await createAuthAgent();

    // Try signing up again with same email (new agent needed)
    const app = await getApp();
    const agent2 = request.agent(app);
    const initRes = await agent2.get("/api/public-settings");
    const cookies = initRes.headers["set-cookie"] || [];
    const xsrf = (Array.isArray(cookies) ? cookies : [cookies])
      .find((c) => c.startsWith("XSRF-TOKEN="));
    const csrf2 = xsrf ? xsrf.split("=")[1].split(";")[0] : "";

    const res = await agent2
      .post("/api/auth/signup")
      .set("X-CSRF-Token", csrf2)
      .send({ email, password: "TestPass123!", name: "Duplicate" });

    expect(res.status).toBe(400);
  });

  it("POST /api/auth/signup — rejects short password", async () => {
    const app = await getApp();
    const agent = request.agent(app);
    const initRes = await agent.get("/api/public-settings");
    const cookies = initRes.headers["set-cookie"] || [];
    const xsrf = (Array.isArray(cookies) ? cookies : [cookies])
      .find((c) => c.startsWith("XSRF-TOKEN="));
    const csrf = xsrf ? xsrf.split("=")[1].split(";")[0] : "";

    const res = await agent
      .post("/api/auth/signup")
      .set("X-CSRF-Token", csrf)
      .send({ email: "short@test.com", password: "1234567", name: "Short" });

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

    const logoutRes = await agent
      .post("/api/auth/logout")
      .set("X-CSRF-Token", csrf);
    expect(logoutRes.status).toBe(200);

    // Verify session is gone
    const meRes = await agent.get("/api/auth/me");
    expect(meRes.body.user).toBeFalsy();
  });

  it("PUT /api/auth/profile — updates name", async () => {
    const { agent, csrf } = await createAuthAgent();
    const res = await agent
      .put("/api/auth/profile")
      .set("X-CSRF-Token", csrf)
      .send({ name: "Updated Name", age_confirmed: "18+", user_type: "adult" });
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
    const app = await getApp();
    const agent = request.agent(app);
    const initRes = await agent.get("/api/public-settings");
    const cookies = initRes.headers["set-cookie"] || [];
    const xsrf = (Array.isArray(cookies) ? cookies : [cookies])
      .find((c) => c.startsWith("XSRF-TOKEN="));
    const csrf = xsrf ? xsrf.split("=")[1].split(";")[0] : "";

    const res = await agent
      .post("/api/auth/forgot-password")
      .set("X-CSRF-Token", csrf)
      .send({ email: "nonexistent@test.com" });
    // Should always return 200 (no email enumeration)
    expect(res.status).toBe(200);
  });
});
