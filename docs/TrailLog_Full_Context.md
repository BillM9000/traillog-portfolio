# TrailLog — Full Project Context
# Give this to any AI assistant to understand everything that's been built.
# App URL: https://traillog.gracezero.ai
# GitHub: BillM9000/crew614-philmont (master branch)

---

# PART 1: MEMORY.md (Master Index)

## Deployment
- VPS: 31.97.134.173 (Hostinger), SSH: `ssh root@31.97.134.173`
- App URL: https://traillog.gracezero.ai
- Docker: `docker compose` in `/opt/crew614/`, port 3614, network `n8n_default`
- GitHub: `BillM9000/crew614-philmont` (master branch)
- Backups: `/opt/crew614/backup.sh` — rolling 10, daily 3am cron
- Golden backups on VPS + local copy in `crew614/backups/`

## Architecture
- React 18 + Vite SPA, Express.js backend, SQLite (WAL mode), schema v16
- Google OAuth + email/password auth (bcrypt, verification tokens, password reset), session-based
- 4 React Contexts: AuthContext, ThemeContext, AdventureContext, ToastContext
- Multi-admin: `users.is_admin` column, `ADMIN_EMAIL` seeds first admin on startup, promote/demote via API
- Docker multi-stage build, Traefik reverse proxy, Let's Encrypt TLS
- Icons: Lucide React (MIT) for small functional UI (<20px); clay PNGs reserved for large decorative spots (24px+)

## Security
- Rate limiting: authLimiter 20/15min, apiLimiter 100/min
- Input: parseId(), body-parser 10kb, esc() for email XSS, parameterized SQL (89 routes)
- Session: SQLite store, hourly GC, Helmet.js headers, safeError() on 500s, 7-day rolling idle timeout
- Cookie flags: httpOnly, secure (prod), sameSite=lax
- Docker non-root (appuser uid 1001), password min 8 chars, 0 npm vulns
- SSH key-only auth (Ed25519)

## Roles & Permissions
- **System Admin**: `users.is_admin = 1`, multiple admins supported, ADMIN_EMAIL seeds first on startup
- **Troop Admin**: `troop_members.role = "admin"`, can manage members/adventures/settings
- **Adult Member**: `user_type = "adult"`, can join troops, manage own gear/dates
- **Scout**: `user_type = "scout"`, can't create troops, parent email required
- Promote: `PUT /api/admin/users/:id/promote`, Demote: `PUT /api/admin/users/:id/demote`
- Self-demote blocked, last-admin demote blocked, sole troop-admin leave blocked

## Navigation Architecture
- **HomeDashboard.jsx**: central hub after login, replaces Lobby.jsx
- Flow: Loading → LandingPage → ProfileSetup → ProfilePage (if shown) → HomeDashboard → AdventurePicker (if troopId set, no advId) → MainView (6-tab)
- `goHome()` = `setTroopId(null); setAdventureId(null)` — returns to HomeDashboard
- Logo click in Header → `onGoHome()`
- `GET /api/dashboard` returns role-aware data: troops + adventures (with crew_readiness, next_training, member counts), pending requests, public troops, platform_stats (admin only)

## Client Components
- **6 Tabs**: Training, Best Windows, Readiness, Itinerary, Gear, Reports (3×2 grid, Lucide icons)
- **Header**: Hero layout — 88px troop logo, crew name, date range, countdown, member count, progress ring. Icons: Settings/Sun/Moon/HelpCircle, profile dropdown with Home + Profile buttons
- **MemberBar**: contextual hints per tab, readiness progress bars, trail badges
- **AdminPanel**: adventure settings + itinerary change confirmation, member management (with removal confirmation), troop settings
- **GearList**: 3-state status (Need/Own/Packed), sharing type badges (personal/crew/buddy/provided), pack weight widget, Gear Guide card
- **GlobalAdmin**: Gear Catalog, Troop Overview, Affiliate Analytics, Platform Settings (with System Admins section)
- **HomeDashboard**: replaces Lobby, role-aware (sys admin sees platform stats), troop cards with readiness/countdown/next training
- **HelpSystem**: 20 role-scoped accordion sections (everyone/admin/sysadmin), triggered by ? icon
- **ProfilePage**: account details, auth badge, troop memberships, change password
- **LandingPage**: 5-section marketing page with inline auth form
- **Itinerary.jsx**: day-by-day viewer, filter tags, print cheat sheet

