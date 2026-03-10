# TrailLog Architecture

> **Schema Version:** 7 | **Last Updated:** 2026-03-10

## System Overview

```
                        ┌─────────────────────────────────────┐
                        │         traillog.gracezero.ai       │
                        │          (Traefik + TLS)            │
                        └──────────────┬──────────────────────┘
                                       │ :443
                                       ▼
                        ┌─────────────────────────────────────┐
                        │       Docker: crew614 container     │
                        │            Node 20 Alpine           │
                        │              :3614                  │
                        ├─────────────────────────────────────┤
                        │                                     │
                        │  ┌───────────┐    ┌──────────────┐  │
                        │  │  Express   │    │  Vite-built  │  │
                        │  │  API       │    │  React SPA   │  │
                        │  │  Server    │    │  (static)    │  │
                        │  └─────┬─────┘    └──────────────┘  │
                        │        │                            │
                        │  ┌─────▼─────────────────────────┐  │
                        │  │  SQLite (WAL mode)            │  │
                        │  │  Docker volume:               │  │
                        │  │  crew614_crew614_data         │  │
                        │  └───────────────────────────────┘  │
                        └─────────────────────────────────────┘
                                       │
                        ┌──────────────┴──────────────────────┐
                        │          External Services          │
                        ├─────────────────────────────────────┤
                        │  Google OAuth    │  Gmail SMTP      │
                        │  (Passport.js)   │  (Nodemailer)    │
                        └─────────────────────────────────────┘
```

## Infrastructure & Deployment

```
VPS: 31.97.134.173 (Hostinger)
SSH: root@31.97.134.173 (key: ~/.ssh/id_ed25519)
GitHub: BillM9000/crew614-philmont (master branch)
Global Admin: ADMIN_EMAIL=billm9000@gmail.com (in /opt/crew614/.env)

Deploy Pipeline:
  local build → tar → scp → VPS extract → docker compose build → up

Backup Strategy:
  ┌─────────────────────────────────────────────────────────────┐
  │  /opt/crew614/backup.sh (rolling, keeps last 10)            │
  │  ├── Daily Cron (3 AM server time)                          │
  │  ├── SQLite .backup → /opt/crew614/backups/                 │
  │  ├── .env snapshot  → /opt/crew614/backups/                 │
  │  ├── Rotate: keeps last 10 backups, auto-deletes oldest     │
  │  └── Manual: ssh root@VPS /opt/crew614/backup.sh            │
  ├─────────────────────────────────────────────────────────────┤
  │  Code Backup                                                │
  │  └── Git push to GitHub (master branch)                     │
  └─────────────────────────────────────────────────────────────┘
```

## Data Model (Schema v7)

