# TrailLog Architecture

> **Schema Version:** 25 | **Last Updated:** 2026-03-30

## System Overview

```
                        +-------------------------------------+
                        |       traillog.gracezero.ai         |
                        |          (Traefik + TLS)            |
                        +-----------------+-------------------+
                                          | :443
                                          v
                        +-------------------------------------+
                        |       Docker: crew614 container     |
                        |            Node 20 Alpine           |
                        |              :3614                  |
                        +-------------------------------------+
                        |                                     |
                        |  +-----------+    +--------------+  |
                        |  |  Express   |    |  Vite-built  |  |
                        |  |  API       |    |  React SPA   |  |
                        |  |  Server    |    |  (static)    |  |
                        |  +-----+-----+    +--------------+  |
                        |        |                            |
                        +--------+----------------------------+
                                 |
                        +--------v----------------------------+
                        |     PostgreSQL (host)               |
                        |     traillog database               |
                        |     connect via 172.18.0.1:5432     |
                        +-------------------------------------+
                                 |
                        +--------+----------------------------+
                        |          External Services          |
                        +-------------------------------------+
                        |  Google OAuth    |  Gmail SMTP      |
                        |  (Passport.js)   |  (Nodemailer)    |
                        +-------------------------------------+
                        |  Anthropic Claude API               |
                        |  (AI Readiness + Gear Engines)      |
                        +-------------------------------------+
```

## Infrastructure & Deployment

```
VPS: Hostinger (Ubuntu)
Docker: single-stage build (pre-built client/dist), Traefik reverse proxy
Database: PostgreSQL on VPS host, Docker connects via host network bridge
GitHub: BillM9000/traillog-portfolio (public), BillM9000/crew614-philmont (private)

Deploy Pipeline:
  npm run build (local) -> tar -> scp -> VPS extract -> docker compose build -> up

Backup Strategy:
  +-------------------------------------------------------------+
  |  backup.sh (rolling, keeps last 10)                         |
  |  +-- Daily Cron (3 AM UTC)                                  |
  |  +-- pg_dump (peer auth via postgres user) -> gzip          |
  |  +-- Docker data export (troop logos, adventure docs)       |
  |  +-- .env snapshot                                          |
  |  +-- Rotate: keeps last 10 of each type, auto-deletes      |
  +-------------------------------------------------------------+
  |  Code Backup                                                |
  |  +-- Git push to GitHub (master branch)                     |
  +-------------------------------------------------------------+
```

## Data Model (Schema v25, 32 tables)

```
+-------------------------+
|         users            |
+-------------------------+
| id, google_id            |
| name, email, avatar      |
| password_hash            |
| user_type                |---- "adult" | "scout"
| parent_email             |
| parent_email_2           |
| email_verified           |
| verification_token       |
| is_admin (0/1)           |
+--------+----------------+
         |
         | user_id
         v
+---------------------+         +---------------------+
|   troop_members      |<--------|       troops         |
+---------------------+  troop  +---------------------+
| user_id, troop_id   |  _id    | id, name            |
| role (admin/member) |         | description         |
| status (pending/    |         | council (required)   |
|   approved/denied)  |         | location             |
|                     |         | is_public (0/1)      |
|                     |         | affiliate_tag        |
+---------------------+         | invite_code          |
                                | logo_url             |
                                +----------+-----------+
                                           |
                                           | troop_id
                                           v
                                +---------------------+
                                |     adventures       |
                                +---------------------+
                                | id, troop_id, name  |
                                | adventure_type      |
                                | itinerary_id        |
                                | depart/arrive/      |
                                |   return/home_date  |
                                | status              |
                                +----------+----------+
                                           |
                          +----------------+----------------+
                          |                |                |
                          v                v                v
               +--------------+ +--------------+ +------------------+
               |    crews      | | adventure_   | |  adventure_      |
               +--------------+ |  skills      | |  achievements    |
               | id, adv_id   | +--------------+ +------------------+
               | name, dates  | | id, adv_id   | | id, adv_id       |
               | itinerary_id | | name, desc   | | user_id, type    |
               +--------------+ | category     | | badge_type       |
                     |          +--------------+ | awarded_at       |
                     v                           +------------------+
               +--------------+
               | crew_members |
               +--------------+
               | crew_id      |
               | user_id      |
               | role         |
               +--------------+
                     |
                     v
               +--------------+
               | adventure_   |
               |  members     |
               +--------------+
               | user_id      |
               | adventure_id |
               | role         |
               | participation|
               | linked_to    |
               | is_manual    |
               | dates (JSON) |
               | skills (JSON)|
               +--------------+

--- Gear System ---

+---------------------+     +-----------------------+
|   gear_catalog       |     |  gear_product_options  |
+---------------------+     +-----------------------+
| id, name            |<----|  gear_catalog_id       |
| category            |     |  product_name, brand   |
| subcategory         |     |  price, weight_oz      |
| weight_oz           |     |  tier (budget/mid/     |
| priority (essential/|     |    premium)            |
|  recommended/       |     |  affiliate_url         |
|  optional)          |     +-----------------------+
| sharing_type        |
+----------+----------+
           |
           v
+----------------------+     +-----------------------+
|  member_gear_items   |     |  troop_gear_overrides  |
+----------------------+     +-----------------------+
| adventure_id         |     | troop_id              |
| user_id              |     | gear_catalog_id       |
| gear_catalog_id      |     | hidden (0/1)          |
| status (needed/      |     +-----------------------+
|   owned/packed)      |
| custom_weight_oz     |     +-----------------------+
+----------------------+     |  troop_custom_gear    |
                             +-----------------------+
                             | troop_id, name        |
                             | category, priority    |
                             | weight_oz             |
                             +-----------------------+

--- Additional Tables ---

training_events, training_rsvps, invitations, link_requests,
member_assessments, adventure_documents, affiliate_clicks,
platform_settings, sessions (connect-pg-simple)
```

