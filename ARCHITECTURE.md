# TrailLog: system architecture

This document covers the architecture of TrailLog as it exists in the private source on 2026-09-22: system design, data model, API patterns, frontend architecture, infrastructure and the reasoning behind the main decisions. Counts marked as counted were generated from the code on that date.

---

## High-level architecture

```
+------------------------------------------------------------------+
|                        CLIENT (browser)                          |
|  React 18 + Vite 6 + TypeScript                                  |
|  Tailwind CSS 4 · React Router 7 · Recharts (lazy) · Sentry      |
+-------------------------------+----------------------------------+
                                | HTTPS (automatic certificates via Traefik)
+-------------------------------v----------------------------------+
|                     TRAEFIK REVERSE PROXY                        |
|  TLS termination · certificate renewal · HTTP to HTTPS redirect  |
+-------------------------------+----------------------------------+
                                |
+-------------------------------v----------------------------------+
|               EXPRESS 4 APPLICATION SERVER (TypeScript)          |
|  Passport (Google OAuth, local) · PostgreSQL session store       |
|  Helmet CSP · express-rate-limit · CSRF double-submit            |
|  Zod validation · pgtyped typed SQL · Sentry · Nodemailer        |
+-------------------------------+----------------------------------+
                                | pg connection pool
+-------------------------------v----------------------------------+
|                          POSTGRESQL 16                           |
|  50 tables (counted) · troop-scoped data · 427 typed queries     |
+------------------------------------------------------------------+
```

Two environments run on the same host: production and QA, each in its own container with its own database. QA sits behind a Google sign-in gate and takes full test runs before a production deploy.

---

## Data model

The data model is organised around a four-level hierarchy:

```
Troop (scoped by council)
 └── Adventure  (a trek, for example a Philmont season)
      └── Crew(s)
           └── Members  (scouts, parents, leaders)
```

Selected tables from the 50 in the schema:

| Entity | Description |
|--------|-------------|
| troops, councils | Multi-tenant root; a troop belongs to a council |
| adventures, adventure_days, adventure_documents | A trek, its custom day plan and its documents |
| crews, crew_members, crew_milestones | Crews inside an adventure, their rosters and milestones |
| users, link_requests | All roles in one table; parent-to-scout links created by approved requests |
| gear_catalog, member_gear, troop_gear_overrides, troop_custom_gear | The catalog, per-member gear state, and troop-level customisation |
| gear_affiliate_links, affiliate_clicks | Affiliate product links and click tracking |
| itineraries, catalog_trips | The 48 Philmont itineraries (counted) and the trip catalog |
| training_events, training_rsvps, training_attendance, training_event_polls | Calendar events, RSVPs, attendance and multi-date polls |
| training_phases, training_phase_progress, training_logs | The four-phase programme and personal logs |
| member_assessments, readiness_plans, readiness_progress | Self-assessments, generated plans and progress |
| ai_gear_recommendations, gear_ai_logs | Cached recommendations and model call logs with token counts |
| achievements | Auto-awarded trail badges |
| prep_events, travel_legs, travel_leg_drivers | Preparation events and travel logistics with driver roles |
| medical_reminders, announcements, invitations | Reminders, troop announcements and invitations |

**Isolation.** Troop and adventure identifiers are parameters of the typed queries that return scoped data, and an integration suite exercises cross-troop access attempts and expects refusal.

---

## API design

185 route handlers (counted) across 13 Express modules: admin, adventures, auth, crews, directory, gear, home, medical, prep events, training, training (v5 programme), travel legs and troops.

Patterns enforced throughout:

- **Typed SQL.** Queries are written in .sql files and compiled by pgtyped into TypeScript functions with typed parameters and result rows; 427 queries (counted). No string-built SQL.
- **Zod at the boundary.** 18 schemas (counted) validate request bodies on the 16 write endpoints that accept user-shaped input, before any query runs.
- **Rate limits.** 20 requests per 15 minutes on authentication routes, 300 per minute on the API.
- **Transactions** for multi-step writes.

---

## Frontend architecture

### Responsive bifurcation

TrailLog uses a hard breakpoint rather than one fluid layout:

- **Mobile:** bottom navigation, compact header, stacked panels
- **Desktop:** collapsible sidebar, top bar, multi-panel analytics layouts

Each major view renders either a mobile or a desktop component tree. Shared hooks and contexts keep the data logic in one place; only the presentation diverges.

### Components and code splitting

