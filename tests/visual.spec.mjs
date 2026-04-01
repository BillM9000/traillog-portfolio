import { test, expect } from '@playwright/test';
import { AUTH_FILES, BASE_URL } from './auth-helpers.mjs';

/**
 * Suite 13: Visual & Responsive
 *
 * Screenshot comparison tests across mobile and desktop viewports.
 * First run creates baseline images; subsequent runs compare against them.
 */

// --- 13.1: Landing page (no auth, multiple viewports) ---
test.describe('Suite 13 — Visual & Responsive', () => {

  test.describe('Landing page', () => {
    test('13.1a Landing page — mobile (390x844)', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('landing-mobile.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.05,
      });
      await context.close();
    });

    test('13.1b Landing page — tablet (768x1024)', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 768, height: 1024 },
      });
      const page = await context.newPage();
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('landing-tablet.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.05,
      });
      await context.close();
    });

    test('13.1c Landing page — desktop (1440x900)', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
      });
      const page = await context.newPage();
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('landing-desktop.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.05,
      });
      await context.close();
    });
  });

  // --- Authenticated visual tests ---
  test.describe('Authenticated views', () => {
    test.use({ storageState: AUTH_FILES['troopcreator-visual'] });

    // --- 13.2–13.3: Home dashboard ---
    test('13.2 Home dashboard — mobile (390x844)', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: AUTH_FILES['troopcreator-visual'],
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('dashboard-mobile.png', {
        maxDiffPixelRatio: 0.05,
      });
      await context.close();
    });

    test('13.3 Home dashboard — desktop (1440x900)', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: AUTH_FILES['troopcreator-visual'],
        viewport: { width: 1440, height: 900 },
      });
      const page = await context.newPage();
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('dashboard-desktop.png', {
        maxDiffPixelRatio: 0.05,
      });
      await context.close();
    });

    // --- 13.4–13.5: Crew dashboard ---
    test('13.4 Crew dashboard — mobile (390x844)', async ({ browser }) => {
      test.slow();
      const context = await browser.newContext({
        storageState: AUTH_FILES['troopcreator-visual'],
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      await page.getByText(/Enter/i).first().click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('crew-mobile.png', {
        maxDiffPixelRatio: 0.05,
      });
      await context.close();
    });

    test('13.5 Crew dashboard — desktop (1440x900)', async ({ browser }) => {
      test.slow();
      const context = await browser.newContext({
        storageState: AUTH_FILES['troopcreator-visual'],
        viewport: { width: 1440, height: 900 },
      });
      const page = await context.newPage();
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      await page.getByText(/Enter/i).first().click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('crew-desktop.png', {
        maxDiffPixelRatio: 0.05,
      });
      await context.close();
    });

    // --- 13.6: Training tab — mobile ---
    test('13.6 Training tab — mobile (390x844)', async ({ browser }) => {
      test.slow();
      const context = await browser.newContext({
        storageState: AUTH_FILES['troopcreator-visual'],
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      await page.getByText(/Enter/i).first().click();
      await page.waitForLoadState('networkidle');

      // Click the Training tab in the navigation (use role=tab or nav button)
      const trainingNav = page.getByRole('button', { name: /Training/i })
        .or(page.locator('nav').getByText(/Training/i))
        .or(page.getByText(/Training/i)).first();
      await trainingNav.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('training-mobile.png', {
        maxDiffPixelRatio: 0.08,
      });
      await context.close();
    });

    // --- 13.7: Gear tab — mobile ---
    test('13.7 Gear tab — mobile (390x844)', async ({ browser }) => {
      test.slow();
      const context = await browser.newContext({
        storageState: AUTH_FILES['troopcreator-visual'],
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      await page.getByText(/Enter/i).first().click();
      await page.waitForLoadState('networkidle');

      // Click the Gear tab in the navigation (use role=tab or nav button)
      const gearNav = page.getByRole('button', { name: /Gear/i })
        .or(page.locator('nav').getByText(/Gear/i))
        .or(page.getByText(/Gear/i)).first();
      await gearNav.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('gear-mobile.png', {
        maxDiffPixelRatio: 0.08,
      });
      await context.close();
    });

    // --- 13.8: Dark mode toggle — mobile ---
    test('13.8 Dark mode toggle — mobile (390x844)', async ({ browser }) => {
      test.slow();
      const context = await browser.newContext({
        storageState: AUTH_FILES['troopcreator-visual'],
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });

      // Enter crew to get to Header with theme toggle
      const enterBtn = page.getByText(/Enter/i).first();
      if (await enterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await enterBtn.click();
        await page.waitForLoadState('networkidle');
      }

      // Find the dark mode toggle (aria-label="Switch to dark/light mode" in Header)
      const themeToggle = page.locator('[aria-label*="Switch to"]')
        .or(page.getByRole('button', { name: /switch to.*mode/i }))
        .or(page.locator('button:has-text("☀️"), button:has-text("🌙")'));
      await themeToggle.first().click();
      await page.waitForTimeout(500); // Allow transition

      await expect(page).toHaveScreenshot('dashboard-dark-mobile.png', {
        maxDiffPixelRatio: 0.05,
      });
      await context.close();
    });

    // --- 13.9: Dark mode toggle — desktop ---
    test('13.9 Dark mode toggle — desktop (1440x900)', async ({ browser }) => {
      test.slow();
      const context = await browser.newContext({
        storageState: AUTH_FILES['troopcreator-visual'],
        viewport: { width: 1440, height: 900 },
      });
      const page = await context.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });

      // Enter crew to get TopBar with theme toggle
      const enterBtn = page.getByText(/Enter/i).first();
      if (await enterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await enterBtn.click();
        await page.waitForLoadState('networkidle');
      }

      // Find the dark mode toggle (aria-label="Switch to dark/light mode" in TopBar)
      const themeToggle = page.locator('[aria-label*="Switch to"]')
        .or(page.getByRole('button', { name: /switch to.*mode/i }))
        .or(page.locator('button:has-text("☀️"), button:has-text("🌙")'));
      await themeToggle.first().click();
      await page.waitForTimeout(500); // Allow transition

      await expect(page).toHaveScreenshot('dashboard-dark-desktop.png', {
        maxDiffPixelRatio: 0.05,
      });
      await context.close();
    });
  });
});
