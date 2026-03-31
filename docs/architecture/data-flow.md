# TrailLog Data Flow

## Request Lifecycle

Every client interaction follows the same path through the system:

```
Browser (React SPA, TypeScript)
  -> api.ts fetch() wrapper
    -> Express middleware chain
      -> Route handler
        -> PostgreSQL parameterized query (async)
          -> JSON response
            -> React state update
```

1. The React client calls a helper function in `api.ts`, which wraps the native `fetch()` API with the base URL, credentials (`include`), and JSON content-type headers.
2. The request arrives at Express, where it passes through the middleware chain in order (described below).
3. If the request passes all middleware checks, the route handler executes one or more PostgreSQL queries asynchronously via the `pg` Pool.
4. The handler returns a JSON response with an appropriate HTTP status code.
5. The React component or context that initiated the request updates its local state with the response data.

## Middleware Chain

Middleware executes in the following order for every request:

| Order | Middleware | Purpose |
|-------|-----------|---------|
| 1 | Public settings route | `GET /api/public-settings` -- no auth, served before rate limiter |
| 2 | `express.json({ limit: '10kb' })` | Parse JSON request bodies up to 10 KB |
| 3 | `helmet()` | Set security-related HTTP headers (CSP with `scriptSrc: ["'self'"]`, HSTS, X-Frame-Options, etc.) |
| 4 | `pino` logger | Structured JSON audit logging for all requests |
| 5 | `authLimiter` | Rate limit authentication endpoints: 20 requests per 15 minutes |
| 6 | `apiLimiter` | Rate limit general API endpoints: 100 requests per minute |
| 7 | `express-session` | Establish or resume a session from the session cookie, backed by PostgreSQL (`connect-pg-simple`) |
| 8 | `passport.initialize()` / `passport.session()` | Deserialize the authenticated user from the session |
| 9 | Maintenance check | Block all non-admin API requests when maintenance mode is enabled (503) |
| 10 | CSRF verification | Validate `X-CSRF-Token` header matches `XSRF-TOKEN` cookie on POST/PUT/DELETE/PATCH (exempts `/api/vote`, `/api/public-settings`) |
| 11 | `express.static` | Serve the built React SPA, vote page, and static assets |
| 12 | Route handlers | Application logic, guarded by per-route auth middleware |

## Auth Middleware Functions

Route handlers are protected by composable middleware functions that enforce access control. These are applied per-route, not globally:

- **`requireAuth`** -- Verifies the user has an active session. Returns 401 if not authenticated.

- **`requireTroopMember`** -- Confirms the authenticated user is a member of the troop specified in the route parameters. Returns 403 if not a member.

- **`requireTroopAdmin`** -- Confirms the authenticated user has the admin role on the specified troop. Returns 403 if not an admin.

- **`requireAdventureMember`** -- Confirms the authenticated user is a member of the specified adventure. Returns 403 if not a member. **Note: this does NOT bypass for global admins.**

- **`requireAdventureAdmin`** -- Confirms the user is an admin of the specified adventure, with fallthrough: troop-level admins and global admins are automatically considered adventure admins. Returns 403 otherwise.

- **`requireAdventureSelfOrAdmin`** -- Allows access if the user is either the target member (self-action) or an adventure/troop admin. Used for endpoints where members can modify their own data.

- **`requireGlobalAdmin`** -- Checks whether the authenticated user has `is_admin = 1`. Returns 403 if not a system admin. Multiple admins are supported.

These functions are chained on individual route definitions. For example, a route that modifies a member's gear status uses `requireAuth` followed by `requireAdventureSelfOrAdmin`.

## Data Polling

TrailLog does not use WebSockets or server-sent events. The **AdventureContext** in the React client periodically refreshes data by re-fetching from the API. This covers:

- Adventure member list and roles
- Member gear selections and statuses
- Achievement records (badges and milestones)

When a user performs a write operation (toggling a gear item, updating a date), the context triggers an immediate re-fetch to reflect the change. Other users see updates on their next polling cycle.

## Gear Flow

The gear system involves four layers that compose into a member's personalized gear list:

```
Global Catalog (76 items, managed by Global Admin)
  -> Troop Overrides (hide or show specific global items per troop)
    -> Troop Custom Gear (troop-specific additions)
      -> Member Selections (per-adventure, per-user)
```

### Global Catalog

The `gear_catalog` table contains 76 seeded items organized by category (e.g., Clothing, Cooking, Navigation) and subcategory, each with a priority level (essential, recommended, optional), sharing type (personal, crew, buddy, provided), and default weight. The global admin manages this catalog through the Global Admin panel.

### Troop Overrides

Troop admins can hide specific global catalog items that are not relevant to their troop. The `troop_gear_overrides` table records which items are hidden for a given troop. Items not listed in overrides remain visible by default.

### Troop Custom Gear

Troop admins can add troop-specific gear items through the `troop_custom_gear` table. These items appear alongside the global catalog for members of that troop.

### Member Selections

Each member manages their own gear for a specific adventure through the `member_gear_items` table. Items have a three-state status:

- **needed** -- The member has identified this item but does not yet own it.
- **owned** -- The member has the item.
- **packed** -- The item is packed and ready for the trek.

### Pack Weight Calculation

The pack weight endpoint sums weights from items with status "packed" that have a custom weight value entered by the member. Only personal sharing-type items count toward pack weight; crew, buddy, and provided items are excluded. The total includes a dynamic food estimate (1.75 lbs/day x itinerary days) and a water weight constant (6.6 lbs / 3L).

## Parent-Scout Linking

The system supports three paths for linking a support adult to the scout they sponsor:

1. **Auto-link**: When a user joins or accepts an invitation, the system checks if another adventure member shares the same email domain or has a matching `linked_to` hint. If a match is found, the link is created automatically during the join process.

2. **Request and Approve**: An adult member selects a scout from the member list and submits a link request. A troop admin reviews the request and approves or denies it.

3. **Admin Override**: A troop admin directly assigns the parent-scout link through the admin panel without requiring a request.

## Invitation Flow

The invitation system uses token-based email invitations:

1. A troop or adventure admin creates an invitation through the admin panel, specifying the recipient's email address.
2. The server generates a unique token, stores it in the `invitations` table, and sends an email containing a link with the token.
3. The recipient clicks the link, which routes to the client application.
4. The client sends the token to the server's `processInvitation()` endpoint.
5. The server validates the token, auto-joins the user to both the troop and the adventure, and attempts auto-linking if a parent-scout relationship can be inferred.
6. The invitation record is updated with the acceptance timestamp.

If the recipient does not yet have an account, they are prompted to register or sign in before the token is processed.

## Readiness Calculation

Crew readiness is computed both client-side and server-side using the same 4-category algorithm:

- **`computeCrewReadiness()`** (client, `utils/readiness.ts`) -- Calculates overall crew preparedness by averaging four category scores (training, gear, medical, admin) across all trekking members. Support crew members are excluded from the calculation.

- **`computeMemberReadiness()`** (client) -- Calculates an individual member's readiness across the same four categories.

- **`computeServerReadiness(adventureId)`** (server, `db.js`) -- Server-side computation used by the Home Dashboard for troop overview cards.

Categories with no items or no requirements evaluate to 0% readiness, not 100%.

Gear readiness data comes from the `memberGearMap` in the AdventureContext, not from the legacy `adventure_members.gear` JSON column.

## Standalone Pages

- **Vote Page** (`/vote`): Independent from the React SPA. Serves static HTML/JS, no auth, no CSRF. Uses name-based identity in localStorage. 2 votes per person with leaderboard.

- **Approval Page** (`/approve/:token`): Standalone React route for HMAC-signed approve/deny actions from email links.

## Error Handling

The API uses conventional HTTP status codes:

- **400-level errors** are returned with descriptive messages intended for the client to display. These cover validation failures (including Zod schema errors), authorization denials, and resource-not-found conditions.

- **500-level errors** are sanitized in production through a `safeError()` helper that strips internal details (stack traces, file paths, SQL errors) before sending the response. The full error is logged server-side via pino for debugging.

The client displays error messages through the ToastContext, which renders transient notification banners.