```
┌─────────────────────────┐
│         users            │
├─────────────────────────┤
│ id, google_id            │
│ name, email, avatar      │
│ password_hash            │
│ user_type ───────────────┼──── "adult" | "scout"
│ parent_email             │
│ parent_email_2           │
│ email_verified           │
│ verification_token       │
└────────┬────────────────┘
         │
         │ user_id
         ▼
┌─────────────────────┐         ┌─────────────────────┐
│   troop_members      │◄────────│       troops         │
├─────────────────────┤  troop  ├─────────────────────┤
│ user_id, troop_id   │  _id    │ id, name            │
│ role (admin/member) │         │ description         │
│ status (pending/    │         │ council (required)   │
│   approved/denied)  │         │ location             │
│                     │         │ is_public (0/1)      │
│                     │         │ affiliate_tag        │
│                     │         └──────────┬──────────┘
└─────────────────────┘                    │
                                           │ troop_id
                                           ▼
                                ┌─────────────────────┐
                                │     adventures       │
                                ├─────────────────────┤
                                │ id, troop_id, name  │
                                │ itinerary_id        │
                                │ depart_date         │
                                │ arrive_date         │
                                │ return_date         │
                                │ home_date           │
                                │ status              │
                                └──────────┬──────────┘
                                           │
                          ┌────────────────┼────────────────┬──────────────────┐
                          │                │                │                  │
                          ▼                ▼                ▼                  ▼
               ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ ┌──────────────┐
               │ adventure_   │ │ adventure_   │ │  adventure_      │ │ link_        │
               │  members     │ │  skills      │ │  achievements    │ │  requests    │
               ├──────────────┤ ├──────────────┤ ├──────────────────┤ ├──────────────┤
               │ user_id      │ │ id, adv_id   │ │ id, adv_id       │ │ id, adv_id   │
               │ adventure_id │ │ name, desc   │ │ user_id, type    │ │ requester_id │
               │ role         │ │ category     │ │ badge_type       │ │ scout_id     │
               │ participation│ └──────────────┘ │ awarded_at       │ │ status       │
               │ linked_to    │                  └──────────────────┘ │ reviewed_by  │
               │ is_manual    │                                       └──────────────┘
               │ dates (JSON) │
               │ skills (JSON)│
               │ gear (JSON)  │
               └──────────────┘

─── Gear System (v5-v6) ───

┌─────────────────────┐     ┌───────────────────────┐
│   gear_catalog       │     │  gear_product_options  │
├─────────────────────┤     ├───────────────────────┤
│ id, name            │◄────│ gear_catalog_id        │
│ category            │     │ product_name, brand    │
│ subcategory         │     │ price, weight_oz       │
│ weight_oz           │     │ tier (budget/mid/      │
│ priority (essential/│     │   premium)             │
│  recommended/       │     │ star_rating, notes     │
│  optional)          │     │ affiliate_url          │
│ is_crew_shared      │     │ is_ultralight_pick     │
│ description         │     └───────────────────────┘
│ msrp, rating_stars  │
│ sort_order          │
│ is_active           │
└─────────┬───────────┘
          │
          │ gear_catalog_id
          ▼
┌──────────────────────┐     ┌───────────────────────┐
│  member_gear_items   │     │  troop_gear_overrides  │
├──────────────────────┤     ├───────────────────────┤
│ adventure_id         │     │ troop_id              │
│ user_id              │     │ gear_catalog_id       │
│ gear_catalog_id      │     │ hidden (0/1)          │
│ status (needed/      │     └───────────────────────┘
│   owned/packed)      │
│ selected_option_id   │     ┌───────────────────────┐
│ custom_product_name  │     │  troop_custom_gear    │
│ custom_weight_oz     │     ├───────────────────────┤
│ notes                │     │ troop_id, name        │
└──────────────────────┘     │ category, priority    │
                             │ weight_oz, description│
                             └───────────────────────┘

┌─────────────────────┐     ┌───────────────────────┐
│  affiliate_clicks    │     │  platform_settings    │
├─────────────────────┤     ├───────────────────────┤
│ user_id             │     │ key, value            │
│ product_option_id   │     │ (schema_version = 7)  │
│ gear_catalog_id     │     └───────────────────────┘
│ url, referrer       │
│ created_at          │
└─────────────────────┘

─── Invitations ───

┌──────────────┐
│ invitations  │
├──────────────┤
│ troop_id     │
│ adventure_id │
│ email, token │
│ invited_by   │
│ status       │
└──────────────┘
```

## Two-Tier Admin System

```
┌─────────────────────────────────────────────────────────────┐
│  GLOBAL ADMIN (ADMIN_EMAIL env var)                          │
│  ├── Gear Catalog: CRUD items + product options              │
│  │    └── Affiliate URLs on product options                  │
│  ├── Troop Overview: all troops, member counts, tiers        │
│  ├── Affiliate Analytics: click tracking, top products       │
│  ├── Platform Settings: key-value config editor              │
│  └── Also has all Troop Admin powers                         │
├─────────────────────────────────────────────────────────────┤
│  TROOP ADMIN (role=admin on troop_members)                   │
│  ├── Gear Overrides: hide/show global items for their troop  │
│  ├── Custom Gear: add troop-specific items                   │
│  ├── Member Management: role, type, participation, linking   │
│  ├── Adventure Management: create, dates, status             │
│  └── Skills Management: add/remove training skills           │
└─────────────────────────────────────────────────────────────┘

isGlobalAdmin computed server-side in /api/auth/me:
  user.email === process.env.ADMIN_EMAIL → is_global_admin: true
```

## Parent-Scout Linking (v4)

```
┌─────────────────────────────────────────────────────────────┐
│  1. AUTO-LINK (email match, instant)                        │
│     Adult email matches scout's parent_email or             │
│     parent_email_2 → auto-linked on join/invite             │
│                                                             │
│  2. REQUEST/APPROVE (admin approval required)               │
│     Adult → selects scout → link_requests → admin approves  │
│                                                             │
│  3. ADMIN OVERRIDE (direct)                                 │
│     Admin can directly link any adult → any scout           │
└─────────────────────────────────────────────────────────────┘
```