## Two-Tier Admin System

```
+-------------------------------------------------------------+
|  GLOBAL ADMIN (users.is_admin = 1)                           |
|  +-- Gear Catalog: CRUD items + product options              |
|  +-- Troop Overview: all troops, member counts               |
|  +-- Affiliate Analytics: click tracking, top products       |
|  +-- Platform Settings: key-value config editor              |
|  +-- Promote/demote other admins via API                     |
|  +-- Also has all Troop Admin powers                         |
+-------------------------------------------------------------+
|  TROOP ADMIN (role=admin on troop_members)                   |
|  +-- Gear Overrides: hide/show global items for their troop  |
|  +-- Custom Gear: add troop-specific items                   |
|  +-- Member Management: role, type, participation, linking   |
|  +-- Adventure Management: create, dates, status             |
|  +-- Skills Management: add/remove training skills           |
|  +-- Training Events: schedule, manage RSVPs                 |
+-------------------------------------------------------------+

Middleware access control:
  requireAdventureMember  -- NO global admin bypass
  requireAdventureAdmin   -- YES global admin + troop admin bypass
  requireGlobalAdmin      -- checks users.is_admin = 1
```

## Client Architecture

```
main.tsx
  +- ThemeProvider (dark class on <html>, localStorage)
       +- ToastProvider
            +- AuthProvider
                 +- App.tsx
                      |
                      +-- LandingPage        (unauthenticated, 5-section marketing)
                      +-- ProfileSetup       (no user_type yet)
                      +-- OnboardingWizard   (forced flow for new users)
                      +-- HomeDashboard      (post-login hub, troop cards)
                      +-- ApprovalPage       (/approve/:token, standalone)
                      |
                      +-- AdventureProvider  (adventure selected)
                           +- MainView
                                |
                                +-- Desktop (1024px+):
                                |   +-- Sidebar (220px, collapsible to 64px)
                                |   +-- TopBar (48px, section title, countdown)
                                |   +-- DashboardOverview (stat cards + readiness)
                                |   +-- MembersTable (sortable, 5 columns)
                                |
                                +-- Mobile (<1024px):
                                |   +-- Header (logo, crew name, countdown)
                                |   +-- Tab Grid (3x2, Lucide icons)
                                |
                                +-- Content Tabs:
                                     +-- Training (calendar, availability)
                                     +-- Readiness (skills, journey trail)
                                     +-- Itinerary (day cards, print)
                                     +-- Gear (catalog, pack weight, AI chat)
                                     +-- Reports (8 types, Excel export)
                                     +-- Docs (file upload, adventure docs)
                                     |
                                     +-- AdminPanel (modal)
                                     +-- GlobalAdmin (modal, 4 tabs)

Code Splitting: React.lazy for 16 components, 62% main bundle reduction
Styling: Tailwind CSS v4 with tl-* component classes, clsx conditionals
Icons: Lucide React (MIT) for UI, clay PNGs for decorative
```

## React Contexts

