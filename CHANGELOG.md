# TrailLog Changelog

## Phase 7 — Test Hardening & QA (2026-03-31)

### Testing
- 16 Playwright E2E spec files with 193 tests across 22 test suites
- 29 isolated auth sessions — per-spec session isolation eliminates parallel contention
- 429-retry logic with 60s backoff for auth rate limits during parallel setup
- 30-minute auth cache to reduce setup overhead across runs
- Visual regression baselines for 5 key viewport screenshots
- Security suite: CSRF enforcement, auth/authz checks, rate limiting, body size limits, SQL injection prevention
- Screenshot suite: 4 devices (iPhone 14, Pixel 7, Galaxy S24, Desktop 1440) × 6 tabs = 48 screenshots

### Infrastructure
- Phase 7 QA screenshots captured and committed to `docs/screenshots/phase-7/` (62 files)
- Tag `v0.2.1-test-hardening` marks the test-hardened release

---

## Sprint 5 — Bug Fixes & Approval Page (2026-03-19)

### Features
- ApprovalPage: standalone `/approve/:token` route with HMAC-signed approve/deny from email
- Parent onboarding: added `find_unit` step; HomeDashboard "Register Unit" only for adults
- Invite code moved from Troop tab to Members tab in AdminPanel

### Fixes
- Member removal cascade: `removeTroopMember` now deletes crew_members, adventure_members, member_gear, member_assessments in transaction
- AdminPanel remove: now also removes from troop (was only removing from crew, causing orphaned troop_members)
- Gear filters: "Need" filter includes unchecked items; `gear-pill` CSS utilities added
- Readiness save: removed `!pendingApproval` guard so pending members can save assessments

---

## Sprint 4 — Foundation Migrations (2026-03-18)

### PostgreSQL Migration
- Full backend migration: SQLite (better-sqlite3, sync) → PostgreSQL (pg Pool, async)
- 170 async database functions, `$1/$2/$3` parameterized queries, `ON CONFLICT` upserts
- `connect-pg-simple` for session store (auto-creates sessions table)
- Schema: `db/schema.pg.sql` (32 tables)

### Tailwind CSS v4 Migration
- Full client styling migration: inline `style={{}}` + useTheme() → Tailwind CSS v4 utility classes
- `app.css` with `@theme` directive, CSS custom properties, `tl-*` component classes
- `clsx` for conditional class composition; `dark` class on `<html>` for dark mode

### TypeScript Migration
- All 42 client JS/JSX files → TS/TSX with `src/types/` barrel exports
- `allowJs` removed from tsconfig

### Code Splitting
- React.lazy for 16 components, 62% main bundle reduction (599→226KB gzip)
- All Recharts imports isolated to lazy-loaded chart chunks

### Other
- Multi-crew availability views, parent dashboard, photo/file uploads
- Schema cleanup, API test suite (40 integration tests), route inventory

---

## Phase 6 — Desktop BI Command Center (2026-03-31)

### Features
- Sidebar (220px, collapsible to 64px) + TopBar (48px) desktop chrome at 1024px+
- DashboardOverview: 4 stat cards + readiness progress bars on Training and Readiness views
- MembersTable: sortable table (Name, Role, Readiness%, Training, Gear) on Training/Readiness views
- DesktopBIChartRow: Readiness Trend area chart (Recharts, lazy-loaded) + Badge grid — BI header for Readiness view
- MemberDetailPanel: 50/50 drill-down on Readiness view — 52px readiness score, 4-category status bars, ⚠ alerts for <50%, badge row
- GearCompletionChart: horizontal bar chart with 70% reference line — BI header for Gear view
- Two-panel layout on Training view: TrainingEvents (55%) + Calendar (45%)
- Status-threshold bar colors throughout: ≥70% success green, 50–69% warning amber, <50% danger red

### Architecture notes
- All Recharts imports isolated to lazy-loaded chart chunks; main bundle stays ~257KB gzip
- `readinessColor(pct)` helper: ≥70 → #5B7A3A, ≥50 → #D4A017, else → #CC3333
- `useIsDesktop()` hook gates all desktop-only components at 1024px breakpoint

### Design deviations from spec
- **Readiness Trend chart placed on Readiness view, not a dedicated "Dashboard" route.**
  The Phase 6 spec referenced placing the area chart on a "Dashboard (Home)" view. No dedicated Dashboard route exists in the nav — the crew home is the adventure selector (HomeDashboard). Placing a readiness trend chart there would be contextually incorrect (it is crew-scoped, not platform-scoped). The area chart + Badge grid were placed as the BI header of the Readiness/Skills view instead, which provides the correct context. The Training view returns to a clean two-panel layout.
