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

## What's in This Repo

This is the **public portfolio version** — architecture documentation, security docs, AI integration code samples, and Mermaid diagrams. The full source code (120+ API routes, 29 React components, 3200-line database layer, 12 email templates) is in a private repository.

```
server/
  ai-readiness.js   — Claude Sonnet readiness coaching engine (code sample)
  gear-ai.js        — Claude Haiku gear recommendation engine (code sample)
  auth.js           — Passport.js Google OAuth + local strategy (code sample)

client/src/utils/
  readiness.js      — 4-category readiness scoring algorithm (code sample)

docs/
  architecture/     — System overview, data flow
  security/         — Auth, data protection, threat model, dependency audit
  diagrams/         — 6 Mermaid architectural diagrams

Dockerfile          — Multi-stage build, non-root user (uid 1001)
docker-compose.yml  — Service config with Traefik TLS automation
ARCHITECTURE.md     — Comprehensive system design document
CLAUDE_ARCHITECT_ALIGNMENT.md — Exam domain mapping
```

### Code Samples Included

| File | What It Demonstrates |
|------|---------------------|
| `server/ai-readiness.js` | Claude API integration, async orchestration, structured JSON output, deterministic fallback, token tracking |
| `server/gear-ai.js` | Background batch processing, rate limiting, 7-day cache management, singleton pattern, scheduled refresh |
| `server/auth.js` | Passport.js dual-strategy auth (Google OAuth + bcrypt local), session serialization |
| `client/src/utils/readiness.js` | Domain algorithm design — 4-category scoring across training, gear, medical, admin |

### Full Application (Private Repo)

The complete codebase — including all API routes, React components, database schema, email templates, seed data, and deployment pipeline — is available upon request for interview review.

---

## Built With Claude Code

This entire application — frontend, backend, database, security hardening, documentation, and deployment pipeline — was built using [Claude Code](https://claude.com/claude-code) as the primary development tool.
