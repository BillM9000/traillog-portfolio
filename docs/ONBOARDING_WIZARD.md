# TrailLog Onboarding Wizard Specification

## Overview

The onboarding wizard is a **forced, full-screen walkthrough** that new users must complete before accessing the main app. It serves a dual purpose:

1. **Setup** — Collects the essential data needed to configure their account
2. **Feature Discovery** — Teaches users what TrailLog can do while getting them started

The wizard cannot be dismissed or skipped. Users must complete all required steps for their role. Some steps offer a "I'll do this later" off-ramp for non-critical actions.

---

## Pre-Wizard Gate: ProfileSetup

Before the wizard, users complete age verification and user type selection (separate component, unchanged):

- **Youth / Scout (Ages 13-17)**: Sets `user_type = "scout"`, requires parent/guardian email
- **Adult Leader (Ages 18+)**: Sets `user_type = "adult"`

Age confirmation is immutable after being set.

---

## Wizard Flows by Role

### ADULT — ADMIN Path (8 steps)

| Step | Title | Required | Action |
|------|-------|----------|--------|
| 1 | "What brings you here?" | **Forced** | Role selection — 3 large cards with benefit descriptions |
| 2 | "Register Your Unit" | **Forced** | Unit type + number + council picker + optional logo upload |
| 3 | "Plan Your Adventure" | **Forced** | Adventure type, crew name, 4 dates, itinerary picker with mini-preview |
| 4 | "How Ready Are You?" | **Forced** | 4-question readiness assessment (distance, pack, elevation, activity) |
| 5 | "Your First Training Week" | Skip OK | 7-day date picker grid for training availability |
| 6 | "Gear You Already Own" | Skip OK | Tap-to-toggle grid of ~15 essential gear items |
| 7 | "Build Your Crew" | Skip OK | Email invite form + feature discovery grid |
| 8 | "You're All Set" | **Forced** | Summary card + 3 action buttons (Itinerary / Gear / Training) |

### ADULT — TREKKER Path (7 steps)

| Step | Title | Required | Action |
|------|-------|----------|--------|
| 1 | "What brings you here?" | **Forced** | Role selection |
| 2 | "Find Your Unit" | **Forced** | Search by council + unit type + number, or enter invite code |
| 3 | "What TrailLog Does For You" | **Forced** | Full-page feature tour (itinerary, gear, readiness, training, countdown) |
| 4 | "How Ready Are You?" | **Forced** | 4-question readiness assessment |
| 5 | "Your First Training Week" | Skip OK | 7-day date picker grid |
| 6 | "Gear You Already Own" | Skip OK | Essential gear tap-grid |
| 7 | "You're All Set" | **Forced** | Summary + waiting-for-approval or action buttons |

### SCOUT Path (5 steps)

| Step | Title | Required | Action |
|------|-------|----------|--------|
| 1 | "Welcome, Scout!" | **Forced** | Auto-set trekker role, welcome screen with feature preview |
| 2 | "Find Your Troop" | **Forced** | Search or invite code flow |
| 3 | "How Ready Are You?" | **Forced** | 4-question assessment with youth-friendly wording |
| 4 | "Gear You Already Own" | Skip OK | Essential gear tap-grid |
| 5 | "You're Ready!" | **Forced** | Summary |

### PARENT Path (3 steps)

| Step | Title | Required | Action |
|------|-------|----------|--------|
| 1 | "What brings you here?" | **Forced** | Selects "I'm a parent" |
| 2 | "Connect to Your Scout" | **Forced** | Enter scout's email or use invite link to link accounts |
| 3 | "Your Dashboard" | **Forced** | Preview of parent dashboard features + done |

---

## Step Details

### Step 1 — Role Selection

Three large cards, each with an icon, role name, and benefit statement:

- **"I'm organizing a crew"** → "Set up your unit, manage members, track everyone's readiness"
- **"I'm trekking with a crew"** → "Track your gear, get a training plan, count down the days"
- **"I'm a parent"** → "See your scout's gear progress, readiness score, and upcoming schedule"

Scouts skip this step — their role is auto-set to trekker.

