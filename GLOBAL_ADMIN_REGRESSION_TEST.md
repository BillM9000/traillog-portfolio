# TrailLog — Global Admin Automated Regression Test

You are testing the TrailLog web app at https://traillog.gracezero.ai as the Global Admin user (billm9000@gmail.com). The database has been reset to a clean state — no troops, no adventures, no other users. 48 Philmont itineraries are pre-seeded.

**IMPORTANT INSTRUCTIONS:**
- Execute each step sequentially. Take a screenshot after each action to verify results.
- After each SECTION, report PASS or FAIL with any issues found.
- If a step fails, note the failure, take a screenshot, and continue to the next step.
- For Google OAuth login: the user will complete the Google sign-in manually. Wait for the page to finish loading after login.
- When you need to verify text on the page, use `read_page` or `find` to check for the expected content.
- When you need to verify API responses, use `javascript_tool` to run fetch requests.
- Skip steps that require SSH/VPS access — note them as "SKIP (requires VPS)".

---

## SECTION 1: Health Check

**Step 1.1** — Navigate to `https://traillog.gracezero.ai/api/health`. Read the page content. Verify the JSON response contains `"status":"ok"` and `"version":"1.0.0"`. Take a screenshot.

**Step 1.2** — Use `javascript_tool` to run:
```js
fetch('/api/health').then(r => r.json()).then(d => JSON.stringify(d))
```
Verify the result contains status "ok".

---

## SECTION 2: Login & First Landing

**Step 2.1** — Navigate to `https://traillog.gracezero.ai`. Take a screenshot. Verify the login page renders with a "Sign in with Google" button visible.

**Step 2.2** — MANUAL STEP: The user will click "Sign in with Google" and complete authentication as billm9000@gmail.com. Wait 5 seconds for the page to load after login, then take a screenshot.

**Step 2.3** — After login, verify the page is the **Platform Admin** view (full-page, NOT a modal). Look for the heading text "Platform Admin" on the page. This is the correct landing page for a Global Admin with no troop memberships.

**Step 2.4** — Verify the header area shows:
- The text "Platform Admin" (with 🌐 emoji)
- A user avatar image
- A "Sign Out" button

**Step 2.5** — Verify there are 4 tab buttons visible: "Gear Catalog", "Troop Overview", "Affiliate", "Settings". Use `find` to locate each tab button text.

**Step 2.6** — Verify the **Troop Overview** tab is the active/selected tab (it should be the default when landing on Platform Admin in full-page mode).

**Step 2.7** — Check the browser console for errors using `read_console_messages` with pattern "error|Error|ERR". Report any errors found.

Take a screenshot of the full Platform Admin landing page.

---

## SECTION 3: Platform Admin Tabs — Empty State

**Step 3.1** — On the Troop Overview tab (should already be active), verify there are no troop rows listed. The page should show an empty state or no troop data. Take a screenshot.

**Step 3.2** — Click the **"Gear Catalog"** tab button. Wait 2 seconds for data to load. Take a screenshot. Verify gear items are displayed — look for category names like "Backpacking", "Clothing", "Cooking", "Navigation", "Safety", or similar gear category headings. The catalog should have items listed (76 items pre-seeded).

**Step 3.3** — Click the **"Affiliate"** tab button. Wait 1 second. Take a screenshot. Verify it renders without crashing — look for text like "Total Clicks" or "0" or some empty-state indication. No error should appear.

**Step 3.4** — Click the **"Settings"** tab button. Wait 1 second. Take a screenshot. Verify settings are displayed. Look for the text "schema_version" on the page. Verify it appears as a read-only label (not inside an editable text input).

**Step 3.5** — Click the **"Troop Overview"** tab to return to it.

---

## SECTION 4: Navigate to Lobby

**Step 4.1** — Find and click the **Sign Out** button (or the close/X button if available in the Platform Admin header). The Global Admin full-page view has a close action that transitions to the Lobby.

Note: If a Sign Out button is the only option, look for another button that would close/dismiss the Platform Admin view. If clicking "Sign Out" would log out, DON'T click it — instead look for a close (✕) or similar button.