## Schema v11 (Core Data)
- **Troops**: council (required), location ("City, ST"), is_public
- **Adventures**: adventure_type, 4 trek dates (depart/arrive/return/home), itinerary_id
- **Members**: participation (trekking/support), linked_to (multi-scout), is_manual
- **Gear**: 76 catalog items, member_gear table, product options
- **48 Philmont itineraries** seeded (12/9/7-day treks with day-by-day data)
- **training_events**: adventure_id, date, period (am/pm/all), time_label, location, notes
- **training_rsvps**: event_id, user_id, status (going/cant)
- Invitations, achievements, troop gear overrides, troop custom gear, affiliate clicks

## Schema v12-v16
- v12: Age gate (`age_confirmed`), immutable
- v13: Password reset (`reset_token`/`reset_token_expires`)
- v14: TOS (`tos_accepted_at`), legal pages
- v15: Gear sharing types (`sharing_type`: personal/crew/buddy/provided)
- v16: Multi-admin (`users.is_admin`), promote/demote

## Calendar & Training (Current System)
- Dates stored as `"YYYY-MM-DD:period"` where period is `am`, `pm`, or `all`
- Calendar tap cycles: All Day → Morning → Afternoon → Off
- Visual: gradient fill (top-half=AM, bottom-half=PM, full=All Day)
- Best Windows shows AM/PM breakdown per date, best period recommendation
- Bulk select (weekends/all) adds as `:all` by default
- Admin schedules training events from Best Windows tab
- Members RSVP: Going / Can't Make It (toggle, real-time)
- Email notifications on training event creation

## Gear System
- **gear_catalog**: 76 items, categories, weight_oz, sharing_type, philmont_compliant
- **member_gear**: per-user status (needed/owned/packed), adventure-scoped
- **Pack weight**: personal packed items + food (1.75 lbs/day × trek days) + water (6.6 lbs / 3L)
- **Sharing types**: personal (weight counted), crew/buddy/provided (not in weight calc)
- **Troop overrides**: hide catalog items, add custom gear
- **GearList**: 3-state toggle, filters, color-coded badges, Gear Guide explainer

## Readiness & Gamification
- `computeCrewReadiness()` / `computeMemberReadiness()` — 4 categories: training, gear, medical, admin
- **Adaptive averaging**: only counts categories with items defined
- **Trail Badges**: gear_ready, trail_medic, admin_pro, training_complete, fully_prepared
- **Journey Waypoints**: Trailhead (0%) > Base Camp (25%) > Timber Ridge (50%) > Eagle Point (75%) > Summit (100%)
- **18 universal Philmont skills** seeded per adventure (8 training, 5 medical, 5 admin)

## Reports Tab
- **Admin reports**: Crew Roster (CSV+print), Gear Readiness Matrix (CSV), Pack Weight Summary (CSV), Training RSVP Summary (CSV), Crew Readiness Overview (print)
- **Everyone reports**: My Gear Checklist (print), My Still Need List (CSV+print), Itinerary Cheat Sheet (print)

## Platform Settings
- Maintenance mode (toggle, custom message, admin exempt)
- Registration open/closed (blocks signup + Google OAuth new users)
- Announcement banner (text + type: info/warning/success)
- Max troops per user (default 2, admin exempt)

## Email Templates (12 total)
- Invitation, approval, denial, join request, parent notification
- Date changed, itinerary changed, training scheduled, badge earned
- Verification, link request, password reset
- All use styled detail blocks, troop context, `esc()` for XSS

## Key API Endpoints
- `/api/itineraries` / `/api/itineraries/:id` — itinerary CRUD
- `/api/gear-catalog` — gear CRUD
- `/api/adventures/:id/members/:userId/pack-weight` — dynamic weight
- `/api/troops/:id/adventures` — adventure CRUD with itinerary change detection + email
- `/api/admin/troops` / `/api/admin/users` / `/api/admin/settings` — global admin
- `/api/admin/users/:id/promote` / `demote` — system admin management
- `/api/dashboard` — home dashboard data (role-aware)
- `/api/troops/:troopId/leave` — self-remove with sole-admin check
- `/api/public-settings` — banner, maintenance, registration (no auth)
- `/api/adventures/:id/training-events` — CRUD + RSVP

## Troop Logo Upload
- Upload: PUT `/api/troops/:id/logo` (base64 JSON, max 500KB, PNG/JPG/WebP)
- Serve: GET `/api/troops/:id/logo` (public, 1hr cache)
- Storage: `/app/data/troop-logos/{troopId}.png` (Docker volume)
- TroopLogo.jsx: reusable component with colored circle + letter fallback

---

# PART 2: memory2ndhalf.md (Continued Features)

## Adventure Types
- Philmont Scout Ranch — enabled
- Northern Tier, Florida Sea Base, Summit Bechtel Reserve — disabled, "Coming Soon"

