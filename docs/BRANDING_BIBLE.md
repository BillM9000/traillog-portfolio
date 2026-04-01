# TrailLog Branding Bible

> Single source of truth for visual identity, typography, color palette, and tone.
> Last verified against codebase: 2026-03-31

---

## Identity

| Element | Value |
|---------|-------|
| **Product name** | TrailLog |
| **Wordmark** | Trail (white/dark) + **Log** (sage green `#B8CC9A`) |
| **Tagline** | High Adventure Training Coordinator |
| **Company** | GraceZero.ai |
| **Sub-brand text** | "by GraceZero.ai" (uppercase, letter-spacing 2px, 9px) |
| **Contact** | bill.mccoy@gracezero.ai |
| **Domain** | traillog.gracezero.ai |
| **Legal disclaimer** | "An independent tool by GraceZero.ai — not affiliated with or endorsed by Scouting America or any national scouting organization." |

---

## Logo

**Compass-Mountain Mark** (`client/src/components/Logo.tsx`)
- Outer compass ring: `#B8CC9A` (50% opacity)
- Inner ring: `#D4E4B8` (30% opacity)
- Mountain peaks: `#B8CC9A` back, `#FDFAF5` front
- Trail path: `#5B7A3A` (1.5px stroke, curved)
- Data point markers: `#FDFAF5` fill, `#5B7A3A` stroke
- Cardinal dots: `#D4E4B8` (N=full, S/E/W=40% opacity)
- North needle: `#D4E4B8` (70% opacity)
- Default size: 32px, viewBox 48×48

**Branding assets** (`branding/` folder):
- `traillog-logo.svg` — standalone mark
- `traillog-logo-wordmark.svg` — mark + wordmark
- `traillog-logo-wordmark-dark-bg.svg` — for dark backgrounds
- `traillog-logo-wordmark-light.svg` — light variant

**Favicon**: `client/public/favicon.svg` — mountain/trail logo with dark background circle

---

## Typography

| Role | Font | Weights | Source |
|------|------|---------|--------|
| **Display / Headings** | Source Serif 4 | 400, 600, 700, 900 | Google Fonts |
| **Body / UI** | DM Sans | 400, 500, 600, 700 | Google Fonts |
| **Fallback (display)** | Georgia, serif | — | System |
| **Fallback (body)** | Helvetica, sans-serif | — | System |

**Usage rules:**
- `fontDisplay` = `'Source Serif 4', Georgia, serif` — headings, card titles, crew name, countdown
- `fontBody` = `'DM Sans', 'Helvetica', sans-serif` — all body text, buttons, labels, inputs, tabs
- Card titles: 15px, weight 800, `fontDisplay`
- Tab buttons: 11px, weight 600/700, `fontBody`
- Sub-labels: 9–10px, weight 600, `fontBody`, uppercase where appropriate

---

## Color Palette

### Core Brand Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Forest Deep** | `#3A4D2A` | Light theme accent, primary buttons, active pills, header gradient end |
| **Forest Mid** | `#4E6635` | Header gradient middle |
| **Forest Light** | `#6B8847` | Header gradient start (light mode) |
| **Sage Green** | `#B8CC9A` | "Log" wordmark color, dark theme accent, active pills (dark), progress elements |
| **Sage Pale** | `#D4E4B8` | Light theme accent background, pale accents |
| **Olive Green** | `#5B7A3A` | Light theme accent, selected states, adult member badges |
| **Moss Dark** | `#8BA868` | Dark theme accent, heat map full |

### Light Theme

| Token | Hex | Purpose |
|-------|-----|---------|
| `bg` | `#FDFAF5` | Page background (warm cream) |
| `bgAlt` / `bgCard` | `#F3F0E8` | Card backgrounds, alternate rows |
| `bgHeader` | gradient `#3A4D2A → #4E6635 → #6B8847` | Header bar |
| `text` | `#2C2416` | Primary text (warm black) |
| `textMuted` | `#6B5D4D` | Secondary text |
| `textDim` | `#8B7D6B` | Tertiary/hint text |
| `heading` | `#2C2416` | Section headings |
| `accent` | `#5B7A3A` | Interactive elements, links |
| `border` | `#DDD6C8` | Card borders |
| `borderLight` | `#C4B599` | Subtle borders |
| `gold` | `#C4A035` | Achievement gold |
| `urgency` | `#C47A2A` | Urgency/warning amber |
| `danger` | `#c06040` | Delete/error red-orange |

