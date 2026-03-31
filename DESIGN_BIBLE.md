# TrailLog Design Bible
## Single source of truth for every visual decision.

> **Status:** Phase 6 — Complete
> **Last updated:** 2026-03-31
> All phases read from this file. Changes here require a full visual regression pass.

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

### Status Colors (with CSS variable names)
```
Success (on track):  #5B7A3A  →  var(--status-success)
Warning (attention): #D4A017  →  var(--status-warning)
Danger  (overdue):   #CC3333  →  var(--status-danger)
Neutral (info):      #6B5D4D  →  var(--status-neutral)
```

### Readiness Thresholds
- **≥ 70%** → Success green (`#5B7A3A`)
- **30–69%** → Warning amber (`#D4A017`)
- **< 30%** → Danger red (`#CC3333`)

> **Deviation — MemberDetailPanel (Phase 6):** The drill-down panel uses a tighter threshold:
> ≥70% → green, ≥50% → amber, <50% → red. The "⚠ Needs attention" alert fires at <50% (not <30%).
> Rationale: at <50% a category is genuinely blocking crew readiness; the panel is a coaching tool
> that should flag issues earlier than the dashboard overview.

### Countdown Pill Phases
- **90+ days** → `#5B7A3A` (calm green)
- **60–89 days** → `#C47A2A` (amber)
- **30–59 days** → `#D4700A` (orange)
- **< 30 days** → `#CC3333` (red)

### Primary Color Ramp (Forest Green)
| Shade | Hex |
|-------|-----|
| 50  | `#F0F4EC` |
| 100 | `#D4E4B8` |
| 200 | `#B8CC9A` |
| 300 | `#8BA868` |
| 400 | `#6B8847` |
| 500 | `#5B7A3A` |
| 600 | `#4E6635` |
| 700 | `#3A4D2A` |
| 800 | `#2A3620` |
| 900 | `#1A2412` |

### Secondary Color Ramp (Amber)
| Shade | Hex |
|-------|-----|
| 50  | `#FFF8ED` |
| 100 | `#FDEECF` |
| 200 | `#FAD99A` |
| 300 | `#F5BE63` |
| 400 | `#EDA030` |
| 500 | `#C47A2A` |
| 600 | `#A66020` |
| 700 | `#8A4C18` |
| 800 | `#6A3810` |
| 900 | `#4A2608` |

### Danger Color Ramp
| Shade | Hex |
|-------|-----|
| 50  | `#FFF0F0` |
| 100 | `#FFD5D5` |
| 200 | `#FFB0B0` |
| 300 | `#FF7A7A` |
| 400 | `#EE4444` |
| 500 | `#CC3333` |
| 600 | `#AA2222` |
| 700 | `#8A1818` |
| 800 | `#6A1010` |
| 900 | `#480A0A` |

### Success Color Ramp
| Shade | Hex |
|-------|-----|
| 50  | `#F0F6EC` |
| 100 | `#D4E8C0` |
| 200 | `#A8D080` |
| 300 | `#7EBA55` |
| 400 | `#60A03A` |
| 500 | `#5B7A3A` |
| 600 | `#4A6430` |
| 700 | `#3A5025` |
| 800 | `#2A3C1A` |
| 900 | `#1A2A10` |

### Warning Color Ramp
| Shade | Hex |
|-------|-----|
| 50  | `#FFFBEA` |
| 100 | `#FFF3C0` |
| 200 | `#FFE480` |
| 300 | `#F5CF40` |
| 400 | `#E8B820` |
| 500 | `#D4A017` |
| 600 | `#B08010` |
| 700 | `#8A600C` |
| 800 | `#644508` |
| 900 | `#3E2C04` |

---

## 2. Typography

### Font Stack
```css
/* Display: headings, crew names, big numbers */
font-family: 'Source Serif 4', Georgia, serif;

/* Body: labels, descriptions, nav */
font-family: 'DM Sans', Helvetica, sans-serif;

/* Data: percentages, counts, gear numbers */
font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
```

### Loading Strategy
- **Only 2 Google Font requests** — Source Serif 4 + DM Sans in a single `<link>` call
- DM Sans: `<link rel="preload">` in `index.html` (prevents FOIT on body text)
- Both fonts: `font-display: swap`
- Monospace: system font — no external request

### Size Scale
| Token | px | Usage |
|-------|----|-------|
| `text-[11px]` | 11 | Badge labels, timestamps, table headers |
| `text-[12px]` | 12 | Secondary labels, metadata |
| `text-[13px]` | 13 | Body text, descriptions |
| `text-[14px]` | 14 | Emphasized body, stat values |
| `text-[16px]` | 16 | Subheadings, card titles |
| `text-[18px]` | 18 | Section headings |
| `text-[20px]` | 20 | Page titles (mobile) |
| `text-[24px]` | 24 | Page titles (desktop), hero stats |
| `text-[32px]` | 32 | Hero display numbers |
| `text-[48px]` | 48 | Large hero stats |
| `text-[72px]` | 72 | Full-bleed countdown |