## Client Architecture

```
main.jsx
  └─ ThemeProvider
       └─ ToastProvider
            └─ AuthProvider
                 └─ App.jsx
                      │
                      ├── LoginPage          (unauthenticated)
                      ├── ProfileSetup       (no user_type yet)
                      ├── Lobby              (no approved troop)
                      ├── AdventurePicker    (no adventure selected)
                      │
                      └── AdventureProvider  (adventure selected)
                           └─ MainView
                                ├── Header (logo, breadcrumb, countdown, profile)
                                ├── MemberBar (crew avatars, badges, link requests)
                                ├── CTA Banner (highest-priority action)
                                │
                                ├── Tab Bar: Training | Best Windows | Readiness | Itinerary | Gear
                                │
                                ├── [Calendar] — availability heatmap, trek blocking
                                ├── [Results] — best date windows analysis
                                ├── [Skills] — journey trail, readiness checklists
                                ├── [Itinerary] — day cards, print cheat sheet
                                ├── [Gear]
                                │    ├── GearList — catalog browser, 3-state status,
                                │    │   product options, affiliate buy links,
                                │    │   category/priority/status filters, search
                                │    ├── PackWeightWidget — base + food + water calc
                                │    ├── GearAIChat button — AI gear advisor
                                │    └── Global/Gear Admin button
                                │
                                ├── AdminPanel (modal) — adventure/members/troop settings
                                ├── GlobalAdmin (modal) — 4 tabs for global admin:
                                │    ├── Gear Catalog (items + product options + affiliate URLs)
                                │    ├── Troop Overview (table with counts)
                                │    ├── Affiliate Analytics (clicks chart + top products)
                                │    ├── Platform Settings (key-value editor)
                                │    └── Troop Overrides (hide/show items, custom gear)
                                │
                                └── GearAIChat (modal) — AI gear advisor
```

## React Contexts

```
┌──────────────────────────────────────────────────────────┐
│  ThemeContext                                             │
│  ├── theme object (dark/light color tokens)              │
│  ├── mode ("dark" | "light")                             │
│  └── toggleTheme()                                       │
├──────────────────────────────────────────────────────────┤
│  ToastContext                                            │
│  ├── addToast(message, type)                             │
│  └── removeToast(id)                                     │
├──────────────────────────────────────────────────────────┤
│  AuthContext                                             │
│  ├── user (includes is_global_admin flag)                │
│  ├── memberships, approvedTroops, adventureMemberships   │
│  ├── login(), signup(), logout()                         │
│  ├── updateProfile()                                     │
│  └── refresh()                                           │
├──────────────────────────────────────────────────────────┤
│  AdventureContext                                        │
│  ├── adventure, members, skills, itinerary               │
│  ├── trekDate, trekDates (4-field object)                │
│  ├── achievements { badges, milestones }                 │
│  ├── gearCatalog (full catalog with options)             │
│  ├── memberGearMap (per-user gear selections)            │
│  ├── trekkingMembers, supportMembers                     │
│  ├── updateMemberLocally(userId, patch)                  │
│  └── refreshAll/Members/Skills/Achievements/MemberGear() │
└──────────────────────────────────────────────────────────┘
```

## Server API Routes

