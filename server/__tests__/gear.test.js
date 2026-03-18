import { describe, it, expect } from "vitest";
import { createAuthAgent } from "./helpers.js";

describe("Gear catalog (authenticated)", () => {
  it("GET /api/gear-catalog — returns gear items", async () => {
    const { agent } = await createAuthAgent();
    const res = await agent.get("/api/gear-catalog");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(50); // 76 seeded items
  });

  it("GET /api/gear-catalog/categories — returns categories", async () => {
    const { agent } = await createAuthAgent();
    const res = await agent.get("/api/gear-catalog/categories");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("GET /api/gear-catalog/:id — returns single item", async () => {
    const { agent } = await createAuthAgent();
    const listRes = await agent.get("/api/gear-catalog");
    const firstId = listRes.body[0].id;

    const res = await agent.get(`/api/gear-catalog/${firstId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("name");
    expect(res.body).toHaveProperty("category");
  });

  it("GET /api/itineraries — returns Philmont treks", async () => {
    const { agent } = await createAuthAgent();
    const res = await agent.get("/api/itineraries");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(20); // 48 seeded
  });

  it("GET /api/itineraries/:id — returns single itinerary", async () => {
    const { agent } = await createAuthAgent();
    const listRes = await agent.get("/api/itineraries");
    const firstId = listRes.body[0].id;

    const res = await agent.get(`/api/itineraries/${firstId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("name");
    expect(res.body).toHaveProperty("days");
  });
});

describe("Global admin — requires is_admin", () => {
  it("GET /api/admin/troops — 403 for non-admin", async () => {
    const { agent } = await createAuthAgent();
    const res = await agent.get("/api/admin/troops");
    // Regular user should get 403 (not 401 — they're authenticated)
    expect(res.status).toBe(403);
  });

  it("GET /api/admin/users — 403 for non-admin", async () => {
    const { agent } = await createAuthAgent();
    const res = await agent.get("/api/admin/users");
    expect(res.status).toBe(403);
  });

  it("POST /api/gear-catalog — 403 for non-admin", async () => {
    const { agent, csrf } = await createAuthAgent();
    const res = await agent
      .post("/api/gear-catalog")
      .set("X-CSRF-Token", csrf)
      .send({ name: "Test Item", category: "test", weight_oz: 10 });
    expect(res.status).toBe(403);
  });
});
