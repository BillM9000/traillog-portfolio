/**
 * Playwright global setup — authenticates all test personas and saves
 * their cookie/storage state to tests/.auth/<persona>.json so that
 * individual test files can reuse sessions without logging in again.
 *
 * Runs once before the entire test suite (via the "setup" project).
 */

import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, '.auth');
const BASE_URL = 'https://traillog.gracezero.ai';
const PASSWORD = 'TestPass#2026!';

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

/** Test personas — name to email mapping.
 *
 * Base personas (10): shared by lightweight/serial tests.
 * Per-spec personas (10): same email as base, but each gets its own
 * connect.sid so that heavy parallel specs never contend on the same
 * PostgreSQL session row.  Total = 20 = exactly the 20-req/15-min
 * auth rate-limit budget.
 */
const PERSONAS = {
  // ── base personas ──────────────────────────────────────────────────────────
  sysadmin:       'sysadmin@traillog.test',
  troopcreator:   'troopcreator@traillog.test',
  troopjoiner:    'troopjoiner@traillog.test',
  adultleader:    'adultleader@traillog.test',
  parenttrek:     'parenttrek@traillog.test',
  parentsupport:  'parentsupport@traillog.test',
  'scout-alpha':  'scout.alpha@traillog.test',
  'scout-bravo':  'scout.bravo@traillog.test',
  invited:        'invited@traillog.test',
  codejoiner:     'codejoiner@traillog.test',

  // ── per-spec isolated sessions (same credentials, separate session rows) ───
  // sysadmin variants
  'sysadmin-data':      'sysadmin@traillog.test',      // data-mutations.spec
  'sysadmin-email':     'sysadmin@traillog.test',      // email-notifications.spec
  'sysadmin-lifecycle': 'sysadmin@traillog.test',      // member-lifecycle.spec sysadmin sections

  // troopcreator variants
  'troopcreator-troop':   'troopcreator@traillog.test', // troop.spec
  'troopcreator-shared':  'troopcreator@traillog.test', // reports + multi-crew + adventure + member-lifecycle tc section
  'troopcreator-visual':  'troopcreator@traillog.test', // visual.spec (many screenshot contexts)

  // adultleader variants
  'adultleader-gear':      'adultleader@traillog.test', // gear.spec
  'adultleader-itin':      'adultleader@traillog.test', // itinerary.spec
  'adultleader-train':     'adultleader@traillog.test', // training.spec
  'adultleader-lifecycle': 'adultleader@traillog.test', // member-lifecycle.spec adultleader sections
};

/** Auth file paths keyed by persona name. */
export const AUTH_FILES = Object.fromEntries(
  Object.keys(PERSONAS).map((name) => [
    name,
    path.join(AUTH_DIR, `${name}.json`),
  ]),
);

/**
 * Authenticate a single persona:
 *  1. Open a browser context and navigate to the app (sets XSRF-TOKEN cookie)
 *  2. Extract the XSRF-TOKEN value
 *  3. POST /api/auth/login with credentials + CSRF header
 *  4. Save the resulting storageState (cookies + localStorage) to disk
 */
async function authenticatePersona(browser, name, email) {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  // Step 1 — hit an API endpoint to establish a session and get the XSRF-TOKEN cookie.
  // The SPA static page may not always trigger session creation, but any server
  // route that goes through the session middleware will.
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  // Also hit an API endpoint to ensure the session middleware runs
  await page.request.get(`${BASE_URL}/api/auth/me`);

  // Step 2 — extract the XSRF-TOKEN cookie
  const cookies = await context.cookies();
  const xsrfCookie = cookies.find((c) => c.name === 'XSRF-TOKEN');
  if (!xsrfCookie) {
    // Debug: log what cookies we do have
    console.log(`  [setup] cookies for ${name}:`, cookies.map(c => c.name).join(', '));
    throw new Error(`No XSRF-TOKEN cookie found for persona "${name}"`);
  }
  const csrfToken = xsrfCookie.value;

  // Step 3 — POST login with CSRF header
  const response = await page.request.post(`${BASE_URL}/api/auth/login`, {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    data: { email, password: PASSWORD },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(
      `Login failed for "${name}" (${email}): ${response.status()} — ${body}`,
    );
  }

  // Step 4 — persist cookies + storage to disk
  const authFile = AUTH_FILES[name];
  await context.storageState({ path: authFile });

  await context.close();
  console.log(`  [setup] authenticated: ${name} (${email})`);
}

/** Global setup entry point. */
export default async function globalSetup() {
  // Ensure .auth directory exists
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  console.log('[global-setup] Authenticating test personas...');

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
  });

  // Authenticate all personas sequentially to avoid hammering the server.
  // Skip personas whose auth files already exist and are recent (< 10 min old)
  // to avoid hitting the 20-request/15-min auth rate limit.
  for (const [name, email] of Object.entries(PERSONAS)) {
    const authFile = AUTH_FILES[name];
    if (fs.existsSync(authFile)) {
      const age = Date.now() - fs.statSync(authFile).mtimeMs;
      if (age < 10 * 60 * 1000) {
        console.log(`  [setup] reusing recent auth: ${name}`);
        continue;
      }
    }
    await authenticatePersona(browser, name, email);
  }

  await browser.close();
  console.log('[global-setup] All personas authenticated.');
}
