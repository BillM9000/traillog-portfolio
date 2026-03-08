# Crew 614 Training Coordinator

Philmont 2026 • Itinerary 12-20 • Super Strenuous • 69 mi • 12 Days

A shared scheduling tool for Philmont crew parents to coordinate training hike availability. Everyone visits the same URL, picks their name, marks available dates, and the app finds the best overlapping windows for group training.

## Architecture

```
crew614/
├── server/          # Express + SQLite API
│   ├── index.js     # API server
│   ├── db.js        # SQLite setup & queries
│   └── package.json
├── client/          # React (Vite) frontend
│   ├── src/
│   │   ├── App.jsx  # Main app (the scheduler)
│   │   └── main.jsx # Entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── docker-compose.yml
├── Dockerfile
└── README.md
```

## Stack
- **Frontend**: React + Vite (builds to static files)
- **Backend**: Express.js + better-sqlite3
- **Database**: SQLite (single file, no external DB needed)
- **Deployment**: Docker on Hostinger KVM VPS

## API Endpoints

```
GET    /api/members              - List all members
POST   /api/members              - Add member (admin, requires pin)
DELETE /api/members/:id           - Remove member (admin, requires pin)
PUT    /api/members/:id/dates     - Update member's available dates
PUT    /api/members/:id/skills    - Update member's completed skills
GET    /api/skills                - List all skills
POST   /api/skills               - Add skill (admin, requires pin)
DELETE /api/skills/:id            - Remove skill (admin, requires pin)
```

## Quick Start (Local Dev)

```bash
# Server
cd server && npm install && npm run dev

# Client (separate terminal)
cd client && npm install && npm run dev
```

## Deploy to VPS

```bash
# On your VPS
docker compose up -d --build
```

The app runs on port 3614. Point your reverse proxy (nginx/caddy) at it, or expose directly.

## Admin

PIN: `614` (change ADMIN_PIN in server/index.js and client/src/App.jsx)