After clicking, wait 2 seconds. Take a screenshot.

**Step 4.2** — Verify the **Lobby** view is now shown. Look for:
- The "TrailLog" logo/heading at the top
- Text that says "Welcome," followed by the user's name
- A "🌐 Platform Admin" button
- A "Sign Out" button
- Text "Available Troops" as a card heading
- Text "No troops yet. Create one to get started!" (the empty state message)
- A button that says "+ Create a New Troop"

Take a screenshot of the Lobby.

---

## SECTION 5: Create First Troop — Validation

**Step 5.1** — Click the **"+ Create a New Troop"** button. Wait 1 second. Take a screenshot. Verify a form appears with input fields for troop name, council, city, state, and a visibility toggle.

**Step 5.2** — Without filling any fields, click the **"Create"** button. Take a screenshot. Verify an error message appears — it should say "Troop name required" (in red text).

**Step 5.3** — Find the troop name input field (placeholder contains "Troop or crew name"). Type "Test Troop 1" into it. Now click **"Create"** again without filling council. Take a screenshot. Verify error: "Council is required".

**Step 5.4** — Find the council input field (placeholder contains "Council"). Type "Greater Test Council". Now click **"Create"** again without filling city. Take a screenshot. Verify error: "City is required".

**Step 5.5** — Find the city input field (placeholder contains "City"). Type "Springfield". Now click **"Create"** again without selecting a state. Take a screenshot. Verify error: "State is required".

**Step 5.6** — Verify the **Troop Visibility** toggle is visible. It should show two options: "Public" and "Private". Verify "Public" is currently selected/active (it should be the default).

**Step 5.7** — Click the **"Private"** button in the visibility toggle. Take a screenshot. Verify the helper text below changes — it should mention "hidden from search" and "invite" language.

**Step 5.8** — Click the **"Public"** button in the visibility toggle to switch back. Verify the helper text returns to mentioning "listed" and "search" language.

**Step 5.9** — Click the **"Cancel"** button. Verify the form collapses and the "+ Create a New Troop" button reappears. Take a screenshot.

---

## SECTION 6: Create First Troop — Success

**Step 6.1** — Click **"+ Create a New Troop"** to reopen the form.

**Step 6.2** — Fill in the form fields:
- Troop name: Type "Troop 614"
- Council: Type "Pathway to Adventure"
- City: Type "Buckner"
- State: Select "MO" from the state dropdown
- Leave visibility as "Public" (default)

Take a screenshot showing the filled form.

**Step 6.3** — Click the **"Create"** button. Wait 3 seconds for the page to transition. Take a screenshot.

**Step 6.4** — Verify the page has transitioned to the **AdventurePicker** view. Look for:
- The heading "Troop 614" at the top
- Sub-text showing "Pathway to Adventure · Buckner, MO" (council and location)
- Text "Select an adventure"
- A "Back" button
- A "🌐 Platform Admin" button
- A "Sign Out" button
- Text "No adventures yet. Create one to get started!" (empty adventure list)
- A "+ Create Adventure" button (dashed border)

Take a screenshot of the AdventurePicker.

---

## SECTION 7: Create Second Troop (Private)

**Step 7.1** — Click the **"Back"** button. Wait 2 seconds. Take a screenshot. Verify you're back on the **Lobby** view.

**Step 7.2** — Verify "Troop 614" now appears in the Available Troops list. Look for the text "Troop 614" and "Pathway to Adventure · Buckner, MO" and an "Enter →" button next to it.

**Step 7.3** — Click **"+ Create a New Troop"** again.

**Step 7.4** — Fill in the form:
- Troop name: "Crew 99"
- Council: "Secret Council"
- City: "Nowhere"
- State: Select "TX"
- Click the **"Private"** button in the visibility toggle

Take a screenshot of the filled form.

**Step 7.5** — Click **"Create"**. Wait 3 seconds. Take a screenshot. Verify you auto-entered "Crew 99" (AdventurePicker showing "Crew 99" with "Secret Council · Nowhere, TX").

