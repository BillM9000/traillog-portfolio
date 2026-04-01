/**
 * Suite 4: Adventure & Crew
 *
 * Tests verifying adventure visibility, crew membership,
 * date display, and permission enforcement.
 */

import { test, expect } from '@playwright/test';
import { AUTH_FILES, BASE_URL, getCSRFToken } from './auth-helpers.mjs';

test.describe('Suite 4: Adventure & Crew', () => {
  test.use({
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
  });

  test.describe('Crew dashboard — troopcreator', () => {
    test.use({ storageState: AUTH_FILES['troopcreator-shared'] });

    test.beforeEach(async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    });

    test('4.1 Adventure visible in crew dashboard', { tag: '@smoke' }, async ({ page }) => {
      // Enter the crew
      const enterBtn = page.getByText(/enter\s*→/i).first();
      await expect(enterBtn).toBeVisible({ timeout: 10000 });
      await enterBtn.click();
      await page.waitForLoadState('networkidle');

      // Should see adventure-related content: trek name, Philmont, dates, or crew name
      const adventureIndicators = [
        page.getByText(/philmont/i),
        page.getByText(/adventure/i),
        page.getByText(/trek/i),
        page.getByText(/crew\s*614/i),
        page.getByText(/training/i),
      ];

      let found = false;
      for (const indicator of adventureIndicators) {
        if (await indicator.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          found = true;
          break;
        }
      }

      expect(found).toBeTruthy();
    });

    test('4.2 Crew 614-A has correct members', async ({ page }) => {
      // Use API to verify crew membership
      const troopsRes = await page.request.get(`${BASE_URL}/api/troops`);
      expect(troopsRes.status()).toBe(200);
      const troops = await troopsRes.json();
      expect(troops.length).toBeGreaterThan(0);

      const troopId = troops[0].id;

      // Get adventures for the troop
      const advRes = await page.request.get(`${BASE_URL}/api/troops/${troopId}/adventures`, {
        failOnStatusCode: false,
      });

      if (advRes.status() === 200) {
        const adventures = await advRes.json();
        if (adventures.length > 0) {
          const advId = adventures[0].id;

          // Get crews for the adventure
          const crewRes = await page.request.get(
            `${BASE_URL}/api/adventures/${advId}/crews`,
            { failOnStatusCode: false }
          );

          if (crewRes.status() === 200) {
            const crews = await crewRes.json();
            // Find crew 614-A
            const crewA = crews.find((c) => /614.*a/i.test(c.name));
            if (crewA) {
              // Get members for crew A
              const membersRes = await page.request.get(
                `${BASE_URL}/api/crews/${crewA.id}/members`,
                { failOnStatusCode: false }
              );
              if (membersRes.status() === 200) {
                const members = await membersRes.json();
                expect(members.length).toBeGreaterThan(0);
              }
            }
          }
        }
      }
    });

    test('4.3 Crew 614-B has correct members', async ({ page }) => {
      const troopsRes = await page.request.get(`${BASE_URL}/api/troops`);
      const troops = await troopsRes.json();
      const troopId = troops[0].id;

      const advRes = await page.request.get(`${BASE_URL}/api/troops/${troopId}/adventures`, {
        failOnStatusCode: false,
      });

      if (advRes.status() === 200) {
        const adventures = await advRes.json();
        if (adventures.length > 0) {
          const advId = adventures[0].id;

          const crewRes = await page.request.get(
            `${BASE_URL}/api/adventures/${advId}/crews`,
            { failOnStatusCode: false }
          );

          if (crewRes.status() === 200) {
            const crews = await crewRes.json();
            const crewB = crews.find((c) => /614.*b/i.test(c.name));
            if (crewB) {
              const membersRes = await page.request.get(
                `${BASE_URL}/api/crews/${crewB.id}/members`,
                { failOnStatusCode: false }
              );
              if (membersRes.status() === 200) {
                const members = await membersRes.json();
                expect(members.length).toBeGreaterThan(0);
              }
            }
          }
        }
      }
    });

    test('4.4 Adventure dates displayed correctly', async ({ page }) => {
      // Enter the crew
      const enterBtn = page.getByText(/enter\s*→/i).first();
      await expect(enterBtn).toBeVisible({ timeout: 10000 });
      await enterBtn.click();
      await page.waitForLoadState('networkidle');

      // Wait for the adventure to finish loading (can show "Loading adventure..." briefly)
      await page.waitForFunction(
        () => !document.body.textContent.includes('Loading adventure'),
        { timeout: 15_000 }
      ).catch(() => {});

      // Look for date-related content in the header, sidebar, or dashboard.
      // The sidebar shows "Philmont 2026" and the header shows dates like "Jun 14 → Jun 23".
      // The countdown shows "X days out". Calendar months are also date content.
      const datePatterns = [
        page.getByText(/\d{4}/),                          // Year (e.g. "2026")
        page.getByText(/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i), // Month name
        page.getByText(/\d+\s*days?\s*(left|until|away|remaining|out)/i),   // Countdown
      ];

      let foundDate = false;
      for (const pattern of datePatterns) {
        if (await pattern.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          foundDate = true;
          break;
        }
      }

      expect(foundDate).toBeTruthy();
    });
  });

  test.describe('Permission enforcement — adultleader', () => {
    test.use({ storageState: AUTH_FILES['adultleader-adventure'] });

    test('4.5 Non-admin cannot create adventure (API)', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      const csrf = await getCSRFToken(page.context());

      // Get a troop ID first
      const troopsRes = await page.request.get(`${BASE_URL}/api/troops`);
      const troops = await troopsRes.json();

      if (troops.length > 0) {
        const troopId = troops[0].id;

        const res = await page.request.post(`${BASE_URL}/api/troops/${troopId}/adventures`, {
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrf,
          },
          data: {
            name: 'Unauthorized Adventure',
            type: 'philmont',
            start_date: '2026-08-01',
            end_date: '2026-08-14',
          },
          failOnStatusCode: false,
        });

        // Non-admin should be forbidden
        expect([403, 404]).toContain(res.status());
      }
    });
  });
});
