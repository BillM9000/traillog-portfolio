# TrekSync Architecture

## System Overview

```
                        ┌─────────────────────────────────────┐
                        │         treksync.gracezero.ai       │
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

## Data Model

```
┌─────────────────────┐
│       users          │
├─────────────────────┤
│ id, google_id       │
│ name, email, avatar │
│ user_type ──────────┼──── "adult" | "scout"
│ parent_email        │
│ email_verified      │
└────────┬────────────┘
         │
         │ user_id
         ▼
┌─────────────────────┐         ┌─────────────────────┐
│   troop_members      │◄────────│       troops         │
├─────────────────────┤  troop  ├─────────────────────┤
│ user_id, troop_id   │  _id    │ id, name            │
│ role (admin/member) │         │ description         │
│ status (pending/    │         │ affiliate_tag       │
│   approved/denied)  │         └──────────┬──────────┘
└─────────────────────┘                    │
                                           │ troop_id
                                           ▼
                                ┌─────────────────────┐
                                │     adventures       │
                                ├─────────────────────┤
                                │ id, troop_id, name  │
                                │ itinerary_id        │
                                │ depart_date ────────┼── Day leave home
                                │ arrive_date ────────┼── Day arrive Philmont
                                │ return_date ────────┼── Day depart Philmont
                                │ home_date ──────────┼── Day arrive home
                                │ status (active/     │
                                │   completed/archived│)
                                └──────────┬──────────┘
                                           │
                          ┌────────────────┼────────────────┐
                          │                │                │
                          ▼                ▼                ▼
               ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
               │ adventure_   │ │ adventure_   │ │  adventure_      │
               │  members     │ │  skills      │ │  achievements    │
               ├──────────────┤ ├──────────────┤ ├──────────────────┤
               │ user_id      │ │ id, adv_id   │ │ id, adv_id       │
               │ adventure_id │ │ name, desc   │ │ user_id, type    │
               │ role ────────┼─┤ category     │ │ badge_type       │
               │ participation│ └──────────────┘ │ awarded_at       │
               │  (trekking/  │                  └──────────────────┘
               │   support)   │
               │ linked_to ───┼── FK to another member (support→scout)
               │ is_manual    │
               │ dates (JSON) │
               │ skills (JSON)│
               │ gear (JSON)  │
               └──────────────┘
                      │
                      │ Also:
                      ▼
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
                                ├── Header
                                │    ├── Logo
                                │    ├── Breadcrumb (troop > adventure)
                                │    ├── Smart Countdown (useCountdown)
                                │    └── Profile Dropdown
                                │
                                ├── MemberBar
                                │    ├── Trekking Members (avatars + type badges)
                                │    ├── Support Members (separate section)
                                │    └── Trail Badge Icons
                                │
                                ├── Tab Bar
                                │    ├── Training (Calendar)
                                │    ├── Best Windows (Results)
                                │    ├── Readiness (Skills)
                                │    ├── Itinerary
                                │    └── Gear
                                │
                                ├── [Calendar]
                                │    ├── Month grids with availability heatmap
                                │    ├── Trek date blocking (⛺ adventure / 🚐 travel)
                                │    └── Bulk select / clear actions
                                │
                                ├── [Results]
                                │    └── Best date windows analysis
                                │
                                ├── [Skills]
                                │    ├── Journey Progress Trail (Scout Law waypoints)
                                │    ├── Per-member progress dots
                                │    └── Skill checklists (trekking-only readiness %)
                                │
                                ├── [Itinerary]
                                │    ├── Day cards (expandable details)
                                │    ├── Programs, water strategy, warnings
                                │    └── Print button → PrintCheatSheet
                                │
                                ├── [GearList]
                                │    ├── Per-member progress bars + type badges
                                │    ├── Category/priority filters
                                │    └── Crew % (trekking-only)
                                │
                                ├── AdminPanel (modal)
                                │    ├── Adventure tab (dates, status, delete)
                                │    ├── Members tab (role, type, participation,
                                │    │    link, manual add, invite, remove)
                                │    └── Troop tab (name, description)
                                │
                                └── ConfirmModal (generic)
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
│  │    types: success | error | info | celebration        │
│  └── removeToast(id)                                     │
├──────────────────────────────────────────────────────────┤
│  AuthContext                                             │
│  ├── user, memberships, approvedTroops                   │
│  ├── login(), signup(), logout()                         │
│  ├── updateProfile({ name, user_type, parent_email })    │
│  └── refresh()                                           │
├──────────────────────────────────────────────────────────┤
│  AdventureContext                                        │
│  ├── adventure, members, skills, itinerary               │
│  ├── trekDate (legacy), trekDates (4-field object)       │
│  ├── achievements { badges, milestones }                 │
│  ├── trekkingMembers, supportMembers                     │
│  ├── updateMemberLocally(userId, patch)                  │
│  └── refreshAdventure/Members/Skills/Achievements/All()  │
└──────────────────────────────────────────────────────────┘
```

## Server API Routes

```
Auth:
  GET  /auth/google                              → OAuth initiate
  GET  /auth/google/callback                     → OAuth callback
  GET  /auth/me                                  → Current user + memberships
  POST /auth/logout                              → End session

Profile:
  PUT  /auth/profile                             → Update name/type/parent_email

Troops:
  GET  /api/troops                               → List troops
  POST /api/troops                               → Create troop
  PUT  /api/troops/:id                           → Update troop
  GET  /api/troops/:id/members                   → List members
  POST /api/troops/:id/join                      → Request to join
  PUT  /api/troops/:id/members/:uid/approve      → Approve member
  PUT  /api/troops/:id/members/:uid/deny         → Deny member

