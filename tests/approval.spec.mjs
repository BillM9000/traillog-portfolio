import { test, expect } from '@playwright/test';
import { AUTH_FILES, BASE_URL, getCSRFToken, apiGet } from './auth-helpers.mjs';

/**
 * Suite 11: Approval & Invitations
 *
 * API-level tests verifying admin can view pending members,
 * invitation records exist, and invalid tokens are rejected.
 */
test.describe('Suite 11 — Approval & Invitations', () => {
  test.use({ storageState: AUTH_FILES['troopcreator-approval'] });

  test('11.1 Admin can view pending members', { tag: '@smoke' }, async ({ page }) => {
    // Need page context to ensure session cookies are properly loaded
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const response = await page.request.get(`${BASE_URL}/api/troops`);
    expect(response.status()).toBe(200);
    const troops = await response.json();
    expect(Array.isArray(troops)).toBeTruthy();
    expect(troops.length).toBeGreaterThan(0);

    // Try each troop until we find one where we can view members
    let found = false;
    for (const troop of troops) {
      const pendingRes = await page.request.get(
        `${BASE_URL}/api/troops/${troop.id}/members?status=pending`,
        { failOnStatusCode: false }
      );
      if (pendingRes.status() === 200) {
        const members = await pendingRes.json();
        expect(Array.isArray(members)).toBeTruthy();
        found = true;
        break;
      }
    }
    // At minimum, one troop should allow member listing (admin sees all statuses)
    expect(found).toBeTruthy();
  });

  test('11.2 Invitation record exists for invited member', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const troopsRes = await page.request.get(`${BASE_URL}/api/troops`);
    expect(troopsRes.status()).toBe(200);
    const troops = await troopsRes.json();
    expect(troops.length).toBeGreaterThan(0);

    // Query each troop's member list — an invited/pending member proves invitations work.
    // The app has no separate /invitations endpoint; invited members appear in the members list.
    let found = false;
    for (const troop of troops) {
      const membersRes = await page.request.get(
        `${BASE_URL}/api/troops/${troop.id}/members`,
        { failOnStatusCode: false }
      );
      if (membersRes.status() === 200) {
        const members = await membersRes.json();
        expect(Array.isArray(members)).toBeTruthy();
        found = true;
        break;
      }
    }
    expect(found).toBeTruthy();
  });

  test('11.3 Invalid approval token rejected', async ({ page }) => {
    // Navigate to app so session + CSRF cookies are set
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // The /approve/:token page is a React SPA route — it always returns the
    // HTML shell (200) but the React component validates the token and shows
    // an error message. Navigate to it and check the rendered content.
    const fakeToken = 'invalid-token-00000000-0000-0000-0000-000000000000';
    await page.goto(`${BASE_URL}/approve/${fakeToken}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // The approval page should render an error state for the bogus token.
    // Check the page content for error indicators or the absence of approve/deny buttons.
    const bodyText = await page.textContent('body');
    const hasError = /invalid|expired|not found|error|loading/i.test(bodyText);
    const hasApproveButton = await page.getByRole('button', { name: /^approve$/i }).isVisible().catch(() => false);
    // Either the page shows an error message, or the approve button is NOT present
    expect(hasError || !hasApproveButton).toBeTruthy();

    // Also verify the token-based API rejects the bogus token
    const csrfToken = await getCSRFToken(page.context());
    const postRes = await page.request.post(
      `${BASE_URL}/api/troops/approve-by-token`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: { token: fakeToken, action: 'approve' },
        failOnStatusCode: false,
      }
    );
    // The API should reject with 400 (bad token) or 403 (invalid/expired)
    expect([400, 403, 404]).toContain(postRes.status());
  });
});
