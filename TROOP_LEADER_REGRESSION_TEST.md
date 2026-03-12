# TrailLog — First-Time Troop Leader Regression Test

You are testing the TrailLog web app at https://traillog.gracezero.ai as a **brand new user** — a troop leader who has never used the app before. This test covers the complete first-time experience: Google OAuth login, profile setup, troop creation, adventure creation, and full feature exploration.

**DATABASE STATE:** Clean slate. Only one user exists: billm9000@gmail.com (Global Admin, no troops). 48 Philmont itineraries and 77 gear catalog items are pre-seeded.

**TEST ACCOUNT:** `billmccoy48@gmail.com` — Google OAuth login. This user does NOT exist yet in the database. They will sign up via Google OAuth during the test.

**INSTRUCTIONS:**
- Execute each step sequentially.
- After each SECTION, report PASS or FAIL with any issues found.
- If a step fails, note the failure and continue to the next step.
- Use `read_page`, `find`, or `javascript_tool` to verify expected content.
- Take screenshots at key milestones or when something fails.

---

## SECTION 1: Health Check

**Step 1.1** — Use `javascript_tool` to run:
```js
fetch('/api/health').then(r => r.json()).then(d => JSON.stringify(d))
```
Verify the response contains `"status":"ok"`.

**Step 1.2** — Use `javascript_tool` to verify clean state:
```js
fetch('/api/itineraries').then(r => r.json()).then(d => 'Itineraries: ' + d.length)
```
Verify: "Itineraries: 48".

---

## SECTION 2: Login & Profile Setup

**Step 2.1** — Navigate to `https://traillog.gracezero.ai`. Verify the login page renders with a "Sign in with Google" button, email/password fields, and a "Sign In" button.

**Step 2.2** — The user will click "Sign in with Google" and complete authentication as **billmccoy48@gmail.com**. Wait for the page to finish loading after login.

**Step 2.3** — Verify the page is **ProfileSetup** — look for:
- "Welcome, Bill McCoy!" (or whatever name is on the Google account)
- "One quick question before we get started."
- "Are you an adult or a scout?"
- Two buttons: **Adult** ("Parent, adviser, or crew leader") and **Scout** ("Youth trekking crew member")
- A "Continue" button (disabled until selection made)

**Step 2.4** — Click the **"Scout"** button. Verify two parent email fields appear: "Parent/Guardian Email (required)" and "Second Parent/Guardian Email (optional)".

**Step 2.5** — Click the **"Adult"** button. Verify the parent email fields disappear. The "Continue" button should be enabled.

**Step 2.6** — Click **"Continue"**. Wait 3 seconds. Verify the page transitions to the **Lobby**.

---

## SECTION 3: Lobby — Empty State & Troop Discovery

