# TrailLog — Foundation Migrations

## Claude Code Implementation Prompts

Two sessions, executed in order. No users are on the platform — this is pre-release. Breaking changes are acceptable. The goal is to establish the final production architecture before any public release.

**Current stack (post-migration):** React 18 + TypeScript, Vite, Express.js, PostgreSQL (pg driver, async), Tailwind CSS v4, Docker on Hostinger VPS.

**Previous stack:** React 18 + TypeScript, Vite, Express.js, SQLite (better-sqlite3), inline styles via useTheme(), Docker on Hostinger VPS.

**Both migrations are complete.** PostgreSQL migration done 2026-03-18. Tailwind CSS migration done 2026-03-18.

---
---

# Session 1: PostgreSQL Migration

**Objective:** Replace SQLite with the PostgreSQL instance already running on the VPS. The app has zero users — this is a clean cutover, not a live migration. Delete all SQLite code when done.

## Step 1 — Codebase Scan

Before writing any code, answer these questions and report findings:

1. **Database connection.** How is `better-sqlite3` initialized? Where does the connection live? Is it a singleton, per-request, or something else? List every file that imports the database.
2. **Query inventory.** List every SQL query in the codebase — inline strings, prepared statements, everything. Note which use SQLite-specific syntax (e.g., `datetime('now')`, `INTEGER PRIMARY KEY AUTOINCREMENT`, `PRAGMA`, `json_group_array`, `LIKE` with case sensitivity behavior, `||` for string concat).
3. **Schema.** Read `schema.sql` from D5. This is the canonical schema definition. Note every SQLite-specific type or constraint that needs translation.
4. **Transactions.** Are there any explicit transactions (`db.transaction()`)? Where?
5. **WAL mode and pragmas.** List every `PRAGMA` statement. These don't exist in Postgres — each needs an equivalent or removal.
6. **Data.** Is there any seed data or initialization logic that inserts rows on first run?
7. **Postgres access.** Verify the Postgres instance is accessible from the Docker container. Document the connection string format (host, port, database name, user, password). If the app runs in Docker and Postgres runs on the host, the connection host is typically `host.docker.internal` or the host's internal IP — verify which works.

## Step 2 — Schema Translation

Create `schema.pg.sql` — the PostgreSQL version of the canonical schema. Key translations:

| SQLite | PostgreSQL |
|--------|-----------|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` or `GENERATED ALWAYS AS IDENTITY` |
| `TEXT` | `TEXT` (same) |
| `INTEGER` for booleans (0/1) | `BOOLEAN` with `DEFAULT FALSE` |
| `REAL` | `DOUBLE PRECISION` or `NUMERIC` |
| `datetime('now')` | `NOW()` or `CURRENT_TIMESTAMP` |
| `PRAGMA foreign_keys = ON` | Always enforced in Postgres (remove pragma) |
| `PRAGMA journal_mode = WAL` | WAL is Postgres default (remove pragma) |
| `json_group_array()` | `json_agg()` or `array_agg()` |
| `GROUP_CONCAT()` | `STRING_AGG()` |
| `IFNULL()` | `COALESCE()` (same in both, but verify usage) |
| `||` string concat | `||` (same in both) |
| `LIKE` (case-insensitive in SQLite) | `ILIKE` (case-insensitive in Postgres) |

Preserve every table, column, constraint, index, and relationship from D5's `schema.sql`. The Postgres schema must be a faithful translation, not a redesign.

Run `schema.pg.sql` against the Postgres instance and verify it creates all tables cleanly.

## Step 3 — Connection Layer

Replace `better-sqlite3` with a Postgres client. Use `pg` (node-postgres) directly — not an ORM.

Create a `db.ts` (or `db.js` if the server isn't TypeScript yet) module:

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Connection pool: min 2, max 10 for a small app
  min: 2,
  max: 10,
});

export default pool;
```

**Key differences from better-sqlite3:**

