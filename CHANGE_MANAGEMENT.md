# Change Management Procedures

Standard operating procedures for making changes to the TrailLog application. This document ensures consistency, traceability, and safety whether the team is one person or ten.

---

## Table of Contents

1. [Environments](#1-environments)
2. [Change Classifications](#2-change-classifications)
3. [Change Workflow](#3-change-workflow)
4. [Pre-Deployment Checklist](#4-pre-deployment-checklist)
5. [Deployment Procedure](#5-deployment-procedure)
6. [Rollback Procedure](#6-rollback-procedure)
7. [Post-Deployment Verification](#7-post-deployment-verification)
8. [Database Changes](#8-database-changes)
9. [Emergency Hotfix Procedure](#9-emergency-hotfix-procedure)
10. [Version History & Audit Trail](#10-version-history--audit-trail)

---

## 1. Environments

| Environment | Purpose | URL | Database |
|-------------|---------|-----|----------|
| **Local Dev** | Development and initial testing | `localhost:5173` (Vite) | N/A (SQLite runs in Docker only — see Windows Dev Notes) |
| **Staging** | Pre-production validation | TBD — to be set up before or at go-live | Copy of production DB (sanitized) |
| **Production** | Live application | `https://traillog.gracezero.ai` | `/app/data/crew614.db` (Docker volume) |

### Current State (Pre-Launch)

While the app has not gone live with real users, **staging and production are the same environment**. Once live:

- A separate staging environment MUST be established (second Docker instance, different port/subdomain)
- All changes MUST go through staging before production
- Production database must NEVER be used for testing

### Staging Environment Setup (When Ready)

```
# On VPS — run staging alongside production
# Staging: port 3615, separate DB volume
docker compose -f docker-compose.staging.yml up -d
```

- Staging URL: `https://staging.traillog.gracezero.ai` (or similar)
- Staging DB: separate volume, seeded from sanitized production backup
- Staging shares no data with production

---

## 2. Change Classifications

Every change is classified by risk level. The classification determines the required process.

### Low Risk
- UI text changes, label updates, color adjustments
- Adding logging or comments
- Dependency version patches (non-breaking)
- Documentation updates

**Process:** Code → Test locally → Deploy

### Medium Risk
- New features (new components, new API endpoints)
- Bug fixes that modify existing behavior
- CSS/layout changes affecting multiple components
- Email template changes

**Process:** Code → Test locally → Backup production DB → Deploy → Verify on production

### High Risk
- Database schema changes (migrations)
- Authentication/session changes
- Security-related changes
- Changes to existing API contracts (request/response shape)
- Deleting or renaming database columns/tables

**Process:** Code → Test locally → Golden backup → Deploy to staging → Test on staging → Backup production → Deploy to production → Verify → Monitor

### Critical
- Data migrations that transform existing user data
- Changes to payment processing (if applicable)
- Infrastructure changes (Docker config, Traefik, TLS)
- Rollback of a failed deployment

**Process:** Same as High Risk + explicit sign-off from project owner before production deployment

---

## 3. Change Workflow

```
┌─────────────────────────────────────────────────────────┐
│  1. PLAN                                                │
│     - Identify what's changing and why                  │
│     - Classify risk level (Low/Medium/High/Critical)    │
│     - Identify affected files and components            │
│     - Check for dependencies between changes            │
│     - Group related changes into deployment sets        │
└─────────────┬───────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────┐
│  2. DEVELOP                                             │
│     - Create feature branch (or work on master for      │
│       solo dev — switch to branches when team grows)    │
│     - Write code, following existing patterns           │
│     - Test locally (Windows: UI only, Docker: full)     │
│     - Commit with descriptive message                   │
└─────────────┬───────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────┐
│  3. PRE-DEPLOY                                          │
│     - Run pre-deployment checklist (Section 4)          │
│     - For High/Critical: create golden backup           │
│     - Push to GitHub                                    │
└─────────────┬───────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────┐
│  4. DEPLOY                                              │
│     - Follow deployment procedure (Section 5)           │
│     - For High/Critical: deploy to staging first        │
└─────────────┬───────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────┐
│  5. VERIFY                                              │
│     - Run post-deployment checks (Section 7)            │
│     - Monitor for errors in Docker logs                 │
│     - If failure: execute rollback (Section 6)          │
└─────────────┘───────────────────────────────────────────┘
```

---

## 4. Pre-Deployment Checklist

Run through before every production deployment.

| # | Check | Required For |
|---|-------|-------------|
| 1 | `npm run build --prefix client` succeeds with no errors | All |
| 2 | Git status clean — all changes committed | All |
| 3 | Changes pushed to GitHub | All |
| 4 | No `console.log` debug statements left in code | All |
| 5 | No hardcoded localhost URLs or test data | All |
| 6 | Secrets/credentials not committed (check `.env`) | All |
| 7 | Production backup taken | Medium+ |
| 8 | Golden backup created and labeled | High/Critical |
| 9 | Database migration tested (fresh DB + existing DB) | Schema changes |
| 10 | Staging deployment tested and verified | High/Critical |
| 11 | Affected email templates tested (send test email) | Email changes |
| 12 | Rollback plan documented for this specific change | High/Critical |

---

## 5. Deployment Procedure

### Standard Deployment (Current Process)

```bash
# 1. Build client
npm run build --prefix client

# 2. Package (from Windows dev machine)
tar czf /tmp/crew614-deploy.tar.gz \
  --exclude=node_modules --exclude=.git --exclude=client/node_modules \
  -C "C:\Users\billm\220claudsession\philmont_app" crew614/

# 3. Transfer to VPS
scp /tmp/crew614-deploy.tar.gz root@31.97.134.173:/tmp/

# 4. Deploy on VPS
ssh root@31.97.134.173
cd /opt && tar xzf /tmp/crew614-deploy.tar.gz
cd /opt/crew614
docker compose build --no-cache
docker compose up -d

# 5. Verify
docker logs crew614 --tail 20
curl -s https://traillog.gracezero.ai/api/health
```

### Deployment with Database Reset (Clean Slate)

Only use when intentionally wiping all data (e.g., pre-launch reset).

```bash
# WARNING: This deletes all data in the database
docker compose down -v
docker compose up -d
```

### Deployment Timing

- **Preferred window:** Early morning or late evening (minimal user activity)
- **Avoid:** Weekday evenings when troop admins are likely scheduling training
- **Announce:** For breaking changes, notify active users beforehand (once notification system exists)

---

## 6. Rollback Procedure

### Quick Rollback (Code Only — No Schema Changes)

```bash
# On VPS
cd /opt/crew614
git log --oneline -5  # Find the last known-good commit

# Restore from previous deployment tar (if saved)
# Or redeploy from a known-good git commit

docker compose build --no-cache
docker compose up -d
```

### Full Rollback (Code + Database)

```bash
# On VPS
cd /opt/crew614

# 1. Stop the app
docker compose down

# 2. Restore database from golden backup
docker volume rm crew614_app-data  # Remove current volume
docker compose up -d               # Creates fresh volume
docker cp /opt/crew614/crew614-GOLDEN-<label>.db crew614:/app/data/crew614.db
docker compose restart

# 3. Redeploy previous code version
# (restore from saved tar or git checkout)
docker compose build --no-cache
docker compose up -d

# 4. Verify
curl -s https://traillog.gracezero.ai/api/health
```

### Rollback Decision Matrix

| Symptom | Action |
|---------|--------|
| App won't start (Docker crash loop) | Check `docker logs crew614`. Fix code or rollback code. |
| App starts but errors on specific feature | Rollback code only if schema unchanged. Otherwise full rollback. |
| Database corruption or data loss | Full rollback to golden backup. Notify affected users. |
| Performance degradation | Check Docker resource limits. Scale or rollback if code-related. |

---

## 7. Post-Deployment Verification

Run after every production deployment.

| # | Check | How |
|---|-------|-----|
| 1 | Health endpoint responds | `curl -s https://traillog.gracezero.ai/api/health` |
| 2 | App loads in browser | Navigate to `https://traillog.gracezero.ai` |
| 3 | Can log in (Google OAuth) | Sign in with test account |
| 4 | Can log in (email/password) | Sign in with test account (if applicable) |
| 5 | No errors in Docker logs | `docker logs crew614 --tail 50` — check for crashes, stack traces |
| 6 | Changed feature works | Manually test the specific feature that was modified |
| 7 | Email sends (if applicable) | Trigger a test email and verify delivery |
| 8 | Database accessible | Check that existing data loads correctly |
| 9 | Mobile responsive | Quick check on phone or browser mobile view |

---

## 8. Database Changes

Database schema changes are the highest-risk category because they can break the app AND lose data if done wrong.

### Schema Migration Rules

1. **Always use versioned migrations** — TrailLog uses `CURRENT_SCHEMA_VERSION` in `server/db.js`
2. **Migrations must be idempotent** — running them twice should not break anything
3. **Never drop columns or tables** in a migration unless you've confirmed zero data loss
4. **Always add columns as nullable** or with a default value — never add NOT NULL without a default
5. **Test migrations on both fresh DB and existing DB** before deploying
6. **Golden backup REQUIRED** before any schema change deployment

### Migration Testing Procedure

```bash
# Test 1: Fresh database (simulates new install)
docker compose down -v
docker compose up -d
# Verify: app starts, schema version correct, seed data present

# Test 2: Existing database (simulates upgrade)
# Restore a backup, then deploy new code
docker cp /path/to/backup.db crew614:/app/data/crew614.db
docker compose restart
# Verify: app starts, migration runs, existing data intact
```

---

## 9. Emergency Hotfix Procedure

For critical production bugs affecting live users.

1. **Assess severity** — Is the app down? Is data at risk? Are users blocked?
2. **Communicate** — If users are affected, acknowledge the issue (email, in-app banner, etc.)
3. **Fix forward or rollback?**
   - If the fix is simple and obvious → fix forward (deploy the fix)
   - If the fix is complex or risky → rollback to last known-good state
4. **Skip staging** — Hotfixes can go directly to production (this is the ONLY exception)
5. **Document** — After resolution, document what happened, what was done, and what will prevent recurrence

### Hotfix Commit Convention

```
git commit -m "HOTFIX: brief description of what was fixed

Root cause: ...
Impact: ...
"
```

---

## 10. Version History & Audit Trail

### Commit Convention

```
<type>: <short description>

<optional body — what and why>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `security`, `schema`, `hotfix`, `deploy`

### Schema Version Log

| Version | Date | Description | Golden Backup |
|---------|------|-------------|---------------|
| v10 | 2026-03-10 | Itinerary system, multi-scout linking | `crew614-GOLDEN-pre-regression-20260310.db` |
| v11 | 2026-03-12 | Time slot availability, training events | `crew614-GOLDEN-pre-timeslots-20260312.db` |
| v12 | 2026-03-13 | Age gate (COPPA), session timeout | `crew614-GOLDEN-pre-agegate-20260313.db` |
| v13 | 2026-03-13 | Password reset tokens | N/A (additive, no data risk) |
| v14 | 2026-03-13 | TOS acceptance tracking (tos_accepted_at) | N/A (additive, no data risk) |
| v15 | 2026-03-13 | Gear sharing types (personal/crew/buddy/provided) | N/A (additive) |
| v16 | 2026-03-14 | Multi-admin (`users.is_admin`) | `crew614-GOLDEN-pre-phase1-20260314.db` |
| v17 | 2026-03-14 | Councils lookup table (350+ BSA councils) | `crew614-GOLDEN-pre-crew-layer-20260314.db` |
| v18 | 2026-03-14 | Crew layer (crews table, crew_members) | `crew614-GOLDEN-post-crew-layer-20260314.db` |
| v19 | 2026-03-14 | AI Readiness Engine (readiness tables) | `crew614-GOLDEN-post-ai-readiness-20260314.db` |
| v20 | 2026-03-14 | Council numbers (`council_num` column) | `crew614-GOLDEN-post-council-overhaul-20260314.db` |

### Deployment Log

Record every production deployment here.

| Date | Changes | Risk | Deployed By | Verified | Notes |
|------|---------|------|-------------|----------|-------|
| 2026-03-12 | Schema v11: time slots + training events | High | Bill McCoy | ✅ | Fresh DB, golden backup taken |
| 2026-03-13 | Set 1: 7-day rolling session timeout | Medium | Bill McCoy | ✅ | Cookie flags hardened |
| 2026-03-13 | Set 2: Age gate (schema v12, COPPA) | High | Bill McCoy | ✅ | Golden backup taken, browser tested |
| 2026-03-13 | Set 3: Password reset (schema v13) | Medium | Bill McCoy | ✅ | API tested, manual email test pending |
| 2026-03-13 | Set 4+5: VPS audit doc + Privacy/Terms pages | Low | Bill McCoy | ✅ | /privacy, /terms routes, VPS hardening deferred |
| 2026-03-13 | TOS acceptance tracking (schema v14) | Medium | Bill McCoy | ✅ | Explicit checkbox on both signup paths, tos_accepted_at in DB |
| 2026-03-13 | Set 7: Troop logo upload + display | Low | Bill McCoy | ✅ | File-based storage, AdminPanel upload, Lobby display, TroopLogo component |
| 2026-03-13 | Set 7 polish: date validation, header redesign, logo hero | Low | Bill McCoy | ✅ | Date cascade auto-clear, objectFit contain, 88px hero logo, depart→home date range |
| 2026-03-14 | Sets 8-14: Profile, platform settings, CSRF, CSP, multi-admin | High | Bill McCoy | ✅ | Golden backups at each stage |
| 2026-03-14 | Crew layer: multi-crew architecture (schema v17-v18) | High | Bill McCoy | ✅ | 4-stage rollout, full GUI test |
| 2026-03-14 | AI Readiness Engine (schema v19) | High | Bill McCoy | ✅ | Claude API integration, personalized coaching |
| 2026-03-14 | Council overhaul: 238 BSA councils (schema v20) | Medium | Bill McCoy | ✅ | Upsert pattern, custom entry |
| 2026-03-14 | Go-live audit: session invalidation, checklist, prod test | Medium | Bill McCoy | ✅ | 90+ routes audited, all tabs tested |

### Golden Backup Registry

| Label | Date | Location | Contents |
|-------|------|----------|----------|
| pre-regression | 2026-03-10 | `/opt/crew614/crew614-GOLDEN-pre-regression-20260310.db` | Schema v10, test data |
| pre-timeslots | 2026-03-12 | `/opt/crew614/crew614-GOLDEN-pre-timeslots-20260312.db` | Schema v11, pre-training-events |
| pre-agegate | 2026-03-13 | `/opt/crew614/crew614-GOLDEN-pre-agegate-20260313.db` | Schema v11, pre-age-gate |
| pre-phase1 | 2026-03-14 | `/opt/crew614/crew614-GOLDEN-pre-phase1-20260314.db` | Schema v14, pre-platform-settings |
| pre-crew-layer | 2026-03-14 | `/opt/crew614/crew614-GOLDEN-pre-crew-layer-20260314.db` | Schema v16, pre-crews |
| post-crew-layer | 2026-03-14 | `/opt/crew614/crew614-GOLDEN-post-crew-layer-20260314.db` | Schema v18, crews working |
| post-ai-readiness | 2026-03-14 | `/opt/crew614/crew614-GOLDEN-post-ai-readiness-20260314.db` | Schema v19, AI engine |
| post-council-overhaul | 2026-03-14 | `/opt/crew614/crew614-GOLDEN-post-council-overhaul-20260314.db` | Schema v20, 238 councils |

---

## Appendix A: Useful Commands

```bash
# SSH to VPS
ssh root@31.97.134.173

# View logs
docker logs crew614 --tail 50
docker logs crew614 -f              # Follow live

# DB access (read-only queries)
docker exec -w /app/server crew614 node -e "
const Database = require('better-sqlite3');
const db = new Database('/app/data/crew614.db');
console.log(db.prepare('SELECT count(*) as c FROM users').get());
"

# Backup (manual)
docker cp crew614:/app/data/crew614.db /opt/crew614/crew614-backup-$(date +%Y%m%d).db

# Health check
curl -s https://traillog.gracezero.ai/api/health

# Disk usage
df -h /
docker system df
```

---

## Appendix B: Contact & Ownership

| Role | Name | Contact |
|------|------|---------|
| Project Owner | Bill McCoy | billm9000@gmail.com |
| VPS Provider | Hostinger | 31.97.134.173 |
| Domain Registrar | (see DNS config) | gracezero.ai |
| SMTP Provider | Gmail | billm9000@gmail.com (app password) |
| Source Code | GitHub | BillM9000/crew614-philmont |

---

*Last updated: 2026-03-14*
