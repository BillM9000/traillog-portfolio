# TrailLog Full Regression Test

## Test Accounts

| Alias | Email | Role | Notes |
|-------|-------|------|-------|
| **GLOBAL ADMIN** | billm9000@gmail.com | Platform Admin only | Google OAuth. No troop membership. Lands on Platform Admin. |
| **TROOP LEADER** | billmccoy48@gmail.com | Troop admin, trekker | Google OAuth. Creates troop, manages adventure. Parent of Lincoln4 + Quinn. |
| **SCOUT (email)** | beyondpong@outlook.com | Scout | Quinn McCoy. Invited by email. Has email/password OR Google auth. |
| **MOM (email)** | tracymccoy08@gmail.com | Adult, support (not trekking) | Tracy McCoy. Joins or is invited. Parent of Lincoln4 + Quinn. |
| **SCOUT (manual)** | *(none)* | Scout | Lincoln4 McCoy. Manually added by troop leader. No account. |

---

## SECTION 1: Auth & Navigation

> **User: TROOP LEADER** (billmccoy48@gmail.com)

1.1  Open https://traillog.gracezero.ai — app loads, no console errors
1.2  Click "Sign in with Google" — redirects to Google, returns to app, user name + avatar shown
1.3  Click profile dropdown → Sign Out → returns to login page
1.4  Re-login with Google — session restored, lands on last view
1.5  Open /api/health in browser — returns `{"status":"ok","version":"1.0.0",...}`
1.6  Open browser DevTools → Network → reload page — verify security headers present on every response:
     - `content-security-policy` (should include `style-src 'unsafe-inline'`)
     - `x-frame-options: SAMEORIGIN`
     - `x-content-type-options: nosniff`
     - `strict-transport-security` (max-age present)
     - `referrer-policy: no-referrer`
1.7  Verify Google avatar image loads (not blocked by CSP)
1.8  Verify Google Fonts render correctly (Source Serif 4 for headings, DM Sans for body text)
1.9  Check browser console for any CSP violation errors — should be zero

---

## SECTION 2: Email/Password Auth

> **User: NEW TEST USER** (use a throwaway email you control)

2.1  Sign out. Click "Sign up with email" (or equivalent)
2.2  Try password with 7 characters — should get error "8+ chars"
2.3  Try password with 8 characters, valid email — should succeed, "Check your email to verify"
2.4  Check email inbox for verification link — click it — should verify account
2.5  Login with email/password — should work, land in app (ProfileSetup if first time)
2.6  Login with wrong password — should get "Invalid email or password" (not a SQL error)
2.7  Login with unverified email — should get "Please verify your email first"
2.8  Attempt 21+ rapid login attempts — should get rate limited ("Too many attempts")

---

## SECTION 3: Lobby & Troop Management

> **User: TROOP LEADER** (billmccoy48@gmail.com)

3.1  From Lobby, click "+ Create a New Troop"
3.2  Leave council blank, submit — should fail validation ("Council is required")
3.3  Create troop with council "Pathway to Awesome", name "Troop 444", city "Buckner", state "IL", Public — should succeed and auto-enter troop
3.4  Click Back — should return to Lobby (not AdventurePicker)
3.5  Verify new troop appears in Lobby listing with council + location shown
3.6  Create a second troop, set to **Private** — verify it appears for you in Lobby

> **User: MOM** (tracymccoy08@gmail.com) — *to test visibility*

3.7  Login as MOM — verify Private troop is NOT visible in her Lobby
3.8  The Public troop (Troop 444) SHOULD be visible — click "Request to Join"
3.9  Verify "Pending" badge shown for MOM in Lobby

> **User: TROOP LEADER** (billmccoy48@gmail.com)

3.10 Return to troop. Open Admin Panel → Members — verify MOM's pending request visible
3.11 Approve MOM — she should auto-join all active adventures (no separate "Add" step needed)

---

## SECTION 4: Adventure Creation & Types

> **User: TROOP LEADER** (billmccoy48@gmail.com)