**Step 7.6** — Click **"Back"** to return to Lobby. Wait 2 seconds. Take a screenshot.

**Step 7.7** — Verify BOTH troops appear in the Lobby:
- "Troop 614" with "Pathway to Adventure · Buckner, MO" and "Enter →" button
- "Crew 99" with "Secret Council · Nowhere, TX" and "Enter →" button (Global Admin can enter any troop without membership)

---

## SECTION 8: Platform Admin — Troop Overview (Populated)

**Step 8.1** — Click the **"🌐 Platform Admin"** button in the Lobby header. Wait 2 seconds. Take a screenshot. Verify the Platform Admin modal/overlay opens.

**Step 8.2** — Click the **"Troop Overview"** tab if not already active. Verify both troops are listed:
- "Troop 614" with a "Public" badge
- "Crew 99" with a "Private" badge

**Step 8.3** — Each troop row should show: member count, adventure count, and "Enter →" button. Take a screenshot.

**Step 8.4** — Click on the **"Troop 614"** row (not the "Enter →" button) to expand it. Wait 1 second. Take a screenshot. Verify a member list appears showing the Global Admin user (billm9000@gmail.com) with admin role.

**Step 8.5** — Click the row again to collapse it. Now click on **"Crew 99"** row to expand it. Verify similar member info. Take a screenshot.

**Step 8.6** — Close the Platform Admin modal by clicking the **"✕"** (close) button. Verify you return to the Lobby.

---

## SECTION 9: Create Adventure (Philmont)

**Step 9.1** — On the Lobby, click **"Enter →"** on "Troop 614". Wait 2 seconds. Verify you're on the AdventurePicker for "Troop 614". Take a screenshot.

**Step 9.2** — Click **"+ Create Adventure"**. Wait 1 second. Take a screenshot. Verify the adventure creation form appears.

**Step 9.3** — Verify the **Adventure Type** selector is visible — a 2×2 grid with 4 buttons:
- 🏔️ Philmont Scout Ranch — should be enabled and selected (highlighted border)
- 🛶 Northern Tier — should be greyed out with "COMING SOON" badge
- ⛵ Florida Sea Base — should be greyed out with "COMING SOON" badge
- 🧗 Summit Bechtel Reserve — should be greyed out with "COMING SOON" badge

**Step 9.4** — Verify the date labels are Philmont-specific. Look for these label texts: "DEPART HOME", "ARRIVE PHILMONT", "DEPART PHILMONT", "RETURN HOME" (they may be uppercase).

**Step 9.5** — Verify an itinerary dropdown is present with placeholder text "Select itinerary...".

**Step 9.6** — Use `read_page` to inspect the itinerary `<select>` element. Verify it contains `<optgroup>` elements labeled "12-Day Treks", "9-Day Treks", "7-Day Treks" with multiple options in each group.

**Step 9.7** — Fill in the form:
- Adventure name: Type "Philmont 2026" in the name input
- Depart Home: Set to "2026-07-01"
- Arrive Philmont: Set to "2026-07-03"
- Depart Philmont: Set to "2026-07-14"
- Return Home: Set to "2026-07-16"
- Itinerary: Use `read_page` to find the itinerary select element. Look for an option that contains "12-6" in its value attribute, or select an option from the "12-Day Treks" group.

Take a screenshot of the filled form.

**Step 9.8** — Click **"Create"**. Wait 3 seconds. Take a screenshot. Verify the app transitions to the **Main Adventure View** with tab navigation. Look for 5 tab buttons: "Training", "Best Windows", "Readiness", "Itinerary", "Gear".

---

## SECTION 10: Adventure Main View

**Step 10.1** — Take a screenshot of the full adventure view. Verify:
- Header area shows troop name and adventure name
- A member bar is visible showing the Global Admin user
- Tab buttons are visible: Training, Best Windows, Readiness, Itinerary, Gear
- An admin button (⚙️) is visible in the header

**Step 10.2** — Verify the **"Training"** tab is active (default view). The calendar component should be visible with month headers and date cells.