### Line Height
- **Headings (display font):** `leading-[1.2]`
- **Body text:** `leading-[1.5]`
- **Data numbers:** `leading-[1.0]`

### Font Weights
- 400: body text, muted labels
- 500: emphasized labels
- 600: subheadings, card titles
- 700: headings, important values
- 900: display numbers, hero stats

---

## 3. Spacing Scale

All spacing uses these fixed values. No arbitrary values outside this scale.

| Token | px | Usage |
|-------|----|-------|
| `4px` | 4 | Icon gaps, tight inline spacing |
| `8px` | 8 | Component padding (compact), gap between labels |
| `12px` | 12 | Inset padding (small cards) |
| `16px` | 16 | Standard card padding, section gap |
| `20px` | 20 | Card padding (comfortable), vertical spacing |
| `24px` | 24 | Section padding, between cards |
| `32px` | 32 | Page section gaps |
| `48px` | 48 | Hero section vertical padding |
| `64px` | 64 | Full-bleed section separation |

---

## 4. Border Radius

| Context | Value | Token |
|---------|-------|-------|
| Inputs, small controls | `4px` | `rounded` |
| Buttons, small cards | `8px` | `rounded-lg` |
| Standard cards | `12px` | `rounded-xl` / `var(--radius-card)` = 14px |
| Large cards, panels | `16px` | `rounded-2xl` |
| Modals | `16px` | `rounded-2xl` |
| Pills, badges, tags | `9999px` | `rounded-full` |

---

## 5. Shadows

```css
/* Default card shadow (light mode) */
--shadow-card: 0 1px 3px rgba(0,0,0,0.06);

/* Elevated (modals, dropdowns) */
box-shadow: 0 4px 16px rgba(0,0,0,0.10);

/* Dark mode: no shadow (border replaces shadow) */
.dark { --shadow-card: none; }
```

---

## 6. Adventure Themes

Each adventure has a complete visual theme. Components read from `AdventureTheme` context — no hardcoded values.

| Adventure | Hero Gradient | Accent | BG Texture | Patch |
|-----------|--------------|--------|------------|-------|
| **Philmont** | `#3A4D2A → #4E6635 → #6B8847` | `#C47A2A` (amber) | Topo contours | Mountain arrowhead |
| **Sea Base** | `#1A3A5C → #1E5080 → #2A6FA0` | `#00B4A0` (teal) | Wave lines | Ship arrowhead |
| **Northern Tier** | `#2A3A5C → #3A4A6C → #5A6A8C` | `#C0C8D8` (silver) | Aurora lines | Canoe arrowhead |
| **Summit Bechtel** | `#2A2A2A → #3A2A2A → #4A3030` | `#CC3333` (red) | Rock texture | Summit arrowhead |

### AdventureTheme interface
```typescript
interface AdventureTheme {
  id: 'philmont' | 'seabase' | 'northern-tier' | 'summit';
  name: string;
  base: string;
  heroGradient: [string, string, string];
  patchImage: string;           // SVG path
  accentColor: string;
  bgTexture: 'topo' | 'waves' | 'aurora' | 'rock';
  textureOpacity: number;
  badgeSet: Badge[];
  gearTemplateId: string;
  trainingTemplateId: string;
}
```

---

## 7. Badge System

### 8 Badges (in order)
| # | Name | Icon | Category |
|---|------|------|----------|
| 1 | Boot Break-In | Boot | Physical |
| 2 | Pack Shakedown | Backpack | Gear |
| 3 | Medical Cleared | Medical Cross | Admin |
| 4 | Trail Ready | Mountain Trail | Physical |
| 5 | Gear Complete | Clipboard | Gear |
| 6 | First Hike | Boot Print | Physical |
| 7 | Crew Leader | Compass | Leadership |
| 8 | Summit Certified | Summit Flag | Achievement |

### Visual States
**Earned:**
- Full-color circle background (per category)
- 2px solid border with subtle inset shadow (embroidered feel)
- Copper/gold ring: `box-shadow: 0 0 0 2px #C4A035`
- Colored SVG icon, centered
- Bold label below

**Locked:**
- Dashed 2px border, `#C4B599` (muted)
- Grayscale/desaturated icon, 40% opacity
- Lock icon (12px) at bottom-right
- Muted label, reduced opacity

### Sizes
| Context | Size |
|---------|------|
| Inline (mentions) | 48px |
| Badge row (mobile) | 64px |
| Badge row (desktop) | 80px |
| Detail modal | 96px |

