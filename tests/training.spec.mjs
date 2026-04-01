/**
 * Suite 5: Training & Readiness
 *
 * UI tests verifying tab navigation, readiness display,
 * and assessment saving within the crew view.
 */

import { test, expect } from '@playwright/test';
import { AUTH_FILES, BASE_URL, getCSRFToken } from './auth-helpers.mjs';

test.describe('Suite 5: Training & Readiness', () => {
  test.use({
    storageState: AUTH_FILES['adultleader-train'],
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
  });

  /**
   * Navigate to the crew view by entering the first available crew.
   */
  async function enterCrew(page) {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const enterBtn = page.getByText(/enter\s*→/i).first();
    await expect(enterBtn).toBeVisible({ timeout: 10000 });
    await enterBtn.click();
    await page.waitForLoadState('networkidle');
  }

  /**
   * Click a tab by name. Works for both mobile bottom nav and desktop sidebar.
   */
  async function clickTab(page, tabName) {
    // Try multiple selectors: sidebar link, bottom nav, button, or generic text
    const tab = page.getByRole('link', { name: new RegExp(tabName, 'i') })
      .or(page.getByRole('button', { name: new RegExp(tabName, 'i') }))
      .or(page.getByText(new RegExp(`^${tabName}$`, 'i')));

    await tab.first().click();
    await page.waitForLoadState('networkidle');
  }

  test('5.1 Training tab loads', { tag: '@smoke' }, async ({ page }) => {
    test.slow();
    await enterCrew(page);

    await clickTab(page, 'Training');

    // Training tab should show training-related content
    const trainingContent = [
      page.getByText(/training/i),
      page.getByText(/requirements?/i),
      page.getByText(/complete/i),
      page.getByText(/course/i),
      page.locator('[class*="training"], [data-testid*="training"]'),
    ];

    let found = false;
    for (const el of trainingContent) {
      if (await el.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        found = true;
        break;
      }
    }

    expect(found).toBeTruthy();
  });

  test('5.2 Readiness tab loads', { tag: '@smoke' }, async ({ page }) => {
    test.slow();
    await enterCrew(page);

    await clickTab(page, 'Readiness');

    // The Skills/Readiness component shows either:
    // - "AI Readiness Coach" prompt with "Start Assessment" button (if no assessment yet)
    // - A training plan with phases, priority cards, or leader dashboard
    // - Text like "Self-Assessment", "Priority Now", phase names, readiness percentages
    const readinessContent = [
      page.getByText(/AI Readiness Coach/i),
      page.getByText(/Start Assessment/i),
      page.getByText(/Self-Assessment/i),
      page.getByText(/Priority Now/i),
      page.getByText(/readiness/i),
      page.getByText(/training plan/i),
      page.getByText(/assessment/i),
      page.getByText(/phase/i),
      page.getByText(/\d+\s*%/),
    ];

    let found = false;
    for (const el of readinessContent) {
      if (await el.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        found = true;
        break;
      }
    }

    expect(found).toBeTruthy();
  });

  test('5.3 Readiness shows progress bars or scores', async ({ page }) => {
    test.slow();
    await enterCrew(page);

    await clickTab(page, 'Readiness');

    // Look for progress indicators: progress bars, percentage text, score numbers
    const progressIndicators = [
      page.locator('progress, [role="progressbar"], [class*="progress"]'),
      page.getByText(/\d+\s*%/),
      page.locator('[class*="bar"], [class*="score"], [class*="ring"]'),
    ];

    let found = false;
    for (const el of progressIndicators) {
      const count = await el.count();
      if (count > 0) {
        const firstVisible = await el.first().isVisible({ timeout: 3000 }).catch(() => false);
        if (firstVisible) {
          found = true;
          break;
        }
      }
    }

    expect(found).toBeTruthy();
  });

  test('5.4 Member can interact with readiness assessment', async ({ page }) => {
    test.slow();
    await enterCrew(page);

    await clickTab(page, 'Readiness');

    // The Skills component shows either:
    // A) "Start Assessment" button if no assessment exists yet
    // B) An assessment form with: range slider, clickable div cards, and submit button
    // C) A completed plan view (if assessment already done)

    const startBtn = page.getByRole('button', { name: /Start Assessment/i });
    const hasStartBtn = await startBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasStartBtn) {
      // Click "Start Assessment" to open the assessment form
      await startBtn.click();
      await page.waitForTimeout(500);

      // The form should now show a range slider for hiking distance
      const rangeSlider = page.locator('input[type="range"]');
      await expect(rangeSlider.first()).toBeVisible({ timeout: 3000 });

      // The form also has clickable div cards for pack experience, elevation, activity level
      // These are styled divs with onClick, not native inputs
      const optionCards = page.locator('.cursor-pointer').filter({ hasText: /None|Some|Loaded|Flat|hills|Sedentary|active/i });
      const cardCount = await optionCards.count();
      expect(cardCount).toBeGreaterThan(0);

      // Interact with the slider
      const slider = rangeSlider.first();
      await slider.fill('5');
      await page.waitForTimeout(300);

      // Click one of the option cards
      await optionCards.first().click();
      await page.waitForTimeout(300);

      // Verify the submit button is present
      const submitBtn = page.getByRole('button', { name: /Generate My AI Plan|Update Assessment|Saving/i });
      await expect(submitBtn).toBeVisible();

      // Cancel to restore state (don't actually submit)
      const cancelBtn = page.getByRole('button', { name: /Cancel/i });
      if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await cancelBtn.click();
      }
    } else {
      // Assessment already completed — look for plan content or "Update Assessment" button
      const planContent = [
        page.getByText(/Priority Now/i),
        page.getByText(/Phase/i),
        page.getByRole('button', { name: /Update Assessment/i }),
        page.getByText(/training plan/i),
        page.getByText(/\d+\s*%/),
      ];

      let found = false;
      for (const el of planContent) {
        if (await el.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          found = true;
          break;
        }
      }

      expect(found).toBeTruthy();
    }
  });
});