**Step 10.3** — Click on a future date cell in the calendar. Wait 1 second. Take a screenshot. Verify the cell changes appearance (fills with color), indicating availability was toggled.

**Step 10.4** — Click the **"Best Windows"** tab. Wait 1 second. Take a screenshot. The view should show some message about needing more members, or show limited analysis with only 1 member.

**Step 10.5** — Click the **"Readiness"** tab. Wait 1 second. Take a screenshot. Verify:
- A journey trail visualization is shown (waypoints from Trailhead to Summit)
- Four readiness categories are visible: training, gear, medical, admin
- Percentages should show **0%** for empty/incomplete categories (NOT 100%)

**Step 10.6** — Look for a "Trail Guide" legend section. If it's collapsible, click to expand it. Take a screenshot. Verify badge icons and waypoint descriptions are shown.

---

## SECTION 11: Itinerary Tab

**Step 11.1** — Click the **"Itinerary"** tab. Wait 2 seconds. Take a screenshot.

**Step 11.2** — Verify the selected itinerary loads and displays. Look for:
- A "Quick Reference" heading with the itinerary name
- Stats showing: total miles, duration (days), dry camps, staffed camps, rating
- Filter tag buttons: "All", "Staffed", "Dry Camp", "Layover", "Trail/Base"
- Day cards with day numbers, camp names, mileage, and type badges

**Step 11.3** — Click the **"Staffed"** filter button. Wait 1 second. Take a screenshot. Verify only days with "Staffed" type badges are shown (other day types are hidden).

**Step 11.4** — Click the **"All"** filter button to reset. Verify all days reappear.

**Step 11.5** — Click on a **day card** (e.g., Day 2 or Day 3) to expand it. Wait 1 second. Take a screenshot. Verify expanded content appears showing programs or other details.

**Step 11.6** — Find and click the **"Expand All"** button. Verify all day cards expand.

**Step 11.7** — Find and click the **"Collapse"** button. Verify all day cards collapse.

**Step 11.8** — Find and click the **"Print"** button. Wait 1 second. Take a screenshot. Verify a print/cheat-sheet modal appears with trek details.

**Step 11.9** — Close the print modal (find and click a close button or X). Verify you return to the Itinerary view.

---

## SECTION 12: Gear Tab

**Step 12.1** — Click the **"Gear"** tab. Wait 2 seconds. Take a screenshot.

**Step 12.2** — Verify gear items are displayed with category groupings. Look for category headers and individual gear items with status indicators.

**Step 12.3** — Look for two buttons above the gear list:
- "🌐 Global Admin" button (because user is global admin, not just gear admin)
- "🤖 AI Advisor" button

**Step 12.4** — Scroll down to find a gear item. Click on it to cycle its status. Take a screenshot. The item's status indicator should change (e.g., from unmarked to "needed").

