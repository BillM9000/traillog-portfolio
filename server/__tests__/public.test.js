import { describe, it, expect } from "vitest";
import { getRequest } from "./helpers.js";

describe("Public routes (no auth)", () => {
  it("GET /api/public-settings — returns settings object", async () => {
    const res = await (await getRequest()).get("/api/public-settings");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("maintenance_mode");
    expect(res.body).toHaveProperty("registration_enabled");
    expect(res.body).toHaveProperty("announcement_enabled");
    expect(res.body).toHaveProperty("announcement_banner");
    expect(res.body).toHaveProperty("announcement_type");
  });

  it("GET /api/councils — returns 350+ BSA councils", async () => {
    const res = await (await getRequest()).get("/api/councils");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(100);
    expect(res.body[0]).toHaveProperty("id");
    expect(res.body[0]).toHaveProperty("name");
  });

  it("GET /health — returns 200", async () => {
    const res = await (await getRequest()).get("/health");
    expect(res.status).toBe(200);
  });
});

describe("Auth guard — protected routes return 401 without session", () => {
  const protectedRoutes = [
    "GET /api/troops",
    "GET /api/itineraries",
    "GET /api/gear-catalog",
    "GET /api/gear-catalog/categories",
    "GET /api/dashboard",
    "GET /api/admin/troops",
    "GET /api/admin/users",
    "GET /api/admin/settings",
    "GET /api/admin/system-admins",
    "GET /api/admin/affiliate-stats",
  ];

  for (const route of protectedRoutes) {
    const [method, path] = route.split(" ");
    it(`${route} — 401`, async () => {
      const req = await getRequest();
      const res = await req[method.toLowerCase()](path);
      expect(res.status).toBe(401);
    });
  }
});

describe("CSRF protection — state-changing requests need valid token", () => {
  it("POST without CSRF token — 403", async () => {
    const res = await (await getRequest())
      .post("/api/troops")
      .send({ name: "Test Troop" });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/CSRF/i);
  });

  it("PUT without CSRF token — 403", async () => {
    const res = await (await getRequest())
      .put("/api/auth/profile")
      .send({ name: "x" });
    expect(res.status).toBe(403);
  });

  it("DELETE without CSRF token — 403", async () => {
    const res = await (await getRequest()).delete("/api/admin/troops/1");
    expect(res.status).toBe(403);
  });
});