### Dark Theme

| Token | Hex | Purpose |
|-------|-----|---------|
| `bg` | `#1A1F16` | Page background (deep forest) |
| `bgAlt` / `bgCard` | `#252B1F` | Card backgrounds |
| `bgHeader` | gradient `#1A2412 → #2A3620 → #3A4D2A` | Header bar |
| `text` | `#E8E0D4` | Primary text (warm white) |
| `textMuted` | `#B0A898` | Secondary text |
| `textDim` | `#8B8478` | Tertiary/hint text |
| `heading` | `#E8E0D4` | Section headings |
| `accent` | `#8BA868` | Interactive elements |
| `border` | `#3A3D34` | Card borders |
| `borderLight` | `#4A4D40` | Subtle borders |
| `gold` | `#E8A84C` | Achievement gold |
| `urgency` | `#E8A84C` | Urgency/warning amber |
| `danger` | `#c06040` | Delete/error red-orange |

### Semantic Colors

| Purpose | Light | Dark |
|---------|-------|------|
| Adult badge bg | `#5B7A3A` | `#5B7A3A` |
| Scout badge bg | `#8B6E4E` | `#8B6E4E` |
| Unknown type bg | `#8B7D6B` | `#8B7D6B` |
| Support badge bg | `#8a6d3b` | `#8a6d3b` |
| Active pill bg | `#3A4D2A` | `#B8CC9A` |
| Active pill text | `#FDFAF5` | `#1A1F16` |
| Heat map full | `#5B7A3A` | `#8BA868` |

### Export / Print Colors

| Name | Hex | Usage |
|------|-----|-------|
| Header bg | `#3A4D2A` | Excel/PDF header rows |
| Accent bg | `#D4E8B8` | Highlighted cells |
| Alt row bg | `#F5F5F0` | Alternating rows |
| Border | `#C8C4B8` | Cell borders |

---

## Header Gradient

```
Light: linear-gradient(175deg, #3A4D2A 0%, #4E6635 55%, #6B8847 100%)
Dark:  linear-gradient(175deg, #1A2412 0%, #2A3620 55%, #3A4D2A 100%)
```

All header text is light-on-dark regardless of theme mode.

---

## Component Style Tokens

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| Card border-radius | 14px | 14px | All cards |
| Card padding | 16px | 16px | Standard cards |
| Button border-radius | 8px (toolbar), 10px (primary), 20px (pill) | same | Buttons |
| Tab border-radius | 10px | 10px | Tab buttons |
| Shadow | `0 1px 3px rgba(0,0,0,0.06)` | none | Card shadow |
| Badge border-radius | 6px (member type), 10px (generic) | same | Badges |

---

## Tone & Voice

- **Warm, encouraging, Scout-inspired** — not corporate
- Progress milestones reference Scout Law values ("A Scout is Trustworthy", "Prepared", "Brave", "Cheerful")
- Trail metaphor throughout: Trailhead → Base Camp → Timber Ridge → Eagle Point → Summit
- CTA copy uses action words: "Get Started", "Enter →", "View Details >"
- Error/empty states are supportive, not blaming ("No documents yet" not "No documents found")
- Email subject lines use emoji sparingly and trail language
- Never claim BSA/Philmont affiliation

---

## Trail Badges (7 total)

| Badge | Emoji | Name |
|-------|-------|------|
| Gear Ready | 🎒 | gear_ready |
| Trail Medic | 🏥 | trail_medic |
| Admin Pro | 📋 | admin_pro |
| Training Complete | 🥾 | training_complete |
| AI Ready | 🤖 | ai_ready |
| AI Gear Scout | 🛍️ | ai_gear |
| Fully Prepared | ⭐ | fully_prepared |

---

## Journey Waypoints

