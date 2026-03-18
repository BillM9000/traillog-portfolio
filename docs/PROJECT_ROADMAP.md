# TrailLog Project Roadmap
> Last updated: 2026-03-18
> Organized by project phase. Work top-down.

---

# ═══════════════════════════════════════
# COMPLETED
# ═══════════════════════════════════════

| # | Item | Sprint |
|---|------|--------|
| S1 | Session regeneration on login (session fixation fix) | Sprint 1 |
| S2 | Audit logging — pino structured logs for logins, permission changes, deletions | Sprint 2 |
| T2 | Attendance → Readiness pipeline live test | Sprint 1 |
| T4 | ESLint + Prettier setup (client + server flat configs) | Sprint 2 |
| T5 | Input validation — zod on 14 auth + critical routes | Sprint 2 |
| D1 | Delete dead files — Lobby.jsx, stale references | Sprint 1 |
| D2 | HelpSystem content fix — time period references | Sprint 1 |
| D3 | Structured logging — pino + pino-http alongside Morgan | Sprint 2 |
| C1 | Group view tooltip — popover near clicked cell | Sprint 3 |
| C2 | Empty state for Training Events (already existed) | Sprint 3 |
| C6 | Configurable attendance milestones (admin UI, per-adventure) | Sprint 3 |
| G1 | Food/water weight estimates verified against Philmont data | Sprint 3 |
| C3 | Event notifications/reminders — email 24hr before (scheduler.js) | Sprint 3 |
| C4 | Calendar export — .ics file download for Google Cal / iCal | Sprint 3 |
| C5 | Event recurrence — weekly/biweekly bulk creation | Sprint 3 |
| G2 | Affiliate links wiring — table + analytics tab built, connected to frontend gear items | Sprint 3 |
| G3 | Gear product options — schema, UI, admin CRUD complete (data entry ongoing) | Sprint 3 |
| A2 | Multi-crew availability views — All Crews picker, combined heat map, crew-grouped members | Sprint 4 |
| A4 | Parent dashboard — scout progress cards with readiness breakdown, gear/training status | Sprint 4 |
| A3 | Photo/file uploads — Docs tab, base64 upload, VPS file storage, admin CRUD | Sprint 4 |

---

# ═══════════════════════════════════════
# FEATURE DEVELOPMENT
# ═══════════════════════════════════════
> New capabilities. Build these before locking down for launch.

## 🎒 Gear Features
| # | Item | Effort | Notes |
|---|------|--------|-------|
| G4 | AI chat assistant — Philmont prep Q&A powered by Claude | Large | Major new feature |

## 🏔️ Adventure & Troop Features
| # | Item | Effort | Notes |
|---|------|--------|-------|
| A1 | Additional adventure types — Northern Tier, Sea Base, Summit ("Coming Soon") | Large | Needs itinerary data + UI |
| A5 | Troop networking — connect troops with same trek dates for shared training | Large | Major social feature |

## 💰 Business & Monetization
| # | Item | Effort | Notes |
|---|------|--------|-------|
| B1 | Public demo mode — explore with sample data, no account needed | Medium | Pre-launch marketing |
| B2 | Subscription pricing — ~$39/year per troop, freemium model | Large | Business decision |

---

# ═══════════════════════════════════════
# TECH DEBT & CODE QUALITY
# ═══════════════════════════════════════
> Cleanup that makes feature work easier. Can interleave with features.

| # | Item | Effort | Notes |
|---|------|--------|-------|
| D5 | Schema cleanup — canonical schema.sql, FK constraints, index analysis, ERD diagram | Medium | TODO |
| D6 | Vite code splitting — route-split tabs to reduce 575KB main bundle | Medium | TODO |
| D4 | API consolidation — 120+ routes → ~45 RESTful endpoints | Large | Breaking change, needs test coverage first |
| D7 | Service layer extraction — Route → Service → Repository pattern | Large | Architecture overhaul |
| D8 | TypeScript migration — incremental, file-by-file | Large | Long-term quality investment |

---

# ═══════════════════════════════════════
# TESTING & VERIFICATION
# ═══════════════════════════════════════
> Deferred items + test infrastructure. Do after features stabilize.

| # | Item | Effort | Notes |
|---|------|--------|-------|
| T1 | Multi-user live testing — need 2nd person for heat map, Best Dates chips, drag-select | Small | Needs 2nd person |
| T3 | Mobile responsiveness — calendar, training events, edit form on phone screens | Medium | Deferred to desktop/mobile split |
| T6 | Unit tests — overlap algorithm, pack weight, readiness scoring (Vitest, target 200+) | Large | Do after CI/CD is set up |
| T7 | Integration tests — Supertest for state-changing routes (target 80-120) | Large | Do after CI/CD is set up |
| T8 | E2E tests — Playwright, convert 15-phase Chrome automation (target 20-40) | Large | Do after CI/CD is set up |
| T9 | CI/CD pipeline — GitHub Actions (lint → test → build → deploy). Guide at `reference_cicd.md` | Medium | Blocked until test suites exist |

---

# ═══════════════════════════════════════
# PRE-LAUNCH — Infrastructure & Hardening
# ═══════════════════════════════════════
> Do these once, right before going live with real users. Don't do early — features will change.

## 🚀 Infrastructure
| # | Item | Effort | Notes |
|---|------|--------|-------|
| I1 | Off-site backup replication — currently single-server, no DR | Medium | TODO |
| I2 | Sentry error tracking + uptime monitoring | Small | TODO |
| I3 | Email upgrade — Gmail SMTP → Resend or Postmark for production reliability | Medium | When volume justifies cost |
| I4 | Offline/PWA — service worker for gear checklist + calendar on the trail | Large | Major feature, needs design |

## 🔒 Security Hardening
| # | Item | Effort | Notes |
|---|------|--------|-------|
| S3 | Penetration testing — OWASP ZAP scan, securityheaders.com audit | Medium | Do after features stabilize |
| S4 | Encryption at rest — LUKS disk encryption or SQLCipher for SQLite | Medium | Final hardening |
| S5 | CSP `unsafe-inline` for styles — migrate CSS-in-JS to CSS modules (21 components) | Large | Massive refactor, low risk in practice |
