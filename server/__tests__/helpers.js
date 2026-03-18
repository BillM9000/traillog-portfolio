import request from "supertest";

// Set test env before importing app
process.env.NODE_ENV = "test";

let app;
let db;

export async function getApp() {
  if (!app) {
    const mod = await import("../index.js");
    app = mod.default;
    const dbMod = await import("../db.js");
    db = dbMod.default;
  }
  return app;
}

/**
 * Create an authenticated agent with session cookie + CSRF token.
 * Flow: signup → verify email in DB → login → profile setup → extract CSRF
 */
export async function createAuthAgent(overrides = {}) {
  const a = await getApp();
  const agent = request.agent(a);

  // Hit a GET endpoint that goes through session + CSRF middleware
  // NOTE: /api/public-settings is registered BEFORE session middleware, so use /api/health
  const initRes = await agent.get("/api/health");
  let csrf = extractCsrfFromResponse(initRes);

  const email = overrides.email || `test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
  const password = overrides.password || "TestPass123!";
  const name = overrides.name || "Test User";

  // Step 1: Sign up (returns 201, does NOT log in)
  const signupRes = await agent
    .post("/api/auth/signup")
    .set("X-CSRF-Token", csrf)
    .send({ email, password, name, tos_accepted: true });
  csrf = extractCsrfFromResponse(signupRes) || csrf;

  if (signupRes.status === 201) {
    // Step 2: Verify email directly in DB (bypass email verification)
    db.prepare("UPDATE users SET email_verified = 1 WHERE email = ?").run(email.toLowerCase());

    // Step 3: Login (this regenerates session, sets new CSRF)
    const loginRes = await agent
      .post("/api/auth/login")
      .set("X-CSRF-Token", csrf)
      .send({ email, password });
    csrf = extractCsrfFromResponse(loginRes) || csrf;

    // Step 4: Complete profile setup
    // After session.regenerate, we need fresh CSRF from new session
    const healthRes = await agent.get("/api/health");
    csrf = extractCsrfFromResponse(healthRes) || csrf;

    await agent
      .put("/api/auth/profile")
      .set("X-CSRF-Token", csrf)
      .send({
        name,
        age_confirmed: overrides.age_confirmed || "18+",
        user_type: overrides.user_type || "adult",
      });
  }

  // Get final CSRF after all session changes
  const meRes = await agent.get("/api/auth/me");
  csrf = extractCsrfFromResponse(meRes) || csrf;

  return { agent, email, password, csrf };
}

/**
 * Extract XSRF-TOKEN from Set-Cookie response header.
 * Handles URL-encoded values and various cookie formats.
 */
function extractCsrfFromResponse(res) {
  const cookies = res.headers["set-cookie"];
  if (!cookies) return "";
  const arr = Array.isArray(cookies) ? cookies : [cookies];
  for (const c of arr) {
    const match = c.match(/XSRF-TOKEN=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return "";
}

/**
 * Get a CSRF token from a fresh session (for unauthenticated POST tests).
 */
export async function getCsrfAgent() {
  const a = await getApp();
  const agent = request.agent(a);
  const res = await agent.get("/api/health");
  const csrf = extractCsrfFromResponse(res);
  return { agent, csrf };
}

/**
 * Unauthenticated request (no session).
 */
export async function getRequest() {
  const a = await getApp();
  return request(a);
}
