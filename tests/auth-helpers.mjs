/**
 * Shared authentication helpers for TrailLog Playwright tests.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, '.auth');

export const BASE_URL = 'https://traillog.gracezero.ai';

/** Paths to saved auth state files, keyed by persona name.
 *
 * Every spec file that uses sysadmin, troopcreator, or adultleader gets
 * its own per-spec key so concurrent specs never share a connect.sid.
 */
export const AUTH_FILES = {
  // ── base personas (sole-user emails) ───────────────────────────────────────
  troopjoiner:    path.join(AUTH_DIR, 'troopjoiner.json'),
  parenttrek:     path.join(AUTH_DIR, 'parenttrek.json'),
  parentsupport:  path.join(AUTH_DIR, 'parentsupport.json'),
  'scout-alpha':  path.join(AUTH_DIR, 'scout-alpha.json'),
  invited:        path.join(AUTH_DIR, 'invited.json'),
  codejoiner:     path.join(AUTH_DIR, 'codejoiner.json'),

  // ── sysadmin per-spec ──────────────────────────────────────────────────────
  'sysadmin-data':       path.join(AUTH_DIR, 'sysadmin-data.json'),
  'sysadmin-email':      path.join(AUTH_DIR, 'sysadmin-email.json'),
  'sysadmin-lifecycle':  path.join(AUTH_DIR, 'sysadmin-lifecycle.json'),
  'sysadmin-admin':      path.join(AUTH_DIR, 'sysadmin-admin.json'),

  // ── troopcreator per-spec ──────────────────────────────────────────────────
  'troopcreator-troop':      path.join(AUTH_DIR, 'troopcreator-troop.json'),
  'troopcreator-shared':     path.join(AUTH_DIR, 'troopcreator-shared.json'),
  'troopcreator-visual':     path.join(AUTH_DIR, 'troopcreator-visual.json'),
  'troopcreator-admin':      path.join(AUTH_DIR, 'troopcreator-admin.json'),
  'troopcreator-approval':   path.join(AUTH_DIR, 'troopcreator-approval.json'),
  'troopcreator-onboarding': path.join(AUTH_DIR, 'troopcreator-onboarding.json'),
  'troopcreator-security':   path.join(AUTH_DIR, 'troopcreator-security.json'),

  // ── adultleader per-spec ───────────────────────────────────────────────────
  'adultleader-gear':        path.join(AUTH_DIR, 'adultleader-gear.json'),
  'adultleader-itin':        path.join(AUTH_DIR, 'adultleader-itin.json'),
  'adultleader-train':       path.join(AUTH_DIR, 'adultleader-train.json'),
  'adultleader-lifecycle':   path.join(AUTH_DIR, 'adultleader-lifecycle.json'),
  'adultleader-admin':       path.join(AUTH_DIR, 'adultleader-admin.json'),
  'adultleader-data':        path.join(AUTH_DIR, 'adultleader-data.json'),
  'adultleader-adventure':   path.join(AUTH_DIR, 'adultleader-adventure.json'),
  'adultleader-troop':       path.join(AUTH_DIR, 'adultleader-troop.json'),
  'adultleader-screenshots': path.join(AUTH_DIR, 'adultleader-screenshots.json'),
  'adultleader-security':    path.join(AUTH_DIR, 'adultleader-security.json'),
};

/**
 * UI login flow — navigates to the landing page and fills in the
 * email/password form. Useful for tests that need to exercise the
 * login UI itself rather than reusing saved auth state.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} email
 * @param {string} password
 */
export async function login(page, email, password) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  // Wait for redirect away from the landing/login page
  await page.waitForURL((url) => !url.pathname.match(/^\/?$/), {
    timeout: 15_000,
  });
}

/**
 * Extract the XSRF-TOKEN value from the browser context's cookies.
 *
 * @param {import('@playwright/test').BrowserContext} context
 * @returns {Promise<string>}
 */
export async function getCSRFToken(context) {
  const cookies = await context.cookies();
  const xsrf = cookies.find((c) => c.name === 'XSRF-TOKEN');
  if (!xsrf) {
    throw new Error('XSRF-TOKEN cookie not found — visit the app first');
  }
  return xsrf.value;
}

/**
 * POST helper that automatically includes the CSRF header.
 *
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} url       — full URL or path relative to baseURL
 * @param {object} data      — JSON body
 * @param {string} csrfToken — value of the XSRF-TOKEN cookie
 * @returns {Promise<import('@playwright/test').APIResponse>}
 */
export async function apiPost(request, url, data, csrfToken) {
  return request.post(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    data,
  });
}

/**
 * GET helper for API requests.
 *
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} url — full URL or path relative to baseURL
 * @returns {Promise<import('@playwright/test').APIResponse>}
 */
export async function apiGet(request, url) {
  return request.get(url);
}
