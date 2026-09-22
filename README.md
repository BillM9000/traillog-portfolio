# TrailLog

TrailLog is a multi-tenant SaaS platform for Scouting America high-adventure crew preparation: training, gear, readiness and logistics from the first crew meeting to the trailhead. Philmont is fully supported today, with other bases on the roadmap. Built by one engineer using Claude Code as the primary development tool.

**Live:** [traillog.ai](https://traillog.ai) · Built by [GraceZero](https://gracezero.com)

Every statement in this document was checked against the private source on 2026-09-22. Counts marked as counted were generated from the code on that date; other counts are rounded.

**Scouts are minors.** Parent contact fields live on the user record, a parent is linked to a scout only through a request that a troop admin approves, and the screenshots below use seeded test personas with every real name, troop and crew identifier covered.

---

## AI architecture: two models, one configuration

TrailLog's AI features use two Claude models with distinct roles. One configuration module is the single source of truth for model selection, using alias strings rather than date-pinned versions so an upgrade is a one-line change.

| Task | Model | Why |
|------|-------|-----|
| Gear recommendations (cached, refreshed on a seven-day cycle by a daily scheduler) | Claude Haiku 4.5 | High volume, structured output, cost matters |
| Readiness plan generation (on demand, per member) | Claude Sonnet 4.6 | Reasoning over a self-assessment, itinerary and dates |
| Trail Advisor gear chat | Claude Sonnet 4.6 | Conversational reasoning |

**Deterministic fallback.** When the API key is absent or the call fails, the readiness planner drops to a rule-based generator that produces the same JSON shape. The UI does not change and no error reaches the user.

**Activity-aware coaching.** A dispatcher selects an activity-specific system prompt, so a paddling crew gets paddling advice rather than backpacking advice.

**Token tracking.** Tokens consumed per call are stored with each recommendation and plan.

---

## Operations

- **Backups.** Nightly database dumps with a rolling retention of ten, from the shared host's backup template. A monitor check alerts when the newest backup is older than 25 hours.
- **Monitoring.** External uptime pings of the health endpoint every five minutes (the endpoint returns 503 when the database is unreachable, so the probe catches database failures, not only process crashes); Sentry on the server and in the browser with 20 percent trace sampling; a host monitor every 15 minutes with ten checks, including disk above 85 percent, backup age, container memory above 256 MB and container restarts.
- **Security.** CSRF double-submit cookie mirrored from a per-session token; Helmet content security policy with scripts restricted to the app's own origin; Zod validation (18 schemas, counted) on the 16 write endpoints that accept user-shaped bodies; bcrypt password hashing; session regeneration on login; typed, parameterized SQL only (427 pgtyped queries, counted); per-IP rate limits of 20 per 15 minutes on authentication and 300 per minute on the API; a non-root container.
- **Deploys.** A seven-step script: build the client, package, upload, rebuild the container, record the deploy manifest, list images, verify the health endpoint. The script prints the rollback command (retag the previous image) at the end. A QA environment behind a Google sign-in gate is used for test runs before production.

---

## Quality assurance

**Principles**

- **Both platforms, every time.** Tests run on mobile and desktop profiles because responsive layouts and shared state create cross-platform dependencies that one profile misses.
- **Human in the loop.** A person reviews every plan before implementation, approves every deploy, and inspects screenshot evidence before signing off.

**Test suites (counted on 2026-09-22)**

| Layer | Tool | Size | What it covers |
|-------|------|------|----------------|
| Server integration | Vitest against a real PostgreSQL | 7 files, 64 cases | Auth, gear, prep events, troops, readiness, public routes, cross-troop access attempts |
| End to end | Playwright | 29 spec files, 266 cases | Auth, CRUD, navigation, security boundaries, email flows, device screenshots, visual regression against baselines |

Seeded test personas provide the authenticated sessions the Playwright suites use.

**AI-assisted review.** Claude Code with a browser extension reads screenshots to spot layout and consistency problems that assertions miss, on both mobile and desktop.

---

## Features

- **Multi-tenant troops** scoped by council, with a troop directory and invitations.
- **Multiple crews per adventure.** Sister crews keep their own rosters and itineraries; an all-crews view combines availability so leaders can plan joint training.
- **AI readiness plans.** A personalised multi-phase plan from a short self-assessment, tailored to the trek and its dates, with the deterministic fallback described above.
- **AI gear recommendations.** Top product picks per catalog item with weight, price range and rationale, cached and refreshed on a schedule so the page loads instantly.
- **Training calendar and phases.** Crew availability heat map, four training phases (Base Building, Trail Ready, Peak Prep, Shakedown) with drill tracking, multi-date polls for group events, and a personal training log.
- **Itineraries and day planning.** The 48 Philmont itineraries (counted) with length in days, mileage, difficulty rating and highlights; a custom day planner for other trips; prep events with RSVP and attendance; travel legs with driver sign-up; a printable trek packet.
- **Gear catalog.** Three-state tracking (need, own, packed), pack weight calculator, category and priority filters, and affiliate product links with click tracking.
- **Readiness dashboard.** Individual and crew readiness across training, gear, medical and admin, with a desktop analytics layout and a sortable member table.
- **Badges and journey.** Auto-awarded trail badges and a journey trail that tracks crew-wide readiness from trailhead to summit.
- **Parent and scout linking.** A parent is linked to a scout by a request that a troop admin approves.
- **Reports and Excel export.** Roster, gear and readiness reports, exported to Excel or printed.
- **Mobile first.** Works on any device with no app download. Separate mobile and desktop component trees for the views that need them.
- **Transactional email.** 14 transactional sender functions (counted).
- **Dark mode**, toggled by a class on the document root.

---

## Screenshots

Seeded test data. Names, troop, council and crew identifiers are covered.

### Home dashboard
![Home dashboard: crew roster, readiness ring, journey progress and quick actions](docs/screenshots/readme/home-desktop.png)

### Gear view
![Gear view: catalog with category filters, pack weight tracker, member readiness table and completion chart](docs/screenshots/readme/gear-desktop.png)

### Readiness view
![Readiness view: AI Readiness Coach card, badge display and skill checklist by category](docs/screenshots/readme/readiness-desktop.png)

### Training
![Training tab: current phase card, four-phase progression strip and crew availability calendar](docs/screenshots/readme/training-desktop.png)

### Training on a phone
![Training on a phone: crew section, phase progression, training log, phase distribution and availability calendar](docs/screenshots/readme/training-mobile.png)

### Landing page on a phone
![Landing page on a phone: illustration, sign-in, three feature cards and the how-it-works steps](docs/screenshots/readme/landing-mobile.png)

---

## Tech stack

| Layer | Technology | Details |
|-------|-----------|---------|
| Frontend | React 18, Vite 6, TypeScript, React Router 7 | 115 components (counted), 36 of them code-split through a retrying lazy loader (counted) |
| Styling | Tailwind CSS 4 | CSS custom properties, component classes, dark mode by class toggle |
| Backend | Express 4 on Node 22, TypeScript | 13 route modules, 185 handlers (counted) |
| Database access | pgtyped | 427 typed SQL queries generated from .sql files (counted) |
| Database | PostgreSQL 16 | 50 tables in the schema (counted), connection pool, parameterized queries only |
| Auth | Passport | Google OAuth and email/password with bcrypt, sessions in PostgreSQL |
| AI | Anthropic Claude API | Haiku for cached batch work, Sonnet for reasoning features, deterministic fallback |
| Security | Helmet, express-rate-limit, CSRF double-submit, Zod | See Operations |
| Email | Nodemailer | 14 transactional senders (counted) |
| Charts | Recharts | Readiness trend and gear completion charts |
| Testing | Playwright, Vitest | 29 spec files and 266 cases; 7 files and 64 cases against PostgreSQL |
| Monitoring | Sentry, UptimeRobot, host monitor script | Errors, uptime, ten infrastructure checks every 15 minutes |
| Deployment | Docker, Traefik | Scripted deploy with health verification, automatic TLS |

### Architecture highlights

- **One model configuration module** selects the model per feature with alias strings, so an upgrade happens in one place.
- **TypeScript on both sides.** The client and the server are TypeScript, and the server's SQL is typed at build time by pgtyped from .sql files.
- **Tailwind CSS 4** replaced inline styles with custom properties and component classes.
- **Code splitting with a retrying lazy loader.** When a content-hashed chunk is missing after a deploy, the loader reloads the page once instead of showing a blank screen.
- **Sentry on both Express and React** with request context and environment tags.
- **Host monitoring** by a cron script with ten checks, including disk, backup freshness, container memory and restarts.

For system design, data model, API patterns and the reasoning behind the main decisions, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Built with Claude Code

This project was built with Claude Code as the primary development tool. The human contributions were product design, system architecture, UX decisions and technical judgement; Claude Code produced the implementation across the stack, from schema to React components to test suites, under review. The workflow keeps a person at every gate: plan review before implementation, visual inspection before commit, manual approval before deploy. Co-authorship trailers on most commits record what was built with the assistant.

---

## Documentation

- [Architecture](ARCHITECTURE.md): system design, data model, API patterns, infrastructure and key decisions
- [Security policy](SECURITY.md): vulnerability reporting

---

## This repository

The public portfolio version of TrailLog: screenshots and system design documentation. The source code is maintained in a private repository.

---

## License

MIT for the documentation in this repository.