| % | Name | Scout Law Value |
|---|------|-----------------|
| 0% | Trailhead | "The journey begins" |
| 25% | Base Camp | "A Scout is Trustworthy" |
| 50% | Timber Ridge | "A Scout is Prepared" |
| 75% | Eagle Point | "A Scout is Brave" |
| 100% | Summit! | "A Scout is Cheerful" |

---

## Icon System

- **Functional UI icons** (<20px): Lucide React (MIT license) — CalendarIcon, ClipboardCheck, Map, Backpack, FileText, FolderOpen, Upload, Trash2, Download, Settings, Sun, Moon, etc.
- **Decorative/large icons** (24px+): Clay-style PNGs reserved for large spots (currently unused)
- **Tab icons**: Lucide at 13px, strokeWidth 2.5
- **Sharing type badges**: text labels (CREW green, BUDDY blue, PROVIDED orange)

---

## Tailwind CSS Class Mapping

The app uses **Tailwind CSS v4** with custom CSS properties defined in `client/src/app.css`. The `@theme` directive registers brand tokens with Tailwind. Components use `className` with Tailwind utilities instead of inline `style={{}}` objects.

### Theme Token Classes

| Brand Token | Tailwind Class (bg) | Tailwind Class (text) | CSS Variable |
|-------------|---------------------|----------------------|--------------|
| Page bg | `bg-tl-bg` | — | `--color-tl-bg` |
| Card bg | `bg-tl-bgCard` | — | `--color-tl-bgCard` |
| Alt bg | `bg-tl-bgAlt` | — | `--color-tl-bgAlt` |
| Primary text | — | `text-tl-text` | `--color-tl-text` |
| Muted text | — | `text-tl-textMuted` | `--color-tl-textMuted` |
| Dim text | — | `text-tl-textDim` | `--color-tl-textDim` |
| Heading text | — | `text-tl-heading` | `--color-tl-heading` |
| Accent | `bg-tl-accent` | `text-tl-accent` | `--color-tl-accent` |
| Border | `border-tl-border` | — | `--color-tl-border` |
| Border light | `border-tl-borderLight` | — | `--color-tl-borderLight` |
| Gold | `bg-tl-gold` | `text-tl-gold` | `--color-tl-gold` |
| Danger | `bg-tl-danger` | `text-tl-danger` | `--color-tl-danger` |

### Component Utility Classes (`tl-*`)

Custom `@layer components` classes in `app.css` replace the old JavaScript helper functions from `theme.ts`:

| Old JS Helper | New Tailwind Class | Usage |
|---------------|-------------------|-------|
| `card()` | `tl-card` | Card container with bg, border, radius, shadow |
| `badge()` | `tl-badge` | Inline badge with padding, radius, font |
| `toolbarBtn()` | `tl-btn-toolbar` | Toolbar action button |
| `cardTitle()` | `tl-card-title` | Card heading typography |
| `statCard()` | `tl-stat-card` | Dashboard stat card |
| `input()` | `tl-input` | Form input field |

### Dark Mode

Dark mode is controlled by a `dark` class on the `<html>` element. ThemeContext manages the toggle; Tailwind's `dark:` variant prefix applies dark theme styles automatically. CSS custom properties in `app.css` switch values based on the `.dark` selector.

### Conditional Classes

Use `clsx` (imported from `clsx`) for conditional class composition:
```tsx
import { clsx } from 'clsx';
className={clsx('tl-card', isActive && 'ring-2 ring-tl-accent')}
```

---

## File & Asset Locations

| Asset | Path |
|-------|------|
| Logo component | `client/src/components/Logo.tsx` |
| Tailwind config & theme variables | `client/src/app.css` |
| Theme context (dark mode toggle) | `client/src/contexts/ThemeContext.tsx` |
| Theme constants (badges, waypoints) | `client/src/utils/theme.ts` |
| Export colors | `client/src/utils/exportUtils.ts` |
| Vite config (Tailwind plugin) | `client/vite.config.ts` |
| Favicon | `client/public/favicon.svg` |
| Branding SVGs | `branding/` |
| Google Fonts link | `client/index.html` |