**Step 3.1** — Verify the Lobby shows:
- "Welcome," followed by the user's name
- A "Sign Out" button
- **No** "Platform Admin" button (this user is NOT a global admin)
- An "Available Troops" section
- No existing troops listed (billm9000's Global Admin has no troops either)
- A "+ Create a New Troop" button

---

## SECTION 4: Create First Troop — Form Validation

**Step 4.1** — Click **"+ Create a New Troop"**. Verify the form expands with:
- Troop/Crew Name input
- Council input
- City input
- State dropdown
- Description input (optional)
- Visibility toggle: "Public" / "Private"
- "Cancel" and "Create" buttons

**Step 4.2** — Without filling any fields, click **"Create"**. Verify error: **"Troop name required"**.

**Step 4.3** — Type "Troop 10" in the name field. Click **"Create"**. Verify error: **"Council is required"**.

**Step 4.4** — Type "Northeast Illinois Council" in the council field. Click **"Create"**. Verify error: **"City is required"**.

**Step 4.5** — Type "Chicago" in the city field. Click **"Create"**. Verify error: **"State is required"**.

**Step 4.6** — Click the **"Private"** visibility button. Verify helper text mentions "hidden" or "invite-only". Click **"Public"** to switch back. Verify helper text mentions "listed" or "searchable".

**Step 4.7** — Click **"Cancel"**. Verify the form collapses and "+ Create a New Troop" button reappears.

---

## SECTION 5: Create First Troop — Success

**Step 5.1** — Click **"+ Create a New Troop"** again. Fill in:
- Troop name: `Troop 10`
- Council: `Northeast Illinois Council`
- City: `Chicago`
- State: Select **"IL"**
- Visibility: **Public** (default)

**Step 5.2** — Click **"Create"**. Wait 3 seconds. Verify the page transitions to **AdventurePicker** showing:
- "Troop 10" heading
- "Northeast Illinois Council · Chicago, IL" subtitle
- "Back" button, "Sign Out" button
- "No adventures yet. Create one to get started!"
- "+ Create Adventure" button
- **No** "Platform Admin" button

---

## SECTION 6: Create First Adventure (Philmont)

**Step 6.1** — Click **"+ Create Adventure"**. Verify the creation form with:
- Adventure Type 2x2 grid: Philmont enabled (selected), 3 others greyed "COMING SOON"
- Adventure name input
- 4 date inputs with Philmont labels: "DEPART HOME", "ARRIVE PHILMONT", "DEPART PHILMONT", "RETURN HOME"
- Itinerary dropdown

**Step 6.2** — Use `read_page` to inspect the itinerary `<select>`. Verify it contains `<optgroup>` elements: "12-Day Treks", "9-Day Treks", "7-Day Treks".

**Step 6.3** — Fill in:
- Adventure name: `Philmont Summer 2026`
- Depart Home: `2026-06-20`
- Arrive Philmont: `2026-06-22`
- Depart Philmont: `2026-07-03`
- Return Home: `2026-07-05`
- Itinerary: Select the first option from the "12-Day Treks" group

**Step 6.4** — Click **"Create"**. Wait 3 seconds. Verify the **Main Adventure View** loads with 5 tab buttons: "Training", "Best Windows", "Readiness", "Itinerary", "Gear".

---

## SECTION 7: Main View — First Look

**Step 7.1** — Verify:
- Header shows a countdown (days until departure June 20)
- Admin button (⚙️) visible (troop creator = troop admin)
- Theme toggle button visible
- **MemberBar** shows one member with "YOU" badge, "A" (Adult) badge, and "Admin" badge

**Step 7.2** — Verify the **"Training"** tab is the active default with a calendar visible.

---

## SECTION 8: Training Tab — Calendar & Date Selection

**Step 8.1** — Verify the Training tab shows:
- Month headers and clickable date cells
- Buttons: "Select All", "Weekends Only", "Clear All"

**Step 8.2** — Click on **3 future weekend date cells**. Wait 2 seconds for debounce save. Verify the MemberBar date count updated (e.g., "3 dates").

**Step 8.3** — Click **"Select All"**. Wait 2 seconds. Verify date count increased significantly.

**Step 8.4** — Click **"Clear All"**. Wait 2 seconds. Verify date count returns to 0.

**Step 8.5** — Click **"Weekends Only"**. Wait 2 seconds. Verify a moderate number of weekend dates selected.

**Step 8.6** — Click **"Clear All"**. Manually click **3 specific weekend dates** for the Best Windows test. Wait 2 seconds.

---

## SECTION 9: Best Windows Tab

**Step 9.1** — Click the **"Best Windows"** tab. Wait 2 seconds. Verify it loaded with date analysis — the 3 selected dates should show with 100% availability (1 of 1 member).

---

## SECTION 10: Readiness Tab

**Step 10.1** — Click the **"Readiness"** tab. Wait 2 seconds.

**Step 10.2** — Verify:
- Journey trail visualization with 5 waypoints: Trailhead, Base Camp, Timber Ridge, Eagle Point, Summit
- 4 readiness categories: Training, Gear, Medical, Admin
- All categories show **0%** (empty = 0%, NOT 100%)
- Crew readiness is **0%**

**Step 10.3** — Look for the "Trail Guide" legend. If collapsible, expand it. Verify badge descriptions: Gear Ready, Trail Medic, Admin Pro, Training Complete, Fully Prepared.

---

## SECTION 11: Itinerary Tab

**Step 11.1** — Click the **"Itinerary"** tab. Wait 2 seconds. Verify:
- "Quick Reference" heading with itinerary name
- Stats: miles, duration, dry camps, staffed camps, rating
- Filter tags: "All", "Staffed", "Dry Camp", "Layover", "Trail/Base"
- Day cards

**Step 11.2** — Click **"Staffed"** filter. Verify only staffed camp days shown.

**Step 11.3** — Click **"Dry Camp"** filter. Verify only dry camp days shown with "DRY CAMP" warning.

**Step 11.4** — Click **"All"** to reset. Verify all days reappear.

**Step 11.5** — Click a day card to expand it. Verify expanded details (programs, water sources).

**Step 11.6** — Click **"Expand All"**. Verify all expanded. Click **"Collapse"**. Verify all collapsed.

**Step 11.7** — Click **"Print"**. Verify print/cheat-sheet modal appears. Close it.

---

## SECTION 12: Gear Tab — Browse, Search & Status

**Step 12.1** — Click the **"Gear"** tab. Wait 2 seconds. Verify gear items displayed with category groupings.

**Step 12.2** — Verify "Gear Admin" button visible (troop admin).

**Step 12.3** — Type **"sleeping"** in the search input. Verify list filters to matching items only. Clear search. Verify full catalog returns.

**Step 12.4** — Click a **category filter** (e.g., "Clothing"). Verify only that category shown. Click "All" to reset.

**Step 12.5** — Click **"Essential"** priority filter. Verify only essential items shown. Click "All" to reset.

**Step 12.6** — Find a gear item. Click to cycle status:
- Click 1 → "Own". Verify.
- Click 2 → "Packed". Verify.
- Click 3 → "Need". Verify.
- Click 4 → cleared. Verify.

**Step 12.7** — Mark **3 items** as "Own". Verify crew gear stats updated.

---

## SECTION 13: Pack Weight Widget

**Step 13.1** — While on Gear tab, locate the **Pack Weight** widget.

**Step 13.2** — Verify it shows:
- Base weight
- Food estimate (~21 lbs for 12-day trek)
- Water weight (~4.4 lbs)
- Total pack weight

---

## SECTION 14: Admin Panel — Adventure Settings

**Step 14.1** — Click the **admin button (⚙️)**. Verify the Admin Panel slide-in opens with the Adventure tab active showing:
- Adventure name: "Philmont Summer 2026"
- Date inputs with set dates
- Itinerary dropdown
- Status: "Active"
- "Save Adventure" button

**Step 14.2** — Change adventure name to **"Philmont Summer 2026 — Crew 10"**. Click **"Save Adventure"**. Verify toast: "Adventure saved".

**Step 14.3** — Change itinerary to a **9-Day trek**. Click **"Save Adventure"**. Verify toast.

**Step 14.4** — Close Admin Panel. Click **"Itinerary"** tab. Verify the new 9-Day itinerary displayed (fewer days than before).

---

## SECTION 15: Admin Panel — Members Tab

**Step 15.1** — Open Admin Panel (⚙️). Click **"Members"** tab. Verify the user listed as sole member with "Admin" role and "A" (Adult) type.

**Step 15.2** — In "Add Manual Member", type **"Marcus Rivera"** and click **"Add"**. Verify Marcus appears with "S" (Scout) badge and "manual" indicator.

**Step 15.3** — Close Admin Panel. Verify Marcus appears in MemberBar with "S" badge.

**Step 15.4** — Open Admin Panel. On Marcus's row, click **"Change to Adult"**. Verify badge changes to "A". Click **"Change to Scout"**. Verify back to "S".

**Step 15.5** — Add manual member: **"Jamie Chen"**. Verify they appear.

**Step 15.6** — In "Invite by Email", enter `testparent@example.com`. Click **"Send"**. Verify toast "Invitation sent!" and email appears in "Pending Invitations".

**Step 15.7** — Close Admin Panel.

---

## SECTION 16: Admin Panel — Troop Settings

**Step 16.1** — Open Admin Panel (⚙️). Click **"Troop"** tab. Verify:
- Troop Name: "Troop 10"
- Council: "Northeast Illinois Council"
- City: "Chicago", State: "IL"
- Visibility: "Public"

**Step 16.2** — Change council to **"Chicago Area Council"**. Add description: **"High adventure crew preparing for Philmont"**. Click **"Save Troop"**. Verify toast.

**Step 16.3** — Toggle to **"Private"**. Verify helper text. Click **"Save Troop"**.

**Step 16.4** — Toggle back to **"Public"**. Click **"Save Troop"**.

**Step 16.5** — Close Admin Panel.

---

## SECTION 17: MemberBar Interactions

**Step 17.1** — Verify MemberBar shows 3 members:
- Bill McCoy (YOU, Admin, Adult)
- Marcus Rivera (Scout, manual)
- Jamie Chen (Scout, manual)

**Step 17.2** — Click **Marcus Rivera**. Verify his row highlights as selected.

**Step 17.3** — Click **"Training"** tab. Verify Marcus has 0 dates (manual member, no dates set).

**Step 17.4** — Click back on the main user to re-select. Verify their data loads back.

---

## SECTION 18: Create Second Adventure

**Step 18.1** — Open Admin Panel (⚙️). On Adventure tab, find **"+ Create Another Adventure"** and click it.

**Step 18.2** — Fill in:
- Adventure name: `Fall Training Weekend`
- Leave dates and itinerary blank

Click **"Create Adventure"**. Wait 3 seconds.

**Step 18.3** — Verify the app entered the new adventure — "Fall Training Weekend" in header.

**Step 18.4** — Click **"Itinerary"** tab. Verify empty state: "No itinerary selected" with a dropdown.

**Step 18.5** — Select a **7-Day trek** from the dropdown. Wait 2 seconds. Verify itinerary loaded with day cards.

---

## SECTION 19: Navigation Flow

**Step 19.1** — Click **"Back"**. Verify you're on **AdventurePicker** for Troop 10.

**Step 19.2** — Verify **2 adventures** listed:
- "Philmont Summer 2026 — Crew 10"
- "Fall Training Weekend"

Adventures should NOT auto-select.

**Step 19.3** — Click **"Philmont Summer 2026 — Crew 10"**. Verify Main View loads with tabs and member data intact.

**Step 19.4** — Click **"Back"** → AdventurePicker. Click **"Back"** → Lobby.

**Step 19.5** — Verify Lobby shows "Troop 10" with "Enter →". No Platform Admin button.

**Step 19.6** — Click **"Enter →"**. Verify AdventurePicker loaded.

---

## SECTION 20: Theme Toggle

**Step 20.1** — Enter the Philmont adventure. Find the **theme toggle** button. Click it. Verify the theme changes (background + text colors switch).

**Step 20.2** — Click again. Verify original theme returns.

**Step 20.3** — Verify the **countdown display** shows days until departure (2026-06-20).

---

## SECTION 21: Sign Out & Re-Login

**Step 21.1** — Click **"Sign Out"**. Verify the login page appears.

**Step 21.2** — The user will click "Sign in with Google" and complete authentication as **billmccoy48@gmail.com** again. Wait for the page to load.

**Step 21.3** — Verify you are **NOT** taken to ProfileSetup again. You should land on the Lobby or auto-enter Troop 10.

**Step 21.4** — Navigate into the Philmont adventure. Verify saved data intact:
- Gear tab: 3 items still marked "Own"
- Training tab: selected dates still present
- MemberBar: 3 members (Bill, Marcus, Jamie)

---

## SECTION 22: Member Removal

**Step 22.1** — Open Admin Panel (⚙️). Go to **Members** tab. Verify all 3 members listed.

**Step 22.2** — Click **"Remove"** on Jamie Chen. Verify Jamie disappears.

**Step 22.3** — Close Admin Panel. Verify MemberBar shows only 2 members.

---

## SECTION 23: API Security (Non-Admin Scope)

Use `javascript_tool` for all tests.

**Step 23.1** — Verify no global admin access:
```js
fetch('/api/admin/troops').then(r => r.status + ' ' + r.statusText)
```
Verify: **"403 Forbidden"**.

**Step 23.2** —
```js
fetch('/api/admin/settings').then(r => r.status + ' ' + r.statusText)
```
Verify: **"403 Forbidden"**.

**Step 23.3** —
```js
fetch('/api/admin/users').then(r => r.status + ' ' + r.statusText)
```
Verify: **"403 Forbidden"**.

**Step 23.4** —
```js
fetch('/api/auth/me').then(r => r.json()).then(d => d.name + ' | admin: ' + d.is_global_admin)
```
Verify name present and admin is **false** (or 0/undefined).

---

## SECTION 24: Final Summary

After completing all sections, compile a results table:

| Section | Description | Result | Issues |
|---------|-------------|--------|--------|
| 1  | Health Check | | |
| 2  | Login & Profile Setup | | |
| 3  | Lobby — Empty State | | |
| 4  | Create Troop — Validation | | |
| 5  | Create Troop — Success | | |
| 6  | Create Adventure (Philmont) | | |
| 7  | Main View — First Look | | |
| 8  | Training Tab | | |
| 9  | Best Windows Tab | | |
| 10 | Readiness Tab | | |
| 11 | Itinerary Tab | | |
| 12 | Gear Tab | | |
| 13 | Pack Weight Widget | | |
| 14 | Admin Panel — Adventure | | |
| 15 | Admin Panel — Members | | |
| 16 | Admin Panel — Troop | | |
| 17 | MemberBar Interactions | | |
| 18 | Create Second Adventure | | |
| 19 | Navigation Flow | | |
| 20 | Theme Toggle | | |
| 21 | Sign Out & Re-Login | | |
| 22 | Member Removal | | |
| 23 | API Security | | |

Mark each as PASS ✅ or FAIL ❌ with specific issues noted.