```
+----------------------------------------------------------+
|  ThemeContext                                             |
|  +-- isDark, mode ("dark" | "light")                     |
|  +-- toggleTheme() -- adds/removes dark class on <html>  |
+----------------------------------------------------------+
|  ToastContext                                            |
|  +-- addToast(message, type)                             |
|  +-- removeToast(id)                                     |
+----------------------------------------------------------+
|  AuthContext                                             |
|  +-- user (includes is_global_admin flag)                |
|  +-- memberships, approvedTroops, adventureMemberships   |
|  +-- login(), signup(), logout(), googleAuth()           |
|  +-- updateProfile(), refresh()                          |
+----------------------------------------------------------+
|  AdventureContext                                        |
|  +-- adventure, members, skills, itinerary               |
|  +-- trekDates (depart/arrive/return/home)               |
|  +-- achievements { badges, milestones }                 |
|  +-- gearCatalog, memberGearMap                          |
|  +-- trekkingMembers, supportMembers                     |
|  +-- refreshAll/Members/Skills/Achievements/MemberGear() |
+----------------------------------------------------------+
```

## Server API Routes (161 total)

```
Auth (10 routes):
  POST /auth/signup, /auth/login, /auth/logout
  GET  /auth/google, /auth/google/callback, /auth/me
  PUT  /auth/profile
  POST /auth/forgot-password, /auth/reset-password, /auth/verify-email

Troops (12 routes):
  GET/POST /api/troops, PUT /api/troops/:id
  GET  /api/troops/:id/members, /api/troops/:id/invite-code
  POST /api/troops/:id/join, /api/troops/:id/join-by-code
  PUT  /api/troops/:id/members/:uid/approve|deny
  POST /api/troops/:id/leave
  PUT  /api/troops/:id/settings

Adventures (6 routes):
  GET/POST /api/troops/:id/adventures
  PUT/DELETE /api/adventures/:id
  GET  /api/adventures/:id/join-info

Adventure Members (14 routes):
  GET/POST /api/adventures/:id/members
  DELETE /api/adventures/:id/members/:uid
  PUT  role, user-type, participation, link, dates, skills, medical, admin-tasks
  POST /api/adventures/:id/manual-members
  DELETE /api/adventures/:id/manual-members/:mid

Crews (8 routes):
  GET/POST /api/adventures/:id/crews
  PUT/DELETE /api/adventures/:id/crews/:cid
  GET/POST/DELETE /api/adventures/:id/crews/:cid/members

Training Events (6 routes):
  GET/POST /api/adventures/:id/training-events
  PUT/DELETE /api/adventures/:id/training-events/:eid
  POST /api/adventures/:id/training-events/:eid/rsvp

Gear (20+ routes):
  Catalog CRUD, member gear status, pack weight, troop overrides,
  troop custom gear, bulk operations

Skills, Achievements, Invitations, Link Requests, Documents,
Global Admin, Affiliate, AI Gear, Content, Health: ~85 routes
```

## Database Layer

```
PostgreSQL accessed via `pg` Pool (async):
  - $1, $2, $3 numbered placeholders (not ? like SQLite)
  - INSERT ... ON CONFLICT DO UPDATE for upserts
  - RETURNING id for insert ID retrieval
  - BEGIN/COMMIT/ROLLBACK for transactions
  - 170 exported async functions in db.js
  - connect-pg-simple for session store (auto-creates sessions table)

Key patterns:
  const { rows } = await pool.query('SELECT ...', [param1, param2]);
  const { rows: [row] } = await pool.query('... RETURNING id', [...]);

Transactions:
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // ... operations ...
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
```

## Security

```
Request Pipeline:
  express.json (10KB limit) -> helmet -> rate limiters ->
  session (PostgreSQL store) -> passport -> CSRF check -> route handlers

Security Headers (Helmet.js):
  Content-Security-Policy    scriptSrc: ["'self'"] (no unsafe-inline)
  X-Frame-Options            SAMEORIGIN
  X-Content-Type-Options     nosniff
  Strict-Transport-Security  max-age=15552000; includeSubDomains
  Referrer-Policy            no-referrer

CSRF Protection:
  Double-submit cookie pattern
  Session token -> XSRF-TOKEN cookie -> X-CSRF-Token header
  Exempts: /api/vote, /api/public-settings, GET requests

Rate Limiting (express-rate-limit):
  authLimiter    20 req / 15 min  (login, signup, password reset)
  apiLimiter    100 req / 1 min   (all /api/ routes)

Input Validation:
  Zod schemas    14 schemas on auth, troop, training, admin, vote, readiness
  parseId()      Safe parseInt (null not NaN)
  express.json   10KB body limit
  esc()          HTML-escape in email templates
  Parameterized  100% prepared statements, zero concatenation

Audit Logging:
  pino structured JSON logger
  Request metadata, user actions, security events

Docker Security:
  Non-root user  appuser (uid 1001)
  Alpine image   Minimal attack surface
  Log rotation   json-file, 10MB max, 3 files

Session Management:
  httpOnly: true      No JavaScript access
  secure: true        HTTPS only (production)
  sameSite: "lax"     CSRF mitigation
  Session fixation    req.session.regenerate() after login
  PostgreSQL store    connect-pg-simple
```