**Step 12.5** — Click the **"🌐 Global Admin"** button. Wait 2 seconds. Take a screenshot. Verify the Platform Admin modal opens showing the Gear Catalog tab (and Troop Overrides tab should also be available since we're inside a troop context).

**Step 12.6** — Close the Platform Admin modal (click ✕). Return to the Gear tab.

---

## SECTION 13: Admin Panel

**Step 13.1** — Find the admin button (⚙️) in the Header and click it. Wait 1 second. Take a screenshot. Verify the **Admin Panel** slide-in opens.

**Step 13.2** — Verify the Adventure tab/section shows:
- An adventure type selector (2×2 grid with Philmont selected/highlighted)
- Date inputs with the dates you entered during creation
- An itinerary dropdown with the current selection
- A status field (active)
- A "Save" button

**Step 13.3** — Find the itinerary dropdown in the Admin Panel. Change the selection to a different itinerary (pick any from a different group, e.g., a 9-Day trek option). Take a screenshot.

**Step 13.4** — Click the **"Save"** button. Wait 2 seconds. Take a screenshot. Verify a success toast message appears (something like "Adventure saved").

**Step 13.5** — Close the Admin Panel (click ✕ or the close button). Click the **"Itinerary"** tab. Wait 2 seconds. Take a screenshot. Verify the **new itinerary** is now displayed (different name/stats from before). This confirms the itinerary change persisted.

**Step 13.6** — Open the Admin Panel again (click ⚙️). Look for the **Troop** tab/section in the Admin Panel and click it. Take a screenshot. Verify troop info is editable:
- Troop name input
- Council input (max 60 chars)
- City input
- State dropdown
- Description input
- Visibility toggle (Public/Private)

**Step 13.7** — Close the Admin Panel.

---

## SECTION 14: Member Management

**Step 14.1** — Open the Admin Panel (⚙️). Look for the members/member management section. Take a screenshot.

**Step 14.2** — Verify the Global Admin (billm9000@gmail.com) is listed as the sole adventure member with "admin" role.

**Step 14.3** — Look for a "manual member" or "Add manual member" input field. Type **"Lincoln McCoy"** and click the Add button. Wait 1 second. Take a screenshot.

**Step 14.4** — Verify "Lincoln McCoy" appears in the member list with a "Scout" badge and a "manual" indicator.

**Step 14.5** — Close the Admin Panel. Look at the **MemberBar** (the member strip near the top of the page). Take a screenshot. Verify Lincoln McCoy now appears there as a member with an "S" (Scout) badge.

**Step 14.6** — Open the Admin Panel again. Find Lincoln McCoy's row and click the **"Remove"** button. Wait 1 second. Take a screenshot. Verify Lincoln disappears from the member list.

**Step 14.7** — Close the Admin Panel. Verify Lincoln is also gone from the MemberBar. Take a screenshot.

**Step 14.8** — Open Admin Panel. Re-add "Lincoln McCoy" as a manual member. Verify he reappears. Take a screenshot.

**Step 14.9** — Close the Admin Panel.

---

## SECTION 15: Create Second Adventure via Admin Panel

**Step 15.1** — Open the Admin Panel (⚙️). Scroll down to find a **"Create New Adventure"** section or button. Take a screenshot.

**Step 15.2** — If there's a creation form, fill in:
- Adventure name: "Fall Training Trek"
- Skip dates (leave blank)
- Select a 7-Day trek itinerary from the dropdown

Take a screenshot.

**Step 15.3** — Click **"Create"**. Wait 3 seconds. Take a screenshot. Verify a success toast appears. The Admin Panel should close and the view should enter the new adventure.

**Step 15.4** — Click the **"Itinerary"** tab. Wait 2 seconds. Take a screenshot. Verify the 7-day itinerary is displayed (fewer day cards than the 12-day trek).

**Step 15.5** — Navigate back to the AdventurePicker. Find and click a "Back" button or similar navigation. Wait 2 seconds. Take a screenshot. Verify 2 adventures are listed, each with a 🏔️ icon.

---

## SECTION 16: Itinerary Empty State & Selection

**Step 16.1** — On the AdventurePicker, click **"+ Create Adventure"**. Fill in only the name: "No Itin Test" — do NOT select an itinerary, do NOT set dates. Click **"Create"**. Wait 3 seconds.

**Step 16.2** — Click the **"Itinerary"** tab. Wait 2 seconds. Take a screenshot. Verify the **empty state** is shown:
- A 🗺️ map emoji
- Heading: "No itinerary selected"
- Text for admins: "Choose a trail itinerary to see daily route details, camps, and program highlights."
- A grouped dropdown (select element) with options for 12-Day, 9-Day, and 7-Day treks

**Step 16.3** — Select a **9-Day trek** itinerary from the dropdown. Wait 2 seconds. Take a screenshot. Verify the itinerary loads immediately — day cards, stats, and filter buttons appear.

**Step 16.4** — Reload the page (navigate to `https://traillog.gracezero.ai` then navigate back into the troop and adventure). Click the Itinerary tab. Verify the itinerary still displays (persisted in the database).

---

## SECTION 17: Platform Admin — Gear Catalog CRUD

**Step 17.1** — Navigate to the Lobby (Back → Back from adventure). Click **"🌐 Platform Admin"**. Click the **"Gear Catalog"** tab. Wait 2 seconds. Take a screenshot.

**Step 17.2** — Find the search input. Type **"backpack"**. Wait 1 second. Take a screenshot. Verify the list filters to show only items matching "backpack".

**Step 17.3** — Clear the search input. Verify the full catalog reappears.

**Step 17.4** — Find and click the **"+ Add Item"** button (or similar add button). Wait 1 second. Take a screenshot. Verify an item edit modal/form opens.

**Step 17.5** — Fill in the new item form:
- Name: "Test Widget"
- Category: "Test"
- Priority: Select "optional"
- Weight: "5"

Take a screenshot.

**Step 17.6** — Click **"Save"** (or the submit button). Wait 1 second. Verify the item is added. Search for "Test Widget" in the catalog search. Take a screenshot. Verify it appears.

**Step 17.7** — Find the "Test Widget" item and click its **edit** button (pencil icon or "Edit" text). Wait 1 second. Verify the edit modal opens with current values pre-filled.

**Step 17.8** — Change the name to "Super Widget" and weight to "10". Click **Save**. Wait 1 second. Take a screenshot. Verify the updated values appear in the catalog.

**Step 17.9** — Find "Super Widget" and click its **delete/archive** button. Wait 1 second. Take a screenshot. Verify the item disappears from the catalog list.

**Step 17.10** — Close the Platform Admin modal.

---

## SECTION 18: Platform Admin — Troop Delete

**Step 18.1** — Open Platform Admin (🌐 button). Click **"Troop Overview"** tab. Take a screenshot. Verify both troops listed.

**Step 18.2** — Click **"Enter →"** on "Crew 99". Wait 2 seconds. Take a screenshot. Verify you're on the AdventurePicker for "Crew 99" showing "Secret Council · Nowhere, TX".

**Step 18.3** — Click **"Back"** to return to Lobby. Open **Platform Admin** again. Go to **Troop Overview**.

**Step 18.4** — Find the "Crew 99" troop row. Look for a **"Delete Troop"** button and click it. Wait 1 second. Take a screenshot. Verify a confirmation modal appears asking you to type the troop name.

**Step 18.5** — Type **"Crew 99"** in the confirmation input. Click the confirm/delete button. Wait 2 seconds. Take a screenshot.

**Step 18.6** — Verify "Crew 99" has disappeared from the Troop Overview list. Only "Troop 614" should remain.

**Step 18.7** — Close Platform Admin. Verify the Lobby no longer shows "Crew 99". Take a screenshot.

---

## SECTION 19: Platform Settings & Affiliate

**Step 19.1** — Open Platform Admin. Click the **"Settings"** tab. Wait 1 second. Take a screenshot.

**Step 19.2** — Verify `schema_version` is displayed and is NOT editable (shown as a read-only label, not an input field).

**Step 19.3** — Click the **"Affiliate"** tab. Wait 1 second. Take a screenshot. Verify it renders with empty/zero data — no crash or error. Look for "0" total clicks or an empty state.

---

## SECTION 20: API Security Verification

Use `javascript_tool` for each of these tests. You do NOT need to open new browser windows.

**Step 20.1** — Run:
```js
fetch('/api/admin/troops').then(r => r.status + ' ' + r.statusText)
```
Verify result is "200 OK" (Global Admin has access).

**Step 20.2** — Run:
```js
fetch('/api/admin/settings').then(r => r.status + ' ' + r.statusText)
```
Verify result is "200 OK".

**Step 20.3** — Run:
```js
fetch('/api/admin/users').then(r => r.json()).then(d => 'Users: ' + d.length)
```
Verify it returns a count (should be 1 — just the Global Admin).

**Step 20.4** — Run:
```js
fetch('/api/itineraries').then(r => r.json()).then(d => 'Itineraries: ' + d.length)
```
Verify result is "Itineraries: 48".

**Step 20.5** — Run:
```js
fetch('/api/itineraries/invalid!@#').then(r => r.status + ': ' + r.statusText)
```
Verify result is "400" (Bad Request — not a server error or stack trace).

---

## SECTION 21: Itinerary String ID Regression Test

This tests the fix for a bug where itinerary IDs like "12-6" were being mangled by parseInt().

**Step 21.1** — Run via `javascript_tool`:
```js
fetch('/api/itineraries/12-6').then(r => r.status + ' ' + r.statusText)
```
Verify result is **"200 OK"** (NOT 400 or 404).

**Step 21.2** — Run:
```js
fetch('/api/itineraries/12-6').then(r => r.json()).then(d => d.name)
```
Verify it returns an itinerary name string (not null/undefined/error).

**Step 21.3** — Run:
```js
fetch('/api/itineraries/9-1').then(r => r.json()).then(d => d.name)
```
Verify it returns a name.

**Step 21.4** — Run:
```js
fetch('/api/itineraries/7-12').then(r => r.json()).then(d => d.name)
```
Verify it returns a name.

**Step 21.5** — Run:
```js
fetch('/api/itineraries/99-99').then(r => r.status)
```
Verify result is **404** (valid format, but doesn't exist).

**Step 21.6** — Run:
```js
fetch('/api/itineraries/invalid').then(r => r.status)
```
Verify result is **400** (invalid format).

---

## SECTION 22: Theme Toggle

**Step 22.1** — Navigate into an adventure (Lobby → Enter Troop 614 → select "Philmont 2026" adventure). Wait for it to load. Take a screenshot showing the current theme (light or dark).

**Step 22.2** — Look for a theme toggle button (☀️ or 🌙 icon, usually in the header or profile area). Click it. Wait 1 second. Take a screenshot. Verify the entire page re-themes — background color, text color, and card colors should all change.

**Step 22.3** — Click the theme toggle again to switch back. Take a screenshot. Verify it returns to the original theme.

---

## SECTION 23: Navigation Flow

**Step 23.1** — From the adventure Main View, find and click a **"Back"** button (in the header). Wait 2 seconds. Take a screenshot. Verify you're on the **AdventurePicker** showing all adventures for Troop 614.

**Step 23.2** — Verify the AdventurePicker shows multiple adventures (you created at least 3). The adventures should NOT auto-select (because you navigated back).

**Step 23.3** — Click **"Back"** again. Wait 2 seconds. Take a screenshot. Verify you're on the **Lobby**.

**Step 23.4** — From Lobby, click **"🌐 Platform Admin"**. Verify Platform Admin opens as a modal. Close it (✕). Verify you're still on the Lobby.

**Step 23.5** — From Lobby, click **"Enter →"** on "Troop 614". Verify you go to AdventurePicker. Click the **"🌐 Platform Admin"** button. Verify Platform Admin opens as a modal. Close it. Verify you're still on AdventurePicker.

**Step 23.6** — Click **"Sign Out"**. Wait 2 seconds. Take a screenshot. Verify you're back on the login page.

---

## SECTION 24: Final Summary

After completing all sections, compile a results table:

| Section | Description | Result | Issues |
|---------|-------------|--------|--------|
| 1  | Health Check | | |
| 2  | Login & First Landing | | |
| 3  | Platform Admin Tabs — Empty State | | |
| 4  | Navigate to Lobby | | |
| 5  | Create First Troop — Validation | | |
| 6  | Create First Troop — Success | | |
| 7  | Create Second Troop (Private) | | |
| 8  | Platform Admin — Troop Overview (Populated) | | |
| 9  | Create Adventure (Philmont) | | |
| 10 | Adventure Main View | | |
| 11 | Itinerary Tab | | |
| 12 | Gear Tab | | |
| 13 | Admin Panel | | |
| 14 | Member Management | | |
| 15 | Create Second Adventure | | |
| 16 | Itinerary Empty State & Selection | | |
| 17 | Gear Catalog CRUD | | |
| 18 | Troop Delete | | |
| 19 | Settings & Affiliate | | |
| 20 | API Security Verification | | |
| 21 | Itinerary String ID Regression | | |
| 22 | Theme Toggle | | |
| 23 | Navigation Flow | | |

Mark each as PASS ✅ or FAIL ❌ with specific issues noted.
