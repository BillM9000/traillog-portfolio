# TrailLog — Scout Trek Preparation Platform

> Full-stack SaaS application with Claude AI integration, built entirely with [Claude Code](https://claude.com/claude-code).
> Portfolio project by Bill McCoy.

---

## What This Is

TrailLog is a multi-tenant platform for BSA high-adventure crews to coordinate training, gear, readiness, and logistics. It supports the full preparation lifecycle — from troop creation and member onboarding through gear tracking, training scheduling, readiness scoring, and AI-powered coaching.

**Live at:** [traillog.gracezero.ai](https://traillog.gracezero.ai)

---

## Architecture

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite SPA, 29 components, 4 contexts |
| **Backend** | Express.js, 120+ REST API endpoints |
| **Database** | SQLite (WAL mode), schema v22, 22 incremental migrations |
| **AI Engine** | Anthropic Claude API (Sonnet + Haiku) |
| **Auth** | Google OAuth 2.0 + email/password (Passport.js, bcrypt) |
| **Security** | CSRF, CSP, HSTS, rate limiting, parameterized SQL |
| **Infrastructure** | Docker multi-stage build, Traefik reverse proxy, Let's Encrypt TLS |
| **Email** | 12 transactional templates via Gmail SMTP |

### Data Model

```
Troop → Adventure → Crew(s) → Members
```

Multi-tenant hierarchy supporting sister crews (same adventure, different itineraries), parent-scout linking (3 approval workflows), and role-based access (global admin, troop admin, adventure admin, member).

---

## Architectural Diagrams

- [System Architecture](docs/diagrams/system-architecture.md) — full stack overview with AI integration
- [Data Model](docs/diagrams/data-model.md) — multi-tenant ER diagram
- [Auth Flows](docs/diagrams/auth-flow.md) — OAuth + email/password sequence diagrams
- [AI Integration](docs/diagrams/ai-integration.md) — Claude API with fallback pattern
- [Middleware Chain](docs/diagrams/middleware-chain.md) — 12-step request pipeline
- [Gear System](docs/diagrams/gear-system.md) — 4-layer composition with sharing types

---

## AI Integration (Claude API)

TrailLog integrates the Anthropic Claude API in two distinct patterns:

### Readiness Coaching Engine (`server/ai-readiness.js`)
- **Model:** `claude-sonnet-4-6` (complex reasoning for personalized training plans)
- **Pattern:** Async orchestration with structured JSON output
- **Fallback:** Deterministic 4-phase plan when API is unavailable
- **Context:** Member fitness assessment + itinerary difficulty + gear status + weeks remaining
- **Output:** 4-phase progressive training plan + priority alerts (red/yellow/green)

### Gear Recommendation Engine (`server/gear-ai.js`)
- **Model:** `claude-haiku-4-5` (simpler classification task, cost-optimized)
- **Pattern:** Background batch processing with rate limiting (1 req/sec)
- **Caching:** 7-day expiry, skip refresh for valid cached entries
- **Scheduling:** Initial run after 30s delay, then every 24 hours

Both engines use:
- Singleton API client with lazy initialization
- Markdown fence stripping for robust JSON parsing
- Token usage tracking for cost monitoring
- Graceful degradation (app fully functional without API key)

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Gear Tracking** | 76-item catalog with 4 sharing types (personal, crew, buddy, provided). 3-state tracking (needed → owned → packed). Dynamic pack weight calculation with food/water estimates. |
| **Readiness Scoring** | 4-category algorithm (training, gear, medical, admin) computed per-member and per-crew. Single source of truth in `client/src/utils/readiness.js`. |
| **Training Calendar** | AM/PM/All-Day availability tracking, best-window optimization, scheduled events with RSVP. |
| **AI Readiness Coach** | Personalized 4-phase training plans based on fitness assessment, itinerary difficulty, and time remaining. |
| **Crew Layer** | Multi-crew support within adventures. Independent itineraries, dates, and member rosters per crew. |
| **Parent-Scout Linking** | Three workflows: auto-link (email domain match), request/approve, admin override. |
| **Reports & Export** | Gear summary, pack weight analysis, Excel export for offline use. |
| **Security** | CSRF double-submit cookies, CSP headers, rate limiting, parameterized SQL, non-root Docker. |

---

## Claude Architect Exam Alignment

This project demonstrates competencies across all 5 domains of the [Claude Certified Architect Foundations](https://www.anthropic.com/certification) exam.

**See full mapping:** [CLAUDE_ARCHITECT_ALIGNMENT.md](CLAUDE_ARCHITECT_ALIGNMENT.md)

---

## Project Structure

```
server/
  index.js          — Express app, 120+ API routes, middleware chain
  db.js             — SQLite schema (v22), migrations, 100+ DB functions
  auth.js           — Passport.js (Google OAuth + local strategy)
  email.js          — 12 email templates with XSS escaping
  ai-readiness.js   — Claude Sonnet readiness coaching engine
  gear-ai.js        — Claude Haiku gear recommendation engine
  councils.js       — BSA council seed data
  itinerary_seed.js — Trek itinerary seed data

client/src/
  App.jsx           — Auth gating, routing, context orchestration
  api.js            — Centralized fetch wrapper, 60+ API methods
  contexts/         — AuthContext, ThemeContext, AdventureContext, ToastContext
  components/       — 29 React components (Calendar, GearList, Skills, etc.)
  utils/            — Readiness scoring, date helpers, theme tokens

docs/
  architecture/     — System overview, data flow
  security/         — Auth, data protection, threat model
  diagrams/         — 6 Mermaid architectural diagrams
```

---

## Note on Seed Data

This is the **portfolio version** of the repository. Domain-specific seed data (48 trek itineraries, 76-item gear catalog, 237 BSA councils) and AI system prompts have been replaced with representative samples. The data structures and architectural patterns are fully visible. The full application is live at [traillog.gracezero.ai](https://traillog.gracezero.ai).

---

## Built With Claude Code

This entire application — frontend, backend, database, security hardening, documentation, and deployment pipeline — was built using [Claude Code](https://claude.com/claude-code) as the primary development tool.
