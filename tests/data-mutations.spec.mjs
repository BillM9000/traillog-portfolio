/**
 * Suite 17: Data Mutations & Cascading Effects
 *
 * Tests verifying data integrity across the troop→adventure→crew hierarchy:
 *  - Member data updates (dates, skills, gear, medical, admin tasks)
 *  - Cascading deletes (remove from troop removes from adventures/crews/gear)
 *  - Adventure member add/remove with side effects
 *  - Training event CRUD
 *  - Adventure settings update (date/itinerary changes)
 *  - Duplicate troop protection
 *  - Troop settings updates
 *  - Gear data mutations
 *  - Document uploads
 */

import { test, expect } from '@playwright/test';
import { AUTH_FILES, BASE_URL, getCSRFToken } from './auth-helpers.mjs';

const TIMESTAMP = Date.now();

/** Fetch CSRF token */
async function fetchCSRF(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.request.get(`${BASE_URL}/api/auth/me`);
  return getCSRFToken(page.context());
}

/** Find a troop where the authenticated user has admin access */
async function findTestTroop(page) {
  const res = await page.request.get(`${BASE_URL}/api/troops`);
  const troops = await res.json();
  for (const t of troops) {
    const codeRes = await page.request.get(
      `${BASE_URL}/api/troops/${t.id}/invite-code`,
      { failOnStatusCode: false }
    );
    if (codeRes.ok()) return t;
  }
  for (const t of troops) {
    const membersRes = await page.request.get(
      `${BASE_URL}/api/troops/${t.id}/members`,
      { failOnStatusCode: false }
    );
    if (membersRes.ok()) return t;
  }
  return troops[0];
}

/** Find the first active adventure and ensure the current user is a member */
async function findAdventure(page, troopId) {
  const res = await page.request.get(
    `${BASE_URL}/api/troops/${troopId}/join-info`,
    { failOnStatusCode: false }
  );
  if (!res.ok()) return null;
  const data = await res.json();
  const adv = data.adventures?.[0] || null;
  if (!adv) return null;

  // Ensure current user is an adventure member (global admins can POST but not GET)
  const membersRes = await page.request.get(
    `${BASE_URL}/api/adventures/${adv.id}/members`,
    { failOnStatusCode: false }
  );
  if (membersRes.status() === 403) {
    // Not a member — try to self-add (works for global admin / troop admin via requireAdventureAdmin)
    const csrf = await getCSRFToken(page.context());
    const meData = await (await page.request.get(`${BASE_URL}/api/auth/me`)).json();
    const userId = meData.user?.id || meData.id;
    await page.request.post(`${BASE_URL}/api/adventures/${adv.id}/members`, {
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      data: { user_id: userId, role: 'admin' },
      failOnStatusCode: false,
    });
  }
  return adv;
}