## Email Templates (12 types)

```
sendVerificationEmail         -> Email verification link (signup)
sendPasswordResetEmail        -> Password reset token
sendJoinRequestEmail          -> Notify admins of join request
sendMemberApprovedEmail       -> Notify member approved to troop
sendMemberDeniedEmail         -> Notify member denied from troop
sendInvitationEmail           -> Invite someone to join adventure
sendParentNotificationEmail   -> Notify parent of scout activity
sendDateChangedEmail          -> Notify when trek dates change
sendItineraryChangedEmail     -> Notify when itinerary changes
sendTrainingScheduledEmail    -> Notify of scheduled training event
sendBadgeEarnedEmail          -> Congratulate badge achievement
sendLinkRequestEmail          -> Notify admins of parent-link request
```

## Testing

```
Framework: Playwright (browser automation)
Suites: 17 test files, 168 total tests
Personas: 10 pre-configured accounts with saved auth state
Runtime: ~7 minutes for full suite
Database: Tests run against production PostgreSQL

See docs/testing/methodology.md for full details.
```

## File Structure

```
crew614/
+-- server/
|   +-- index.js          Express app, 161 API routes, helmet, middleware
|   +-- db.js             PostgreSQL pool, 170 async functions, schema v25
|   +-- middleware.js      Auth middleware, CSRF, rate limiting
|   +-- auth.js           Passport.js Google OAuth + local strategy
|   +-- email.js          Nodemailer templates (12 email types, XSS-escaped)
|   +-- gear-ai.js        Claude Haiku gear recommendations
|   +-- ai-readiness.js   Claude Sonnet readiness coaching
|   +-- scheduler.js      Cron jobs (gear refresh, session cleanup)
|   +-- routes/            Route modules (auth, troops, adventures, gear, admin)
|   +-- package.json
|
+-- client/
|   +-- src/
|   |   +-- main.tsx              Entry point (providers wrap)
|   |   +-- App.tsx               Auth gates, routing, code splitting
|   |   +-- app.css               Tailwind v4 config, tl-* classes, theme
|   |   +-- api.ts                Fetch wrapper, all API methods
|   |   |
|   |   +-- contexts/
|   |   |   +-- AuthContext.tsx    User auth state
|   |   |   +-- ThemeContext.tsx   Dark/light theme (dark class toggle)
|   |   |   +-- AdventureContext.tsx  Adventure + gear + members data
|   |   |   +-- ToastContext.tsx   Toast notifications
|   |   |
|   |   +-- components/           42+ TSX components
|   |   |   +-- desktop/          Sidebar, TopBar, DashboardOverview, MembersTable
|   |   |   +-- HomeDashboard.tsx Post-login hub with troop cards
|   |   |   +-- LandingPage.tsx   5-section marketing with auth form
|   |   |   +-- AdminPanel.tsx    Adventure/member/troop admin
|   |   |   +-- GlobalAdmin.tsx   4-tab global admin panel
|   |   |   +-- (38+ more...)
|   |   |
|   |   +-- types/                TypeScript type definitions
|   |   +-- hooks/                useCountdown, useIsDesktop
|   |   +-- utils/                theme.ts, readiness.ts, dates.ts
|   |
|   +-- vite.config.ts
|
+-- db/
|   +-- schema.pg.sql        PostgreSQL schema (32 tables)
|
+-- tests/
|   +-- *.spec.mjs           17 Playwright test suites
|   +-- global-setup.mjs     Auth state generation
|   +-- auth-helpers.mjs     CSRF + persona utilities
|
+-- docs/
|   +-- architecture/        Overview, data flow
|   +-- security/            Threat model, auth, data protection, audit
|   +-- testing/             Integration test methodology
|   +-- operations/          Backup, DR, incident response, runbook
|   +-- diagrams/            6 Mermaid architectural diagrams
|
+-- Dockerfile              Single-stage build, non-root user
+-- docker-compose.yml      Service config, Traefik labels
+-- ARCHITECTURE.md         This file
+-- SECURITY.md             Vulnerability disclosure policy
+-- README.md               Project overview
```

## Schema Migration History

```
v1-v7   -> Initial schema through gear system, affiliate tracking, council scoping
v8-v10  -> Training events, RSVPs, member assessments
v11-v14 -> Crews layer, crew_members, adventure documents
v15-v18 -> Multi-crew support, crew-scoped itineraries and dates
v19-v22 -> Troop settings, invite codes, logo URLs, approval tokens
v23-v25 -> PostgreSQL migration, session store, index optimization
```
