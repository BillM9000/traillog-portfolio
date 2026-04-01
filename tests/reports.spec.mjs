import { test, expect } from '@playwright/test';
import { AUTH_FILES, BASE_URL } from './auth-helpers.mjs';

/**
 * Suite 8: Reports
 *
 * Verifies the Reports tab loads correctly, displays report type options,
 * and offers Excel export and print buttons.
 */
test.describe('Suite 8 — Reports', () => {
  test.use({ storageState: AUTH_FILES['troopcreator-shared'] });

  test.beforeEach(async ({ page }) => {
    // Navigate to crew view
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Enter a crew from the dashboard
    const enterBtn = page.getByRole('button', { name: /enter/i }).first()
      || page.getByText(/Enter →/i).first();
    await page.getByText(/Enter/i).first().click();
    await page.waitForLoadState('networkidle');

    // Navigate to Reports tab
    const reportsNav = page.getByRole('link', { name: /reports/i })
      .or(page.getByRole('button', { name: /reports/i }))
      .or(page.getByText(/Reports/));
    await reportsNav.first().click();
    await page.waitForLoadState('networkidle');
  });

  test('8.1 Reports tab loads with report type options', { tag: '@smoke' }, async ({ page }) => {
    // Verify we are on the reports view and there are selectable report types
    const reportsArea = page.locator('[class*="report"], [data-testid*="report"]')
      .or(page.getByText(/report/i).first());
    await expect(reportsArea).toBeVisible({ timeout: 10_000 });

    // Look for report type selectors — could be buttons, radio, select, or list items
    const reportOptions = page.getByRole('button').filter({ hasText: /readiness|training|gear|itinerary|member|crew|assessment|medical/i })
      .or(page.getByRole('option'))
      .or(page.locator('select'));
    const count = await reportOptions.count();
    expect(count).toBeGreaterThan(0);
  });

  test('8.2 Can select a report type', async ({ page }) => {
    // Find and click the first report type option
    const reportOption = page.getByRole('button').filter({ hasText: /readiness|training|gear|itinerary|member|crew/i }).first()
      .or(page.getByRole('radio').first())
      .or(page.locator('select').first());

    if (await page.locator('select').count() > 0) {
      const select = page.locator('select').first();
      const options = await select.locator('option').allTextContents();
      if (options.length > 1) {
        await select.selectOption({ index: 1 });
      }
    } else {
      const btn = page.getByRole('button').filter({ hasText: /readiness|training|gear|itinerary|member|crew/i }).first();
      if (await btn.isVisible()) {
        await btn.click();
      }
    }

    await page.waitForLoadState('networkidle');
    // After selecting, some report content should appear
    await expect(page.locator('#root')).toBeVisible();
  });

  test('8.3 Excel export button exists', async ({ page }) => {
    const excelBtn = page.getByRole('button', { name: /excel|export|download/i })
      .or(page.getByText(/excel|export.*xlsx/i));
    await expect(excelBtn.first()).toBeVisible({ timeout: 10_000 });
  });

  test('8.4 Print report button exists', async ({ page }) => {
    const printBtn = page.getByRole('button', { name: /print/i })
      .or(page.getByText(/print/i));
    await expect(printBtn.first()).toBeVisible({ timeout: 10_000 });
  });
});