115 TypeScript components (counted). 36 of them (counted) load through a lazy loader that wraps React.lazy with one extra behaviour: when a content-hashed chunk is missing after a deploy because the browser cached the old index page, it reloads the page once before surfacing an error. Chart components load in their own chunks.

### State

Context providers for application-wide concerns, including the theme (dark mode toggles a class on the document root). Everything else is local component state, so data flow stays traceable.

### Routing

React Router 7 with parameterised routes. Deep links and browser history work; the server serves the app shell for client routes.

---

## Security architecture

| Control | Implementation |
|---------|---------------|
| CSRF | Double-submit cookie: a per-session token is mirrored into a cookie the client echoes in a request header |
| Content security policy | Helmet with scripts restricted to the app's origin; styles allow inline rules for the Tailwind build and a fonts host |
| Rate limiting | Authentication routes 20 per 15 minutes; API 300 per minute |
| Input validation | Zod schemas on write endpoints; typed query parameters |
| SQL injection | pgtyped typed queries with bound parameters; no dynamic SQL |
| Sessions | PostgreSQL session store; seven-day lifetime; httpOnly, SameSite lax; regenerated on login |
| Passwords | bcrypt hashing |
| Transport | Traefik terminates TLS with automatic certificates and redirects HTTP to HTTPS |
| Container | Runs as a non-root user on a Node 22 base image |
| Identity | Google OAuth 2.0 and local email/password through Passport |

---

## Infrastructure and deployment

```
+------------------------------------------------------------+
|                    Shared hardened host                    |
|   Traefik  ->  production container  ->  PostgreSQL 16     |
|            ->  QA container (Google sign-in gate) -> QA DB |
+------------------------------------------------------------+
```

Deployment is a scripted, operator-run procedure:

1. Build the client
2. Package the deployable tree
3. Upload to the host
4. Extract and rebuild the container image, restart the container
5. Record the deploy manifest
6. List the images now present
7. Verify the health endpoint; the script prints the rollback command (retag the previous image and restart)

Hostnames, addresses and ports are left out of this document on purpose.

---

## Monitoring

| Layer | Tool | Triggers on |
|-------|------|-------------|
| External uptime | UptimeRobot, every five minutes | Downtime, or a 503 from the health endpoint when the database is unreachable |
| Application errors | Sentry, client and server, 20 percent trace sampling | Unhandled exceptions, React crashes, slow transactions |
| Infrastructure | Host monitor script by cron, every 15 minutes, ten checks | Disk above 85 percent, backup older than 25 hours, container memory above 256 MB, container restarts, and other host and container checks |

The health endpoint queries the database on every ping and returns 503 when the connection fails, which is what makes the external probe useful for database failures.

---

## AI integration

Two features, two caching strategies:

**Readiness plans.** Generated on demand from a member's short self-assessment, the trek and its dates, and stored with the tokens used. A dispatcher chooses an activity-specific prompt. If the model is unavailable, a rule-based generator produces the same JSON shape.

**Gear recommendations.** Generated per catalog item, cached with a seven-day expiry, and refreshed by a daily scheduler. Pages read from the cache, so a user never waits on a model call.

**Cost containment.** Model calls are bounded by data, not by user activity: recommendations are refreshed on a schedule, plans are generated when a member asks for one, and every call records its token usage.

---

## Key decisions

**PostgreSQL over SQLite.** The prototype used SQLite. Concurrent writes from several users and a need for connection pooling led to PostgreSQL before launch.

**Sessions over JWTs.** Crew leadership changes and members leave; immediate revocation matters more than statelessness. Server-side sessions in PostgreSQL give instant revocation and easy inspection.

**Typed SQL over an ORM.** pgtyped compiles hand-written SQL into typed functions, so the query is visible and the types are checked at build time.

**TypeScript on both sides.** The client and the server are TypeScript, and the server's SQL is typed at build time, so a schema change surfaces as a compile error rather than a runtime one.

**Code splitting with a retrying loader.** Added because a cached index page can reference chunk files that a deploy removed, which otherwise shows a blank screen.

**Tailwind CSS 4 over a component library.** The dual-layout design, custom colour tokens and a Scouting-specific visual language fought against prebuilt component defaults. Custom properties and a small set of component classes give full control without unused variants.

**Responsive bifurcation over a fluid layout.** Sidebars, data tables and drill-down panels do not collapse gracefully to a phone. Separate mobile and desktop trees for those views keep both clean, with shared hooks holding the logic.
