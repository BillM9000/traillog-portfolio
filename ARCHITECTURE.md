# TrekSync Architecture

Multi-troop SaaS platform for Scouting America high adventure trek preparation. Coordinates training schedules, gear readiness, itinerary planning, and crew readiness tracking.

**Live:** https://treksync.gracezero.ai

---

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Browser (SPA)                      │
│  React 18 + Vite · Google OAuth · Context API           │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS (Traefik TLS)
┌──────────────────────▼──────────────────────────────────┐
│                   VPS (Hostinger)                        │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Docker: crew614 container                      │    │
│  │  ┌─────────────────────┐  ┌──────────────────┐  │    │
│  │  │  Express.js :3614   │  │  SQLite (WAL)    │  │    │
│  │  │  Passport.js        │──│  /app/data/       │  │    │
│  │  │  Static file serve  │  │  crew614.db      │  │    │
│  │  └─────────────────────┘  └──────────────────┘  │    │
│  └─────────────────────────────────────────────────┘    │
│  Traefik reverse proxy · Auto TLS via Let's Encrypt     │
└─────────────────────────────────────────────────────────┘
```

## Data Model

```
┌──────────┐     ┌──────────────┐     ┌─────────────────────┐
│  users   │────<│ troop_members│>────│       troops         │
│          │     │ (role,status)│     │ (name, description)  │
└──────────┘     └──────────────┘     └──────────┬──────────┘
     │                                           │
     │           ┌──────────────────┐            │ 1:N
     └──────────<│adventure_members │>───┌───────▼──────────┐
                 │ dates (JSON)     │    │   adventures     │
                 │ skills (JSON)    │    │ trek_date        │
                 │ gear (JSON)      │    │ itinerary_id ──────> itineraries
                 │ medical (JSON)   │    │ status           │
                 │ admin_tasks(JSON)│    └──────────────────┘
                 └──────────────────┘           │ 1:N
                                        ┌──────▼──────┐
                 ┌──────────────┐       │   skills    │
                 │  gear_items  │       │ category    │
                 │  priority    │       │ is_default  │
                 │  category    │       └─────────────┘
                 │  affiliate   │
                 └──────────────┘
```

**Key relationships:**
- A **Troop** has many **Adventures** (Philmont, Sea Base, etc.)
- Each Adventure has its own members, itinerary, skills, and readiness tracking
- `adventure_members` stores per-member JSON arrays: `dates`, `skills`, `gear`, `medical`, `admin_tasks`
- Skills are scoped to an adventure and categorized: `training`, `medical`, `admin`
- Schema versioning via `platform_settings.schema_version`

## Authentication Flow

```
Browser                    Server                   Google
  │── GET /auth/google ──────>│                        │
  │                           │── OAuth redirect ─────>│
  │                           │<── code ───────────────│
  │                           │── exchange code ──────>│
  │                           │<── profile ────────────│
  │<── session cookie ────────│  (find/create user)    │
  │── GET /api/auth/me ──────>│                        │
  │<── { user, memberships }──│                        │
```

- Google OAuth via Passport.js (`passport-google-oauth20`)
- Express sessions stored in SQLite (`sessions` table)
- Session cookie: 30-day TTL, httpOnly, secure in production, sameSite=lax

## Client Architecture

### Navigation Flow

```
LoginPage → ProfileSetup → Lobby → AdventurePicker → MainView
                                                         │
                                              ┌──────────┴──────────┐
                                              │  Tabs:              │
                                              │  Calendar │ Results │
                                              │  Itinerary│ Gear    │
                                              │  Readiness│         │
                                              └───────────────────-─┘
```

### Component Tree

```
App
├── LoginPage              Google OAuth sign-in
├── ProfileSetup           User type (Scout/Adult) + parent email
├── Lobby                  Troop search, join, create
├── AdventurePicker        Select/create adventure within troop
└── AdventureProvider      Context: members, skills, itinerary, adventure
    └── MainView
        ├── Header         Breadcrumb (Troop > Adventure), countdown, admin badge
        ├── MemberBar      Color-coded member chips, selection, pending requests
        ├── Tab Content
        │   ├── Calendar   Training hike date coordination with drag-select
        │   ├── Results    Best training windows from overlap analysis
        │   ├── Itinerary  Enriched day cards (programs, water, warnings)
        │   ├── GearList   Per-member gear checklist with completion %
        │   └── Skills     Crew Readiness Dashboard (training/gear/medical/admin)
        ├── AdminPanel     Modal: troop/adventure settings, member management
        └── ConfirmModal   Generic confirmation dialog
```

### State Management

Three React Contexts:
- **AuthContext** — user session, troop memberships, login/logout
- **ThemeContext** — dark/light mode toggle (light default), theme tokens
- **AdventureContext** — active adventure data (members, skills, itinerary), polling (60s), optimistic updates

Optimistic updates pattern:
```
User action → updateMemberLocally() → instant UI update
           → debouncedSave() → API call (background)
```

## API Routes

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/auth/google` | Initiate Google OAuth |
| GET | `/auth/google/callback` | OAuth callback |
| GET | `/api/auth/me` | Current user + memberships |
| POST | `/api/auth/logout` | Destroy session |
| PUT | `/api/auth/profile` | Set user_type, parent_email |

