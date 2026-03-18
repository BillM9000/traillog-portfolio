import request from "supertest";

// Set test env before importing app
process.env.NODE_ENV = "test";

let app;

export async function getApp() {
  if (!app) {
    const mod = await import("../index.js");
    app = mod.default;
  }
  return app;
}

/**
 * Create an authenticated agent with session cookie + CSRF token.
 */
export async function createAuthAgent(overrides = {}) {
  const a = await getApp();
  const agent = request.agent(a);

  // Hit a GET endpoint to establish session and get CSRF cookie
  const initRes = await agent.get("/api/public-settings");

  // Extract CSRF from Set-Cookie header
  const csrf = extractCsrfFromResponse(initRes);

  const email = overrides.email || `test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
  const password = overrides.password || "TestPass123!";
  const name = overrides.name || "Test User";

  const signupRes = await agent
    .post("/api/auth/signup")
    .set("X-CSRF-Token", csrf)
    .send({ email, password, name });

  // Re-extract CSRF (session may have regenerated)
  const csrf2 = extractCsrfFromResponse(signupRes) || csrf;

  if (signupRes.status === 200 || signupRes.status === 201) {
    await agent
      .put("/api/auth/profile")
      .set("X-CSRF-Token", csrf2)
      .send({
        name,
        age_confirmed: overrides.age_confirmed || "18+",
        user_type: overrides.user_type || "adult",
      });
  }

  // Get final CSRF
  const meRes = await agent.get("/api/auth/me");
  const finalCsrf = extractCsrfFromResponse(meRes) || csrf2;

  return { agent, email, password, csrf: finalCsrf };
}

/**
 * Extract XSRF-TOKEN from Set-Cookie response header.
 */
function extractCsrfFromResponse(res) {
  const cookies = res.headers["set-cookie"];
  if (!cookies) return "";
  const xsrf = (Array.isArray(cookies) ? cookies : [cookies])
    .find((c) => c.startsWith("XSRF-TOKEN="));
  if (!xsrf) return "";
  return xsrf.split("=")[1].split(";")[0];
}

/**
 * Unauthenticated request (no session).
 */
export async function getRequest() {
  const a = await getApp();
  return request(a);
}
