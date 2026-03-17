# TrailLog Project Roadmap
> Last updated: 2026-03-17
> Tackle in order listed within each section.
> "NOW" = actionable this sprint. "FUTURE" = parked until core is solid.

---

# ═══════════════════════════════════════
# NOW — Actionable Work
# ═══════════════════════════════════════

## 🔒 SECURITY
| # | Item | Effort | Status |
|---|------|--------|--------|
| S1 | Session regeneration on login (`req.session.regenerate()` after auth) — session fixation risk | Small | DONE |
| S2 | Audit logging — structured logs for logins, permission changes, deletions (pino) | Medium | DONE |
| S3 | Penetration testing — OWASP ZAP scan, securityheaders.com audit | Medium | TODO |
| S4 | Encryption at rest — LUKS disk encryption or SQLCipher for SQLite | Medium | TODO |

---

## 🧪 TESTING & VERIFICATION
| # | Item | Effort | Status |
|---|------|--------|--------|
| T1 | Multi-user live testing — need 2nd person for heat map, Best Dates chips, drag-select | Small | TODO |
| T2 | Attendance → Readiness pipeline live test — complete event, mark attendance, verify skills + score | Small | DONE |
| T3 | Mobile responsiveness — calendar, training events, edit form on phone screens | Medium | DEFERRED (testing during desktop/mobile split) |
| T4 | ESLint + Prettier setup | Small | DONE |
| T5 | Input validation library (zod) on auth + critical routes (14 schemas) | Medium | DONE |

---

## 📅 TRAINING & CALENDAR — Polish
| # | Item | Effort | Status |
|---|------|--------|--------|
| C1 | Group view tooltip — popover near clicked cell instead of bottom panel | Small | TODO |
| C2 | Empty state for Training Events — helpful message when zero events exist | Small | TODO |
| C6 | Configurable attendance milestones — admin sets thresholds (currently hardcoded 1/3/5) | Small | TODO |

---

## 🎒 GEAR & READINESS — Polish
| # | Item | Effort | Status |
|---|------|--------|--------|
| G1 | Confirm food/water weight estimates (1.75 lbs/day food, 6.6 lbs water) with real Philmont data | Small | TODO |

---

## 🏗️ CLEANUP & TECH DEBT
| # | Item | Effort | Status |
|---|------|--------|--------|
| D1 | Delete dead files — Lobby.jsx, clean stale references | Small | DONE |
| D2 | HelpSystem content — still references "morning/afternoon/all day" time periods | Small | DONE |
| D3 | Structured logging — pino + pino-http alongside Morgan (JSON output) | Medium | DONE |
| D5 | Schema cleanup — canonical schema.sql, FK constraints, index analysis, ERD diagram | Medium | TODO |
| D6 | Vite code splitting — route-split tabs to reduce 575KB main bundle | Medium | TODO |

---

## 🚀 INFRASTRUCTURE & OPS
| # | Item | Effort | Status |
|---|------|--------|--------|
| I1 | Off-site backup replication — currently single-server, no DR | Medium | TODO |
| I2 | Sentry error tracking + uptime monitoring | Small | TODO |

---

## RECOMMENDED TACKLE ORDER

**Sprint 1 — Harden & Verify** ✅
- ~~S1 (session regen)~~, ~~T2 (attendance pipeline test)~~, ~~D1 (dead files)~~, ~~D2 (HelpSystem fix)~~ — DONE 2026-03-17

**Sprint 1b — Deferred from Sprint 1**
- T1 (multi-user test — needs 2nd person), T3 (mobile check — deferred to desktop/mobile split)

**Sprint 2 — Code Quality Foundation**
- T4 (ESLint), T5 (input validation), S2 (audit logging), D3 (structured logging)

**Sprint 3 — User-Facing Polish**
- C1 (tooltip), C2 (empty state), C6 (configurable milestones), G1 (weight estimates)

