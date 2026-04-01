# TrailLog Project Roadmap
> Last updated: 2026-03-31
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
| D6 | Vite code splitting — React.lazy for 16 components, 62% bundle reduction (599→226KB) | Sprint 4 |
| D8 | TypeScript migration — all 42 client JS/JSX → TS/TSX, `src/types/` barrel | Sprint 4 |
| D5 | Schema cleanup — canonical schema.pg.sql, FK constraints, SCHEMA.md | Sprint 4 |
| P6 | Desktop BI layout — Sidebar + TopBar + DashboardOverview + MembersTable + charts at 1024px+ | Phase 6 |
| T8 | E2E tests — Playwright, 16 specs, 193 tests, 29 isolated auth sessions, visual regression | Phase 7 |

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

---

# ═══════════════════════════════════════
# TECH DEBT & CODE QUALITY
# ═══════════════════════════════════════
> Cleanup that makes feature work easier. Can interleave with features.

| # | Item | Effort | Notes |
|---|------|--------|-------|
| D4 | API consolidation — 172 routes → ~60 RESTful endpoints | Large | Breaking change, needs test coverage first |
| D7 | Service layer extraction — Route → Service → Repository pattern | Large | Architecture overhaul |

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
| T8 | E2E tests — 16 Playwright specs, 193 tests, 29 sessions (expand to 250+) | Medium | Foundation complete, expand coverage |
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
| S4 | Encryption at rest — LUKS disk encryption for PostgreSQL data directory | Medium | Final hardening |
| S5 | CSP `unsafe-inline` for styles — audit remaining inline styles after Tailwind migration | Medium | Tailwind CSS migration (2026-03-18) moved most styling to compiled CSS; audit for remaining runtime style usage |
