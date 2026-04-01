# TrailLog

A multi-troop collaborative platform for Scouting America high adventure preparation. Crews use TrailLog to coordinate training schedules, track gear readiness, manage crew logistics, and prepare for Philmont Scout Ranch treks.

**Live:** [traillog.gracezero.ai](https://traillog.gracezero.ai) · Built by [GraceZero](https://gracezero.ai)

---

## Features

- **Multi-Troop SaaS** — Troops are scoped by BSA council. Public troops are discoverable; private troops are invite-only.
- **Adventure Scoping** — Each trek is an "adventure" with its own members, dates, gear, skills, and readiness tracking.
- **Training Hike Coordinator** — Interactive calendar with drag-to-select availability. Heatmap shows crew overlap at a glance.
- **Best Training Windows** — Algorithm scores consecutive-day windows by attendance, duration, and weekend bonus.
- **Gear Catalog** — 76-item Philmont-specific gear catalog with 3-state tracking (needed → owned → packed), pack weight calculator, and category/priority filters.
- **Readiness Dashboard** — Crew and individual readiness across 4 categories (training, gear, medical, admin) with journey waypoint gamification.
- **Trail Badges** — Auto-awarded badges (🎒 Gear Ready, 🏥 Trail Medic, 📋 Admin Pro, 🥾 Training Complete, ⭐ Fully Prepared) with email notifications.
- **Parent-Scout Linking** — Support adults linked to scouts via email match, request/approve, or admin override.
- **12-Day Itinerary** — Day-by-day trek reference with elevation, mileage, and printable pocket cheat sheet.
- **Two-Tier Admin** — Global admin (platform-wide) + Troop admin (per-troop member and adventure management).
- **Dark/Light Theme** — User-selectable with system preference detection.
- **Email Notifications** — 13 email templates for invitations, approvals, date changes, badge awards, and more.
- **Desktop BI Layout** — Collapsible sidebar, stat cards, readiness trend charts, and sortable members table at 1024px+.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18, Vite 6, TypeScript | Component UI, fast HMR dev |
| Styling | Tailwind CSS v4, clsx | Utility-first CSS with dark mode |
| Backend | Express.js 4 | REST API (172 routes across 8 modules) |
| Database | PostgreSQL (pg / node-postgres) | Async pool, schema v25 |
| Auth | Passport.js, bcrypt | Google OAuth + email/password |
| Security | Helmet.js, express-rate-limit | Headers, rate limiting |
| Email | Nodemailer | Gmail SMTP (13 template types) |
| Charts | Recharts (lazy-loaded) | Readiness trends, gear completion |
| Testing | Playwright (16 specs, 193 tests) | E2E, visual regression, security |
| Deployment | Docker, Traefik | Containerized with auto-HTTPS |

---

## Quick Start

### Development

```bash
# Terminal 1 — Backend
cd server && npm install && npm run dev

# Terminal 2 — Frontend
cd client && npm install && npm run dev
```

Frontend runs at `http://localhost:5173` with API proxy to `localhost:3614`.

### Production (Docker)

```bash
docker compose up -d --build
```

Runs on port `3614` behind your reverse proxy (Traefik/nginx) for HTTPS.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No (default: 3614) | Server port |
| `NODE_ENV` | Yes (production) | Enables secure cookies, error sanitization |
| `DATABASE_URL` | Yes (production) | PostgreSQL connection string |
| `SESSION_SECRET` | Yes (production) | Session encryption key (40+ chars) |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | Yes | OAuth callback URL |
| `APP_URL` | Yes | Public app URL (for email links) |
| `ADMIN_EMAIL` | Yes | Global admin email address |
| `SMTP_USER` | No | Gmail address for sending emails |
| `SMTP_PASS` | No | Gmail app password |

---

## Project Structure

```
crew614/
├── server/
│   ├── index.js          Express app, middleware, 16 direct routes
│   ├── routes/           7 route modules (156 routes)
│   │   ├── auth.js       OAuth, login, signup, password reset
│   │   ├── troops.js     Troop CRUD, members, invitations
│   │   ├── adventures.js Adventure lifecycle, members, skills
│   │   ├── crews.js      Crew management, availability
│   │   ├── gear.js       Gear catalog, member gear, pack weight
│   │   ├── training.js   Training events, calendar, reminders
│   │   └── admin.js      Global admin, platform settings
│   ├── db.js             PostgreSQL functions (170 async), 76-item seed
│   ├── auth.js           Passport.js Google OAuth + local strategy
│   ├── email.js          Nodemailer templates (13 email types)
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── main.tsx              Entry point (provider wrappers)
│   │   ├── App.tsx               Auth gates, routing, state orchestration
│   │   ├── api.ts                Fetch wrapper, all API methods
│   │   ├── app.css               Tailwind v4 config, CSS custom properties
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx    User auth + memberships
│   │   │   ├── ThemeContext.tsx   Dark/light theme
│   │   │   ├── AdventureContext.tsx  Adventure + gear data
│   │   │   └── ToastContext.tsx   Toast notifications
│   │   ├── components/           44 TypeScript React components
│   │   ├── desktop/              Sidebar, TopBar, BI charts (1024px+)
│   │   ├── hooks/
│   │   │   ├── useCountdown.ts   Phase-aware countdown
│   │   │   └── useIsDesktop.ts   1024px breakpoint hook
│   │   ├── utils/
│   │   │   ├── readiness.ts      Shared readiness calculation
│   │   │   ├── theme.ts          Color tokens, badge helpers
│   │   │   ├── dates.ts          Date math utilities
│   │   │   └── constants.ts      Day names, config
│   │   └── types/                TypeScript type definitions
│   └── index.html
│
├── tests/                16 Playwright E2E specs (193 tests)
├── docs/                 Architecture, security, and operations docs
├── Dockerfile            Single-stage build, non-root user
├── docker-compose.yml    Service config, Traefik labels
├── ARCHITECTURE.md       Detailed system architecture
├── SECURITY.md           Vulnerability disclosure policy
└── README.md             This file
```

---

## Documentation

- [Architecture Overview](ARCHITECTURE.md) — System design, data model, API routes
- [Security Policy](SECURITY.md) — Vulnerability reporting and disclosure
- [Architecture Deep-Dive](docs/architecture/) — Overview, data flow, infrastructure
- [Security Documentation](docs/security/) — Threat model, auth, data protection, dependency audit
- [Operations Runbook](docs/operations/) — Backup, DR, incident response, day-to-day operations

---

## License

MIT
