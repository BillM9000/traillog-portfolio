# TrailLog System Overview

## What Is TrailLog?

TrailLog is a web-based platform that helps Scout troops prepare for high-adventure treks at Philmont Scout Ranch. It brings together troop leaders, parents, and scouts into a shared workspace where they can coordinate training schedules, track gear readiness, manage medical and administrative requirements, and monitor overall crew preparedness for their expedition.

The application is hosted at **https://traillog.gracezero.ai** and serves multiple troops simultaneously as a multi-tenant platform.

## Tenant Model

TrailLog organizes data into a four-level hierarchy:

```
Troop (scoped by BSA council)
  └── Adventure (one per trek)
        └── Crew (team within an adventure, own itinerary/dates)
              └── Members (scouts, adults, and support crew)
```

**Troops** are the top-level organizational unit. Because BSA troop numbers are only unique within a council (Troop 614 in the Greater St. Louis Area Council is a different troop than Troop 614 in the Sam Houston Area Council), every troop is scoped by its council name. Troops can be public (discoverable in the lobby) or private (invite-only).

**Adventures** represent a single trek or expedition. Each adventure belongs to one troop and can contain one or more crews. A troop can have multiple adventures over time.

**Crews** are teams within an adventure. Each crew has its own itinerary, trek dates, leader, and member roster. Single-crew adventures (the common case) are transparent to users; the crew picker UI only appears when an adventure has multiple crews. Adventures auto-create one default crew on creation.

**Members** are users who belong to a crew within an adventure. Each member has a participation type (trekking or support crew), a user type (adult or scout), and optionally a parent-scout link that connects a support adult to the scout they are sponsoring.

## Administration

TrailLog uses a two-tier administration model:

- **Global Admin (System Admin)**: Users with `users.is_admin = 1`. The `ADMIN_EMAIL` environment variable seeds the first admin on startup. Multiple admins are supported via promote/demote API. System admins can manage the gear catalog, view all troops, access affiliate analytics, configure platform-wide settings (maintenance mode, registration, announcements), and promote/demote other admins.

- **Troop Admin**: A per-troop role stored on the troop membership record. Troop admins can manage adventure settings, approve or deny member requests, send invitations, assign roles, and configure troop-specific gear overrides. Any troop member can be promoted to troop admin by an existing admin.

## Authentication

TrailLog supports two authentication methods, both session-based:

1. **Google OAuth**: Users click "Sign in with Google," which triggers a server-side redirect through Passport.js. Google returns the user's profile, and the server creates or updates the local user record. No tokens are stored on the client.

2. **Email and Password**: Users register with an email address and a password (minimum 8 characters). Passwords are hashed with bcrypt before storage. New accounts receive a verification email with a unique token that must be clicked to activate the account.

Both methods establish a server-side session. Subsequent requests include a session cookie that the server validates on every API call.

## Client Architecture

The front end is a single-page application built with:

- **React 18** for the component model and rendering
- **Vite** for development server and production builds
- **TypeScript** throughout (all 42+ client files migrated from JS/JSX)
- **Tailwind CSS v4** for utility-first styling with CSS custom properties and dark mode via `dark` class
- **44 components** organized by feature (gear list, itinerary, admin panel, training calendar, readiness dashboard, desktop BI layout, and others)
- **React.lazy code splitting** for 16 components, reducing main bundle from 599KB to 226KB gzip
- **4 React Contexts** that provide shared state:
  - **AuthContext** -- current user, login/logout state
  - **ThemeContext** -- light/dark mode toggle (adds/removes `dark` class on `<html>`; theme colors defined as CSS custom properties in Tailwind CSS)
  - **AdventureContext** -- active adventure data including members, gear, and achievements
  - **ToastContext** -- transient notification messages

The client communicates with the server exclusively through JSON API calls. There are no WebSocket connections; data freshness is maintained through periodic polling in the AdventureContext.

## Server Architecture

The back end is a Node.js Express.js monolith that handles:

- 172 API routes across 8 modules (including 29 crew-scoped routes)
- Session management via express-session with a PostgreSQL-backed session store (connect-pg-simple)
- Google OAuth and local authentication via Passport.js
- CSRF protection via double-submit cookie pattern
- Email delivery for invitations, notifications, and verification (13 templates)
- AI readiness engine with Claude API integration and fallback plan generation
- AI gear recommendations with background caching
- Static file serving for the built React application and standalone vote page

The server runs as a single process. There is no background job queue, no microservice decomposition, and no external cache layer.

## Database

TrailLog uses **PostgreSQL** as its sole data store, accessed through the **pg (node-postgres)** driver with a connection pool in asynchronous mode. The database runs on the VPS host and the Docker container connects via `172.18.0.1:5432`. There is no ORM; all database access uses hand-written SQL with parameterized queries. The canonical schema is defined in `db/schema.pg.sql`.

### Why PostgreSQL

- **Robustness**: PostgreSQL provides full ACID compliance, advanced indexing, robust concurrent access, and mature tooling for backups (`pg_dump`) and monitoring.
- **Single-server fit**: TrailLog runs on one VPS. PostgreSQL runs on the same host, providing strong data integrity with minimal operational overhead.
- **Connection pooling**: The `pg` driver's `Pool` class manages connections efficiently, supporting the application's concurrency requirements.

### Why a Monolith

The application serves a well-defined user base (scout troops preparing for treks) with predictable traffic patterns. A monolithic architecture keeps the deployment simple, the codebase navigable, and the operational overhead low. Splitting into microservices would add complexity without a corresponding benefit at this scale.

### Why No ORM

- **Parameterized queries**: All queries use parameterized `pool.query()` calls, which protect against SQL injection and allow PostgreSQL to optimize query plans.
- **Explicit SQL**: The queries are readable, auditable, and directly correspond to the schema. There is no hidden query generation or N+1 problem to debug.
- **Async access**: The `pg` driver's asynchronous API integrates naturally with Express async route handlers using `async/await`.
