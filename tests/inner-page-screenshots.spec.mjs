/**
 * Inner-page screenshot suite for TrailLog.
 *
 * Logs in as adultleader (who is a member of Crew 614-A), enters the
 * adventure, then captures each tab across multiple device viewports.
 * Screenshots saved to the output directory.
 *
 * Devices: iPhone 14, Pixel 7, Android (Galaxy S24), Desktop 1440
 */
import { test, expect, devices } from '@playwright/test';
import { AUTH_FILES, BASE_URL } from './auth-helpers.mjs';
import path from 'node:path';
import fs from 'node:fs';

const OUTPUT_DIR = 'C:/GraceZero.ai.local/design_studio/test-reports/inner-pages';

const TABS = [
  { name: 'Training', sidebarText: 'Training' },
  { name: 'Readiness', sidebarText: 'Readiness' },
  { name: 'Itinerary', sidebarText: 'Itinerary' },
  { name: 'Gear', sidebarText: 'Gear' },
  { name: 'Reports', sidebarText: 'Reports' },
  { name: 'Docs', sidebarText: 'Docs' },
];

const DEVICE_CONFIGS = [
  { name: 'iPhone-14', ...devices['iPhone 14'] },
  { name: 'Pixel-7', ...devices['Pixel 7'] },
  { name: 'Android', ...devices['Galaxy S24'] },
  { name: 'Desktop-1440', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false, userAgent: undefined },
];

test.use({
  storageState: AUTH_FILES['adultleader-screenshots'],
  channel: 'chrome',
  launchOptions: {
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  },
});

/**
 * Navigate into Crew 614-A from the home dashboard.
 * adultleader is a member with an adventure card showing "Enter".
 */
async function enterAdventure(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2000);

  // Look for "Enter" button on adventure card
  const enterBtn = page.locator('button:has-text("Enter")').first();
  if (await enterBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await enterBtn.click();
    await page.waitForTimeout(2500);
    return true;
  }

  // Fallback: maybe auto-selected adventure, check if we see tab content
  const hasContent = await page.locator('button:has-text("Training")').isVisible({ timeout: 3000 }).catch(() => false);
  return hasContent;
}

/**
 * Switch to a specific tab by clicking the matching button.
 */
async function switchTab(page, tabName, isDesktop) {
  if (isDesktop) {
    // Desktop: sidebar has nav items — try both button and link
    const sidebarItem = page.locator(`[class*="Sidebar"] button:has-text("${tabName}"), [class*="sidebar"] button:has-text("${tabName}")`).first();
    if (await sidebarItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sidebarItem.click();
    } else {
      // Fallback: click any visible element with the tab name in the sidebar area
      const anyItem = page.locator(`button:has-text("${tabName}"), [role="button"]:has-text("${tabName}")`).first();
      if (await anyItem.isVisible({ timeout: 2000 }).catch(() => false)) {
        await anyItem.click();
      }
    }
  } else {
    // Mobile: click the section pill tab (the small pill buttons)
    // There may be multiple buttons with the same text (bottom nav + pill tabs)
    // The pill tabs are in the scrollable section nav
    const pillTabs = page.locator('button:has-text("' + tabName + '")');
    const count = await pillTabs.count();
    for (let i = 0; i < count; i++) {
      const btn = pillTabs.nth(i);
      const fontSize = await btn.evaluate(el => window.getComputedStyle(el).fontSize);
      // Pill tabs are 11px, bottom nav labels are 10px
      if (fontSize === '11px' || fontSize === '12px') {
        await btn.click();
        break;
      }
    }
    // Fallback: just click first one
    if (count > 0) {
      await pillTabs.first().click();
    }
  }
  await page.waitForTimeout(1500);
}

test.describe('Inner page screenshots', () => {
  for (const deviceCfg of DEVICE_CONFIGS) {
    for (const tab of TABS) {
      test(`${deviceCfg.name} — ${tab.name}`, async ({ browser }) => {
        const context = await browser.newContext({
          storageState: AUTH_FILES['adultleader-screenshots'],
          viewport: deviceCfg.viewport,
          deviceScaleFactor: deviceCfg.deviceScaleFactor || 1,
          isMobile: deviceCfg.isMobile ?? false,
          hasTouch: deviceCfg.hasTouch ?? false,
          ...(deviceCfg.userAgent ? { userAgent: deviceCfg.userAgent } : {}),
        });
        const page = await context.newPage();

        try {
          const entered = await enterAdventure(page);
          expect(entered).toBeTruthy();

          const isDesktop = (deviceCfg.viewport?.width || 0) >= 1024;
          await switchTab(page, tab.name, isDesktop);

          // Scroll to top for consistent screenshots
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(500);

          fs.mkdirSync(OUTPUT_DIR, { recursive: true });

          // Viewport screenshot — captures fixed bottom nav bar in context
          const viewportFile = `${deviceCfg.name}_${tab.name}.png`;
          await page.screenshot({
            path: path.join(OUTPUT_DIR, viewportFile),
            fullPage: false,
          });

          // Full-page screenshot — captures all scrollable content
          const fullFile = `${deviceCfg.name}_${tab.name}_full.png`;
          await page.screenshot({
            path: path.join(OUTPUT_DIR, fullFile),
            fullPage: true,
          });
        } finally {
          await context.close();
        }
      });
    }
  }
});