```
Auth:
  GET  /auth/google                              → OAuth initiate
  GET  /auth/google/callback                     → OAuth callback
  GET  /auth/me                                  → User + memberships + is_global_admin
  POST /auth/logout                              → End session
  PUT  /auth/profile                             → Update profile

Troops:
  GET  /api/troops                               → List troops
  POST /api/troops                               → Create troop
  PUT  /api/troops/:id                           → Update troop
  GET  /api/troops/:id/members                   → List members
  POST /api/troops/:id/join                      → Request to join
  PUT  /api/troops/:id/members/:uid/approve|deny → Approve/deny

Adventures:
  GET  /api/troops/:id/adventures                → List adventures
  POST /api/troops/:id/adventures                → Create adventure
  PUT  /api/adventures/:id                       → Update adventure
  DELETE /api/adventures/:id                     → Delete adventure

Adventure Members:
  GET  /api/adventures/:id/members               → List members
  POST /api/adventures/:id/members               → Add member + auto-link
  DELETE /api/adventures/:id/members/:uid         → Remove member
  PUT  /api/adventures/:id/members/:uid/role      → Set admin/member
  PUT  /api/adventures/:id/members/:uid/user-type → Set adult/scout
  PUT  /api/adventures/:id/members/:uid/participation → Set trekking/support
  PUT  /api/adventures/:id/members/:uid/link      → Link adult→scout
  PUT  /api/adventures/:id/members/:uid/dates     → Update availability
  PUT  /api/adventures/:id/members/:uid/skills    → Update skills
  POST /api/adventures/:id/manual-members         → Add manual member
  DELETE /api/adventures/:id/manual-members/:mid  → Remove manual member

Link Requests:
  POST /api/adventures/:id/link-requests          → Request link to scout
  GET  /api/adventures/:id/link-requests          → List requests
  PUT  /api/adventures/:id/link-requests/:rid/approve|deny

Gear Catalog (v5-v6):
  GET  /api/gear-catalog                          → Full catalog with options
  GET  /api/gear-catalog/categories               → Category list
  GET  /api/gear-catalog/:id                      → Single item + options
  POST /api/gear-catalog                          → Create item (global admin)
  PUT  /api/gear-catalog/:id                      → Update item (global admin)
  DELETE /api/gear-catalog/:id                    → Archive item (global admin)
  POST /api/gear-catalog/:id/options              → Add product option
  PUT  /api/gear-catalog/options/:id              → Update product option
  DELETE /api/gear-catalog/options/:id            → Delete product option

Member Gear (adventure-scoped):
  GET  /api/adventures/:id/gear                   → All members' gear
  GET  /api/adventures/:id/members/:uid/gear      → Member's gear items
  PUT  /api/adventures/:id/members/:uid/gear-item/:gid → Set status/option
  DELETE /api/adventures/:id/members/:uid/gear-item/:gid → Remove item
  POST /api/adventures/:id/members/:uid/gear-bulk → Bulk set selections
  GET  /api/adventures/:id/members/:uid/pack-weight → Pack weight calc

Troop Gear:
  GET  /api/troops/:id/gear-overrides             → Hidden items list
  PUT  /api/troops/:id/gear-overrides/:gid        → Toggle hidden
  GET  /api/troops/:id/custom-gear                → Custom items
  POST /api/troops/:id/custom-gear                → Add custom item
  DELETE /api/troops/:id/custom-gear/:id          → Remove custom item

Skills & Achievements:
  GET  /api/adventures/:id/skills                 → List skills
  POST /api/adventures/:id/skills                 → Add skill
  DELETE /api/adventures/:id/skills/:sid           → Remove skill
  GET  /api/adventures/:id/achievements           → Get badges & milestones
  POST /api/adventures/:id/check-milestones       → Auto-award badges

Invitations:
  POST /api/adventures/:id/invitations            → Send invite email
  GET  /api/adventures/:id/invitations            → List invitations
  GET  /api/invitations/:token                    → Accept invitation

Global Admin (requires ADMIN_EMAIL match):
  GET  /api/admin/troops                          → All troops overview
  GET  /api/admin/users                           → All users
  GET  /api/admin/settings                        → Platform settings
  PUT  /api/admin/settings                        → Update setting
  GET  /api/admin/affiliate-stats                 → Click analytics

Affiliate:
  POST /api/affiliate/click                       → Track click (any auth user)

AI Gear:
  POST /api/gear/ai/weight-lookup                 → AI weight estimate
  POST /api/gear/ai/chat                          → AI gear advisor
  GET  /api/gear/ai/usage                         → Usage stats

Content:
  GET  /api/itineraries                           → List itineraries
  GET  /api/itineraries/:id                       → Enriched itinerary

Health:
  GET  /api/health                                → Status, version, uptime (no auth)
```

## File Structure

