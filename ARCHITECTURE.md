# TrailLog Architecture

> **Schema Version:** 4 | **Last Updated:** 2026-03-09

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

Deploy Pipeline:
  local build → tar → scp → VPS extract → docker compose build → up

Backup Strategy:
  ┌─────────────────────────────────────────────────────────────┐
  │  Daily Cron (2 AM UTC)                                      │
  │  ├── SQLite .backup → /opt/crew614-backups/db/              │
  │  ├── .env snapshot  → /opt/crew614-backups/env/             │
  │  ├── docker-compose.yml → /opt/crew614-backups/config/      │
  │  ├── Rotate: keep last 30 days                              │
  │  └── Git push of code to GitHub                             │
  ├─────────────────────────────────────────────────────────────┤
  │  Local Backup                                               │
  │  ├── Git pull (all code)                                    │
  │  └── SCP of DB + .env → local backups/ directory            │
  └─────────────────────────────────────────────────────────────┘
```

## Data Model (Schema v4)

```
┌─────────────────────────┐
│         users            │
├─────────────────────────┤
│ id, google_id            │
│ name, email, avatar      │
│ password_hash            │
│ user_type ───────────────┼──── "adult" | "scout"
│ parent_email             │
│ parent_email_2           │  ← v4: second parent/guardian email
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
                          ┌────────────────┼────────────────┬──────────────────┐
                          │                │                │                  │
                          ▼                ▼                ▼                  ▼
               ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ ┌──────────────┐
               │ adventure_   │ │ adventure_   │ │  adventure_      │ │ link_        │
               │  members     │ │  skills      │ │  achievements    │ │  requests    │
               ├──────────────┤ ├──────────────┤ ├──────────────────┤ ├──────────────┤
               │ user_id      │ │ id, adv_id   │ │ id, adv_id       │ │ id, adv_id   │
               │ adventure_id │ │ name, desc   │ │ user_id, type    │ │ requester_id │
               │ role ────────┼─┤ category     │ │ badge_type       │ │ scout_id     │
               │ participation│ └──────────────┘ │ awarded_at       │ │ status ──────┤
               │  (trekking/  │                  └──────────────────┘ │  (pending/   │
               │   support)   │                                       │  approved/   │
               │ linked_to ───┼── FK to scout (any adult → scout)     │  denied)     │
               │ is_manual    │                                       │ reviewed_by  │
               │ dates (JSON) │                                       │ created_at   │
               │ skills (JSON)│                                       │ resolved_at  │
               │ gear (JSON)  │                                       └──────────────┘
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

## Parent-Scout Linking (v4)