Data collected: `onboarding_role` (admin / trekker / parent)

### Step 2 — Register Unit (Admin) / Find Unit (Trekker/Scout)

**Admin**: Embedded unit creation form (unit type dropdown, unit number, council search, optional logo upload). Feature callout: *"TrailLog tracks gear, training, readiness, and itineraries for your entire unit. Every member gets their own dashboard."*

**Trekker/Scout**: Council search + unit type + number lookup. Shows matching unit with "Request to Join" button. Alternative: enter an invite code/link.

Feature callout: *"Once approved, you'll see your crew's itinerary, gear checklist, training schedule, and readiness tracker."*

### Step 3 — Plan Your Adventure (Admin only)

Adventure type selector (Philmont, Sea Base, Northern Tier, Summit), crew name input, 4 date pickers (depart/arrive/return/home), itinerary picker grouped by duration (7/9/12-day).

Feature callout: *"Your itinerary drives everything — daily schedules, dry camp warnings, water strategies, elevation profiles. Each crew member sees their own countdown."*

Shows a mini-preview of the itinerary tab with the selected route.

### Step 3 — Feature Tour (Trekker only)

Full-page visual walkthrough showing what users will have access to:

- **Your Itinerary** — Day-by-day route with camps, programs, dry camp warnings
- **Personal Gear List** — Check off items, track pack weight, AI suggestions
- **Readiness Plan** — AI generates a personalized training plan based on your fitness
- **Training Events** — See scheduled hikes, mark attendance
- **Countdown** — Live countdown to departure with phase tracking

Not data collection — purely feature discovery. Required step (cannot skip).

### Step 4 — Readiness Assessment (All except Parent)

The 4 readiness questions from the existing assessment, presented as a single clean form:

1. **Longest hike in past 3 months?** — < 3 miles / 3-7 miles / 7-12 miles / 12+ miles
2. **Pack experience?** — Never carried a loaded pack / Day pack only / Multi-day loaded pack
3. **Elevation access?** — Flat terrain only / Some hills / Real elevation gain
4. **Activity level?** — Sedentary / Lightly active / Regularly active / Very active

CTA button text: **"See My Training Plan"** (not "Next") — makes the user feel they're getting something, not just filling out a form.

Submits via the existing `POST /api/crews/:crewId/readiness/assess` endpoint.

### Step 5 — Training Dates (Admin/Trekker, Skippable)

Shows the next 7 calendar days as a tap-to-select grid. Users pick which days they can train this week. Creates a training availability entry if they pick any dates.

Header: *"Pick days you can train this week"*

Skip: "I'll schedule later →" (small, muted, no border)

### Step 6 — Gear Quick-Check (All except Parent, Skippable)

Grid of ~15 essential gear items displayed as tap-to-toggle cards with emoji icons:

| Item | Icon |
|------|------|
| Backpack (50-80L) | 🎒 |
| Hiking Boots | 🥾 |
| Sleeping Bag | 🛏️ |
| Sleeping Pad | 🏕️ |
| Water Filter | 💧 |
| Stove & Fuel | 🍳 |
| Compass | 🧭 |
| Rain Gear | ☔ |
| Headlamp | 🔦 |
| First Aid Kit | ⛑️ |
| Mess Kit | 🍽️ |
| Sunscreen | ☀️ |
| Water Bottles (2+) | 🫗 |
| Trekking Poles | 🥢 |
| Camp Clothes | 👕 |

Tapping an item marks it as "owned" — saves to the member_gear table. Shows a live progress bar (e.g. "4 of 15 items — 27%").

Header: *"Tap items you own. We'll track the rest on your gear checklist."*

Skip: "I'll do this later →"

### Step 7 — Invite Members (Admin only, Skippable)

Email invite form with ability to add multiple emails. Below the form, a visual feature grid showing what invited members will see:

- 🎒 **Gear Checklist** — AI-powered pack list with weight tracking
- 📊 **Readiness Engine** — Personalized training plans based on fitness assessment
- 🗓️ **Training Calendar** — Schedule hikes, track attendance
- 📋 **Reports** — Excel exports for gear, training, readiness
- 📄 **Documents** — Share permission forms, medical info, packing lists

