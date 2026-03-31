# TrailLog Design Bible
## Single source of truth for every visual decision.

> **Status:** Phase 6 — Complete
> **Last updated:** 2026-03-31
> All phases reference this file. Changes require a visual regression pass.

---

## Design System Phases

| Phase | Name | Status |
|-------|------|--------|
| 0 | Design Bible + token foundation | ✅ Complete |
| 1 | Tailwind CSS v4 integration | ✅ Complete |
| 2 | Mobile-first hero (full + compact variants) | ✅ Complete |
| 3 | Badge gamification system | ✅ Complete |
| 4 | Status-aware color coding | ✅ Complete |
| 5 | Empty states + priority action cards | ✅ Complete |
| 6 | Desktop BI command center | ✅ Complete |

---

## 1. Colors

### Semantic Roles

| Role | Light | Dark | Usage |
|------|-------|------|-------|
| Background | `#FDFAF5` | `#1A1A14` | Page background |
| Surface | `#F3F0E8` | `#2A2A1E` | Cards, panels |
| Text | `#2C2416` | `#F0EDE5` | Primary body text |
| Muted | `#6B5D4D` | `#8B7365` | Secondary labels |
| Border | `#DDD6C8` | `rgba(255,255,255,0.08)` | Card/input borders |
| Primary | `#3A4D2A` | `#5B8A3A` | Forest green — brand primary |
| Accent | `#5B7A3A` | `#8BA868` | CTAs, active states |
| Amber | `#C47A2A` | `#E8A84C` | Secondary, warnings |
| Danger | `#CC3333` | `#E05050` | Behind/overdue states |
| Success | `#5B7A3A` | `#7AAA5A` | On track |
| Warning | `#D4A017` | `#E8C040` | Needs attention |

### Status Colors

```
Success (on track):  #5B7A3A  →  var(--status-success)
Warning (attention): #D4A017  →  var(--status-warning)
Danger  (overdue):   #CC3333  →  var(--status-danger)
Neutral (info):      #6B5D4D  →  var(--status-neutral)
```

### Readiness Thresholds (Dashboard, MembersTable, stat cards)
- **≥ 70%** → Success green (`#5B7A3A`)
- **30–69%** → Warning amber (`#D4A017`)
- **< 30%** → Danger red (`#CC3333`)

> **Deviation — MemberDetailPanel:** The drill-down panel uses tighter thresholds: ≥70% green, ≥50% amber, <50% red. The "⚠ Needs attention" alert fires at <50% (not <30%) because the panel is a coaching tool meant to flag actionable gaps earlier than the overview dashboard.

---

## 2. Typography

| Role | Font | Weight | Size |
|------|------|--------|------|
| Display headings | Source Serif 4 | 700–900 | 24–52px |
| Body / UI | DM Sans | 400–700 | 11–16px |
| Monospace | System mono | 400 | 12–13px |

- **Large readiness score** (MemberDetailPanel): 52px Source Serif 4, weight 900
- **Section labels**: 10–11px DM Sans, bold, uppercase, 1.2px tracking
- **Stat card values**: 28–32px Source Serif 4, weight 900

---

## 3. Spacing Scale

Tailwind default 4px base (`p-1` = 4px, `p-4` = 16px, `p-6` = 24px). Key layout constants:

| Element | Value |
|---------|-------|
| Sidebar width | 220px (collapsed: 64px) |
| TopBar height | 48px |
| Compact hero height | ~56px |
| Stat card padding | 16–20px |
| Content max-width | 900px (1100px for Gear/Calendar/Readiness) |

---

## 4. Status-Aware UI Rules

Every data-driven element that has a readiness score, countdown, or completion % must use the status color system — no hardcoded colors on dynamic values.

- Stat card values: color from threshold function
- Readiness bars: width + color from live data
- Countdown pill: 4-phase color by days remaining (≥90 green → ≥60 amber → ≥30 orange → <30 red)
- Badge states: earned (full opacity, gold border) vs locked (40% opacity, greyscale)

---

## 5. Badge System

8 badges in the progression system:

| Badge | Unlock Condition |
|-------|-----------------|
| Trail Ready | Overall readiness ≥ 70% |
| Gear Master | Gear category ≥ 100% |
| First Aider | Medical category complete |
| Paper Trail | Admin category complete |
| Summit Seeker | Training category ≥ 80% |
| Pack Pro | Gear owned + packed |
| Early Bird | Registered > 90 days before trek |
| Team Player | RSVP'd to a training event |

Badges appear in: BadgeRow (profile/detail panel), BadgeCatalog (full earned/locked grid), and DesktopBIChartRow (72px grid in BI header).

---

## 6. Adventure Themes

Per-adventure visual theming driven by `AdventureThemeContext`:

| Theme | Adventure Type | Colors | Texture |
|-------|---------------|--------|---------|
| Philmont | philmont | Forest green gradient | Topo contours |
| Sea Base | sea_base | Navy → teal | Wave lines |
| Northern Tier | northern_tier | Slate → aurora blue | Aurora bands |
| Summit Bechtel | summit_bechtel | Slate grey | Rock hatch |

The `AdventureThemeProvider` bridges `adventure_type` from `AdventureContext` into theme-resolved gradients and textures. Theme applies to hero background, sidebar gradient, and patch asset.

---

## 7. Desktop Layout (1024px+)

| Component | Spec |
|-----------|------|
| Sidebar | 220px, collapsible to 64px icon rail. Forest gradient. `localStorage` state. |
| TopBar | 48px. Section title, countdown badge, theme toggle, profile avatar. |
| Content area | Max-width 900px (1100px for wide views). Centered. Independent scroll. |
| MembersTable | Sortable (Name, Role, Readiness%, Training, Gear). Clickable rows. |
| DesktopBIChartRow | ReadinessTrendChart (58%) + BadgeRow grid (42%). Recharts, lazy-loaded. |
| MemberDetailPanel | 50% width, sticky. 52px score, 4 category bars, ⚠ alerts, 48px badge row. |

Desktop components only render at ≥1024px via `useIsDesktop()` hook. Mobile layout is completely unchanged.

---

## 8. Performance Budget

| Asset | Budget | Status |
|-------|--------|--------|
| Main JS bundle | 250KB gzipped | ✅ 226KB |
| Recharts chunks | Desktop only, lazy | ✅ ReadinessTrend 19KB, GearBar 30KB |
| Google Fonts | 2 requests max | ✅ 1 combined |
| Image assets | 50KB per patch | TBD |
| Lighthouse Mobile | 85+ | Phase 7 audit |
| Lighthouse Desktop | 95+ | Phase 7 audit |

---

## Deviations from Spec (Tracked)

| Deviation | Decision |
|-----------|----------|
| BI chart placement | Readiness Trend chart placed on Readiness view (not a "Dashboard" route — none exists). Area chart + Badge grid serve as the BI header for the Readiness panel. |
| MemberDetailPanel thresholds | Uses ≥70/≥50/<50 instead of bible's ≥70/≥30/<30. Earlier warning threshold is appropriate for a coaching panel vs overview dashboard. |

---

*This document is the contract between design intent and implementation. Any deviation is documented above. Adding a deviation requires updating this table.*
