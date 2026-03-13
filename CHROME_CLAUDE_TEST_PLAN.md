# TrailLog Chrome Claude Automated Test Plan

## Prerequisites
- User is already logged in as billm9000@gmail.com (global admin) on https://traillog.gracezero.ai
- Database has been reset (clean slate — no troops, adventures, or members)
- DO NOT log out at any point during testing
- DO NOT print anything or trigger print dialogs
- DO NOT download files (skip CSV export button clicks)
- Minimize screenshots — only take them when verifying a critical visual state
- After each action, wait for the UI to settle before proceeding

---

## Phase 1: First-Time User Setup (Lobby)

### 1.1 Your on lobby page already nothing to do here. Bill logged you in

### 1.2 Create a Troop
- Click "Create New Troop" button
- Fill in:
  - Troop Name: `Troop 614`
  - Council: `Sam Houston Area Council`
  - City: `Houston`
  - State: Select `TX`
- Leave visibility as Public (default)
- Skip logo upload
- Click "Create" button
- Verify: troop appears in the list
- Click "Enter" to go into the troop

### 1.3 Create an Adventure
- Should see adventure creation prompt or empty state
- Fill in:
  - Crew Name: `Crew 614-A`
- Set dates:
  - Depart: `2026-05-12`
  - Arrive: `2026-05-14`
  - Return: `2026-05-24`
  - Home: `2026-05-26`
- Click Save/Create
- Verify: adventure is created and main app view loads

---

## Phase 2: Header & Navigation

### 2.1 Verify Header Display
- Take one screenshot to verify header renders correctly
- Verify: troop name, crew name, date range, countdown, and member count visible

### 2.2 Theme Toggle
- Click the sun/moon icon to toggle dark mode
- Verify: background color changes
- Click again to toggle back to light mode

### 2.3 Logo Lightbox
- Click the troop logo in the header
- Verify: lightbox modal opens with large logo and troop info
- Click the X button or backdrop to close

### 2.4 Trail Guide Modal
- Click the progress card (the frosted glass area with % and waypoint name)
- Verify: Trail Guide modal opens showing waypoints and badges
- Close the modal

### 2.5 Tab Navigation
- Click each of the 6 tabs in order and verify the view changes:
  1. Training
  2. Best Windows
  3. Readiness
  4. Itinerary
  5. Gear
  6. Reports
- Click back to "Training" tab

---

## Phase 3: Admin Panel

### 3.1 Open Admin Panel
- Click the settings gear icon in the header
- Verify: AdminPanel modal opens

### 3.2 Adventure Settings
- Verify crew name field shows "Crew 614-A"
- Verify date fields are populated
- Close admin panel

### 3.3 Set Itinerary
- Reopen Admin Panel if closed
- Find the Itinerary dropdown/selector
- Select itinerary "12-20" (or the first 12-day option available)
- Confirm the itinerary change when prompted
- Close admin panel
- Verify: Itinerary tab now shows route data

---

## Phase 4: Calendar / Training Dates

### 4.1 Navigate to Training Tab
- Click "Training" tab if not already there
- Verify: calendar grid is visible with "Training Hike Coordinator" title

### 4.2 Select Training Dates
- Click on 5 different weekend dates in the visible months
- Each click should cycle the date through availability states
- Verify: dates show colored indicators after clicking

### 4.3 Bulk Select
- Click "Select Weekends" button (if visible)
- Verify: multiple dates now show as selected
- Click "Clear All Dates" button
- Verify: all dates cleared

### 4.4 Re-select Some Dates
- Click on 6 dates spread across the calendar (mix of weekdays and weekends)
- These will be used for Best Windows analysis

---

## Phase 5: Best Windows Tab

### 5.1 View Analysis
- Click "Best Windows" tab
- Verify: shows training window recommendations based on selected dates
- Verify: at least one recommendation card is visible (or "not enough data" message)

### 5.2 Schedule a Training Event
- Look for "Schedule Training" or similar button
- Click to open the scheduling form
- Fill in:
  - Date: pick one of the dates you selected in Phase 4
  - Time of Day: select "All Day"
  - Time Label: `9:00 AM`
  - Location: `Memorial Park`
  - Notes: `Loaded pack hike - bring 30lb pack`
- Click "Schedule & Notify Crew" button
- Verify: event card appears in the training events list

