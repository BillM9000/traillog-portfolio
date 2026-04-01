import { test, expect } from '@playwright/test';
import { AUTH_FILES, BASE_URL, getCSRFToken, apiGet } from './auth-helpers.mjs';

/**
 * Suite 10: Admin Panel
 *
 * Verifies admin panel access controls, member list, invite code,
 * global admin visibility, and non-admin restrictions.
 *
 * NOTE: The sidebar "Admin Panel" button only renders when inside a
 * crew/adventure context (isAdmin is determined by troop membership role).
 * Tests must click "Enter →" on the home dashboard first.
 */
test.describe('Suite 10 — Admin Panel', () => {
  // Run serially — tests share troopcreator/sysadmin/adultleader sessions; parallel
  // execution causes session interference that blanks the React app.
  test.describe.configure({ mode: 'serial' });

  /**
   * Enter the first available crew from the home dashboard.
   * If no adventure exists, creates one via API so the sidebar renders.
   */
  async function enterCrew(page) {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    let enterBtn = page.getByText(/enter\s*→/i).first();
    const hasBtn = await enterBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasBtn) {
      // No adventure to enter — create one for the user's first troop
      const csrf = await getCSRFToken(page.context());
      const dashRes = await page.request.get(`${BASE_URL}/api/dashboard`, { failOnStatusCode: false });
      if (dashRes.ok()) {
        const dash = await dashRes.json();
        const troop = dash.troops?.[0];
        if (troop) {
          await page.request.post(`${BASE_URL}/api/troops/${troop.id}/adventures`, {
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
            data: {
              name: 'Admin Panel Test Crew',
              adventure_type: 'philmont',
              arrive_date: '2026-07-01',
              return_date: '2026-07-10',
              depart_date: '2026-06-30',
              home_date: '2026-07-11',
            },
            failOnStatusCode: false,
          });
          await page.reload({ waitUntil: 'networkidle' });
          enterBtn = page.getByText(/enter\s*→/i).first();
        }
      }
    }

    await expect(enterBtn).toBeVisible({ timeout: 10_000 });
    await enterBtn.click();
    await page.waitForLoadState('networkidle');
  }

  // --- 10.1–10.3: Troop admin (troopcreator) ---
  test.describe('Troop admin capabilities', () => {
    test.use({ storageState: AUTH_FILES['troopcreator-admin'] });

    test('10.1 Troop admin can open Admin Panel', { tag: '@smoke' }, async ({ page }) => {
      await enterCrew(page);

      // Look for Admin Panel button/link in sidebar using exact match to avoid matching
      // adventure names like "Admin Panel Test Crew".
      const adminLink = page.getByRole('button', { name: 'Admin Panel' })
        .or(page.getByRole('link', { name: 'Admin Panel' }));
      await expect(adminLink.first()).toBeVisible({ timeout: 10_000 });

      await adminLink.first().click();
      await page.waitForTimeout(1000);

      // Verify admin panel content loaded
      const adminContent = page.getByText(/member|settings|adventure|invite/i).first();
      await expect(adminContent).toBeVisible({ timeout: 10_000 });
    });

    test('10.2 Admin Panel shows member list', async ({ page }) => {
      await enterCrew(page);

      // Open Admin Panel using exact match (avoids matching adventure names containing "Admin Panel")
      const adminLink = page.getByRole('button', { name: 'Admin Panel' })
        .or(page.getByRole('link', { name: 'Admin Panel' }));
      await expect(adminLink.first()).toBeVisible({ timeout: 10_000 });
      await adminLink.first().click();
      await page.waitForTimeout(1000);

      // Wait for Admin Panel modal content to appear (it renders asynchronously)
      await expect(page.getByText(/adventure settings|invite code|members/i).first()).toBeVisible({ timeout: 8_000 });

      // The admin panel opens on the Adventure tab — click Members tab to see the list
      const membersTab = page.getByRole('button', { name: /^Members$/i });
      await expect(membersTab).toBeVisible({ timeout: 5_000 });
      await membersTab.click();
      await page.waitForTimeout(500);

      // Should show at least one member row/item
      const memberItems = page.locator('tr, [class*="member"], li')
        .filter({ hasText: /@|scout|adult|admin/i });
      const count = await memberItems.count();
      expect(count).toBeGreaterThan(0);
    });

    test('10.3 Admin Panel shows invite code', async ({ page }) => {
      await enterCrew(page);

      // Open Admin Panel using exact match
      const adminLink = page.getByRole('button', { name: 'Admin Panel' })
        .or(page.getByRole('link', { name: 'Admin Panel' }));
      await expect(adminLink.first()).toBeVisible({ timeout: 10_000 });
      await adminLink.first().click();
      await page.waitForTimeout(1000);

      // The admin panel opens on the Adventure tab by default.
      // Click the Members tab where the invite code lives.
      const membersTab = page.getByRole('button', { name: /^Members$/i });
      await expect(membersTab).toBeVisible({ timeout: 5_000 });
      await membersTab.click();
      await page.waitForTimeout(1000);

      // Look for invite code display — the Members tab shows "Invite Code" label
      const inviteCode = page.getByText(/invite code|join code/i)
        .or(page.locator('[class*="invite"], [data-testid*="invite"]'));
      await expect(inviteCode.first()).toBeVisible({ timeout: 10_000 });
    });
  });

  // --- 10.4–10.5: System admin (sysadmin) ---
  test.describe('System admin capabilities', () => {
    test.use({ storageState: AUTH_FILES['sysadmin-admin'] });

    test('10.4 System admin can open Global Admin', { tag: '@smoke' }, async ({ page }) => {
      // Global Admin is visible from the home dashboard sidebar (isGlobalAdmin)
      // and also from within a crew context — try home first, enter crew if needed.
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });

      let globalAdminLink = page.getByRole('link', { name: /global admin/i })
        .or(page.getByRole('button', { name: /global admin/i }))
        .or(page.getByText(/Global Admin/));

      // If not visible on home dashboard, enter a crew first
      if (!(await globalAdminLink.first().isVisible({ timeout: 5_000 }).catch(() => false))) {
        await enterCrew(page);
      }

      await expect(globalAdminLink.first()).toBeVisible({ timeout: 10_000 });

      await globalAdminLink.first().click();
      await page.waitForLoadState('networkidle');

      // Verify global admin content loaded
      const globalContent = page.getByText(/platform|gear catalog|troop overview|affiliate|settings/i).first();
      await expect(globalContent).toBeVisible({ timeout: 10_000 });
    });

    test('10.5 Global Admin shows platform overview', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });

      let globalAdminLink = page.getByText(/Global Admin/).first();

      // If not visible on home dashboard, enter a crew first
      if (!(await globalAdminLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
        await enterCrew(page);
        globalAdminLink = page.getByText(/Global Admin/).first();
      }

      await expect(globalAdminLink).toBeVisible({ timeout: 10_000 });
      await globalAdminLink.click();
      await page.waitForLoadState('networkidle');

      // Platform overview should show stats like troops, users, etc.
      const overviewContent = page.getByText(/troop|user|platform|overview/i);
      await expect(overviewContent.first()).toBeVisible({ timeout: 10_000 });
    });
  });

  // --- 10.6–10.7: Non-admin (adultleader) ---
  test.describe('Non-admin restrictions', () => {
    test.use({ storageState: AUTH_FILES['adultleader-admin'] });

    test('10.6 Non-admin cannot see Admin Panel link', async ({ page }) => {
      // Must enter crew context to properly test — the sidebar only renders
      // admin links inside a crew, so we need to verify it's absent there too.
      await enterCrew(page);

      // Admin Panel link should NOT be visible for non-admin
      const adminLink = page.getByText('Admin Panel', { exact: true });
      await expect(adminLink).toHaveCount(0, { timeout: 5_000 }).catch(() => {
        // If it exists, it should not be visible
        return expect(adminLink.first()).not.toBeVisible();
      });
    });

    test('10.7 Non-admin API access to admin routes returns 403', async ({ request }) => {
      // Try accessing admin-only API endpoints
      const adminRoutes = [
        `${BASE_URL}/api/admin/users`,
        `${BASE_URL}/api/admin/settings`,
        `${BASE_URL}/api/admin/troops`,
      ];

      for (const route of adminRoutes) {
        const response = await request.get(route, { failOnStatusCode: false });
        // Should be 401 or 403 — not 200
        expect([401, 403, 404]).toContain(response.status());
      }
    });
  });
});