```
┌─────────────────────────────────────────────────────────────┐
│  Two Linking Paths                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. AUTO-LINK (email match, instant)                        │
│     ┌──────────┐    email matches    ┌──────────┐          │
│     │  Adult   │ ──────────────────► │  Scout   │          │
│     │  (joins) │  parent_email or    │ (in adv) │          │
│     └──────────┘  parent_email_2     └──────────┘          │
│     Triggers: member add, invitation accept                │
│                                                             │
│  2. REQUEST/APPROVE (admin approval required)               │
│     ┌──────────┐  request   ┌───────┐  approve  ┌───────┐ │
│     │  Adult   │ ─────────► │ Admin │ ─────────► │ Link  │ │
│     │ (MemberBar)│          │ Panel │            │ Set   │ │
│     └──────────┘            └───────┘            └───────┘ │
│     Adult selects scout → link_requests table → admin UI   │
│                                                             │
│  3. ADMIN OVERRIDE (direct, any adult → any scout)          │
│     Admin can always directly link from AdminPanel          │
│                                                             │
│  linked_to works for ALL adults (trekking + support)        │
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
                      │    └── parent_email + parent_email_2 (scouts)
                      ├── Lobby              (no approved troop)
                      ├── AdventurePicker    (no adventure selected)
                      │    └── skipAutoSelect support
                      │
                      └── AdventureProvider  (adventure selected)
                           └─ MainView
                                ├── Header
                                │    ├── Logo
                                │    ├── Breadcrumb (troop > adventure)
                                │    ├── Smart Countdown (useCountdown)
                                │    │    └── Phase pill (dark bg, white text)
                                │    └── Profile Dropdown
                                │
                                ├── MemberBar
                                │    ├── Trekking Members (avatars + progress arcs)
                                │    ├── Support Members (separate section)
                                │    ├── "Parent of [Name]" subtitle (linked adults)
                                │    ├── Self-Link Request (unlinked adults → select scout)
                                │    ├── Pending Join Requests (admin view)
                                │    └── Trail Badge Icons (own row only)
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
                                │    ├── Trek date blocking (adventure / travel)
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
                                │    ├── Adventure tab
                                │    │    ├── Settings (dates, status, itinerary)
                                │    │    ├── Create new adventure
                                │    │    └── Delete adventure
                                │    ├── Members tab
                                │    │    ├── Role, type, participation management
                                │    │    ├── Link any adult → any scout
                                │    │    ├── Pending link requests (approve/deny)
                                │    │    ├── Manual member add
                                │    │    ├── Email invitations
                                │    │    └── Remove members
                                │    └── Troop tab (name, description)
                                │
                                ├── ProgressWidgets
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
│  ├── adventureMemberships                                │
│  ├── login(), signup(), logout()                         │
│  ├── updateProfile({ user_type, parent_email,            │
│  │                    parent_email_2 })                   │
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
  PUT  /auth/profile                             → Update name/type/parent_email/parent_email_2

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
  POST /api/adventures/:id/members               → Add member + auto-link
  DELETE /api/adventures/:id/members/:uid         → Remove member
  PUT  /api/adventures/:id/members/:uid/role      → Set admin/member
  PUT  /api/adventures/:id/members/:uid/user-type → Set adult/scout
  PUT  /api/adventures/:id/members/:uid/participation → Set trekking/support
  PUT  /api/adventures/:id/members/:uid/link      → Link adult→scout (validated)
  POST /api/adventures/:id/manual-members         → Add manual member
  DELETE /api/adventures/:id/manual-members/:mid  → Remove manual member

Link Requests (v4):
  POST /api/adventures/:id/link-requests          → Adult requests link to scout
  GET  /api/adventures/:id/link-requests          → List requests (admin: all, member: own)
  PUT  /api/adventures/:id/link-requests/:rid/approve → Approve + set linked_to
  PUT  /api/adventures/:id/link-requests/:rid/deny    → Deny request

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
  GET  /api/invitations/:token                   → Accept invitation + auto-link

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
│   ├── db.js             SQLite schema v4, migrations, all DB functions
│   ├── auth.js           Passport.js Google OAuth strategy
│   ├── email.js          Nodemailer templates (9 email types)
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── main.jsx              Entry point (providers wrap)
│   │   ├── App.jsx               Auth gates, routing, MainView
│   │   ├── api.js                Fetch wrapper, all API methods
│   │   │
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx    User auth state + parent_email_2
│   │   │   ├── ThemeContext.jsx   Dark/light theme
│   │   │   ├── AdventureContext.jsx  Adventure data + computed
│   │   │   └── ToastContext.jsx   Toast notifications
│   │   │
│   │   ├── components/
│   │   │   ├── LoginPage.jsx     Google OAuth login
│   │   │   ├── ProfileSetup.jsx  User type + parent emails (2 fields)
│   │   │   ├── Lobby.jsx         Troop join/pending screen
│   │   │   ├── AdventurePicker.jsx  Adventure list/create
│   │   │   ├── Header.jsx        Nav, countdown, profile
│   │   │   ├── MemberBar.jsx     Crew + parent display + self-link
│   │   │   ├── Calendar.jsx      Availability + trek blocking
│   │   │   ├── Results.jsx       Best date windows
│   │   │   ├── Skills.jsx        Readiness + journey trail
│   │   │   ├── Itinerary.jsx     Route cards + details
│   │   │   ├── GearList.jsx      Gear checklist + progress
│   │   │   ├── AdminPanel.jsx    Admin controls + link request mgmt
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
│   │       ├── dates.js          Date math utilities
│   │       └── constants.js      Day names, etc.
│   │
│   ├── index.html
│   └── vite.config.js
│
├── backups/                Local backup directory (not in git)
├── Dockerfile              Multi-stage (build client → serve with Node)
├── docker-compose.yml      Service config, volume, Traefik labels
├── ARCHITECTURE.md         This file
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
```

## Gamification System

```
Trail Badges (individual, auto-awarded):
  gear_ready        → All gear items checked
  trail_medic       → Medical/first-aid skills done
  admin_pro         → Admin paperwork complete
  training_complete → All training skills done
  fully_prepared    → All of the above

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
  │ linked_to:     user_id | null            │  ← ANY adult → scout
  │ is_manual:     0 | 1                     │  ← placeholder (no account)
  └──────────────────────────────────────────┘

  Linking: ANY adult (trekking or support) can be linked to a scout.
  Auto-link fires when adult's email matches scout's parent_email(s).
  Non-matching adults can request a link (admin approval required).
  Admin can always override and directly link from the Admin Panel.
  Readiness calculations only count trekking members.
  Support members shown in separate section of MemberBar.
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
sendLinkRequestEmail      → Notify admins of parent-link request (v4)
```
