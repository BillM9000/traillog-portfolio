# TrailLog — System Architecture

This document covers the architecture of TrailLog: system design, data model, API patterns, frontend architecture, infrastructure, and key engineering decisions with rationale.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                        │
│  React 18 + Vite + TypeScript                                   │
│  Tailwind CSS v4 · React Router · Recharts · Sentry             │
└─────────────────┬───────────────────────────────────────────────┘
                  │ HTTPS (Let's Encrypt via Traefik)
┌─────────────────▼───────────────────────────────────────────────┐
│                    TRAEFIK REVERSE PROXY                        │
│  TLS termination · Automatic cert renewal · HTTP→HTTPS redirect │
└─────────────────┬───────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────────┐
│                  EXPRESS.JS APPLICATION SERVER                  │
│  Node.js · Passport.js · connect-pg-simple sessions             │
│  Helmet CSP · express-rate-limit · CSRF middleware              │
│  Zod input validation · Sentry SDK · Nodemailer                 │
└─────────────────┬───────────────────────────────────────────────┘
                  │ pg.Pool (connection pooling)
┌─────────────────▼───────────────────────────────────────────────┐
│                      POSTGRESQL 16                              │
│  32 schema tables · Row-level data isolation by troop           │
│  pg_stat_statements for query performance monitoring            │
└─────────────────────────────────────────────────────────────────┘
```

Two environments run in parallel on the same VPS: **production** (public-facing) and **QA** (HTTP Basic Auth protected), each with its own Docker container and database. Playwright's full test suite runs against QA before any production deploy.

---

## Data Model

TrailLog's data model is organized around a four-level hierarchy:

```
Troop
 └── Adventure  (e.g., "Philmont 2026")
      └── Crew(s)
           └── Members  (Scouts, parents, leaders)
```

**Core tables (32 total):**

| Entity | Description |
|--------|-------------|
| `troops` | Multi-tenant root. Every query is scoped by `troop_id`. |
| `adventures` | A specific high-adventure trek (Philmont, Northern Tier, etc.). |
| `crews` | A group within an adventure. Adventures support multiple sister crews. |
| `users` | Unified table for all roles: admin, leader, scout, parent. |
| `crew_members` | Join table: users ↔ crews, with role and readiness data. |
| `gear_items` | 68-item gear catalog with category, priority, weight, and affiliate links. |
| `user_gear` | Per-user gear state: needed → owned → packed (3-state). |
| `itineraries` | 48 selectable Philmont routes with day-by-day camps, mileage, and elevation. |
| `training_events` | Calendar events with RSVP and crew overlap heat map data. |
| `badges` | 7 auto-awarded trail badges with trigger conditions. |
| `ai_gear_recommendations` | Cached AI gear recommendations (weekly refresh, served on-demand). |
| `sessions` | PostgreSQL-backed session store (connect-pg-simple). |

**Isolation guarantee:** Troop isolation is enforced at the query layer, not just the route layer. Every `db.js` function that returns troop data takes `troop_id` as a parameter and includes it in the `WHERE` clause. There is no code path that returns data across troop boundaries except the system admin role (which has no UI).

---

## API Design

**144 route handlers across 7 Express modules:**

| Module | Approx. Routes | Responsibility |
|--------|---------------|----------------|
| `auth.js` | ~15 | Google OAuth, email/password login, session management |
| `users.js` | ~25 | Profiles, roles, parent-scout linking |
| `gear.js` | ~20 | Gear tracking, catalog, pack weight calculator |
| `training.js` | ~25 | Events, RSVPs, calendar, AI training plan generation |
| `readiness.js` | ~20 | Readiness scores, badges, milestones |
| `admin.js` | ~25 | Troop/adventure management, itinerary selection |
| `reports.js` | ~14 | Excel/PDF exports, print-ready roster and readiness reports |

**Patterns enforced throughout:**

- **Parameterized queries only** — 182 async `db.js` functions, all using `$1, $2, $3` binding. Zero string concatenation in SQL.
- **Zod validation on 16 route groups** — schema validation at the request boundary before any DB operation runs.
- **`parseId()` on all route params** — coerces and validates integer IDs before query execution, preventing IDOR via crafted strings.
- **RESTful resource nesting** — routes mirror the data hierarchy: `/api/troop/:troopId/adventure/:adventureId/crew/:crewId/...`
- **Async/await throughout** — all db.js functions return Promises; no callback patterns remain in the codebase.
- **Transactions for multi-step writes** — manual `BEGIN` / `COMMIT` / `ROLLBACK` in try-catch-finally for operations that touch multiple tables.

---

## Frontend Architecture

### Responsive Bifurcation

TrailLog uses a **hard breakpoint layout strategy** rather than a single fluid layout:

- **Mobile (< 1024px):** Bottom navigation bar (6 tabs), compact header, vertically stacked content panels
- **Desktop (≥ 1024px):** Collapsible sidebar, top bar, BI-style multi-panel layouts with side-by-side data views

The breakpoint is detected via a `useIsDesktop` hook wrapping `window.matchMedia`. Each major view renders either a mobile or desktop component tree — two distinct layouts, not one layout trying to serve both. This keeps each layout clean and prevents the compromise that typically degrades both.

### Component Architecture

**49 TypeScript React components** organized by domain:

```
client/src/components/
├── layout/          # Header, Sidebar, BottomNav, TopBar, HamburgerDrawer
├── views/           # Home, Gear, Training, Readiness, Itinerary, Reports, Docs
├── desktop/         # BI panels, member tables, drill-down panels (desktop-only)
├── admin/           # Troop management, member management, itinerary picker
├── auth/            # Login, registration, password reset flows
└── shared/          # Reusable UI primitives (badges, cards, modals)
```

### Code Splitting

**27 components** are lazy-loaded via a custom `lazyWithRetry()` wrapper:

```
Initial bundle:   226KB gzip  (was 599KB before splitting — 62% reduction)
Recharts chunk:   ~200KB      (only loaded when BI dashboard is visited)
Heavy views:      loaded on demand per route
```

`lazyWithRetry()` extends `React.lazy()` with one critical behavior: when a content-hashed chunk is missing after a deploy (user has cached old `index.html` referencing deleted filenames), it auto-reloads the page once before surfacing an error. A `sessionStorage` flag prevents reload loops. This eliminates the "blank screen after deploy" failure mode that affects SPAs without this pattern.

### State Management

No Redux or Zustand. Context API for three application-wide concerns:

| Context | Scope |
|---------|-------|
| `AuthContext` | Current user identity, session state, login/logout |
| `AdventureContext` | Current adventure selection (uses safe variant on pages outside adventure scope) |
| `ThemeContext` | Dark/light mode toggle |

All other state is local to components. The deliberate avoidance of a global state manager keeps data flow traceable — you can follow a prop from render to origin without navigating a store graph.

### Routing

React Router v6 with parameterized clean URLs:

```
/troop/:troopId/adventure/:adventureId/:tab
```

Deep links work, browser back/forward works, all routes are client-side with server fallback to `index.html`.

---

## Security Architecture

| Control | Implementation |
|---------|---------------|
| **CSRF** | Double-submit cookie: `XSRF-TOKEN` cookie echoed as `X-CSRF-Token` request header. Validated middleware on all state-mutating routes. |
| **CSP** | Helmet.js `contentSecurityPolicy` with `scriptSrc: ["'self'"]` — no `unsafe-inline`. Prevents injected script execution. |
| **Rate limiting** | Auth routes: 20 req/15 min. API routes: 100 req/min. Separate limits prevent credential stuffing from exhausting the API budget. |
| **Input validation** | Zod schemas on 16 route groups. `parseId()` on all params. `esc()` for email content (XSS via transactional email). |
| **SQL injection** | Parameterized queries throughout. No dynamic SQL construction anywhere in the codebase. |
| **Session security** | PostgreSQL session store. 7-day expiration. Session ID regenerated on login and logout. `httpOnly`, `secure`, `sameSite=strict` in production. |
| **Password hashing** | bcrypt with configurable salt rounds. |
| **TLS** | Automatic Let's Encrypt via Traefik. HTTP redirects to HTTPS. HSTS headers. |
| **Container security** | Non-root user in Docker container. Read-only bind mounts where possible. |
| **Auth providers** | Google OAuth 2.0 (passport-google-oauth20) + email/password (passport-local). |

---

## Infrastructure & Deployment

```
┌─────────────────────────────────────────────────────────┐
│                   Hostinger KVM2 VPS                    │
│                                                         │
│   ┌──────────┐      ┌───────────────────────────────┐  │
│   │ Traefik  │      │      PostgreSQL 16             │  │
│   │ (router) │      │  prod DB + QA DB               │  │
│   └────┬─────┘      └───────────────┬───────────────┘  │
│        │                            │                   │
│   ┌────▼────────────────────────────▼───────────────┐  │
│   │   crew614-prod (Docker)                         │  │
│   │   Express.js + Node.js                          │  │
│   │   Serves React SPA from dist/ + REST API        │  │
│   └─────────────────────────────────────────────────┘  │
│   ┌─────────────────────────────────────────────────┐  │
│   │   crew614-qa (Docker)                           │  │
│   │   QA environment (HTTP Basic Auth)              │  │
│   └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Deployment workflow (fully scripted, human-approved):**

1. Typecheck (`tsc --noEmit`) — fails fast on type errors before any build
2. Build client (`vite build` → `client/dist/`)
3. Package and upload to VPS
4. Docker image rebuild (multi-stage: install deps → copy dist → run as non-root)
5. Zero-downtime container restart (`docker compose up -d`)
6. Health check verification (`/api/health` returns DB connectivity + memory)
7. Git tag and push

**Environment promotion:** `localhost:5173` → QA (HTTP Basic Auth) → Production. Playwright full suite must pass on QA before any production deploy. Production gets smoke tests only (no test data).

---

## Monitoring Stack (4 layers)

| Layer | Tool | Triggers on |
|-------|------|-------------|
| External uptime | UptimeRobot (5 min interval) | HTTP downtime, `503` from `/api/health` (DB unreachable) |
| Application errors | Sentry (client + server) | Unhandled exceptions, React crashes, slow transactions |
| Infrastructure health | `monitor.sh` cron (every 15 min) | Disk >85%, backup stale >25h, container memory >256MB, session bloat, error rate spikes, auth brute force (429s) |
| Query performance | `pg_stat_statements` | Slow queries, missing indexes |

`/api/health` is the integration point between layers 1 and 4: it queries the database on every ping and returns `503` if the connection fails. This means UptimeRobot catches database failures, not just process crashes. The endpoint also returns Node.js RSS/heap memory and process uptime, surfaced in the admin panel.

---

## AI Integration

**Claude API** (Anthropic) powers two features with different caching strategies:

**AI Training Plans**
- Personalized multi-phase training plans from a Scout's self-assessment: current fitness, hiking experience, altitude exposure, and time to trek.
- Generated once per user per trek cycle (enforced at the DB layer). Not real-time on every page load.
- Cost at scale: ~$0.03/user/trek cycle at Claude Haiku pricing. A 50-user Large Troop costs ~$1.50 per trek cycle.

**AI Gear Recommendations**
- Weekly background batch job generates recommendations per crew, stored in `ai_gear_recommendations`.
- Served from DB on request — the UX feels real-time but it's serving cached results.
- Cost: fixed per week regardless of how many users view recommendations.

**Cost containment principle:** AI calls are bounded by data, not by user activity. Gear recommendations are batched weekly (not per page load). Training plans are one-time per trek cycle (not re-generated on every login). This bounds AI spend to a predictable ceiling, not a per-request variable.

---

## Key Engineering Decisions

**PostgreSQL over SQLite**

SQLite was used in the prototype. It has no connection pooling, no row-level locking, and inconsistent concurrent write behavior under Docker. The data model requires multi-table joins, concurrent session writes from multiple users, and `pg_stat_statements` for query monitoring. PostgreSQL migration (March 2026) resolved several concurrency bugs and unlocked proper performance instrumentation.

**Session-based auth over JWT**

JWTs are stateless by design — revoking one without a blocklist requires short expiry windows (degraded UX) or an allowlist that defeats the stateless benefit. For a crew management app, instant revocation is a real requirement: crew leadership changes, members leave, security incidents happen. Server-side sessions in PostgreSQL give immediate revocation, easy introspection (`SELECT * FROM sessions WHERE user_id = ?`), and no token management complexity on the client.

**Code-splitting 27 components**

The initial bundle was 599KB gzip — too large for mobile users on cell data at trailheads. Recharts alone accounts for ~200KB. Lazy-loading all chart components and heavy views (reports, admin panels) reduced the initial load to 226KB gzip (62% reduction). `lazyWithRetry` was added after a post-deploy incident where cached `index.html` referenced deleted chunk filenames, causing blank screens for users with browser cache.

**TypeScript on client, JavaScript on server**

The client benefits most from TypeScript: IDE autocomplete, type-safe API response handling, compile-time prop errors, and safer refactoring of 49 components. The server is plain JavaScript with JSDoc annotations. Converting the server to TypeScript would add build pipeline complexity with minimal marginal benefit — Vitest runs unit tests on all server functions, and Zod validates all inputs at runtime. The tradeoff is deliberate, not an oversight.

**Tailwind CSS v4 over a component library**

MUI, shadcn, and Radix were evaluated. The app's design system has requirements that fight against pre-built component defaults: dual-breakpoint layout with completely different DOM structures, custom color tokens and dark mode, a Scout-specific visual language. Building on Tailwind v4 with CSS custom properties gives full control without importing unused component variants. The tradeoff is more initial CSS authoring; the benefit is zero bundle bloat from library components and no override specificity battles.

**Responsive bifurcation over fluid layout**

CSS-fluid responsive design works well for content-heavy marketing sites. It struggles with BI layouts: sidebar navigation, data tables, drill-down panels, and multi-column dashboards can't gracefully collapse to mobile without significant compromises in both directions. TrailLog uses separate mobile and desktop component trees for views with complex layout requirements. Shared data-fetching hooks and contexts keep business logic consistent; only the presentation layer diverges.