| better-sqlite3 (sync) | pg (async) |
|---|---|
| `db.prepare(sql).all(params)` | `await pool.query(sql, params)` → `rows` |
| `db.prepare(sql).get(params)` | `await pool.query(sql, params)` → `rows[0]` |
| `db.prepare(sql).run(params)` | `await pool.query(sql, params)` → `rowCount` |
| Returns result directly | Returns `{ rows, rowCount, fields }` |
| `?` placeholders | `$1, $2, $3` numbered placeholders |
| Synchronous — no async/await | Asynchronous — every query needs `await` |

**This is the most impactful change.** Every route handler that touches the database becomes async. Every `db.prepare().all()` becomes `await pool.query()`. Every `?` becomes `$1, $2, $3`.

Example translation:

```javascript
// BEFORE (SQLite)
app.get('/api/crews/:crewId/members', requireAuth, (req, res) => {
  const members = db.prepare(`
    SELECT m.*, u.name, u.email
    FROM members m
    JOIN users u ON u.id = m.user_id
    WHERE m.crew_id = ?
  `).all(req.params.crewId);
  res.json(members);
});

// AFTER (PostgreSQL)
app.get('/api/crews/:crewId/members', requireAuth, async (req, res) => {
  const { rows: members } = await pool.query(`
    SELECT m.*, u.name, u.email
    FROM members m
    JOIN users u ON u.id = m.user_id
    WHERE m.crew_id = $1
  `, [req.params.crewId]);
  res.json(members);
});
```

## Step 4 — Route-by-Route Migration

Go through every route file and convert every database call:

1. **Make the handler `async`** — add `async` before `(req, res)`
2. **Replace `db.prepare().all()` with `await pool.query()`** — destructure `{ rows }`
3. **Replace `db.prepare().get()` with `await pool.query()`** — use `rows[0]`
4. **Replace `db.prepare().run()` with `await pool.query()`** — use `rowCount` if needed
5. **Replace `?` placeholders with `$1, $2, $3`** — numbered sequentially
6. **Replace SQLite functions** — see the translation table above
7. **Add error handling** — wrap each query in try/catch or use an error-handling middleware

Work through each route file in order:
- `routes/auth.js`
- `routes/troops.js`
- `routes/adventures.js`
- `routes/crews.js`
- `routes/training.js`
- `routes/gear.js`
- `routes/admin.js`

**For transactions:**

```javascript
// BEFORE (SQLite)
const transaction = db.transaction(() => {
  db.prepare('INSERT INTO...').run(a);
  db.prepare('UPDATE...').run(b);
});
transaction();

// AFTER (PostgreSQL)
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO...', [a]);
  await client.query('UPDATE...', [b]);
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

## Step 5 — Session Store

If sessions are stored in SQLite (or in memory), move them to Postgres:

```javascript
import pgSession from 'connect-pg-simple';
import session from 'express-session';

const PgStore = pgSession(session);