## Help System (Set 16)
- HelpSystem.jsx: modal overlay with 20 accordion sections, role-filtered
- Triggered by HelpCircle icon in Header logo bar and HomeDashboard header
- Everyone (10): Getting Started, Training Calendar, Best Windows, Readiness, Itinerary, Gear, Reports, Profile, Troop Basics, Trail Guide & Badges
- Troop Admin (5): Member Management, Adventure Setup, Training Events, Troop Settings, Gear Administration
- System Admin (5): Platform Settings, System Administration, Gear Catalog, Deployment & Technical, Architecture & Roles
- Category filter pills, Escape/click-outside/X close, dark/light theme

## Member Removal Confirmation
- AdminPanel Remove buttons require ConfirmModal (was instant)
- MemberBar × for manual members also confirms
- Message warns that gear selections and calendar dates will be lost

---

# PART 3: newfeatures.md (Backlog & Roadmap)

## P1 — Security Hardening (TODO)
- CSRF protection, strict CSP, npm audit + Dependabot

## P2 — Stability & Quality (TODO)
- Input validation library (express-validator or zod)
- Structured logging (pino or winston)
- ESLint + Prettier
- Centralized error handling middleware
- API consolidation (89 routes → ~40)
- Schema cleanup (canonical schema, foreign keys, indexes, ERD)
- CI/CD (GitHub Actions)
- Real test suite (integration, unit, Playwright E2E)

## P3 — Polish & Scale (TODO)
- Penetration testing (OWASP ZAP)
- Service layer extraction
- TypeScript migration (incremental)
- Sentry error tracking, uptime monitoring

## Feature Roadmap
- Affiliate links (table + analytics tab already built, just needs wiring)
- Multiple itineraries per adventure
- Additional adventure types (Northern Tier, Sea Base, Summit)
- AI chat assistant for prep questions
- Subscription pricing (~$39/year per troop)
- Email upgrade (Resend or Postmark)

## Already Done (28 items)
- SSH key-only auth, automated backups, rate limiting, Helmet.js, parameterized SQL
- bcrypt hashing, Docker non-root, session security, 15-phase automated test
- Landing page, scout restrictions, 2-step troop creation, age gate
- Email enrichment, maintenance mode, registration toggle, announcement banner
- Troop limit, Platform Settings tab, multi-admin, Home Dashboard
- Logo→Home navigation, System Admins management, Help System, member removal confirmation

---

# PART 4: Database Schema (server/db.js)

## Tables

### users
id, google_id, email, password_hash, name, avatar_url, user_type, parent_email, parent_email_2, email_verified, verification_token, age_confirmed, age_confirmed_at, reset_token, reset_token_expires, tos_accepted_at, is_admin, created_at

### troops
id, name, description, trek_date, itinerary_id, itinerary_overrides, tier, amazon_affiliate_tag, council, location, is_public, created_by, created_at

### adventures
id, troop_id, name, description, trek_date, depart_date, arrive_date, return_date, home_date, itinerary_id, adventure_type, status, created_by, created_at

### troop_members
id, user_id, troop_id, role, status, color_bg, dates (JSON), skills (JSON), created_at — UNIQUE(user_id, troop_id)

### adventure_members
id, adventure_id, user_id, role, participation, linked_to, linked_to_manual, linked_scouts (JSON), is_manual, manual_name, color_bg, dates (JSON), skills (JSON), gear (JSON), medical (JSON), admin_tasks (JSON), created_at

### skills
id (TEXT PK), troop_id, adventure_id, name, icon, description, category, is_default, sort_order

### gear_catalog
id, name, category, subcategory, description, weight_oz, weight_class, priority, price_tier, msrp, rating_stars, rating_notes, philmont_compliant, compliance_notes, is_crew_shared, sharing_type, affiliate_priority, sort_order, active, created_at, updated_at

### member_gear
id, adventure_id, user_id, gear_catalog_id, status (needed/owned/packed), selected_option_id, custom_product_name, custom_weight_oz, notes — UNIQUE(adventure_id, user_id, gear_catalog_id)

### training_events
id, adventure_id, date, period (am/pm/all), time_label, location, notes, created_by, created_at

### training_rsvps
id, event_id, user_id, status (going/cant) — UNIQUE(event_id, user_id)

### Other tables
- itineraries (48 Philmont routes with day-by-day data)
- gear_product_options (tiered product recommendations)
- troop_gear_overrides (hide catalog items per troop)
- troop_custom_gear (troop-specific additions)
- invitations (email invites with tokens)
- achievements (trail badges per user per adventure)
- crew_milestones (journey waypoints per adventure)
- link_requests (parent-scout linking)
- affiliate_clicks (tracking)
- gear_ai_logs (AI chat history)
- platform_settings (key-value config)
- sessions (express-session store)