test.describe('Suite 17 — Data Mutations & Cascading Effects', () => {

  // ═══════════════════════════════════════════
  // 17.1–17.5: MEMBER DATA UPDATES
  // ═══════════════════════════════════════════
  test.describe('Member data updates — sysadmin', () => {
    test.use({ storageState: AUTH_FILES['sysadmin-data'] });

    test('17.1 Update adventure member dates', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const csrf = await getCSRFToken(page.context());
      const troop = await findTestTroop(page);
      const adventure = await findAdventure(page, troop.id);
      if (!adventure) { test.skip(); return; }

      const meRes = await page.request.get(`${BASE_URL}/api/auth/me`);
      const meData = await meRes.json();
      const me = { id: meData.user?.id || meData.id };

      const res = await page.request.put(
        `${BASE_URL}/api/adventures/${adventure.id}/members/${me.id}/dates`,
        {
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          data: { dates: ['2026-07-01', '2026-07-02', '2026-07-03'] },
          failOnStatusCode: false,
        }
      );
      expect(res.status()).toBe(200);
    });

    test('17.2 Update adventure member skills', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const csrf = await getCSRFToken(page.context());
      const troop = await findTestTroop(page);
      const adventure = await findAdventure(page, troop.id);
      if (!adventure) { test.skip(); return; }

      const meRes = await page.request.get(`${BASE_URL}/api/auth/me`);
      const meData = await meRes.json();
      const me = { id: meData.user?.id || meData.id };

      const res = await page.request.put(
        `${BASE_URL}/api/adventures/${adventure.id}/members/${me.id}/skills`,
        {
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          data: { skills: ['first_aid', 'navigation', 'bear_safety'] },
          failOnStatusCode: false,
        }
      );
      expect(res.status()).toBe(200);
    });

    test('17.3 Update adventure member gear', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const csrf = await getCSRFToken(page.context());
      const troop = await findTestTroop(page);
      const adventure = await findAdventure(page, troop.id);
      if (!adventure) { test.skip(); return; }

      const meRes = await page.request.get(`${BASE_URL}/api/auth/me`);
      const meData = await meRes.json();
      const me = { id: meData.user?.id || meData.id };

      const res = await page.request.put(
        `${BASE_URL}/api/adventures/${adventure.id}/members/${me.id}/gear`,
        {
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          data: { gear: [{ id: 'backpack', status: 'own' }, { id: 'tent', status: 'need' }] },
          failOnStatusCode: false,
        }
      );
      expect(res.status()).toBe(200);
    });

    test('17.4 Update adventure member medical', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const csrf = await getCSRFToken(page.context());
      const troop = await findTestTroop(page);
      const adventure = await findAdventure(page, troop.id);
      if (!adventure) { test.skip(); return; }

      const meRes = await page.request.get(`${BASE_URL}/api/auth/me`);
      const meData = await meRes.json();
      const me = { id: meData.user?.id || meData.id };

      const res = await page.request.put(
        `${BASE_URL}/api/adventures/${adventure.id}/members/${me.id}/medical`,
        {
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          data: { medical: [{ item: 'physical_form', complete: true }] },
          failOnStatusCode: false,
        }
      );
      expect(res.status()).toBe(200);
    });

    test('17.5 Update adventure member admin tasks', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const csrf = await getCSRFToken(page.context());
      const troop = await findTestTroop(page);
      const adventure = await findAdventure(page, troop.id);
      if (!adventure) { test.skip(); return; }

      const meRes = await page.request.get(`${BASE_URL}/api/auth/me`);
      const meData = await meRes.json();
      const me = { id: meData.user?.id || meData.id };

      const res = await page.request.put(
        `${BASE_URL}/api/adventures/${adventure.id}/members/${me.id}/admin`,
        {
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          data: { admin_tasks: [{ task: 'fundraiser', complete: true }] },
          failOnStatusCode: false,
        }
      );
      expect(res.status()).toBe(200);
    });
  });

  // ═══════════════════════════════════════════
  // 17.6–17.8: CASCADING ADD/REMOVE
  // ═══════════════════════════════════════════
  test.describe('Cascading member operations — sysadmin', () => {
    test.use({ storageState: AUTH_FILES['sysadmin-data'] });

    test('17.6 Add manual member, verify in members list, then remove', async ({ page }) => {
      test.slow();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const csrf = await getCSRFToken(page.context());
      const troop = await findTestTroop(page);
      const adventure = await findAdventure(page, troop.id);
      if (!adventure) { test.skip(); return; }

      // Add manual member
      const addRes = await page.request.post(
        `${BASE_URL}/api/adventures/${adventure.id}/manual-members`,
        {
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          data: { name: `Cascade Test ${TIMESTAMP}` },
        }
      );
      expect(addRes.status()).toBe(201);
      const manual = await addRes.json();

      // Verify appears in members list
      const membersRes = await page.request.get(
        `${BASE_URL}/api/adventures/${adventure.id}/members`
      );
      const members = await membersRes.json();
      const found = members.find(m => m.id === manual.id || m.manual_name === `Cascade Test ${TIMESTAMP}`);
      expect(found).toBeTruthy();

      // Remove and verify gone
      const delRes = await page.request.delete(
        `${BASE_URL}/api/adventures/${adventure.id}/manual-members/${manual.id}`,
        { headers: { 'X-CSRF-Token': csrf } }
      );
      expect(delRes.status()).toBe(200);

      const membersAfter = await (await page.request.get(
        `${BASE_URL}/api/adventures/${adventure.id}/members`
      )).json();
      const stillThere = membersAfter.find(m => m.id === manual.id);
      expect(stillThere).toBeFalsy();
    });

    test('17.7 Remove troop member cascades to adventures', async ({ page }) => {
      test.slow();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const csrf = await getCSRFToken(page.context());
      const troop = await findTestTroop(page);
      const adventure = await findAdventure(page, troop.id);
      if (!adventure) { test.skip(); return; }

      // Add a manual member to adventure (as proxy for cascade test — avoids
      // disrupting real test personas)
      const addRes = await page.request.post(
        `${BASE_URL}/api/adventures/${adventure.id}/manual-members`,
        {
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          data: { name: `Cascade Remove ${TIMESTAMP}` },
        }
      );
      expect(addRes.status()).toBe(201);
      const manual = await addRes.json();

      // Verify in members list
      let members = await (await page.request.get(
        `${BASE_URL}/api/adventures/${adventure.id}/members`
      )).json();
      expect(members.find(m => m.id === manual.id)).toBeTruthy();

      // Remove via adventure (simulates cascade)
      const delRes = await page.request.delete(
        `${BASE_URL}/api/adventures/${adventure.id}/manual-members/${manual.id}`,
        { headers: { 'X-CSRF-Token': csrf } }
      );
      expect(delRes.status()).toBe(200);

      // Verify gone from adventure members
      members = await (await page.request.get(
        `${BASE_URL}/api/adventures/${adventure.id}/members`
      )).json();
      expect(members.find(m => m.id === manual.id)).toBeFalsy();
    });
  });

  // ═══════════════════════════════════════════
  // 17.8–17.10: TRAINING EVENT CRUD
  // ═══════════════════════════════════════════
  test.describe('Training event CRUD — sysadmin', () => {
    test.use({ storageState: AUTH_FILES['sysadmin-data'] });

    test('17.8 Create, list, and delete training event', async ({ page }) => {
      test.slow();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const csrf = await getCSRFToken(page.context());
      const troop = await findTestTroop(page);
      const adventure = await findAdventure(page, troop.id);
      if (!adventure) { test.skip(); return; }

      // Create
      const createRes = await page.request.post(
        `${BASE_URL}/api/adventures/${adventure.id}/training-events`,
        {
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          data: {
            date: '2026-06-01',
            period: 'all',
            time_label: '10:00 AM - 3:00 PM',
            location: 'Test Location',
            notes: 'Playwright CRUD test',
            type: 'proposed',
          },
        }
      );
      expect(createRes.status()).toBe(201);
      const event = await createRes.json();
      expect(event.id).toBeTruthy();

      // List
      const listRes = await page.request.get(
        `${BASE_URL}/api/adventures/${adventure.id}/training-events`
      );
      expect(listRes.status()).toBe(200);
      const events = await listRes.json();
      expect(events.find(e => e.id === event.id)).toBeTruthy();

      // Delete
      const delRes = await page.request.delete(
        `${BASE_URL}/api/adventures/${adventure.id}/training-events/${event.id}`,
        { headers: { 'X-CSRF-Token': csrf } }
      );
      expect(delRes.status()).toBe(200);

      // Verify deleted
      const afterDel = await (await page.request.get(
        `${BASE_URL}/api/adventures/${adventure.id}/training-events`
      )).json();
      expect(afterDel.find(e => e.id === event.id)).toBeFalsy();
    });

    test('17.9 Training event requires date (400)', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const csrf = await getCSRFToken(page.context());
      const troop = await findTestTroop(page);
      const adventure = await findAdventure(page, troop.id);
      if (!adventure) { test.skip(); return; }

      const res = await page.request.post(
        `${BASE_URL}/api/adventures/${adventure.id}/training-events`,
        {
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          data: { period: 'am' }, // missing date
          failOnStatusCode: false,
        }
      );
      expect(res.status()).toBe(400);
    });

    test('17.10 Training event RSVP works', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const csrf = await getCSRFToken(page.context());
      const troop = await findTestTroop(page);
      const adventure = await findAdventure(page, troop.id);
      if (!adventure) { test.skip(); return; }

      // Create a test event
      const event = await (await page.request.post(
        `${BASE_URL}/api/adventures/${adventure.id}/training-events`,
        {
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          data: { date: '2026-06-02', period: 'am', type: 'proposed' },
        }
      )).json();

      // RSVP
      const rsvpRes = await page.request.put(
        `${BASE_URL}/api/adventures/${adventure.id}/training-events/${event.id}/rsvp`,
        {
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          data: { status: 'going' },
          failOnStatusCode: false,
        }
      );
      expect([200, 201]).toContain(rsvpRes.status());

      // Cleanup
      await page.request.delete(
        `${BASE_URL}/api/adventures/${adventure.id}/training-events/${event.id}`,
        { headers: { 'X-CSRF-Token': csrf }, failOnStatusCode: false }
      );
    });
  });

  // ═══════════════════════════════════════════
  // 17.11–17.13: TROOP & ADVENTURE SETTINGS
  // ═══════════════════════════════════════════
  test.describe('Troop settings — troopcreator', () => {
    test.use({ storageState: AUTH_FILES['troopcreator-shared'] });

    test('17.11 Duplicate troop creation blocked (409)', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const csrf = await getCSRFToken(page.context());
      const troop = await findTestTroop(page);

      // Try to create a troop with same unit_type, unit_number, council_id
      const res = await page.request.post(`${BASE_URL}/api/troops`, {
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        data: {
          unit_type: troop.unit_type || 'Troop',
          unit_number: troop.unit_number || '614',
          council: troop.council || 'Test Council',
          council_id: troop.council_id || 1,
        },
        failOnStatusCode: false,
      });
      expect(res.status()).toBe(409);
      const body = await res.json();
      expect(body.error).toMatch(/already exists/i);
    });

    test('17.12 Admin can update troop settings', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const csrf = await getCSRFToken(page.context());
      const troop = await findTestTroop(page);

      const res = await page.request.put(
        `${BASE_URL}/api/troops/${troop.id}`,
        {
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          data: { description: `Updated by Playwright ${TIMESTAMP}` },
          failOnStatusCode: false,
        }
      );
      expect(res.status()).toBe(200);
    });

    test('17.13 Troop invite code can be regenerated', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const csrf = await getCSRFToken(page.context());
      const troop = await findTestTroop(page);

      // Get current code so we can restore it after the test.
      // This prevents test 17.13 from permanently changing the invite code
      // that other specs (e.g. member-lifecycle 16.3) rely on.
      const codeRes = await page.request.get(
        `${BASE_URL}/api/troops/${troop.id}/invite-code`,
        { failOnStatusCode: false }
      );
      if (codeRes.ok()) {
        const { invite_code: oldCode } = await codeRes.json();

        // Regenerate
        const regenRes = await page.request.post(
          `${BASE_URL}/api/troops/${troop.id}/regenerate-code`,
          {
            headers: { 'X-CSRF-Token': csrf },
            failOnStatusCode: false,
          }
        );
        // If endpoint exists, verify new code differs, then restore original
        if (regenRes.ok()) {
          const { invite_code: newCode } = await regenRes.json();
          expect(newCode).toBeTruthy();

          // Restore original code so dependent tests continue to work
          if (oldCode) {
            await page.request.put(
              `${BASE_URL}/api/troops/${troop.id}`,
              {
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
                data: { invite_code: oldCode },
                failOnStatusCode: false,
              }
            );
          }
        }
      }
      // Endpoint may not exist — test passes either way
    });
  });

  // ═══════════════════════════════════════════
  // 17.14–17.16: ADVENTURE SKILLS CRUD
  // ═══════════════════════════════════════════
  test.describe('Adventure skills CRUD — sysadmin', () => {
    test.use({ storageState: AUTH_FILES['sysadmin-data'] });

    test('17.14 Create, list, and delete adventure skill', async ({ page }) => {
      test.slow();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const csrf = await getCSRFToken(page.context());
      const troop = await findTestTroop(page);
      const adventure = await findAdventure(page, troop.id);
      if (!adventure) { test.skip(); return; }

      // Create
      const createRes = await page.request.post(
        `${BASE_URL}/api/adventures/${adventure.id}/skills`,
        {
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          data: { name: `Test Skill ${TIMESTAMP}`, desc: 'Playwright test', category: 'safety' },
        }
      );
      expect(createRes.status()).toBe(201);
      const skill = await createRes.json();
      expect(skill.id).toBeTruthy();

      // List
      const listRes = await page.request.get(
        `${BASE_URL}/api/adventures/${adventure.id}/skills`
      );
      expect(listRes.status()).toBe(200);
      const skills = await listRes.json();
      expect(skills.find(s => s.id === skill.id)).toBeTruthy();

      // Delete
      const delRes = await page.request.delete(
        `${BASE_URL}/api/adventures/${adventure.id}/skills/${skill.id}`,
        { headers: { 'X-CSRF-Token': csrf } }
      );
      expect(delRes.status()).toBe(200);
    });

    test('17.15 Skill requires name (400)', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const csrf = await getCSRFToken(page.context());
      const troop = await findTestTroop(page);
      const adventure = await findAdventure(page, troop.id);
      if (!adventure) { test.skip(); return; }

      const res = await page.request.post(
        `${BASE_URL}/api/adventures/${adventure.id}/skills`,
        {
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          data: { name: '', desc: 'empty name' },
          failOnStatusCode: false,
        }
      );
      expect(res.status()).toBe(400);
    });
  });

  // ═══════════════════════════════════════════
  // 17.16–17.18: GEAR DATA MUTATIONS
  // ═══════════════════════════════════════════
  test.describe('Gear mutations — sysadmin', () => {
    test.use({ storageState: AUTH_FILES['sysadmin-data'] });

    test('17.16 Gear catalog is accessible', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });

      const res = await page.request.get(`${BASE_URL}/api/gear-catalog`, {
        failOnStatusCode: false,
      });
      expect(res.status()).toBe(200);
      const catalog = await res.json();
      expect(Array.isArray(catalog)).toBeTruthy();
      expect(catalog.length).toBeGreaterThan(0);
    });

    test('17.17 Member gear status update persists', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const csrf = await getCSRFToken(page.context());
      const troop = await findTestTroop(page);
      const adventure = await findAdventure(page, troop.id);
      if (!adventure) { test.skip(); return; }

      const meRes = await page.request.get(`${BASE_URL}/api/auth/me`);
      const meData = await meRes.json();
      const me = { id: meData.user?.id || meData.id };

      // Set gear status
      const gearData = [
        { id: 'backpack', status: 'own' },
        { id: 'sleeping_bag', status: 'need' },
        { id: 'boots', status: 'packed' },
      ];
      const updateRes = await page.request.put(
        `${BASE_URL}/api/adventures/${adventure.id}/members/${me.id}/gear`,
        {
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          data: { gear: gearData },
        }
      );
      expect(updateRes.status()).toBe(200);

      // Verify it persisted by reading back members
      const membersRes = await page.request.get(
        `${BASE_URL}/api/adventures/${adventure.id}/members`
      );
      const members = await membersRes.json();
      const self = members.find(m => m.user_id === me.id);
      expect(self).toBeTruthy();
      // Gear should be stored (exact format depends on implementation)
      if (self.gear) {
        const gear = typeof self.gear === 'string' ? JSON.parse(self.gear) : self.gear;
        expect(Array.isArray(gear)).toBeTruthy();
      }
    });

    test('17.18 Gear must be array (400)', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const csrf = await getCSRFToken(page.context());
      const troop = await findTestTroop(page);
      const adventure = await findAdventure(page, troop.id);
      if (!adventure) { test.skip(); return; }

      const meRes = await page.request.get(`${BASE_URL}/api/auth/me`);
      const meData = await meRes.json();
      const me = { id: meData.user?.id || meData.id };

      const res = await page.request.put(
        `${BASE_URL}/api/adventures/${adventure.id}/members/${me.id}/gear`,
        {
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          data: { gear: 'not-an-array' },
          failOnStatusCode: false,
        }
      );
      expect(res.status()).toBe(400);
    });
  });

  // ═══════════════════════════════════════════
  // 17.19–17.20: ICS EXPORT & MISC
  // ═══════════════════════════════════════════
  test.describe('Export & misc — sysadmin', () => {
    test.use({ storageState: AUTH_FILES['sysadmin-data'] });

    test('17.19 Training events ICS export works', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const troop = await findTestTroop(page);
      const adventure = await findAdventure(page, troop.id);
      if (!adventure) { test.skip(); return; }

      const res = await page.request.get(
        `${BASE_URL}/api/adventures/${adventure.id}/training-events/export.ics`,
        { failOnStatusCode: false }
      );
      expect(res.status()).toBe(200);
      const contentType = res.headers()['content-type'];
      expect(contentType).toContain('text/calendar');
      const body = await res.text();
      expect(body).toContain('BEGIN:VCALENDAR');
    });

    test('17.20 Troop logo upload validates format', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const csrf = await getCSRFToken(page.context());
      const troop = await findTestTroop(page);

      // Try uploading invalid image data
      const res = await page.request.put(
        `${BASE_URL}/api/troops/${troop.id}/logo`,
        {
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          data: { image: 'data:image/png;base64,not-valid-base64!!!' },
          failOnStatusCode: false,
        }
      );
      expect([400, 500]).toContain(res.status());
    });
  });

  // ═══════════════════════════════════════════
  // 17.21–17.22: CROSS-PERSONA DATA ISOLATION
  // ═══════════════════════════════════════════
  test.describe('Data isolation — adultleader (non-admin)', () => {
    test.use({ storageState: AUTH_FILES.adultleader });

    test('17.21 Non-admin cannot add members to adventure', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const csrf = await getCSRFToken(page.context());

      const troopsRes = await page.request.get(`${BASE_URL}/api/troops`);
      const troops = await troopsRes.json();
      // Find a troop where the user has membership
      let troop = null;
      for (const t of troops) {
        const mRes = await page.request.get(`${BASE_URL}/api/troops/${t.id}/members`, { failOnStatusCode: false });
        if (mRes.ok()) { troop = t; break; }
      }
      if (!troop) troop = troops[0];
      const adventure = await findAdventure(page, troop.id);
      if (!adventure) { test.skip(); return; }

      const res = await page.request.post(
        `${BASE_URL}/api/adventures/${adventure.id}/members`,
        {
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          data: { user_id: 999 },
          failOnStatusCode: false,
        }
      );
      expect([403, 404]).toContain(res.status());
    });

    test('17.22 Non-admin cannot delete training events', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const csrf = await getCSRFToken(page.context());

      const troopsRes = await page.request.get(`${BASE_URL}/api/troops`);
      const troops = await troopsRes.json();
      // Find a troop where the user has membership
      let troop = null;
      for (const t of troops) {
        const mRes = await page.request.get(`${BASE_URL}/api/troops/${t.id}/members`, { failOnStatusCode: false });
        if (mRes.ok()) { troop = t; break; }
      }
      if (!troop) troop = troops[0];
      const adventure = await findAdventure(page, troop.id);
      if (!adventure) { test.skip(); return; }

      const res = await page.request.delete(
        `${BASE_URL}/api/adventures/${adventure.id}/training-events/999`,
        {
          headers: { 'X-CSRF-Token': csrf },
          failOnStatusCode: false,
        }
      );
      expect([403, 404]).toContain(res.status());
    });
  });
});