4.1  Enter Troop 444 → AdventurePicker — verify troop name, council, and location shown in header
4.2  Click "+ Create Adventure" — verify adventure type selector: 2×2 grid with Philmont enabled, 3 others greyed "Coming Soon"
4.3  Select Philmont — verify dynamic date labels: Depart Home, Arrive Philmont, Depart Philmont, Return Home
4.4  Fill all 4 dates + name (e.g. "Philmont 2026") — create adventure
4.5  Verify adventure appears in list with 🏔️ icon
4.6  Enter the adventure — should see MainView with all 5 tabs (Training, Best Windows, Readiness, Itinerary, Gear)
4.7  Verify Header shows smart countdown appropriate to current date vs trek dates

---

## SECTION 5: Member Management & Manual Members

> **User: TROOP LEADER** (billmccoy48@gmail.com)

5.1  MemberBar — verify TROOP LEADER shown with ADULT badge + "trekking" participation
5.2  Open Admin Panel → Members tab
5.3  Add manual member: name "Lincoln4 McCoy" — verify he appears in member list with SCOUT badge + small "manual" tag
5.4  Verify Lincoln4 appears in MemberBar as "Scout" (NOT "Manual")
5.5  Remove Lincoln4 — verify he disappears from MemberBar
5.6  Re-add Lincoln4 — he's back

---

## SECTION 6: Invite Flow (Email)

> **User: TROOP LEADER** (billmccoy48@gmail.com)

6.1  In Admin Panel → Members, enter beyondpong@outlook.com in invite field, click Send
6.2  Verify invitation appears in pending invitations list

> **User: SCOUT** (beyondpong@outlook.com — Quinn)

6.3  Check email — verify invite email received
6.4  Verify email text mentions BOTH Google and email/password auth options (not Google-only)
6.5  Click invite link — should redirect to login page (not directly to Google OAuth)
6.6  Sign in (Google or email/password) — should auto-join troop AND adventure (no admin approval needed for invited users)
6.7  If first-time user, verify ProfileSetup appears to choose Adult/Scout
6.8  After choosing Scout, verify Quinn appears in adventure MemberBar with SCOUT badge

> **User: TROOP LEADER** (billmccoy48@gmail.com)

6.9  Verify Quinn visible in Admin Panel member list (approved, no manual approval needed)

---

## SECTION 7: Multi-Scout Linking (Up to 3)

> **User: TROOP LEADER** (billmccoy48@gmail.com)

**Link TROOP LEADER to 2 scouts:**

7.1  In Admin Panel → Members, find TROOP LEADER (billmccoy48) — should show "Link to scout..." dropdown
7.2  Select Lincoln4 McCoy from dropdown — verify linked scout tag appears with × remove button
7.3  Verify dropdown now says "+ Add scout" and Lincoln4 is excluded from the options
7.4  Select Quinn McCoy from dropdown — verify second tag appears
7.5  Verify MemberBar shows "Parent of Lincoln4 McCoy, Quinn McCoy" next to TROOP LEADER
7.6  Verify dropdown still shows "+ Add scout" (2 of 3 max used)

**Set up MOM as support and link to same 2 scouts:**

7.7  Verify MOM (tracymccoy08) is in the member list (auto-added when approved in Section 3)
7.8  Change MOM's participation to "Support" — verify MemberBar splits into Trekking/Support sections
7.9  In MOM's row, link to Lincoln4 McCoy — tag appears
7.10 Link to Quinn McCoy — second tag appears
7.11 Verify MemberBar shows "Parent of Lincoln4 McCoy, Quinn McCoy" next to MOM in Support section

**Test unlink:**

7.12 Click × on Lincoln4 tag for MOM — verify tag removed, only Quinn remains
7.13 Re-add Lincoln4 — verify tag reappears
7.14 Verify max 3: if you try to add a 3rd scout (if one exists), it should allow it. A 4th should not show the dropdown.

---

## SECTION 8: Member Remove + Link Cascade

