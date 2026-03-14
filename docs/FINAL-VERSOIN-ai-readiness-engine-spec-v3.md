# TrailLog — AI Readiness Engine Feature Spec (v3 — FINAL)

## For Claude Code — Read This First

This spec was developed through an extended product design conversation in Claude.ai. It reflects the full context of what's already built and defines the next major features. **Read TrailLog_Full_Context.md first** — it has the complete current schema, architecture, and feature set.

**App URL:** https://traillog.gracezero.ai
**GitHub:** BillM9000/crew614-philmont (master branch)

**Reference Docs (already in the project):**
- `TrailLog_Full_Context.md` — complete schema, architecture, features, API endpoints (READ FIRST)
- `TrailLog_Hardening_Guide.pdf` — security & code quality punch list (Phase 0 items come from here)
- `TrailLog_Platform_Brief.pdf` — product positioning & sales doc
- `TrailLog_Professional_Stack_Guide.pdf` — future stack migration roadmap (DO NOT act on this now — it's a learning path, not a build plan)

---

## What's Already Built (Don't Rebuild)

TrailLog is a fully deployed React + Express + SQLite app with: Google OAuth + email auth, role system (system admin / troop admin / adult / scout), 48 Philmont itineraries with day-by-day data, 76-item gear catalog with pack weight calculator, training calendar with AM/PM availability, Best Windows scheduling with RSVPs, readiness dashboard with gamification (Trail Badges + Journey Waypoints), reports with CSV export, help system, email notifications, troop logos, platform admin, and multi-adventure support per troop.

**This spec adds three things:**
1. A corrected data model: Troop → Adventure → Crew(s) → Members
2. The AI Readiness Engine
3. Monetization (per-adventure pricing)

---

# SECTION 1: DATA MODEL CORRECTION

## The Problem

The current schema treats an adventure as a single crew. `adventure_members` ties users directly to an adventure with one itinerary and one set of dates. But the real world works differently:

- **An adventure** is when a group of scouts go to the same place at the same time. Troop 614 going to Philmont in June 2026 — that's one adventure, one shared experience, one bus ride.
- **A crew** is a team within that adventure with its own itinerary, its own leader, its own members, and its own readiness tracking.

One adventure can have multiple crews. They might share the same itinerary (sister crews) or have different itineraries. They share the camaraderie of the same adventure but train and track readiness independently.

## The Correct Hierarchy

```
Troop 614 (Northwest Suburban Council)
  └── Adventure: Philmont June 2026 ($29 — or free if it's the troop's first)
        ├── Crew 614-101 (Itinerary 12-20, departs June 12)
        │     ├── Crew Leader: Bill
        │     ├── Member: Joe
        │     └── Member: Steve
        └── Crew 614-102 (Itinerary 12-12, departs June 12)
              ├── Crew Leader: Mike
              ├── Member: Dave
              └── Member: Tom
```

**Key identity:** A troop is uniquely identified by `council_id + troop_number`. Not by who signed it up — leaders change every few years but Troop 614 is Troop 614 forever.

## What Moves Where

| Data | Currently On | Should Be On | Why |
|------|-------------|-------------|-----|
| `itinerary_id` | `adventures` | `crews` | Each crew can have a different itinerary |
| Trek dates (depart/arrive/return/home) | `adventures` | `crews` | Sister crews might have same dates, but different crews in same adventure might not |
| Members | `adventure_members` | `crew_members` | Members belong to a crew, not an adventure directly |
| Skills / readiness | `adventure_members.skills` | `crew_members` or crew-scoped tables | Readiness is per crew, not per adventure |
| Gear tracking | `member_gear` (adventure_id) | `member_gear` (crew_id) | Gear readiness is crew-specific |
| Training events | `training_events` (adventure_id) | Could stay adventure-level OR move to crew-level | See note below |
| Adventure type | `adventures` | `adventures` (stays) | All crews in an adventure go to the same place |

**Training events note:** Training events are interesting because sometimes both crews train together (shared Saturday session) and sometimes they don't. Simplest approach: keep training events at adventure level for shared sessions, but let crews create crew-specific events too. Or just keep it at adventure level — if crews want separate calendars, they create separate adventures. Don't over-engineer this.

## New/Modified Tables

```sql
-- Councils lookup (seed from BSA council list, ~250 councils)
CREATE TABLE councils (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  state TEXT,
  UNIQUE(name)
);

-- Modify troops: replace freeform council text with council_id
-- Add troop_number as explicit field for unique identity
ALTER TABLE troops ADD COLUMN council_id INTEGER REFERENCES councils(id);
ALTER TABLE troops ADD COLUMN troop_number TEXT;
-- Unique constraint: one troop number per council
-- CREATE UNIQUE INDEX idx_troop_identity ON troops(council_id, troop_number);

-- New: Crews table (itinerary + dates move here from adventures)
CREATE TABLE crews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  adventure_id INTEGER REFERENCES adventures(id) ON DELETE CASCADE,
  name TEXT NOT NULL,  -- e.g., "Crew 614-101" or "Alpha Crew"
  itinerary_id TEXT,
  depart_date TEXT,
  arrive_date TEXT,
  return_date TEXT,  -- This is "depart philmont" / "depart base"
  home_date TEXT,
  leader_id INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- New: Crew members (replaces adventure_members for crew-scoped data)
CREATE TABLE crew_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crew_id INTEGER REFERENCES crews(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  role TEXT DEFAULT 'member',  -- member, leader
  participation TEXT DEFAULT 'trekking',  -- trekking, support
  linked_to INTEGER,
  linked_to_manual INTEGER,
  linked_scouts TEXT,  -- JSON
  is_manual INTEGER DEFAULT 0,
  manual_name TEXT,
  color_bg TEXT,
  dates TEXT,   -- JSON, availability
  skills TEXT,  -- JSON, skill completions
  gear TEXT,    -- JSON (or continue using member_gear table with crew_id)
  medical TEXT, -- JSON
  admin_tasks TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(crew_id, user_id)
);
```

**On adventures table:** Remove `itinerary_id`, `depart_date`, `arrive_date`, `return_date`, `home_date` since these now live on `crews`. Keep `adventure_type`, `troop_id`, `name`, `description`, `status`. The adventure becomes the umbrella container.

## Migration Path

The existing app (with adventures that are effectively single crews) migrates cleanly:

1. For each existing `adventure`, create one `crew` record with the adventure's itinerary and dates
2. Move `adventure_members` rows into `crew_members` for that crew
3. Update `member_gear` references from `adventure_id` to `crew_id`
4. Update `training_events` — keep on adventure or move to crew, decide at implementation time

**No data loss.** Every current adventure becomes an adventure with one crew. The schema just now supports adding more crews to an adventure.

---

# SECTION 2: AI READINESS ENGINE

## Why the Current Readiness System Feels Off

The readiness dashboard works but it's a **completion tracker, not a readiness tool.** A member can hit 50% by completing Admin and Medical paperwork without ever putting on boots. The gamification rewards checking boxes, but checking boxes ≠ being ready for Day 3 of a super strenuous itinerary.

**The core insight:** The app cannot be opinionated about *how* a crew trains. Some meet every Saturday. Some train solo across three time zones grinding treadmills in hotels and hunting sled hills in Illinois. The app must be opinionated about **whether they're ready.** The mountain doesn't care how you trained.

## The Four Categories Are Not Equal

| Category | Type | AI Role | Default Visibility |
|----------|------|---------|-------------------|
| **Training** | Progression-driven | Full AI: self-assessment, adaptive phasing, priority coaching, itinerary-aware benchmarks | **Always on** |
| **Gear** | Progression-driven | AI-aware: time-sensitive alerts (boot break-in, pack fitting under load, budget timeline) | **Always on** |
| **Medical** | Deadline-driven | Philmont handles the actual medical. Just form submission reminders | **Hidden by default** |
| **Admin** | Deadline-driven | Permission slips, payments, travel logistics | **Hidden by default** |

**Medical and Admin hidden by default.** They dilute the core value. Troop admin can toggle them on in settings. The existing `computeCrewReadiness()` adaptive averaging already handles missing categories — it only counts categories with items defined.

**Why Gear is a progression track, not just a checklist:**
- Boots: 3-4 month process (purchase → break-in → confirmed fit). Buying 30 days out = blisters Day 1.
- Backpack: must be fitted AND tested under load. "Owned" status means nothing without loaded miles.
- Trip is ~$6k total per person. Gear is a major chunk. Families budget across months. Kids put boots on Christmas lists.
- AI should know: 90 days out with no boots = red alert. 90 days out with no camp towel = don't care.

## Feature Architecture

### 1. Self-Assessment ("Start Anytime" Onboarding)

**Critical product requirement.** Most crews don't find tools until 90 days out. If the engine only works with a long runway, you lose half the market.

When a member first visits Readiness for a crew, a quick modal appears:

- **Current comfortable distance**: slider, 1-15 miles
- **Pack experience**: None / Some (day pack) / Loaded (overnight weight)
- **Elevation/incline access**: Flat terrain only / Some hills / Real elevation available
- **Current activity level**: Sedentary / Lightly active / Regularly active / Very active

30 seconds. No judgment. Stored per (crew_id, user_id). Can be retaken if things change.

### 2. AI Plan Generation (Claude API)

One call per member per crew generates a personalized readiness plan.

**Inputs (all available in the database):**
```json
{
  "adventure_type": "Philmont Scout Ranch",
  "itinerary": {
    "id": "12-20",
    "name": "Super Strenuous",
    "total_miles": 69,
    "days": 12,
    "day_by_day": [ /* from itineraries table */ ]
  },
  "departure_date": "2026-06-12",
  "weeks_remaining": 13,
  "member_assessment": {
    "current_distance_miles": 4,
    "pack_experience": "none",
    "elevation_access": "flat_only",
    "activity_level": "lightly_active"
  },
  "current_gear_status": {
    "boots": "needed",
    "backpack": "needed",
    "total_items_packed": 12,
    "total_items": 76
  }
}
```

**Output — Adaptive phases based on time remaining:**

| Time Left | Behavior |
|-----------|----------|
| 12+ months | Full 4-phase gentle ramp |
| 6 months | Standard 4 phases, moderate pacing |
| 90 days | Compressed. Phases overlap. Phase 1 = 2 weeks not 6. "Time but none to waste." |
| 60 days | Aggressive but honest. Fit members skip early phases. Unfit members get transparent: "Here's what's realistic. Here are the days that'll challenge you most." |
| 30 days | Damage control. Minimum viable readiness. Focus on loaded miles every weekend. |

**Pack weight progression built into phases:**
- Phase 1: No pack
- Phase 2: Light (15-20 lbs)
- Phase 3: Medium (25-30 lbs)
- Phase 4: Full shakedown (35+ lbs)

**Benchmarks describe outcomes, not prescriptions.** "Can do 8 miles with 25lb pack" — not "hike Trail X on Saturday." Works for every crew type.

**The engine never lies.** Doesn't pretend 60 days = 6 months. Honest but constructive.

### 3. Priority Coaching ("What Matters Now")

The visible wow. Top of the Readiness tab, above the existing checklist. A **"Priority Now" card** showing 2-3 dynamically generated priorities based on:

- Time remaining (from crew departure date)
- Itinerary demands (from day-by-day data)
- Current phase (from self-reported progress)
- Gear status (from member_gear table)

**Examples:**
- 120 days, no boots: "🔴 Boot break-in takes 3-4 months. Getting fitted and starting break-in is your #1 priority."
- 90 days, Phase 1 done: "Next milestone: 6-8 miles with 20-25lb pack. Your hardest day is Day 3 (12mi, 2,800ft) — that's your target."
- 60 days, pack not tested: "You have your pack but haven't done loaded miles. Every session from now should be loaded."
- 30 days, on track: "Focus on one full shakedown weekend — full weight, 10+ miles, full camp setup."

Existing checklist, badges, and gamification all stay below. AI adds intelligence on top, doesn't disrupt what works.

### 4. Crew Readiness Dashboard (Leader View)

Adds to the existing dashboard:

- **Per-member phase status** — where each person is in their progression (not just checkbox %)
- **On track / Behind / At risk** — based on phase vs. weeks remaining
  - 🟢 On track: Phase matches or exceeds expected position
  - 🟡 Behind: One phase behind schedule
  - 🔴 At risk: Significantly behind — have the conversation now
- **"Hardest day readiness"** — can this crew handle their toughest itinerary day?

**This is the "have the hard conversation early" feature.** Leader sees in February that someone is red, not on Day 2 of the trek.

### 5. Integration with Existing Features

| Feature | Integration |
|---------|------------|
| Readiness Dashboard | "Priority Now" card sits above existing checklist. Badges/waypoints unchanged. |
| Gear System | AI reads member_gear status for urgency alerts. Catalog and 3-state tracking unchanged. |
| Training Calendar | Stays as-is. AI can suggest session focus based on crew phase. |
| Best Windows | Stays as-is. Could annotate dates with recommended training focus. |
| Itinerary Viewer | AI reads day-by-day data for benchmarks. Viewer unchanged. |
| Skills (18 universal) | Existing checklist continues. AI phases are a separate track. |
| Gamification | Badges/waypoints unchanged. Could add AI milestones ("Assessment Complete", "Phase 1 Ready"). |
| Reports | Could add "Readiness Report" with per-member phase status and risk. |

---

# SECTION 3: MONETIZATION

## Model: Per-Adventure Pricing

| | Price | Notes |
|--|-------|-------|
| **First adventure** | **Free** | Full features, no time limit, no asterisks. This is the growth engine. |
| **Each additional adventure** | **$29** | Per troop, not per user. Covers all crews within that adventure. |

### Why This Works

- **$29 is invisible** against a $6k trip. Less than a crew dinner.
- **No subscriptions.** Scouting is seasonal. Nobody wants to remember to cancel in October.
- **No per-user pricing.** Parents resent it. Troop pays once, everyone's in.
- **Per-adventure = per value moment.** You pay when you're setting up a trip, in planning mode, seeing immediate value.
- **Free first adventure drives adoption.** Every crew leader gets the full wow. They tell other crew leaders. When the troop does Northern Tier in 2028, $29 is automatic.
- **Adventure covers all crews within it.** Troop 614 sending sister crews? One adventure, $29, both crews included. If two leaders genuinely want nothing to do with each other, they create separate adventures and pay separately.
- **Planning two years out?** Pay $29 now, use it for 24 months. No recurring charges.

### Implementation Notes

- `first_adventure_used` flag on the troop record (not the user — leaders change)
- Troop identity = `council_id + troop_number` (persists across leadership changes)
- Payment gate triggers on adventure creation when `first_adventure_used = true`
- Payment integration: Stripe Checkout is simplest. One-time payment, no subscription management.
- Free tier includes ALL features including AI Readiness Engine. The AI is what makes people talk about it — don't gate the wow.

### Revenue Math

- Costs: ~$300-500/year (hosting + Claude API calls)
- Break even: ~15 paid adventures/year
- 100 active troops: ~$2,900/year (assuming most create 1-2 adventures)
- 500 active troops: ~$14,500/year
- Target: Get 500 troops using it, then have the Scouting America conversation

### Future Pricing Levers (Don't Build Yet)

- Raise to $49 once multi-adventure types are live and value is proven
- Council/district licensing: $200-500/year covering all troops in a council
- No ads, no affiliate links in coaching, no per-user fees — ever

---

# SECTION 4: COUNCILS LOOKUP

BSA has ~250 councils. Seed a lookup table to replace freeform council text input on troop creation.

```sql
CREATE TABLE councils (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  city TEXT,
  state TEXT
);
```

Troop creation flow changes from a text input to a searchable dropdown. Existing troops with freeform council text need a one-time migration/mapping to council_id.

This gives you `council_id + troop_number` as the unique troop identity — critical for:
- Preventing duplicate troops
- Troop persistence across leadership changes
- Future council-level licensing
- "Claim this troop" flow when a new leader takes over

---

# SECTION 5: IMPLEMENTATION

## New Database Tables (AI Readiness)

All keyed on `crew_id + user_id` since readiness is per crew, not per adventure:

```sql
CREATE TABLE member_assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crew_id INTEGER REFERENCES crews(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  current_distance_miles REAL,
  pack_experience TEXT CHECK(pack_experience IN ('none', 'day_pack', 'loaded')),
  elevation_access TEXT CHECK(elevation_access IN ('flat_only', 'some_hills', 'real_elevation')),
  activity_level TEXT CHECK(activity_level IN ('sedentary', 'lightly_active', 'regularly_active', 'very_active')),
  assessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(crew_id, user_id)
);

CREATE TABLE readiness_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crew_id INTEGER REFERENCES crews(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  plan_json TEXT,
  weeks_at_generation INTEGER,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(crew_id, user_id)
);

CREATE TABLE readiness_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crew_id INTEGER REFERENCES crews(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  phase_number INTEGER,
  status TEXT CHECK(status IN ('not_started', 'working', 'complete')),
  note TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(crew_id, user_id, phase_number)
);
```

## API Endpoints (AI Readiness)

```
POST   /api/crews/:crewId/readiness/assess              -- Submit self-assessment
GET    /api/crews/:crewId/readiness/plan/:userId         -- Get or generate plan
PUT    /api/crews/:crewId/readiness/progress             -- Update phase status
GET    /api/crews/:crewId/readiness/dashboard            -- Crew-wide readiness view
POST   /api/crews/:crewId/readiness/regenerate/:userId   -- Force regenerate
GET    /api/crews/:crewId/readiness/priorities/:userId   -- "Priority Now" items
```

## Build Order

**Phase 0 — Security P1s (do before anything else — you're live with youth data):**
1. CSRF protection: add `csurf` middleware (or double-submit cookies) on all state-changing routes
2. Content Security Policy: configure strict CSP in Helmet — block inline scripts, restrict resource origins
3. `npm audit` — fix everything critical, set up Dependabot on GitHub for ongoing alerts
4. Run `npm audit fix`, verify zero critical/high vulnerabilities

**Phase 1 — Foundation (data model, everything else depends on it):**
5. Councils lookup table + seed BSA council data (~250 councils) + migrate existing freeform council fields
6. Troop → Adventure → Crew(s) data model restructure (new `crews` table, move itinerary/dates down)
7. Migrate existing `adventure_members` → `crew_members`
8. Update all existing UI/API to work with new crew layer

**Phase 2 — Monetization:**
9. `first_adventure_used` flag on troops
10. Stripe Checkout integration on adventure creation
11. Payment gate logic

**Phase 3 — AI Readiness Engine:**
12. `member_assessments` table + self-assessment modal
13. `show_medical` / `show_admin` toggles on adventures + Admin Panel UI
14. Claude API integration — plan generation endpoint
15. `readiness_plans` table + caching
16. "Priority Now" card on Readiness tab
17. `readiness_progress` table + phase self-reporting UI
18. Crew dashboard AI enhancements (phase indicators, risk flags)
19. Regeneration logic (re-assess, time-based, itinerary change)

**Ongoing — Fold P2 hardening into the work as you touch those areas:**
- When rewriting routes for the crew layer → consolidate API routes (89 → ~40)
- When adding new tables → write canonical schema, add foreign keys + indexes
- When touching backend files → add input validation (express-validator or zod)
- When tests would save you debugging time → add integration tests with Supertest
- The full TypeScript/Next.js/Postgres migration is a **"next version" project**, not a prerequisite. Ship on the current stack, migrate later if you outgrow it.

---

# SECTION 6: DESIGN DECISIONS LOG

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Security P1s before features | **CSRF + CSP + npm audit first** | App is live with youth data. Non-negotiable. A few hours of work. |
| Data model | **Troop → Adventure → Crew(s) → Members** | An adventure is "same place, same time." Crews are teams within it. Sister crews share an adventure. Different itineraries/dates live on crew, not adventure. |
| Pricing model | **$29/adventure, first free** | Per value moment, not subscription. Invisible against $6k trip cost. No seasonal churn. Troop pays, not individual. |
| AI features in free tier | **Yes, included** | The AI is the wow. Gating it means free users see a glorified spreadsheet and never convert. |
| Gear coaching (affiliate/shopping) | **Cut from coaching** | Affiliate infra exists for separate use. Don't mix commerce into readiness. Scouting audience smells cash grabs instantly. |
| Medical & Admin categories | **Hidden by default** | Dilute core value. Toggle on in admin settings if wanted. |
| Fitness app features | **Rejected** | No workout logging, no calorie tracking. Readiness tool, not fitness tracker. |
| Training prescriptions | **Rejected** | Benchmarks = outcomes ("can do 8mi/25lb"), not prescriptions ("do this workout"). Works for Saturday troops and scattered parents alike. |
| Fixed phase timeline | **Rejected** | Adapts per member: start date, current fitness, time remaining. 90-day and 12-month crews both work. |
| Historical trek weather | **Cut** | Low priority. Maybe later. |
| Weather API scheduling | **Deferred** | Nice-to-have, not core. |
| Council identity | **Seeded dropdown, ~250 councils** | Replaces freeform text. Enables unique troop identity (council + number) and future council licensing. |
| Separate adventures for feuding leaders | **Supported by design** | Default = same adventure, shared camaraderie. If leaders want separation, create separate adventures, pay separately. Their choice. |
| Full hardening plan before features | **No — P1s only, fold P2s in** | CSRF/CSP/npm audit are non-negotiable. The 8-week hardening plan, API consolidation, and test suite happen naturally during the restructure work, not as a blocker. |
| TypeScript / Next.js / Postgres migration | **Not now** | Current stack (React + Express + SQLite) shipped a working product. Migrate when you outgrow it, not before. Professional Stack Guide is a learning roadmap, not a prerequisite. |

---

## The Pitch

"TrailLog doesn't just track checkboxes — it knows your trail. Every mile, every climb, every hard day on your specific itinerary. It meets each crew member where they are, whether they started training a year ago or panicked into it 60 days before departure. One dashboard tells the crew leader: are we ready? And if not, exactly where the gaps are."

Nobody in the scouting space is doing itinerary-aware adaptive readiness coaching. This is the golden egg in the middle of the Venn diagram.