```
crew614/
├── server/
│   ├── index.js          Express app, 89 API routes, helmet, middleware
│   ├── db.js             SQLite schema v7, migrations, 76-item seed, all DB functions
│   ├── auth.js           Passport.js Google OAuth + local strategy
│   ├── email.js          Nodemailer templates (9 email types, XSS-escaped)
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── main.jsx              Entry point (providers wrap)
│   │   ├── App.jsx               Auth gates, routing, MainView, isGlobalAdmin
│   │   ├── api.js                Fetch wrapper, all API methods
│   │   │
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx    User auth state
│   │   │   ├── ThemeContext.jsx   Dark/light theme
│   │   │   ├── AdventureContext.jsx  Adventure + gear data
│   │   │   └── ToastContext.jsx   Toast notifications
│   │   │
│   │   ├── components/
│   │   │   ├── LoginPage.jsx     Google OAuth login
│   │   │   ├── ProfileSetup.jsx  User type + parent emails
│   │   │   ├── Lobby.jsx         Troop join/pending screen
│   │   │   ├── AdventurePicker.jsx  Adventure list/create
│   │   │   ├── Header.jsx        Nav, countdown, profile
│   │   │   ├── MemberBar.jsx     Crew + parent display + self-link
│   │   │   ├── Calendar.jsx      Availability + trek blocking
│   │   │   ├── Results.jsx       Best date windows
│   │   │   ├── Skills.jsx        Readiness + journey trail
│   │   │   ├── Itinerary.jsx     Route cards + details
│   │   │   ├── GearList.jsx      Gear catalog, 3-state status, affiliate links
│   │   │   ├── PackWeightWidget.jsx  Pack weight calculator
│   │   │   ├── GearAIChat.jsx    AI gear advisor chat
│   │   │   ├── GlobalAdmin.jsx   4-tab global admin panel
│   │   │   ├── AdminPanel.jsx    Adventure/member/troop admin
│   │   │   ├── PrintCheatSheet.jsx  Printable itinerary
│   │   │   ├── ProgressWidgets.jsx  Readiness widgets
│   │   │   ├── ConfirmModal.jsx  Generic confirmation
│   │   │   └── Logo.jsx          SVG logo component
│   │   │
│   │   ├── hooks/
│   │   │   └── useCountdown.js   Phase-aware countdown
│   │   │
│   │   └── utils/
│   │       ├── theme.js          Color tokens, badge helpers
│   │       ├── readiness.js      Shared readiness calculation (single source of truth)
│   │       ├── dates.js          Date math utilities
│   │       └── constants.js      Day names, etc.
│   │
│   ├── index.html
│   └── vite.config.js
│
├── docs/
│   ├── architecture/       Overview, data flow, infrastructure
│   ├── security/           Threat model, auth, data protection, dependency audit
│   └── operations/         Backup, DR, incident response, runbook
│
├── .github/
│   └── SECURITY.md         GitHub security policy (links to root)
│
├── backups/                VPS: /opt/crew614/backups/ (rolling 10)
├── backup.sh               Rolling backup script
├── Dockerfile              Multi-stage build, non-root user
├── docker-compose.yml      Service config, volume, Traefik labels
├── ARCHITECTURE.md         This file
├── SECURITY.md             Vulnerability disclosure policy
└── README.md               Project overview
```

## Schema Migration History

```
v1 → Initial: users, troops, troop_members, adventures, adventure_members,
     adventure_skills, itineraries, invitations, platform_settings
v2 → Added: adventure_achievements, 4 trek date fields on adventures,
     participation + linked_to + is_manual on adventure_members
v3 → Fixed: user_id nullable on adventure_members (manual members)
v4 → Added: parent_email_2 on users, link_requests table,
     auto-link on member join/invitation, link request workflow
v5 → Added: gear_catalog, gear_product_options, member_gear_items,
     troop_gear_overrides, troop_custom_gear tables.
     76-item Philmont gear catalog seeded inline.
v6 → Added: affiliate_url on gear_product_options,
     affiliate_clicks table for tracking.
     Removed: gear_retailers and gear_item_retailers tables.
     Added: global admin query functions (troops, users, settings, affiliate stats).
v7 → Added: council (TEXT, required), location (TEXT), is_public (INTEGER, default 1)
     on troops table. BSA troop numbers only unique within council.
     GET /api/troops filters: public troops + troops user is a member of.
     12 performance indexes via standalone ensureIndexes() function.
```

## Gamification System