> **User: TROOP LEADER** (billmccoy48@gmail.com)

8.1  Remove Quinn from adventure (click Remove button) — should succeed (no error)
8.2  Verify Quinn disappears from MemberBar
8.3  Verify TROOP LEADER's linked scouts updated: only Lincoln4 remains (Quinn auto-removed from linked_scouts)
8.4  Verify MOM's linked scouts updated: only Lincoln4 remains
8.5  Re-add Quinn from "Add from Troop" section — verify he reappears
8.6  Re-link Quinn to TROOP LEADER and MOM

**Manual member remove cascade:**

8.7  Remove Lincoln4 (manual member) — verify he disappears
8.8  Verify Lincoln4 auto-removed from TROOP LEADER's and MOM's linked_scouts
8.9  Re-add Lincoln4 and re-link as needed

---

## SECTION 9: Training Calendar & Best Windows

> **User: TROOP LEADER** (billmccoy48@gmail.com)

9.1  Training tab — calendar renders for appropriate month range
9.2  Click a date — toggles availability for your user
9.3  Drag across multiple dates — selects range
9.4  Verify heatmap colors update based on selections
9.5  Best Windows tab — verify ranked training windows appear based on availability
9.6  Verify top individual dates shown
9.7  Verify member summary table shows each member's availability count

---

## SECTION 10: Readiness & Gamification

> **User: TROOP LEADER** (billmccoy48@gmail.com)

10.1  Readiness tab — verify journey trail with waypoints (Trailhead → Summit)
10.2  Verify 4 readiness categories shown (training, gear, medical, admin)
10.3  With no items completed — readiness should be 0% for empty categories (NOT 100%)
10.4  Complete a few checklist items — verify percentage updates
10.5  Verify crew readiness in Header updates to match
10.6  Trail Guide legend — expand it, verify badge icons + waypoint descriptions shown
10.7  If all items in a category are completed for a member — verify trail badge auto-awards
10.8  MemberBar — verify trail badge icons appear next to members who earned them

---

## SECTION 11: Gear & Pack Weight

> **User: TROOP LEADER** (billmccoy48@gmail.com)

11.1  Gear tab — verify 76 catalog items load with categories
11.2  Filter by category — verify list filters correctly
11.3  Filter by priority (essential/recommended/optional) — verify correct
11.4  Click a gear item — cycle through states: needed → owned → packed
11.5  Verify pack weight widget updates when items are marked owned/packed (only if custom weight entered)
11.6  Pack weight formula: base weight + food (1.75 × 12 = 21 lbs) + water (4.4 lbs)
11.7  Status filter — filter to "needed only" or "packed only" — verify
11.8  Search/filter by name — verify
11.9  Affiliate buy links — should be empty (product options not yet populated) — this is expected
11.10 AI Gear Chat button — should show paywall for free-tier troops — this is expected

---

## SECTION 12: Itinerary & Print

> **User: TROOP LEADER** (billmccoy48@gmail.com)

12.1  Itinerary tab — verify 12-day itinerary renders with day cards
12.2  Each day shows: camp name, mileage, elevation, programs, water sources
12.3  Baldy Summit Guide section visible
12.4  Key Training Priorities section visible
12.5  Prohibited Items section visible
12.6  Click Print button — PrintCheatSheet opens
12.7  Verify pocket card view renders correctly
12.8  Verify full summary view renders correctly
12.9  Browser print dialog works (Ctrl+P)

---

## SECTION 13: Admin Panel (Troop Admin)

> **User: TROOP LEADER** (billmccoy48@gmail.com)

13.1  Click Admin Panel button in Header — slide-in panel opens
13.2  Adventure settings: edit all 4 dates — verify save works
13.3  Verify date change email sent (check logs or email inbox)
13.4  Member management: change a member's role (admin ↔ member)
13.5  Change member user_type (adult ↔ scout) — verify badge updates in MemberBar
13.6  Troop sub-tab: edit council, city/state, visibility — verify save
13.7  Return to Lobby — verify edited values reflected in troop listing
13.8  Verify pending members visible in Admin Panel member list (if any)