Skip: "I'll invite later →"

### Final Step — "You're All Set"

Summary card showing what was configured:
- Unit name · Adventure type · Date range · Itinerary

Three large action buttons for the user's first action:
- **"Open Gear Catalog"** → jumps to Gear tab
- **"Schedule a Training Hike"** → jumps to Training tab
- **"Explore Your Itinerary"** → jumps to Itinerary tab

Marks `onboarding_completed = 1` on the server.

---

## UI Design

### Layout

- Full-screen overlay (no header, no sidebar, no tabs)
- Centered content card, max-width 520px (mobile-first)
- Progress bar at top: "Step 2 of 7" with a segmented fill bar
- Back button (left arrow) on all steps except step 1
- No X button, no dismiss, no "skip all"

### Skip Pattern

For skippable steps, the primary action is always prominent. The skip option is de-emphasized:

```
┌─────────────────────────────────┐
│  [Step content]                 │
│                                 │
│  ┌───────────────────────────┐  │
│  │   Continue  (big, green)  │  │
│  └───────────────────────────┘  │
│                                 │
│     I'll do this later →        │  ← small, muted text link
└─────────────────────────────────┘
```

### Theming

Uses the existing TrailLog theme system (dark/light mode supported). Theme toggle available on every step.

---

## Technical Implementation

### New Files

| File | Purpose |
|------|---------|
| `client/src/components/OnboardingWizard.tsx` | Main wizard component (replaces OnboardingRoleModal + OnboardingChecklist) |

### Modified Files

| File | Change |
|------|--------|
| `client/src/App.tsx` | Gate on `onboarding_completed` — show wizard if not complete |
| `client/src/components/HomeDashboard.tsx` | Remove OnboardingChecklist render |
| `server/index.js` | Update onboarding routes for step tracking |

### Deleted Files

| File | Reason |
|------|--------|
| `client/src/components/OnboardingRoleModal.tsx` | Absorbed into wizard step 1 |
| `client/src/components/OnboardingChecklist.tsx` | Replaced by wizard |

### Database

No schema changes needed. Uses existing fields:
- `users.onboarding_role` — trekker / admin / parent
- `users.onboarding_completed` — 0 or 1
- `users.onboarding_steps` — JSON array tracking completed step IDs

### Server State Tracking

The wizard saves progress after each step via `PUT /api/onboarding/step`. If the user refreshes mid-wizard, they resume at the last completed step. The `onboarding_steps` JSON array stores step IDs like:

```json
["role_selected", "unit_created", "adventure_created", "readiness_done"]
```

### API Calls Made During Wizard

The wizard calls existing endpoints — no new API routes needed:

| Step | Endpoint |
|------|----------|
| Register Unit | `POST /api/troops` |
| Create Adventure | `POST /api/troops/:id/adventures` |
| Pick Itinerary | `PUT /api/crews/:id` (sets itinerary_id) |
| Readiness Assessment | `POST /api/crews/:crewId/readiness/assess` |
| Training Dates | `PUT /api/crews/:crewId/members/:userId/dates` |
| Gear Items | `PUT /api/crews/:crewId/members/:userId/gear` |
| Invite Members | `POST /api/troops/:troopId/invitations` |
| Find/Join Unit | `POST /api/troops/:troopId/join` |
| Complete Onboarding | `PUT /api/onboarding/complete` |

---

## Force vs Skip Summary

| Step | Admin | Trekker | Scout | Parent |
|------|-------|---------|-------|--------|
| Role selection | Forced | Forced | Auto | Forced |
| Register/Find unit | Forced | Forced | Forced | Forced |
| Adventure setup | Forced | — | — | — |
| Feature tour | — | Forced | — | — |
| Readiness assessment | **Forced** | **Forced** | **Forced** | — |
| Training dates | Skip OK | Skip OK | — | — |
| Gear quick-check | Skip OK | Skip OK | Skip OK | — |
| Invite members | Skip OK | — | — | — |
| Summary / done | Forced | Forced | Forced | Forced |
