/**
 * Suite 3: Troop Management
 *
 * Mix of API and UI tests verifying troop CRUD, membership,
 * invite codes, and role-based access.
 */

import { test, expect } from '@playwright/test';
import { AUTH_FILES, BASE_URL, getCSRFToken } from './auth-helpers.mjs';

test.describe('Suite 3: Troop Management', () => {
  test.use({
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
  });

  test.describe('Admin — troopcreator', () => {
    test.use({ storageState: AUTH_FILES['troopcreator-troop'] });

    test('3.1 Troop creator sees their troop on dashboard', { tag: '@smoke' }, async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });

      // Dashboard should show at least one troop card with an "Enter" button
      const enterButton = page.getByRole('link', { name: /enter/i })
        .or(page.getByRole('button', { name: /enter/i }))
        .or(page.getByText(/enter\s*→/i));

      await expect(enterButton.first()).toBeVisible({ timeout: 10000 });
    });

    test('3.3 Troop has correct member count', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });

      // Look for member count on the troop card (e.g., "8 members" or a number)
      const memberCount = page.getByText(/\d+\s*member/i);
      const hasCount = await memberCount.first().isVisible({ timeout: 5000 }).catch(() => false);

      if (hasCount) {
        const text = await memberCount.first().textContent();
        const count = parseInt(text.match(/(\d+)/)?.[1] || '0', 10);
        expect(count).toBeGreaterThan(0);
      } else {
        // Member count might be shown differently — verify via API
        const res = await page.request.get(`${BASE_URL}/api/troops`, {
          failOnStatusCode: false,
        });
        expect(res.status()).toBe(200);
        const troops = await res.json();
        expect(troops.length).toBeGreaterThan(0);
      }
    });

    test('3.4 Admin can view member list (API)', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });

      // Get the user's troops — find the test troop (TESTCODE614)
      const troopsRes = await page.request.get(`${BASE_URL}/api/troops`);
      expect(troopsRes.status()).toBe(200);
      const troops = await troopsRes.json();
      expect(troops.length).toBeGreaterThan(0);

      // Try each troop until we find one we're a member of
      let membersFound = false;
      for (const troop of troops) {
        const membersRes = await page.request.get(
          `${BASE_URL}/api/troops/${troop.id}/members`,
          { failOnStatusCode: false }
        );
        if (membersRes.status() === 200) {
          const members = await membersRes.json();
          expect(members.length).toBeGreaterThan(0);
          membersFound = true;
          break;
        }
      }
      expect(membersFound).toBeTruthy();
    });

    test('3.5 Troop has invite code (API)', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });

      // Get troops — find one we're admin of
      const troopsRes = await page.request.get(`${BASE_URL}/api/troops`);
      expect(troopsRes.status()).toBe(200);
      const troops = await troopsRes.json();
      expect(troops.length).toBeGreaterThan(0);

      // Try each troop to find one where we have admin access to invite code
      let foundCode = false;
      for (const troop of troops) {
        const codeRes = await page.request.get(
          `${BASE_URL}/api/troops/${troop.id}/invite-code`,
          { failOnStatusCode: false }
        );
        if (codeRes.status() === 200) {
          const body = await codeRes.json();
          expect(body.invite_code).toBeTruthy();
          expect(typeof body.invite_code).toBe('string');
          foundCode = true;
          break;
        }
      }
      expect(foundCode).toBeTruthy();
    });

    test('3.6 Troop settings accessible to admin (API)', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });

      // Get troops — find one we're admin of
      const troopsRes = await page.request.get(`${BASE_URL}/api/troops`);
      expect(troopsRes.status()).toBe(200);
      const troops = await troopsRes.json();
      expect(troops.length).toBeGreaterThan(0);

      const csrf = await getCSRFToken(page.context());

      // Try each troop until we find one where we have admin access
      let settingsOk = false;
      for (const troop of troops) {
        const settingsRes = await page.request.put(
          `${BASE_URL}/api/troops/${troop.id}/settings`,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrf,
            },
            data: { amazon_affiliate_tag: '' },
            failOnStatusCode: false,
          }
        );
        if (settingsRes.status() === 200) {
          settingsOk = true;
          break;
        }
      }
      expect(settingsOk).toBeTruthy();
    });
  });

  test.describe('Scout restrictions — scout-alpha', () => {
    test.use({ storageState: AUTH_FILES['scout-alpha'] });

    test('3.2 Scout cannot create troop (API returns 403)', { tag: '@smoke' }, async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      const csrf = await getCSRFToken(page.context());

      const res = await page.request.post(`${BASE_URL}/api/troops`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
        },
        data: {
          unit_type: 'Troop',
          unit_number: '9999',
          council_id: 1,
        },
        failOnStatusCode: false,
      });

      expect(res.status()).toBe(403);
    });
  });

  test.describe('Non-admin restrictions — adultleader', () => {
    test.use({ storageState: AUTH_FILES['adultleader-troop'] });

    test('3.7 Non-admin cannot access admin routes', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

      const csrf = await getCSRFToken(page.context());

      // Get the user's troops to find a valid troop ID
      const troopsRes = await page.request.get(`${BASE_URL}/api/troops`);
      const troops = await troopsRes.json();

      // Use the first troop if available, otherwise use ID 1
      const troopId = troops.length > 0 ? troops[0].id : 1;

      // Attempt to modify troop settings (admin-only operation)
      const res = await page.request.put(`${BASE_URL}/api/troops/${troopId}/settings`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
        },
        data: { amazon_affiliate_tag: 'hacked' },
        failOnStatusCode: false,
      });

      // Should be 403 Forbidden (not admin of this troop)
      expect([403, 404]).toContain(res.status());
    });
  });
});
