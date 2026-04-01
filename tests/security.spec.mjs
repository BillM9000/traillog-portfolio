import { test, expect, chromium } from '@playwright/test';
import { AUTH_FILES, BASE_URL, getCSRFToken, apiGet } from './auth-helpers.mjs';

/**
 * Suite 12: Security
 *
 * API-level security tests: CSRF enforcement, authentication,
 * authorization, rate limiting, body size limits, and SQL injection.
 * Runs on chromium only.
 */
test.describe('Suite 12 — Security', () => {

  // --- 12.1–12.2: CSRF enforcement ---
  test.describe('CSRF protection', () => {
    test.use({ storageState: AUTH_FILES['troopcreator-security'] });

    test('12.1 POST without CSRF token returns 403', { tag: '@smoke' }, async ({ request }) => {
      // Attempt a POST without the X-CSRF-Token header
      const response = await request.post(`${BASE_URL}/api/troops`, {
        headers: { 'Content-Type': 'application/json' },
        data: { name: 'CSRF Test Troop' },
        failOnStatusCode: false,
      });
      expect(response.status()).toBe(403);
    });

    test('12.2 POST with valid CSRF token succeeds', async ({ page }) => {
      // Use page context so the session cookie and XSRF-TOKEN cookie are loaded
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      // Hit /api/auth/me to ensure CSRF cookie is fully set after session load
      await page.request.get(`${BASE_URL}/api/auth/me`);
      const csrfToken = await getCSRFToken(page.context());

      // POST with proper CSRF header — use forgot-password with a dummy email
      // (safe: just sends a "no account" response, no side effects)
      const response = await page.request.post(`${BASE_URL}/api/auth/forgot-password`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: { email: 'csrf-test-no-such-user@example.com' },
        failOnStatusCode: false,
      });
      // Should NOT be 403 (CSRF passed). Likely 200 (always returns ok for security)
      expect(response.status()).not.toBe(403);
    });
  });

  // --- 12.3: Unauthenticated access ---
  test.describe('Authentication enforcement', () => {
    test('12.3 Unauthenticated access to /api/troops returns 401', { tag: '@smoke' }, async () => {
      // Launch a fresh context with NO stored auth state
      const browser = await chromium.launch();
      const context = await browser.newContext();
      const request = context.request;

      const response = await request.get(`${BASE_URL}/api/troops`, {
        failOnStatusCode: false,
      });
      expect(response.status()).toBe(401);

      await browser.close();
    });
  });

  // --- 12.4: Cross-troop access ---
  test.describe('Authorization — cross-troop access', () => {
    test.use({ storageState: AUTH_FILES['adultleader-security'] });

    test('12.4 Member cannot access troop they do not belong to', async ({ request }) => {
      // Use a troop ID that almost certainly doesn't belong to the adultleader
      const bogusId = 99999;
      const response = await request.get(
        `${BASE_URL}/api/troops/${bogusId}/members`,
        { failOnStatusCode: false }
      );
      // Should be 403 (forbidden) or 404 (not found) — not 200
      expect([403, 404]).toContain(response.status());
    });
  });

  // --- 12.5: Rate limiting headers present ---
  test.describe('Rate limiting', () => {
    test('12.5 API responses include rate-limit headers', async () => {
      const browser = await chromium.launch();
      const context = await browser.newContext();
      const request = context.request;

      // Send a simple GET to an API endpoint
      const res = await request.get(`${BASE_URL}/api/auth/me`, {
        failOnStatusCode: false,
      });

      // The apiLimiter uses standardHeaders: true, which sets RateLimit-* headers
      const headers = res.headers();
      const hasRateLimit =
        headers['ratelimit-limit'] !== undefined ||
        headers['ratelimit-remaining'] !== undefined ||
        headers['x-ratelimit-limit'] !== undefined ||
        headers['x-ratelimit-remaining'] !== undefined;

      expect(hasRateLimit).toBeTruthy();

      await browser.close();
    });
  });

  // --- 12.6: Body size limit ---
  test.describe('Body size limit', () => {
    test.use({ storageState: AUTH_FILES['troopcreator-security'] });

    test('12.6 POST with >6MB body returns 413', async ({ page }) => {
      test.slow();

      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      const csrfToken = await getCSRFToken(page.context());

      // Generate a body larger than 6MB (the express.json limit)
      const largePayload = { data: 'x'.repeat(7 * 1024 * 1024) };

      const response = await page.request.post(`${BASE_URL}/api/troops`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: largePayload,
        failOnStatusCode: false,
      });
      expect(response.status()).toBe(413);
    });
  });

  // --- 12.7: SQL injection ---
  test.describe('SQL injection prevention', () => {
    test.use({ storageState: AUTH_FILES['troopcreator-security'] });

    test('12.7 SQL injection attempt in search returns no error', async ({ request }) => {
      const injectionPayloads = [
        "'; DROP TABLE users; --",
        "1 OR 1=1",
        "' UNION SELECT * FROM users --",
        "Robert'); DROP TABLE members;--",
      ];

      for (const payload of injectionPayloads) {
        const response = await request.get(
          `${BASE_URL}/api/troops?search=${encodeURIComponent(payload)}`,
          { failOnStatusCode: false }
        );

        // Should return a normal response (200, 400, 404) — NOT 500 (server error)
        expect(response.status()).not.toBe(500);

        // If 200, body should be valid JSON (not a database error dump)
        if (response.status() === 200) {
          const body = await response.json();
          expect(body).toBeTruthy();
        }
      }
    });
  });
});