**Sprint 4 — Infrastructure & Safety Net**
- I1 (backup replication), I2 (Sentry), S3 (pen testing), D5 (schema cleanup), D6 (code splitting)

**Sprint 5 — Encryption & Hardening**
- S4 (encryption at rest)

---
---

# ═══════════════════════════════════════
# FUTURE — Parked (too big or not needed yet)
# ═══════════════════════════════════════

## 🔒 Security — Future
| # | Item | Effort | Notes |
|---|------|--------|-------|
| S5 | CSP `unsafe-inline` for styles — migrate CSS-in-JS to CSS modules (21 components) | Large | Massive refactor, low risk in practice |

## 🧪 Testing — Future
| # | Item | Effort | Notes |
|---|------|--------|-------|
| T6 | Unit tests — overlap algorithm, pack weight, readiness scoring (Vitest, target 200+) | Large | Do after CI/CD is set up |
| T7 | Integration tests — Supertest for state-changing routes (target 80-120) | Large | Do after CI/CD is set up |
| T8 | E2E tests — Playwright, convert 15-phase Chrome automation (target 20-40) | Large | Do after CI/CD is set up |
| T9 | CI/CD pipeline — GitHub Actions (lint → test → build → deploy). Guide at `reference_cicd.md` | Medium | Blocked until test suites exist |

## 📅 Calendar — Future Features
| # | Item | Effort | Notes |
|---|------|--------|-------|
| C3 | Event notifications/reminders — email 24hr before scheduled event (needs cron) | Medium | Needs scheduled task infrastructure |
| C4 | Calendar export — .ics file for Google Calendar / iCal | Medium | Nice-to-have |
| C5 | Event recurrence — repeating training events (e.g. "every Saturday") | Medium | Nice-to-have |

## 🎒 Gear — Future Features
| # | Item | Effort | Notes |
|---|------|--------|-------|
| G2 | Affiliate links wiring — table + analytics tab built, connect to frontend gear items | Medium | Monetization prerequisite |
| G3 | Gear product options — schema columns exist but unpopulated | Medium | Data entry project |
| G4 | AI chat assistant — Philmont prep Q&A powered by Claude | Large | Major new feature |

## 🏔️ Adventure & Troop — Future Features
| # | Item | Effort | Notes |
|---|------|--------|-------|
| A1 | Additional adventure types — Northern Tier, Sea Base, Summit ("Coming Soon") | Large | Needs itinerary data + UI |
| A2 | Multi-crew availability views — crew-scoped calendar filtering | Medium | Only matters with 2+ crews |
| A3 | Photo/file uploads — share trek docs, training materials | Medium | Needs file storage solution |
| A4 | Parent dashboard — dedicated view for parents to track scout progress | Medium | New user role/view |
| A5 | Troop networking — connect troops with same trek dates for shared training | Large | Major social feature |

## 🏗️ Architecture — Future
| # | Item | Effort | Notes |
|---|------|--------|-------|
| D4 | API consolidation — 120+ routes → ~45 RESTful endpoints | Large | Breaking change, needs test coverage first |
| D7 | Service layer extraction — Route → Service → Repository pattern | Large | Architecture overhaul |
| D8 | TypeScript migration — incremental, file-by-file | Large | Long-term quality investment |

## 🚀 Infrastructure — Future
| # | Item | Effort | Notes |
|---|------|--------|-------|
| I3 | Email upgrade — Gmail SMTP → Resend or Postmark for production reliability | Medium | When volume justifies cost |
| I4 | Offline/PWA — service worker for gear checklist + calendar on the trail | Large | Major feature, needs design |

## 💰 Business & Monetization — Future
| # | Item | Effort | Notes |
|---|------|--------|-------|
| B1 | Public demo mode — explore with sample data, no account needed | Medium | Pre-launch marketing |
| B2 | Subscription pricing — ~$39/year per troop, freemium model | Large | Business decision |