app.use(session({
  store: new PgStore({
    pool: pool,
    tableName: 'sessions',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 },
}));
```

If sessions are in-memory (`express-session` default), this also fixes the problem of sessions being lost on server restart.

## Step 6 — Environment Configuration

Add the Postgres connection string to the environment:

```bash
# .env or docker-compose environment
DATABASE_URL=postgresql://traillog:password@host:5432/traillog
```

Update `docker-compose.yml` to pass the environment variable to the container. If the app container needs to reach Postgres on the host machine:

```yaml
services:
  app:
    environment:
      - DATABASE_URL=postgresql://traillog:password@host.docker.internal:5432/traillog
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

## Step 7 — Seed Data

If the app has any initialization data (default gear catalog, councils list, etc.), create a `seed.pg.sql` file that inserts it. Run it after `schema.pg.sql`.

## Step 8 — Cleanup

- Delete `better-sqlite3` from `package.json`
- Delete any `.db` files from the repo (add to `.gitignore`)
- Delete `schema.sql` (the SQLite version) — rename `schema.pg.sql` to `schema.sql`
- Remove all `PRAGMA` statements
- Remove any `better-sqlite3` imports
- Update the `SCHEMA.md` ERD if types changed (e.g., `INTEGER` booleans → `BOOLEAN`)

## Step 9 — Verification

- [ ] Run `schema.pg.sql` against a clean Postgres database — all tables created
- [ ] Run all 40 integration tests — all pass against Postgres
- [ ] Start the app, log in, enter a crew, navigate every tab — no errors
- [ ] Toggle a gear item — writes to Postgres correctly
- [ ] Create and delete a training event — works
- [ ] Check browser console — no errors
- [ ] Check server logs — no errors
- [ ] Verify sessions survive server restart (they're in Postgres now)
- [ ] `grep -r "better-sqlite3\|sqlite" --include="*.ts" --include="*.js"` returns nothing

## Constraints

- No schema redesign. This is a 1:1 translation from SQLite to Postgres. Same tables, same columns, same relationships.
- No new npm dependencies beyond `pg` and `connect-pg-simple` (or their TypeScript type packages)
- Do not use an ORM (Prisma, Drizzle, etc.) — raw `pg` with parameterized queries
- Every route handler that touches the database must be async with proper error handling
- The frontend must not change at all — it talks to the same API endpoints

## New Dependencies

```bash
npm install pg connect-pg-simple
npm install -D @types/pg
```

---
---

# Session 2: Tailwind CSS Migration

**Objective:** Replace all inline styles (`style={{ color: theme.text }}`) with Tailwind CSS utility classes. Preserve the exact current appearance. This is a visual no-op — the app must look identical before and after.

## Step 1 — Codebase Scan

Before writing any code, answer these questions:

1. **ThemeContext structure.** Read `client/src/contexts/ThemeContext.tsx` and `client/src/utils/theme.ts`. Document every color token, every helper function (`card()`, `cardTitle()`, `badge()`, `toolbarBtn()`), and every place they're used.
2. **Inline style inventory.** How many components use `style={{}}` with theme values? List them all. This is the scope of the migration.
3. **CSS files.** Are there any existing `.css` files? What do they contain? Any media queries?
4. **Vite config.** What plugins are configured? Is PostCSS already set up?
5. **Font loading.** How are Source Serif 4 and DM Sans loaded? (Should be Google Fonts link in `index.html`.)
6. **BRANDING_BIBLE.md.** Read it. All Tailwind configuration must map to these tokens.

## Step 2 — Install and Configure Tailwind

```bash
cd client
npm install -D tailwindcss @tailwindcss/vite
```

Create `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class', // Toggle via class on <html> or a wrapper div
  theme: {
    extend: {
      // Map every brand token to Tailwind
      colors: {
        // Core brand
        'forest-deep': '#3A4D2A',
        'forest-mid': '#4E6635',
        'forest-light': '#6B8847',
        'sage': '#B8CC9A',
        'sage-pale': '#D4E4B8',
        'olive': '#5B7A3A',
        'moss': '#8BA868',
        
        // Light theme semantic
        'cream': '#FDFAF5',
        'cream-alt': '#F3F0E8',
        'warm-black': '#2C2416',
        'text-muted': '#6B5D4D',
        'text-dim': '#8B7D6B',
        'border-main': '#DDD6C8',
        'border-light': '#C4B599',
        'gold': '#C4A035',
        'urgency': '#C47A2A',
        'danger': '#c06040',
        
        // Dark theme semantic
        'dark-bg': '#1A1F16',
        'dark-card': '#252B1F',
        'dark-text': '#E8E0D4',
        'dark-muted': '#B0A898',
        'dark-dim': '#8B8478',
        'dark-border': '#3A3D34',
        'dark-border-light': '#4A4D40',
        'dark-gold': '#E8A84C',
        
        // Role badges
        'adult-badge': '#5B7A3A',
        'scout-badge': '#8B6E4E',
        'support-badge': '#8a6d3b',
      },
      fontFamily: {
        display: ['"Source Serif 4"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'Helvetica', 'sans-serif'],
      },
      borderRadius: {
        'card': '14px',
        'tab': '10px',
        'btn': '8px',
        'pill': '20px',
        'badge-sm': '6px',
        'badge': '10px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.06)',
      },
      fontSize: {
        'card-title': ['15px', { fontWeight: '800' }],
        'tab': ['11px', { fontWeight: '600' }],
        'sub-label': ['9px', { fontWeight: '600' }],
      },
    },
  },
  plugins: [],
};

export default config;
```

Add the Tailwind directives to your main CSS file (create `client/src/index.css` if it doesn't exist):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Import it in `main.tsx`:

```tsx
import './index.css';
```

Update `vite.config.ts` to include the Tailwind plugin:

```typescript
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // ... rest of config
});
```

Verify the build works before changing any components.

## Step 3 — Dark Mode Strategy

The current app uses ThemeContext to swap between light and dark color objects in JavaScript. With Tailwind, dark mode uses the `dark:` prefix variant.

**Strategy:** Add a `dark` class to the root element when dark mode is active. ThemeContext still manages the toggle state, but instead of providing color objects, it adds/removes the `dark` class.

```tsx
// In ThemeContext.tsx — update to toggle class
useEffect(() => {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}, [isDark]);
```

Then in components:

```tsx
// BEFORE (inline)
<div style={{ background: theme.bg, color: theme.text }}>

// AFTER (Tailwind)
<div className="bg-cream text-warm-black dark:bg-dark-bg dark:text-dark-text">
```

ThemeContext can be simplified dramatically — it only needs to provide `isDark` and `toggleTheme`. The color tokens, helper functions (`card()`, `badge()`, etc.) are replaced by Tailwind classes.

**Do not delete ThemeContext yet.** Simplify it to only manage the dark mode toggle. Other contexts or components may reference it for the `isDark` boolean.

## Step 4 — Create Utility Classes for Repeated Patterns

Before migrating components, define reusable class patterns for the most common UI elements. Add these as `@apply` utilities or document them as copy-paste patterns:

```css
/* In index.css — common component patterns */
@layer components {
  .tl-card {
    @apply bg-cream-alt dark:bg-dark-card border border-border-main dark:border-dark-border rounded-card p-4 shadow-card dark:shadow-none;
  }
  
  .tl-stat-card {
    @apply bg-cream-alt dark:bg-dark-card border border-border-main dark:border-dark-border rounded-card p-4;
  }
  
  .tl-btn-primary {
    @apply bg-forest-deep text-cream font-body text-sm font-semibold rounded-btn px-4 py-2 hover:bg-forest-mid transition-colors duration-150;
  }
  
  .tl-btn-danger {
    @apply bg-danger text-cream font-body text-sm font-semibold rounded-btn px-4 py-2 hover:opacity-90 transition-colors duration-150;
  }
  
  .tl-table-header {
    @apply font-body text-[11px] font-semibold uppercase tracking-wider text-text-muted dark:text-dark-muted;
  }
  
  .tl-table-row {
    @apply hover:bg-cream-alt dark:hover:bg-dark-card transition-colors duration-150 cursor-pointer;
  }
  
  .tl-sidebar-item {
    @apply flex items-center gap-3 px-4 py-2 font-body text-sm text-sage-pale hover:bg-white/10 rounded-btn transition-colors duration-150;
  }
  
  .tl-sidebar-item-active {
    @apply bg-white/15 border-l-[3px] border-sage;
  }
  
  .tl-badge {
    @apply inline-flex items-center px-2 py-0.5 rounded-badge text-[11px] font-semibold font-body;
  }
  
  .tl-input {
    @apply w-full bg-cream dark:bg-dark-bg border border-border-main dark:border-dark-border rounded-btn px-3 py-2 font-body text-sm text-warm-black dark:text-dark-text placeholder:text-text-dim dark:placeholder:text-dark-dim focus:outline-none focus:ring-2 focus:ring-olive dark:focus:ring-moss;
  }
}
```

These `tl-` prefixed classes replace the JavaScript helper functions (`card()`, `badge()`, `toolbarBtn()`).

## Step 5 — Component-by-Component Migration

Migrate every component from inline styles to Tailwind classes. Work through them in dependency order — leaf components first, then parents:

### Migration pattern for each component:

1. Open the component file
2. Find every `style={{}}` prop
3. Translate each CSS property to Tailwind classes
4. Replace `style={{}}` with `className="..."`
5. Add `dark:` variants for every color/background class
6. Remove `useTheme()` import if no longer needed
7. Verify the component renders identically in both themes

### Common translations:

```tsx
// Layout
style={{ display: 'flex', alignItems: 'center', gap: 12 }}
→ className="flex items-center gap-3"

style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}
→ className="grid grid-cols-4 gap-4"

style={{ maxWidth: 900, margin: '0 auto' }}
→ className="max-w-[900px] mx-auto"

// Typography
style={{ fontFamily: theme.fontDisplay, fontSize: 18, fontWeight: 700 }}
→ className="font-display text-lg font-bold"

style={{ fontFamily: theme.fontBody, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}
→ className="font-body text-[11px] font-semibold uppercase tracking-wider"

// Colors (with dark mode)
style={{ color: theme.text, background: theme.bg }}
→ className="text-warm-black dark:text-dark-text bg-cream dark:bg-dark-bg"

style={{ color: theme.textMuted }}
→ className="text-text-muted dark:text-dark-muted"

style={{ borderColor: theme.border }}
→ className="border-border-main dark:border-dark-border"

// Spacing
style={{ padding: 16 }}  →  className="p-4"
style={{ padding: '8px 12px' }}  →  className="px-3 py-2"
style={{ marginBottom: 24 }}  →  className="mb-6"

// Border radius (use custom tokens)
style={{ borderRadius: 14 }}  →  className="rounded-card"
style={{ borderRadius: 10 }}  →  className="rounded-tab"
style={{ borderRadius: 20 }}  →  className="rounded-pill"

// Responsive (desktop only)
style={isDesktop ? { gridTemplateColumns: 'repeat(4, 1fr)' } : { gridTemplateColumns: '1fr' }}
→ className="grid grid-cols-1 lg:grid-cols-4"

// Conditional classes (use template literals or clsx)
style={{ background: isActive ? theme.accent : theme.bgCard }}
→ className={`${isActive ? 'bg-olive dark:bg-moss' : 'bg-cream-alt dark:bg-dark-card'}`}
```

### Migration order (leaf → parent):

1. **Simple UI elements:** Badge, ProgressBar, Avatar, Tooltip
2. **Cards:** StatCard, MemberCard, GearItemCard, ReportCard
3. **Tables:** MemberTable rows, header cells
4. **Tab-level components:** GearTab, ReadinessView, TrainingCalendar, ItineraryView, ReportsView, DocsView
5. **Layout components:** Sidebar, TopBar, ContentArea, DesktopLayout
6. **Top-level:** MainView, App, HomeDashboard
7. **Special:** LandingPage (pre-auth), modals, toasts

### Handling the `useIsDesktop` hook:

The current `useIsDesktop(1024)` hook is used to conditionally apply inline styles. With Tailwind, most of this is replaced by the `lg:` responsive prefix (1024px breakpoint):

```tsx
// BEFORE
const isDesktop = useIsDesktop(1024);
<div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : '1fr' }}>

// AFTER — no hook needed
<div className="grid grid-cols-1 lg:grid-cols-4">
```

Keep `useIsDesktop` only where JavaScript logic (not just styling) depends on the viewport width — e.g., deciding whether to render the sidebar component at all.

## Step 6 — Gradient Handling

The header and sidebar use CSS gradients. Tailwind supports arbitrary gradients:

```tsx
// Header gradient
className="bg-gradient-to-b from-forest-deep via-forest-mid to-forest-light 
           dark:from-[#1A2412] dark:via-[#2A3620] dark:to-forest-deep"

// Or use a custom utility in tailwind.config.ts:
backgroundImage: {
  'header-gradient': 'linear-gradient(175deg, #3A4D2A 0%, #4E6635 55%, #6B8847 100%)',
  'header-gradient-dark': 'linear-gradient(175deg, #1A2412 0%, #2A3620 55%, #3A4D2A 100%)',
  'sidebar-gradient': 'linear-gradient(to bottom, #3A4D2A, #4E6635, #6B8847)',
  'sidebar-gradient-dark': 'linear-gradient(to bottom, #1A2412, #2A3620, #3A4D2A)',
},
```

## Step 7 — Clean Up ThemeContext

After all components are migrated:

1. Remove all color token objects from ThemeContext (they now live in `tailwind.config.ts`)
2. Remove helper functions (`card()`, `badge()`, `toolbarBtn()`, etc.) — they're replaced by `tl-` classes
3. Remove `fontBody` and `fontDisplay` exports — they're `font-body` and `font-display` in Tailwind
4. Keep only: `isDark`, `toggleTheme`, and any non-styling state

ThemeContext should shrink to ~20 lines.

Remove `client/src/utils/theme.ts` entirely if all its exports have been replaced.

Update `BRANDING_BIBLE.md` to reference Tailwind classes instead of JavaScript tokens. Add a section mapping brand tokens to Tailwind class names.

## Step 8 — Verification

For every component, verify in both themes at both breakpoints:

- [ ] **Desktop light (1440px):** Renders identically to before migration
- [ ] **Desktop dark (1440px):** Renders identically to before migration
- [ ] **Mobile light (375px via DevTools):** Renders identically to before migration
- [ ] **Mobile dark (375px via DevTools):** Renders identically to before migration
- [ ] `grep -r "style={{" client/src/` returns zero results (all inline styles removed)
- [ ] `grep -r "useTheme\|theme\." client/src/` — only references to `isDark` and `toggleTheme` remain
- [ ] Vite build succeeds with no warnings
- [ ] Bundle size is within 10% of pre-migration (Tailwind adds CSS, but removing theme JS offsets it)
- [ ] No console errors in either theme
- [ ] Sidebar collapse/expand works
- [ ] All interactive states work (hover, active, selected, focus)

## Constraints

- **Visual no-op.** The app must look exactly the same before and after. If a pixel is different, fix it. Take screenshots of every view in both themes before starting and compare after.
- **No new fonts, colors, or spacing values.** Map only what exists in the brand bible. If a component uses a value not in the bible, flag it and use the closest match.
- **Do not use `@apply` excessively.** The `tl-` component classes (Step 4) are for the most repeated patterns. Individual components should use Tailwind utilities directly. Overusing `@apply` defeats the purpose of utility-first CSS.
- **Use `clsx` or template literals for conditional classes.** Install `clsx` if conditional class composition gets messy. Do not use inline styles as a fallback for conditionals.
- **Do not remove ThemeContext entirely.** Simplify it to manage the dark mode toggle only. Other code may reference `isDark` for non-styling logic.
- **Commit in batches.** Commit after each group in Step 5 (simple elements, cards, tables, tabs, layout, top-level). Each commit should leave the app in a working state.

## New Dependencies

```bash
cd client
npm install -D tailwindcss @tailwindcss/vite
npm install clsx
```

---
---

# Sequencing Summary

| Order | Session | What Changes | Risk |
|-------|---------|-------------|------|
| 1 | **Postgres** ✅ | Data layer: SQLite → PostgreSQL. Every route handler becomes async. Session store moves to Postgres. | Complete (2026-03-18) |
| 2 | **Tailwind** ✅ | Style layer: inline JS styles → Tailwind CSS v4 utility classes. ThemeContext simplified. `tl-*` component classes. `clsx` for conditionals. | Complete (2026-03-18) |
| 3 | **UX Session 1** | Quick wins: skeletons, confirmations, tooltips, undo | Low — built on the final architecture |
| 4 | **UX Session 2** | Navigation: sidebar persistence, breadcrumbs, error states | Medium — structural layout changes |
| 5 | **UX Session 3** | Power user: command palette, keyboard nav, walkthrough | Low — additive features |
| 6 | **Release** | Hand the link to your first user | — |

Sessions 1 (PostgreSQL) and 2 (Tailwind CSS) are complete. The app now runs on its final production architecture: PostgreSQL + Tailwind CSS v4 + the desktop shell. Every future feature builds on this foundation.
