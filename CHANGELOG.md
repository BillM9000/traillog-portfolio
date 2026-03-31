# TrailLog Changelog

This log tracks significant feature milestones, foundation migrations, and design system phases. Individual bug fixes and minor patches are captured in git commit history.

---

## v0.2.0 — Design System Complete (2026-03-31)

### Phase 6 — Desktop BI Command Center

**Features:**
- **Sidebar + TopBar chrome** at 1024px+ — 220px sidebar collapsible to 64px icon rail, 48px top bar with section title, countdown badge, theme toggle, and profile avatar. State persisted in `localStorage`.
- **DashboardOverview** — 4 stat cards (Members, Days to Trek, Gear, Training) + readiness progress bars. Renders on Training and Readiness views.
- **MembersTable** — sortable desktop table (Name, Role, Readiness%, Training, Gear). Clickable rows drive the drill-down panel.
- **DesktopBIChartRow** — Readiness Trend area chart (Recharts, lazy-loaded) + Badge grid (72px). Serves as the BI header for the Readiness view.
- **MemberDetailPanel** — 50/50 split on Readiness view. Left: MembersTable with clickable rows. Right: sticky panel showing 52px overall readiness score, 4-category status bars (Training, Gear, Medical, Admin), ⚠ "Needs attention" alerts for any category < 50%, and 48px badge row. Defaults to first member.
- **GearCompletionChart** — horizontal bar chart (Recharts) showing per-member gear completion %, 70% reference line. Renders above the gear list on desktop. 0% bars show a 3px minimum sliver.
- **Training two-panel** — TrainingEvents (55%) + Calendar (45%) side-by-side on desktop.
- **Status-threshold bar colors** — all category bars use `readinessColor()`: ≥70% → #5B7A3A, 50–69% → #D4A017, <50% → #CC3333. Eliminates legacy per-category hardcoded colors (blue for Medical, purple for Admin).

**Architecture:**
- All Recharts imports isolated to lazy-loaded `.tsx` chart files. Main bundle unchanged at ~257KB gzip.
- `useIsDesktop()` hook (1024px breakpoint) gates all desktop-only components.
- `computeMemberReadiness()` and `computeCrewReadiness()` are the single source of truth for all readiness scores shown in both table and drill-down panel.

**Design deviations from Phase 6 spec:**
- **Readiness Trend chart placed on Readiness view, not a "Dashboard" route.** The spec referenced placing the area chart on a dedicated Dashboard view. No such route exists — the crew home is the adventure selector (HomeDashboard). The Readiness Trend chart + Badge grid are the BI header for the Readiness/Skills view instead, which is contextually correct. The Training view returns to a clean two-panel layout.
- **Bar colors in MemberDetailPanel** — initial implementation used per-category brand colors (amber for Gear, blue for Medical). Corrected to use the same `readinessColor()` threshold function as all other readiness indicators per DESIGN_BIBLE.

---

### Phases 1–5 — Design System Foundation

| Phase | Milestone |
|-------|-----------|
| **0** | Design Bible locked — color ramps, typography scale (Source Serif 4 / DM Sans), spacing, status thresholds |
| **1** | Token foundation — `--tl-*` CSS custom properties, Tailwind CSS v4 integration, `tl-*` component utility classes |
| **2** | Mobile-first hero with compact inner-page variant. Condensed header for inner views (training, readiness, gear, etc.) maximizes content area |
| **3** | Badge gamification — 8 badges (Trail Ready, Gear Master, First Aider, etc.) with earned/locked visual states. Animated unlock flow. BadgeRow and BadgeCatalog components |
| **4** | Status-aware color coding across dashboard — stat cards, readiness bars, countdown pill all drive color from live data thresholds |
| **5** | Empty states and priority action cards — contextual CTA banners, skeleton screens, crew-not-ready states |

---

## v0.1.0 — Foundation Migrations (2026-03-18)

### PostgreSQL Migration

Migrated the full backend from SQLite (better-sqlite3, synchronous) to PostgreSQL (pg Pool, async):

- All 170+ database functions converted to async with `$1, $2, $3` numbered placeholders
- `INSERT OR REPLACE` → `INSERT ... ON CONFLICT DO UPDATE`; `lastInsertRowid` → `RETURNING id`
- Session store: custom SQLite store → `connect-pg-simple` (auto-creates `sessions` table)
- Schema: 32-table `schema.pg.sql` deployed to VPS host PostgreSQL instance
- `better-sqlite3` removed from dependencies; SQLite Docker volume removed

### Tailwind CSS v4 Migration

Migrated all inline `style={{}}` + `useTheme()` color tokens to Tailwind CSS v4:

- New `client/src/app.css` with `@theme` directive and `--tl-*` CSS custom properties
- `tl-*` component utility classes replace `card()`, `badge()`, `toolbarBtn()` style helpers
- ThemeContext simplified: adds/removes `dark` class on `<html>`; Tailwind `dark:` variants handle all mode switching
- `clsx` added for conditional class composition

### TypeScript Migration

All 42 client `.js`/`.jsx` files converted to `.ts`/`.tsx`:

- `src/types/` barrel file with shared interfaces (`AdventureMember`, `Skill`, `Achievement`, `GearCatalogItem`, `MemberGearItem`)
- `allowJs` removed from `tsconfig.json`
- All component props fully typed

### Code Splitting

- `React.lazy` + `Suspense` for 16 heavy components
- 62% main bundle reduction: 599KB → 226KB gzip
- All Recharts imports confined to separate lazy chunks

---

## Earlier Sessions (2026-03-10 to 2026-03-17)

| Date | Work |
|------|------|
| 2026-03-17 | Security hardening: session fixation fix, CSRF double-submit, CSP no-unsafe-inline, Zod validation (14 schemas), pino audit logging, rate limiting |
| 2026-03-17 | T-shirt vote page (`/vote`) — standalone, no auth, CSRF exempt, 2-vote leaderboard |
| 2026-03-19 | ApprovalPage.tsx (HMAC-signed approve/deny from email), member removal cascade, AdminPanel/Gear/Readiness bug fixes, parent onboarding `find_unit` step |