---

## SECTION 14: Global Admin — Platform Admin

> **User: GLOBAL ADMIN** (billm9000@gmail.com)

**Landing experience (no troop memberships):**

14.1  Login as GLOBAL ADMIN — should land **directly on Platform Admin** full-page view (NOT the Lobby)
14.2  Verify header shows "🌐 Platform Admin", avatar, name, and Sign Out button
14.3  Verify default tab is **Troop Overview** (not Gear Catalog)
14.4  Verify 4 tabs available: Gear Catalog, Troop Overview, Affiliate Analytics, Platform Settings

**Troop Overview tab:**

14.5  Verify all troops listed with member count, adventure count, pending count, Public/Private badge
14.6  Verify private troops visible (global admin sees all)
14.7  Each troop row has an **"Enter →"** button
14.8  Click "Enter →" on Troop 444 — should navigate into that troop's AdventurePicker
14.9  Verify troop name, council, location shown correctly in AdventurePicker header
14.10 Verify GLOBAL ADMIN is treated as admin (can see Admin Panel button, create adventures, etc.)
14.11 Click Back — should return to Platform Admin (or Lobby)

**Troop management (expand a troop row):**

14.12 Click a troop row to expand — verify member list loads
14.13 Pending members shown first with Approve/Deny buttons
14.14 Approved members have Remove button
14.15 Approve a pending member — verify status updates, member stays visible
14.16 Delete troop: click "Delete Troop", type troop name to confirm — troop removed

**Other tabs:**

14.17 Gear Catalog tab — verify item list loads, can add/edit/delete items
14.18 Add a product option to a gear item — verify it saves
14.19 Platform Settings tab — verify key-value editor works (read + write)
14.20 Verify `schema_version` is read-only (cannot be edited)
14.21 Affiliate Analytics tab — verify renders (even if empty data)

> **User: TROOP LEADER** (billmccoy48@gmail.com)

**Global Admin from within a troop:**

14.22 Login as TROOP LEADER (who is NOT global admin) — verify NO "🌐 Platform Admin" button in header
14.23 Verify TROOP LEADER sees only "⚙️ Gear Admin" button (troop overrides, not full global admin)

---

## SECTION 15: Security Verification

> **User: Any / VPS access**

15.1  Verify all API responses include security headers (spot check 3-4 endpoints in DevTools Network tab)
15.2  Try accessing `/api/admin/settings` without being global admin — should get 403
15.3  Try accessing `/api/adventures/1/members` without being a member — should get 403
15.4  Trigger a server error (if possible) — verify response says "Something went wrong" (not a SQL error message)
15.5  On VPS: `docker exec crew614 whoami` — should say `appuser` (not root)
15.6  On VPS: `docker logs crew614 --tail 5` — should show "Performance indexes ensured" and "TrailLog running on port 3614"
15.7  Rapid-fire 101+ API requests — verify rate limiting kicks in
15.8  Verify no PII logged in `docker logs crew614`

---

## SECTION 16: Dark/Light Theme & Responsive

> **User: TROOP LEADER** (billmccoy48@gmail.com)

16.1  Toggle theme (dark ↔ light) — verify all components re-theme correctly
16.2  Verify theme preference persists across page reload (stored in localStorage)
16.3  Resize browser to mobile width — verify layout remains usable
16.4  Verify no horizontal scroll on mobile viewport

---

## Schema Version

Current: **v10**

Key schema features to verify exist:
- `adventure_members.linked_scouts` (TEXT, JSON array, max 3)
- `adventure_members.adventure_type` on adventures table (philmont/northern_tier/sea_base/summit)
- `troops.council`, `troops.location`, `troops.is_public`
- `adventure_members.is_manual`, `adventure_members.manual_name`
- Helmet security headers active
- `safeError()` wrapping all catch blocks (production-safe error messages)
- Non-root Docker container (`appuser` uid 1001)
- Password minimum 8 characters