```
Trail Badges (individual, auto-awarded):
  🎒 gear_ready        → All gear items owned/packed
  🏥 trail_medic       → All medical items completed
  📋 admin_pro         → All admin tasks completed
  🥾 training_complete → All training skills done
  ⭐ fully_prepared    → All of the above

Journey Progress Trail (crew-wide):
  ┌─────────┬────────────┬──────────────┬─────────────┬──────────┐
  │ 0%      │ 25%        │ 50%          │ 75%         │ 100%     │
  │Trailhead│ Base Camp  │ Timber Ridge │ Eagle Point │ Summit   │
  │         │ Trustworthy│ Prepared     │ Brave       │ Cheerful │
  └─────────┴────────────┴──────────────┴─────────────┴──────────┘

Readiness Calculation (utils/readiness.js — single source of truth):
  Crew readiness = average of 4 category %'s (trekking members only):
    training % = (training skills done across all) / (total × member count)
    gear %     = (gear items owned/packed from memberGearMap) / (catalog × count)
    medical %  = (medical items done across all) / (total × member count)
    admin %    = (admin tasks done across all) / (total × member count)
    overall %  = (training + gear + medical + admin) / 4

  Used by: Header, Skills, MemberBar, GearList (all reference same utility)
  Gear data source: memberGearMap (AdventureContext), NOT m.gear (legacy)

Smart Countdown Phases:
  pre          → "Departure in X days"
  travel_there → "Arriving in X days"
  on_trek      → "Day X of Trek" (green banner)
  travel_back  → "Home in X days"
  complete     → "Welcome home!" (gold banner)
```

## Gear System (v5-v6)

```
76 seeded items across 14 categories:
  Pack & Carry, Shelter, Sleep System, Clothing - Hiking,
  Clothing - Camp & Sleep, Clothing - Rain & Wind, Footwear,
  Cooking & Food, Water, Navigation & Light, Health & Hygiene,
  Tools & Repair, Sun & Insect Protection, Documents & Misc

Member Gear Status Flow:
  (unchecked) → needed → owned → packed → (remove)

Pack Weight Calculation:
  Base weight (sum of owned/packed gear weights)
  + Food estimate (1.75 lbs/day × 12 days = 21 lbs)
  + Water (4.4 lbs / 2 liters)
  = Total pack weight

Affiliate Links:
  - affiliate_url stored on gear_product_options
  - Clicks tracked in affiliate_clicks table
  - Analytics in Global Admin → Affiliate tab
  - Amazon Associates: tag in URL, earn on full session
  - REI: Impact network, ~5%, 15-day cookie
```

## Security

```
Request Pipeline:
  express.json (1MB limit) → helmet (security headers) → rate limiters →
  session (SQLite store) → passport → express.static → route handlers

Security Headers (Helmet.js):
  Content-Security-Policy    style-src 'unsafe-inline' (React CSS-in-JS)
  X-Frame-Options            SAMEORIGIN
  X-Content-Type-Options     nosniff
  Strict-Transport-Security  max-age=15552000; includeSubDomains
  Referrer-Policy            no-referrer

Rate Limiting (express-rate-limit):
  authLimiter    20 req / 15 min  (login, signup)
  apiLimiter    100 req / 1 min   (all /api/ routes)

Error Handling:
  safeError()    500 errors → "Something went wrong" in production
                 400/403/404/409 → intentional messages preserved

Docker Security:
  Non-root user  appuser (uid 1001)
  Alpine image   Minimal attack surface
  Log rotation   json-file, 10MB max, 3 files

Input Validation:
  parseId()          Safe parseInt (null not NaN)
  express.json       1MB body limit
  esc()              HTML-escape in email templates
  Parameterized SQL  100% prepared statements, zero concatenation

Session Management:
  httpOnly: true   No JavaScript access
  secure: true     HTTPS only (production)
  sameSite: "lax"  CSRF mitigation
  Hourly GC        Expired sessions cleaned up

Data Integrity:
  db.transaction()   deleteAdventure (8 tables), removeAdventureMember (4 tables)
  12 indexes         ensureIndexes() runs every startup
  WAL mode           Crash resilience, concurrent reads
```

## Email Templates (9 types)

```
sendInvitationEmail       → Invite someone to join adventure
sendDateChangedEmail      → Notify when trek dates change
sendBadgeEarnedEmail      → Congratulate badge achievement
sendMemberApprovedEmail   → Notify member approved to troop
sendMemberDeniedEmail     → Notify member denied from troop
sendJoinRequestEmail      → Notify admins of join request
sendParentNotificationEmail → Notify parent of scout activity
sendVerificationEmail     → Email verification link
sendLinkRequestEmail      → Notify admins of parent-link request
```
