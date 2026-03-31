# TrailLog Changelog

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