Adventures:
  GET  /api/troops/:id/adventures                → List adventures
  POST /api/troops/:id/adventures                → Create adventure
  PUT  /api/adventures/:id                       → Update (name, dates, status)
  DELETE /api/adventures/:id                     → Delete adventure

Adventure Members:
  GET  /api/adventures/:id/members               → List members
  POST /api/adventures/:id/members               → Add member
  DELETE /api/adventures/:id/members/:uid         → Remove member
  PUT  /api/adventures/:id/members/:uid/role      → Set admin/member
  PUT  /api/adventures/:id/members/:uid/user-type → Set adult/scout
  PUT  /api/adventures/:id/members/:uid/participation → Set trekking/support
  PUT  /api/adventures/:id/members/:uid/link      → Link support→scout
  POST /api/adventures/:id/manual-members         → Add manual member
  DELETE /api/adventures/:id/manual-members/:mid  → Remove manual member

Adventure Data:
  PUT  /api/adventures/:id/members/:uid/dates    → Update availability
  PUT  /api/adventures/:id/members/:uid/skills   → Update skills
  PUT  /api/adventures/:id/members/:uid/gear     → Update gear

Skills:
  GET  /api/adventures/:id/skills                → List skills
  POST /api/adventures/:id/skills                → Add skill
  DELETE /api/adventures/:id/skills/:sid          → Remove skill

Invitations:
  POST /api/adventures/:id/invitations           → Send invite email
  GET  /api/adventures/:id/invitations           → List invitations
  GET  /api/invitations/:token                   → Accept invitation

Achievements:
  GET  /api/adventures/:id/achievements          → Get badges & milestones
  POST /api/adventures/:id/check-milestones      → Auto-award badges

Content:
  GET  /api/itineraries                          → List itineraries
  GET  /api/itineraries/:id                      → Get enriched itinerary
  GET  /api/gear                                 → Get gear items
```

## File Structure

```
crew614/
├── server/
│   ├── index.js          Express app, all API routes, middleware
│   ├── db.js             SQLite schema, migrations, all DB functions
│   ├── auth.js           Passport.js Google OAuth strategy
│   ├── email.js          Nodemailer templates (8 email types)
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── main.jsx              Entry point (providers wrap)
│   │   ├── App.jsx               Auth gates, routing, MainView
│   │   ├── api.js                Fetch wrapper, all API methods
│   │   │
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx    User auth state
│   │   │   ├── ThemeContext.jsx   Dark/light theme
│   │   │   ├── AdventureContext.jsx  Adventure data + computed
│   │   │   └── ToastContext.jsx   Toast notifications
│   │   │
│   │   ├── components/
│   │   │   ├── LoginPage.jsx     Google OAuth login
│   │   │   ├── ProfileSetup.jsx  First-time user type selection
│   │   │   ├── Lobby.jsx         Troop join/pending screen
│   │   │   ├── AdventurePicker.jsx  Adventure list/create
│   │   │   ├── Header.jsx        Nav, countdown, profile
│   │   │   ├── MemberBar.jsx     Crew avatars + badges
│   │   │   ├── Calendar.jsx      Availability + trek blocking
│   │   │   ├── Results.jsx       Best date windows
│   │   │   ├── Skills.jsx        Readiness + journey trail
│   │   │   ├── Itinerary.jsx     Route cards + details
│   │   │   ├── GearList.jsx      Gear checklist + progress
│   │   │   ├── AdminPanel.jsx    Full admin controls
│   │   │   ├── PrintCheatSheet.jsx  Printable itinerary
│   │   │   ├── ConfirmModal.jsx  Generic confirmation
│   │   │   └── Logo.jsx          SVG logo component
│   │   │
│   │   ├── hooks/
│   │   │   └── useCountdown.js   Phase-aware countdown
│   │   │
│   │   └── utils/
│   │       ├── theme.js          Color tokens, badge helpers
│   │       ├── dates.js          Date math utilities
│   │       └── constants.js      Day names, etc.
│   │
│   ├── index.html
│   └── vite.config.js
│
├── Dockerfile            Multi-stage (build client → serve with Node)
├── docker-compose.yml    Service config, volume, network
└── ARCHITECTURE.md       This file
```

## Gamification System

```
Trail Badges (individual, auto-awarded):
  🎒 gear_ready        → All gear items checked
  🏥 trail_medic       → Medical/first-aid skills done
  📋 admin_pro         → Admin paperwork complete
  🥾 training_complete → All training skills done
  ⭐ fully_prepared    → All of the above

Journey Progress Trail (crew-wide):
  ┌─────────┬────────────┬──────────────┬─────────────┬──────────┐
  │ 0%      │ 25%        │ 50%          │ 75%         │ 100%     │
  │Trailhead│ Base Camp  │ Timber Ridge │ Eagle Point │ Summit   │
  │         │ Trustworthy│ Prepared     │ Brave       │ Cheerful │
  └─────────┴────────────┴──────────────┴─────────────┴──────────┘
  Progress = average readiness across all trekking members

Smart Countdown Phases:
  pre          → "Departure in X days"
  travel_there → "Arriving in X days"
  on_trek      → "Day X of Trek" (green banner)
  travel_back  → "Home in X days"
  complete     → "Welcome home!" (gold banner)
```

## Member Model

```
Each adventure member has:
  ┌──────────────────────────────────────────┐
  │ user_type:     "adult" | "scout"         │  ← from users table
  │ role:          "admin" | "member"        │  ← adventure-scoped
  │ participation: "trekking" | "support"    │  ← adventure-scoped
  │ linked_to:     user_id | null            │  ← support adult → scout
  │ is_manual:     0 | 1                     │  ← placeholder (no account)
  └──────────────────────────────────────────┘

  Admin can change ALL of these from the Admin Panel.
  Readiness calculations only count trekking members.
  Support members shown in separate section of MemberBar.
```
