# TrailLog System Overview

## What Is TrailLog?

TrailLog is a web-based platform that helps Scout troops prepare for high-adventure treks at Philmont Scout Ranch. It brings together troop leaders, parents, and scouts into a shared workspace where they can coordinate training schedules, track gear readiness, manage medical and administrative requirements, and monitor overall crew preparedness for their expedition.

The application is hosted at **https://app.example.com** and serves multiple troops simultaneously as a multi-tenant platform.

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
- **30+ components** organized by feature (gear list, itinerary, admin panel, training calendar, readiness dashboard, home dashboard, help system, and others)
- **4 React Contexts** that provide shared state:
  - **AuthContext** -- current user, login/logout state
  - **ThemeContext** -- light/dark mode preference
  - **AdventureContext** -- active adventure data including members, gear, and achievements
  - **ToastContext** -- transient notification messages

The client communicates with the server exclusively through JSON API calls. There are no WebSocket connections; data freshness is maintained through periodic polling in the AdventureContext.

## Server Architecture

The back end is a Node.js Express.js monolith that handles:

- 120+ API routes for all application operations (including 35+ crew-scoped routes)
- Session management via express-session with a SQLite-backed session store
- Google OAuth and local authentication via Passport.js
- CSRF protection via double-submit cookie pattern
- Email delivery for invitations, notifications, and verification (12 templates)
- AI readiness engine with Claude API integration and fallback plan generation
- AI gear recommendations with background caching
- Static file serving for the built React application and standalone vote page

The server runs as a single process. There is no background job queue, no microservice decomposition, and no external cache layer.

## Database

TrailLog uses **SQLite** as its sole data store, accessed through the **better-sqlite3** driver in synchronous mode. There is no ORM; all database access uses hand-written SQL with prepared statements.

### Why SQLite

- **Simplicity**: A single file on disk eliminates the need to provision, configure, and maintain a separate database server. The entire data layer deploys as part of the application container.
- **Single-server fit**: TrailLog runs on one VPS. SQLite is purpose-built for this deployment model, where a single application process owns the database.
- **WAL mode**: Write-Ahead Logging allows concurrent read access while a write is in progress, which is sufficient for the application's concurrency requirements.

### Why a Monolith

The application serves a well-defined user base (scout troops preparing for treks) with predictable traffic patterns. A monolithic architecture keeps the deployment simple, the codebase navigable, and the operational overhead low. Splitting into microservices would add complexity without a corresponding benefit at this scale.

### Why No ORM

- **Prepared statements**: All queries use parameterized prepared statements, which SQLite compiles once and reuses. This provides both performance and protection against SQL injection.
- **Explicit SQL**: The queries are readable, auditable, and directly correspond to the schema. There is no hidden query generation or N+1 problem to debug.
- **Synchronous access**: better-sqlite3's synchronous API pairs naturally with Express route handlers, avoiding the callback or promise overhead that an ORM would introduce on top of an already-synchronous driver.