### Badge Row Rules
- Always show ALL 8 badges (earned first, then locked)
- Locked creates desire — never hide them
- Mobile: horizontal scroll, `scroll-snap-type: x mandatory`
- Desktop: 4-across grid in readiness section
- Counter above: "3/8 earned"
- Slight glow on earned: `filter: drop-shadow(0 0 4px currentColor)`

### Badge Category Colors
```
Physical:    #5B7A3A (forest green)
Gear:        #C47A2A (amber)
Admin:       #3A5A8A (blue)
Leadership:  #7A4A8A (purple)
Achievement: #C4A035 (gold)
```

---

## 8. Component Inventory

All components that need to be built or exist. Phases responsible for each:

| Component | Phase | Status |
|-----------|-------|--------|
| `StatCard` (4 variants) | 4 | Build |
| `MemberCard` | existing | — |
| `MemberRow` | existing | — |
| `EventCard` | existing | — |
| `BadgeEarned` | 3 | Build |
| `BadgeLocked` | 3 | Build |
| `BadgeRow` | 3 | Build |
| `CountdownPill` (4 phases) | 4 | Enhance |
| `BottomNavBar` | **EXISTS** | Do not rebuild |
| `CompactHero` | 2 | Build |
| `FullHero` | 2 | Enhance |
| `SidebarNav` | **EXISTS** | Do not rebuild |
| `AdventureSelector` | 1 | Build |
| `ReadinessBreakdown` (4-bar) | 4/6 | Build |
| `PriorityAlertCard` | 5 | Build |
| `EmptyState` | 5 | Build |

---

## 9. Stat Card Variants

| Variant | Left Accent | Value Text | When |
|---------|-------------|------------|------|
| Neutral | None | Default `--tl-text` | Informational (member count) |
| Good | `#5B7A3A` bar | `#5B7A3A` | Readiness ≥ 70% |
| Warning | `#D4A017` bar | `#D4A017` | Readiness 30–69% |
| Danger | `#CC3333` bar | `#CC3333` | Readiness < 30% |

Left accent bar: `4px wide`, full card height, `border-radius: 4px 0 0 4px`.

---

## 10. Bottom Nav Bar (EXISTING — reference only)

> **DO NOT REBUILD.** Component exists in `App.tsx` as `BottomNavBar`.

- Height: `60px + env(safe-area-inset-bottom)`
- 5 items: Home, Training, Gear, Readiness, Settings
- Icons: Lucide React, 22px
- Active: primary color icon + bold label
- Inactive: muted gray icon + regular label

---

## 11. Compact Hero (Mobile Inner Pages)

> Built in Phase 2. Reference spec:

- **Home:** Full hero — patch (large), crew name, dates, countdown pill, rank + badge, readiness %
- **Inner pages (Training, Readiness, Itinerary, Gear, Reports, Docs):** Compact bar — `~56px` height, small patch icon (32px) + crew name + countdown pill in single row
- Full hero spacing uses design bible spacing scale (no excess padding)
- Desktop: unchanged (sidebar layout)

---

## 12. Desktop Layout (1024px+)

> Sidebar + TopBar exist. Phase 6 adds BI panels.

- **Sidebar:** 220px collapsible to 64px, forest gradient
- **TopBar:** 48px sticky, section title, countdown badge, theme toggle, profile
- **Content:** `max-width: 900px` centered, independent scroll
- **BI panels:** Recharts lazy-loaded, 1024px+ only — never in mobile bundle

---

## Appendix A: CSS Custom Property Index

All color tokens are defined as CSS custom properties in `client/src/app.css`.
Key tokens for Phase 4+ implementation:

```css
/* Status colors (add to :root and .dark in app.css) */
--status-success: #5B7A3A;
--status-warning: #D4A017;
--status-danger:  #CC3333;
--status-neutral: #6B5D4D;

/* Countdown pill backgrounds */
--countdown-calm:    #5B7A3A;
--countdown-amber:   #C47A2A;
--countdown-orange:  #D4700A;
--countdown-urgent:  #CC3333;
```

---

## Appendix B: Performance Budget

| Asset | Budget | Current |
|-------|--------|---------|
| Main JS bundle | 250KB gzipped | 226KB ✅ |
| Google Fonts | 2 requests max | 1 combined ✅ |
| Recharts chunk | Desktop only | ✅ lazy-loaded (ReadinessTrend 19KB, GearBar 30KB) |
| Image assets | 50KB per patch | TBD |
| Lighthouse Mobile | 85+ | TBD (Phase 7 audit pending) |
| Lighthouse Desktop | 95+ | TBD (Phase 7 audit pending) |

---

*This document is the contract between design intent and implementation. Any deviation requires an explicit decision — update this file to reflect the new decision.*