### 5.3 RSVP to Training Event
- Find the training event card just created
- Click the ThumbsUp (Going) button
- Verify: RSVP status updates (should show "1 going")
- Click ThumbsDown (Can't Make It) to toggle
- Verify: status changes to "1 can't"
- Click ThumbsUp again to switch back to Going

---

## Phase 6: Readiness Tab

### 6.1 View Readiness Dashboard
- Click "Readiness" tab
- Verify: journey progress trail is visible with 5 waypoints
- Verify: 4 category cards visible (Training, Gear, Medical, Admin)

### 6.2 Check Off Training Skills
- Find the Training category section
- Check off 3 training skills by clicking their checkboxes:
  - "Loaded Pack Hike"
  - "Elevation / Hill Training"
  - "Water Carry & Purification"
- Verify: Training % increases from 0%

### 6.3 Check Off Medical Items
- Find the Medical category section
- Check off 2 medical items:
  - "Health Form Part A"
  - "Health Form Part B"
- Verify: Medical % increases

### 6.4 Check Off Admin Tasks
- Find the Admin category section
- Check off 2 admin tasks:
  - "Participant Agreement"
  - "Emergency Contact Card"
- Verify: Admin % increases

### 6.5 Verify Overall Readiness
- Check the header progress ring — should now be > 0%
- The overall % should reflect the average of all 4 categories

---

## Phase 7: Gear Tab

### 7.1 Navigate to Gear
- Click "Gear" tab
- Verify: gear catalog is visible with categories and items

### 7.2 Gear Filters
- Click a category filter pill (e.g., "Footwear" or "Clothing")
- Verify: list filters to that category
- Click "All" to reset
- Click "Essential" priority filter
- Verify: only essential items shown
- Click "All" to reset

### 7.3 Search Gear
- Type "boots" in the search box
- Verify: list filters to show boot-related items
- Clear the search box

### 7.4 Set Gear Status
- Find "Hiking Boots (broken in)" and click Need (first state)
- Click again for Own (second state)
- Click again for Packed (third state)
- Verify: item shows "Packed" status with green indicator

### 7.5 Mark Multiple Items
- Set these items to "Owned":
  - "Backpack 60-75L"
  - "Rain Jacket (packable)"
  - "Sleeping Bag (30F rated)"
  - "Headlamp + Extra Batteries"
- Set these items to "Packed":
  - "Merino Wool Socks (3-4 pairs)"
  - "Hiking Boots (broken in)" (should already be packed)
- Verify: gear summary shows updated counts (packed/owned/need)

### 7.6 Verify Pack Weight Widget
- Verify: PackWeightWidget shows a weight calculation
- Should include base weight + food + water breakdown

### 7.7 Gear Guide
- Find and click the "Gear Guide" collapsible card
- Verify: it expands showing sharing types explanation
- Click again to collapse

---

## Phase 8: Itinerary Tab

### 8.1 View Itinerary
- Click "Itinerary" tab
- Verify: itinerary quick reference card is visible with stats (miles, days, rating)

### 8.2 Expand Day Details
- Click "Expand All" button
- Verify: all day cards expand showing details (camp, programs, elevation)
- Click "Collapse" button
- Verify: all days collapse

### 8.3 Filter by Type
- If type filter buttons exist (Staffed, Dry Camp, etc.), click one
- Verify: days filter to that type
- Click to clear filter

---

## Phase 9: Reports Tab

### 9.1 View Reports Guide
- Click "Reports" tab
- Verify: report cards are visible showing available reports
- Verify: admin reports visible (Crew Roster, Gear Readiness Matrix, Pack Weight Summary, etc.)
- Verify: personal reports visible (My Gear Checklist, Still Need List, Itinerary Cheat Sheet)
- NOTE: Do NOT click any Print or CSV buttons — just verify they exist

---

## Phase 10: Profile Page

### 10.1 Open Profile
- Click the profile icon/button in the header to open dropdown
- Click "View Profile" button
- Verify: ProfilePage loads with account info

### 10.2 Verify Profile Info
- Verify: email shows billm9000@gmail.com
- Verify: auth badge shows "GOOGLE"
- Verify: role shows "Adult"
- Verify: age shows "18+"
- Verify: TOS date is present
- Verify: troop membership shows "Troop 614" with admin badge

### 10.3 Return to App
- Click the "Back" button
- Verify: returns to main app view

---

## Phase 11: Global Admin Panel

### 11.1 Access Global Admin
- Navigate back to Lobby (click troop name in header or back button)
- Click "Global Admin" button
- Verify: Global Admin panel loads

### 11.2 Gear Catalog
- Verify: Gear Catalog tab shows all 76 items grouped by category
- Use search to find "Sawyer"
- Verify: Sawyer Squeeze Water Filter appears
- Clear search

### 11.3 Edit a Gear Item
- Click edit on any gear item
- Change the sharing type dropdown to "crew"
- Save the change
- Verify: item now shows "crew" sharing type badge
- Edit again and change back to "personal"
- Save

### 11.4 Troop Overview
- Click "Troop Overview" tab
- Verify: Troop 614 appears in the list with 1 member

### 11.5 Platform Settings
- Click "Platform Settings" tab
- Verify: settings are displayed
- Do NOT change any settings

### 11.6 Return to App
- Navigate back to Lobby
- Click "Enter" on Troop 614 to go back to the adventure

---

## Phase 12: Add Manual Members & Interactions

### 12.1 Add Manual Members (via Admin Panel)
- Open Admin Panel (gear icon)
- Go to Member Management tab
- Add a manual member named `Scout Alex`
- Add a manual member named `Scout Jordan`
- Close Admin Panel

### 12.2 Select Different Members
- In the MemberBar, click on "Scout Alex"
- Verify: "Editing: Scout Alex" hint appears
- Click on "Scout Jordan"
- Verify: hint updates to "Scout Jordan"
- Click back on your own name (Bill McCoy or similar)

---

## Phase 13: Cross-Tab Verification

### 13.1 Readiness Still Works
- Click "Readiness" tab
- Verify: readiness percentages are visible and > 0% for checked categories

### 13.2 Gear Status Persisted
- Click "Gear" tab
- Verify: previously marked items still show correct status (owned/packed)

### 13.3 Calendar Dates Persisted
- Click "Training" tab
- Verify: previously selected dates still show on calendar

### 13.4 Header Readiness
- Verify: header progress card shows updated crew readiness percentage
- Verify: waypoint name reflects the readiness level

---

## Phase 14: Second Troop (Multi-Troop Test)

### 14.1 Go to Lobby
- Click the troop name area in the header to go back to Lobby

### 14.2 Create Second Troop
- Click "Create New Troop"
- Fill in:
  - Troop Name: `Troop 42`
  - Council: `Greater New York Councils`
  - City: `New York`
  - State: Select `NY`
- Leave visibility as Public
- Click "Create"
- Verify: both troops now visible in Lobby

### 14.3 Switch Between Troops
- Click "Enter" on Troop 42
- Verify: loads into Troop 42 (should show empty adventure state)
- Navigate back to Lobby
- Click "Enter" on Troop 614
- Verify: loads back into Troop 614 with all previous data intact

---

## Phase 15: Final Verification Screenshot

### 15.1 Final State
- Navigate to Training tab
- Take one final screenshot showing:
  - Header with readiness %
  - Tab grid
  - Calendar with dates
  - Overall app state

---

## Test Summary Checklist

| Phase | Area | Tests |
|-------|------|-------|
| 1 | Setup | Profile setup, troop creation, adventure creation |
| 2 | Header | Theme toggle, logo lightbox, Trail Guide, tab nav |
| 3 | Admin | Admin panel, itinerary selection |
| 4 | Calendar | Date selection, bulk select, clear |
| 5 | Best Windows | Analysis view, training event scheduling, RSVP |
| 6 | Readiness | Skill checkoffs across 3 categories, % verification |
| 7 | Gear | Filters, search, status toggles, pack weight |
| 8 | Itinerary | Day viewer, expand/collapse, type filters |
| 9 | Reports | Report cards visibility (no print/download) |
| 10 | Profile | Profile page, info verification, back nav |
| 11 | Global Admin | Gear catalog, edit item, troop overview, settings |
| 12 | Members | Manual member add, member switching |
| 13 | Persistence | Cross-tab data verification |
| 14 | Multi-Troop | Second troop, troop switching |
| 15 | Final | Screenshot for verification |

**Expected Total Actions: ~120+**
**Expected Duration: 10-15 minutes automated**
**Screenshots: 2-3 total (initial header, final state)**
