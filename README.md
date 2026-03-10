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
- **Email Notifications** — 9 email templates for invitations, approvals, date changes, badge awards, and more.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18, Vite 6 | Component UI, fast HMR dev |
| Backend | Express.js 4 | REST API (89 routes) |
| Database | SQLite (better-sqlite3, WAL) | Embedded DB, schema v7 |
| Auth | Passport.js, bcrypt | Google OAuth + email/password |
| Security | Helmet.js, express-rate-limit | Headers, rate limiting |
| Email | Nodemailer | Gmail SMTP templates |
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
| `DATA_DIR` | No (default: /app/data) | SQLite database directory |
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
│   ├── index.js          Express app, 89 API routes, middleware
│   ├── db.js             SQLite schema v7, migrations, 76-item seed
│   ├── auth.js           Passport.js Google OAuth + local strategy
│   ├── email.js          Nodemailer templates (9 email types)
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── main.jsx              Entry point (provider wrappers)
│   │   ├── App.jsx               Auth gates, routing, state orchestration
│   │   ├── api.js                Fetch wrapper, all API methods
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx    User auth + memberships
│   │   │   ├── ThemeContext.jsx   Dark/light theme
│   │   │   ├── AdventureContext.jsx  Adventure + gear data
│   │   │   └── ToastContext.jsx   Toast notifications
│   │   ├── components/           26 React components
│   │   ├── hooks/
│   │   │   └── useCountdown.js   Phase-aware countdown
│   │   └── utils/
│   │       ├── readiness.js      Shared readiness calculation
│   │       ├── theme.js          Color tokens, badge helpers
│   │       ├── dates.js          Date math utilities
│   │       └── constants.js      Day names, config
│   └── index.html
│
├── docs/                 Architecture, security, and operations docs
├── Dockerfile            Multi-stage build, non-root user
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
