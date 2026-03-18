import { describe, it, expect } from "vitest";
import { createAuthAgent } from "./helpers.js";

describe("Troops CRUD", () => {
  it("POST /api/troops — creates troop", async () => {
    const { agent, csrf } = await createAuthAgent();
    const res = await agent
      .post("/api/troops")
      .set("X-CSRF-Token", csrf)
      .send({ name: "Test Troop", council_id: 1, location: "Test City, TX" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("troop");
    expect(res.body.troop.name).toBe("Test Troop");
  });

  it("GET /api/troops — lists user troops", async () => {
    const { agent, csrf } = await createAuthAgent();
    // Create a troop first
    await agent.post("/api/troops").set("X-CSRF-Token", csrf)
      .send({ name: "List Test", council_id: 1, location: "X" });

    const res = await agent.get("/api/troops");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("GET /api/troops/:id — returns troop details", async () => {
    const { agent, csrf } = await createAuthAgent();
    const createRes = await agent.post("/api/troops").set("X-CSRF-Token", csrf)
      .send({ name: "Detail Test", council_id: 1, location: "Y" });
    const troopId = createRes.body.troop.id;

    const res = await agent.get(`/api/troops/${troopId}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Detail Test");
  });

  it("PUT /api/troops/:id — updates troop", async () => {
    const { agent, csrf } = await createAuthAgent();
    const createRes = await agent.post("/api/troops").set("X-CSRF-Token", csrf)
      .send({ name: "Update Test", council_id: 1, location: "Z" });
    const troopId = createRes.body.troop.id;

    const res = await agent
      .put(`/api/troops/${troopId}`)
      .set("X-CSRF-Token", csrf)
      .send({ name: "Updated Troop", council_id: 1, location: "New City" });
    expect(res.status).toBe(200);
  });

  it("GET /api/troops/:id — rejects non-member", async () => {
    const user1 = await createAuthAgent();
    const createRes = await user1.agent.post("/api/troops").set("X-CSRF-Token", user1.csrf)
      .send({ name: "Private Troop", council_id: 1, location: "X" });
    const troopId = createRes.body.troop.id;

    const user2 = await createAuthAgent();
    const res = await user2.agent.get(`/api/troops/${troopId}`);
    expect(res.status).toBe(403);
  });
});

describe("Troop members", () => {
  it("GET /api/troops/:id/members — lists members", async () => {
    const { agent, csrf } = await createAuthAgent();
    const createRes = await agent.post("/api/troops").set("X-CSRF-Token", csrf)
      .send({ name: "Members Test", council_id: 1, location: "X" });
    const troopId = createRes.body.troop.id;

    const res = await agent.get(`/api/troops/${troopId}/members`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Creator should be a member
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe("Adventures CRUD", () => {
  it("POST + GET adventures", async () => {
    const { agent, csrf } = await createAuthAgent();
    // Create troop first
    const troopRes = await agent.post("/api/troops").set("X-CSRF-Token", csrf)
      .send({ name: "Adv Troop", council_id: 1, location: "X" });
    const troopId = troopRes.body.troop.id;

    // Create adventure
    const advRes = await agent
      .post(`/api/troops/${troopId}/adventures`)
      .set("X-CSRF-Token", csrf)
      .send({ adventure_type: "philmont", name: "Summer Trek" });
    expect(advRes.status).toBe(200);
    expect(advRes.body).toHaveProperty("adventure");
    const advId = advRes.body.adventure.id;

    // List adventures
    const listRes = await agent.get(`/api/troops/${troopId}/adventures`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBeGreaterThan(0);

    // Get single adventure
    const getRes = await agent.get(`/api/adventures/${advId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.adventure_type).toBe("philmont");
  });
});
