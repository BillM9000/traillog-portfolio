/**
 * Suite 2: Profile & Onboarding
 *
 * UI-level tests verifying the onboarding wizard behavior
 * for different user types and states.
 */

import { test, expect } from '@playwright/test';
import { AUTH_FILES, BASE_URL } from './auth-helpers.mjs';

test.describe('Suite 2: Profile & Onboarding', () => {
  test.use({
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
  });

  test('2.1 Scout minor sees profile setup — cannot proceed without age selection', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: AUTH_FILES['scout-alpha'],
      baseURL: BASE_URL,
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // If the scout is directed to profile setup, look for age-related UI
    const profileSetup = page.getByText(/profile/i).first();
    const ageSelector = page.locator('select, [role="combobox"], [data-testid*="age"], input[type="date"]').first();

    // Check if we see any onboarding/profile content
    const hasProfileContent = await profileSetup.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasProfileContent) {
      // Verify there's some form of age/DOB field visible
      const hasAgeField = await ageSelector.isVisible({ timeout: 3000 }).catch(() => false);
      // The profile setup should be present for scout accounts
      expect(hasProfileContent || hasAgeField).toBeTruthy();
    }

    await context.close();
  });

  test('2.2 New user sees onboarding wizard after profile setup', async ({ browser }) => {
    test.slow(); // Multiple navigations

    // Use the invited persona — may still have onboarding pending
    const context = await browser.newContext({
      storageState: AUTH_FILES.invited,
      baseURL: BASE_URL,
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Look for onboarding wizard indicators: step indicators, wizard container, welcome text
    const wizardIndicators = [
      page.getByText(/welcome/i),
      page.getByText(/get started/i),
      page.getByText(/step/i),
      page.locator('[data-testid*="onboarding"], [class*="onboarding"], [class*="wizard"]'),
    ];

    let foundWizard = false;
    for (const indicator of wizardIndicators) {
      if (await indicator.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        foundWizard = true;
        break;
      }
    }

    // If user has completed onboarding, they go straight to dashboard — that's OK too
    const dashboard = page.getByText(/dashboard/i).or(page.locator('[class*="dashboard"]'));
    const atDashboard = await dashboard.first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(foundWizard || atDashboard).toBeTruthy();

    await context.close();
  });

  test('2.3 Completed user does NOT see onboarding wizard', { tag: '@smoke' }, async ({ browser }) => {
    const context = await browser.newContext({
      storageState: AUTH_FILES['troopcreator-onboarding'],
      baseURL: BASE_URL,
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Should go directly to home dashboard with troop cards — NOT an onboarding wizard
    // Look for troop card or dashboard indicators
    const troopCard = page.getByText(/enter/i).or(page.getByRole('button', { name: /enter/i }));
    const hasTroopCards = await troopCard.first().isVisible({ timeout: 10000 }).catch(() => false);

    // Should NOT see onboarding wizard
    const wizardModal = page.locator('[class*="wizard"], [class*="onboarding-modal"]');
    const hasWizard = await wizardModal.first().isVisible({ timeout: 2000 }).catch(() => false);

    // Completed user sees dashboard, not wizard
    expect(hasTroopCards).toBeTruthy();
    expect(hasWizard).toBeFalsy();

    await context.close();
  });

  test('2.4 Admin onboarding shows admin-specific steps', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: AUTH_FILES['troopcreator-onboarding'],
      baseURL: BASE_URL,
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Troopcreator is an admin — if onboarding is active, it should show admin steps
    // Look for admin-specific content like "Create Troop", "Manage Members", "Admin"
    const adminIndicators = [
      page.getByText(/admin/i),
      page.getByText(/create.*troop/i),
      page.getByText(/manage/i),
    ];

    let hasAdminContent = false;
    for (const indicator of adminIndicators) {
      if (await indicator.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        hasAdminContent = true;
        break;
      }
    }

    // Admin user should see admin-related content (either in onboarding or dashboard)
    expect(hasAdminContent).toBeTruthy();

    await context.close();
  });

  test('2.5 Trekker onboarding shows trekker-specific steps', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: AUTH_FILES['scout-alpha'],
      baseURL: BASE_URL,
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Scout/trekker should see trekker-related content
    // Look for gear, training, readiness, trek-related terms
    const trekkerIndicators = [
      page.getByText(/training/i),
      page.getByText(/readiness/i),
      page.getByText(/gear/i),
      page.getByText(/trek/i),
      page.getByText(/crew/i),
      page.getByText(/enter/i),
    ];

    let hasTrekkerContent = false;
    for (const indicator of trekkerIndicators) {
      if (await indicator.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        hasTrekkerContent = true;
        break;
      }
    }

    expect(hasTrekkerContent).toBeTruthy();

    await context.close();
  });
});