### Troops
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/troops` | Search troops |
| POST | `/api/troops` | Create troop |
| GET | `/api/troops/:id` | Get troop |
| PUT | `/api/troops/:id` | Update troop (admin) |
| POST | `/api/troops/:id/join` | Request to join |
| GET | `/api/troops/:id/members` | List members |
| PUT | `/api/troops/:id/members/:uid/approve` | Approve join request |

### Adventures
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/troops/:troopId/adventures` | List adventures |
| POST | `/api/troops/:troopId/adventures` | Create adventure |
| GET | `/api/adventures/:id` | Get adventure |
| PUT | `/api/adventures/:id` | Update adventure |
| DELETE | `/api/adventures/:id` | Delete adventure |
| GET | `/api/adventures/:id/members` | List adventure members |
| POST | `/api/adventures/:id/members` | Add member to adventure |
| DELETE | `/api/adventures/:id/members/:uid` | Remove member |
| PUT | `/api/adventures/:id/members/:uid/dates` | Update availability dates |
| PUT | `/api/adventures/:id/members/:uid/skills` | Update training skills |
| PUT | `/api/adventures/:id/members/:uid/gear` | Update gear checklist |
| PUT | `/api/adventures/:id/members/:uid/medical` | Update medical readiness |
| PUT | `/api/adventures/:id/members/:uid/admin` | Update admin tasks |

### Adventure Skills
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/adventures/:id/skills` | List skills (filterable by category) |
| POST | `/api/adventures/:id/skills` | Add custom skill/checklist item |
| DELETE | `/api/adventures/:id/skills/:skillId` | Remove custom skill |

### Content
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/itineraries` | List available itineraries |
| GET | `/api/itineraries/:id` | Get itinerary with enriched route data |
| GET | `/api/gear` | Gear items (optional `?troop=` for affiliate links) |

## Itinerary Data Structure

Each itinerary day includes:
```json
{
  "day": 5,
  "camp": "Ute Gulch",
  "elevation": 8200,
  "miles": 8.2,
  "gain": 1200,
  "loss": 800,
  "type": "Dry Camp",
  "notes": "First dry camp — manage water carefully",
  "showers": false,
  "food_pickup": "Ute Gulch cantina",
  "water_pitstop": "Ute Gulch spring",
  "water_warning": "Dry camp — fill 4-6 liters",
  "programs": [
    { "name": "Western Lore", "type": "staffed", "description": "..." }
  ],
  "warnings": ["Burn zone — no shade", "Carry extra sunscreen"]
}
```

Global info includes: conservation project, Baldy summit guide, prohibited items, trailhead info.

## Crew Readiness Dashboard

Four tracked categories with per-member checkboxes:

| Category | Field | Tracks |
|----------|-------|--------|
| Training | `skills` | Loaded hikes, water carry, bear bag, camp cooking, etc. |
| Gear | `gear` | Items from gear_items table (essential/recommended/optional) |
| Medical | `medical` | Health forms, BMI check, medications reviewed |
| Admin | `admin_tasks` | Signed waivers, emergency contacts, travel booked |

Overall crew readiness = average of 4 category percentages.

## Deployment

```
Local build → tar → SCP → Docker Compose rebuild on VPS

1. npm run build --prefix client
2. tar czf crew614-deploy.tar.gz (excluding node_modules, .git)
3. scp to VPS:/tmp/
4. On VPS: extract to /opt/crew614/, docker compose build --no-cache, up -d
```

- **Host:** Hostinger VPS (31.97.134.173)
- **Reverse proxy:** Traefik with automatic Let's Encrypt TLS
- **Container:** Node 20 Alpine, multi-stage build (Vite frontend + Express backend)
- **Database:** SQLite with WAL mode, persisted in Docker named volume `crew614_crew614_data`
- **Network:** `n8n_default` (shared Traefik network)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, vanilla CSS-in-JS |
| Backend | Express.js, Passport.js, better-sqlite3 |
| Database | SQLite (WAL mode) |
| Auth | Google OAuth 2.0 |
| Container | Docker, multi-stage Alpine build |
| Proxy | Traefik v2 + Let's Encrypt |
| Email | Nodemailer (SMTP) |

## File Structure

```
crew614/
├── server/
│   ├── index.js          Express routes + middleware
│   ├── db.js             Schema, migrations, seed data, DB functions
│   ├── auth.js           Passport.js Google OAuth + local auth strategies
│   ├── email.js          Nodemailer email service
│   └── package.json
├── client/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx              Root component, tab routing, state orchestration
│       ├── api.js               API client (fetch wrapper)
│       ├── main.jsx             Entry point, context providers
│       ├── contexts/
│       │   ├── AuthContext.jsx       User session + memberships
│       │   ├── ThemeContext.jsx      Dark/light mode
│       │   └── AdventureContext.jsx  Adventure data + polling + optimistic updates
│       ├── components/
│       │   ├── LoginPage.jsx         Google OAuth sign-in
│       │   ├── ProfileSetup.jsx      Scout/Adult selection
│       │   ├── Lobby.jsx             Troop search/join/create
│       │   ├── AdventurePicker.jsx   Adventure selection/creation
│       │   ├── Header.jsx            Breadcrumb, countdown, theme toggle
│       │   ├── MemberBar.jsx         Color-coded member chips
│       │   ├── Calendar.jsx          Training hike date coordination
│       │   ├── Results.jsx           Best training windows analysis
│       │   ├── Itinerary.jsx         Enriched day cards
│       │   ├── GearList.jsx          Per-member gear checklist
│       │   ├── Skills.jsx            Crew Readiness Dashboard
│       │   ├── AdminPanel.jsx        Settings modal (troop/adventure/members)
│       │   ├── ConfirmModal.jsx      Generic confirmation dialog
│       │   └── Logo.jsx              SVG logo
│       ├── hooks/
│       │   └── useCountdown.js       Trek date countdown timer
│       └── utils/
│           ├── constants.js          Day/month names
│           ├── dates.js              Date utility functions
│           └── theme.js              Theme tokens + style helpers
├── Dockerfile            Multi-stage build
├── docker-compose.yml    Production deployment config
└── ARCHITECTURE.md       This file
```
