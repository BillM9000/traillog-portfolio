# TrailLog Data Flow

## Request Lifecycle

Every client interaction follows the same path through the system:

```
Browser (React SPA)
  → api.js fetch() wrapper
    → Express middleware chain
      → Route handler
        → SQLite prepared statement
          → JSON response
            → React state update
```

1. The React client calls a helper function in `api.js`, which wraps the native `fetch()` API with the base URL, credentials (`include`), and JSON content-type headers.
2. The request arrives at Express, where it passes through the middleware chain in order (described below).
3. If the request passes all middleware checks, the route handler executes one or more SQLite prepared statements synchronously.
4. The handler returns a JSON response with an appropriate HTTP status code.
5. The React component or context that initiated the request updates its local state with the response data.

## Middleware Chain

Middleware executes in the following order for every request:

| Order | Middleware | Purpose |
|-------|-----------|---------|
| 1 | `express.json({ limit: '1mb' })` | Parse JSON request bodies up to 1 MB |
| 2 | `helmet()` | Set security-related HTTP headers (CSP, HSTS, X-Frame-Options, etc.) |
| 3 | `morgan('short')` | Log every HTTP request (method, URL, status, response time) to stdout |
| 4 | `authLimiter` | Rate limit authentication endpoints: 20 requests per 15 minutes |
| 5 | `apiLimiter` | Rate limit general API endpoints: 100 requests per minute |
| 6 | `express-session` | Establish or resume a session from the session cookie, backed by SQLite |
| 7 | `passport.initialize()` / `passport.session()` | Deserialize the authenticated user from the session |
| 8 | CSRF verification | Validate `X-CSRF-Token` header against session token on POST/PUT/DELETE/PATCH requests |
| 9 | `express.static` | Serve the built React SPA and its assets from the `client/dist` directory |
| 10 | Route handlers | Application logic, guarded by per-route auth middleware |

## Auth Middleware Functions

Route handlers are protected by composable middleware functions that enforce access control. These are applied per-route, not globally:

- **`requireAuth`** -- Verifies the user has an active session. Returns 401 if not authenticated.

- **`requireTroopMember`** -- Confirms the authenticated user is a member of the troop specified in the route parameters. Returns 403 if not a member.

- **`requireTroopAdmin`** -- Confirms the authenticated user has the admin role on the specified troop. Returns 403 if not an admin.

- **`requireAdventureMember`** -- Confirms the authenticated user is a member of the specified adventure. Returns 403 if not a member.

- **`requireAdventureAdmin`** -- Confirms the user is an admin of the specified adventure, with a fallthrough: troop-level admins are automatically considered adventure admins. Returns 403 otherwise.

- **`requireAdventureSelfOrAdmin`** -- Allows access if the user is either the target member (self-action) or an adventure/troop admin. Used for endpoints where members can modify their own data.

- **`requireGlobalAdmin`** -- Checks whether the authenticated user's email matches the `ADMIN_EMAIL` environment variable. Returns 403 if not the global admin.

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
  → Troop Overrides (hide or show specific global items per troop)
    → Troop Custom Gear (troop-specific additions)
      → Member Selections (per-adventure, per-user)
```

### Global Catalog

The `gear_catalog` table contains 76 seeded items organized by category (e.g., Clothing, Cooking, Navigation) and subcategory, each with a priority level (essential, recommended, optional) and default weight. The global admin manages this catalog through the Global Admin panel.

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

The pack weight endpoint (`/api/adventures/:id/members/:userId/pack-weight`) sums weights from items that have a custom weight value entered by the member. Catalog default weights are not used as fallback values in the calculation. The total includes a fixed food estimate (1.75 lbs/day for 12 days) and a water weight constant (4.4 lbs).

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

Crew readiness is computed entirely on the client side. The single source of truth is `client/src/utils/readiness.js`, which exports two functions:

- **`computeCrewReadiness()`** -- Calculates overall crew preparedness by averaging four category scores (training, gear, medical, admin) across all trekking members. Support crew members are excluded from the calculation.

- **`computeMemberReadiness()`** -- Calculates an individual member's readiness across the same four categories.

These functions are consumed by three components: the **Header** (countdown and readiness percentage), the **Skills/Readiness tab** (detailed breakdown), and the **MemberBar** (per-member readiness indicators).

Gear readiness data comes from the `memberGearMap` in the AdventureContext, not from the legacy `adventure_members.gear` JSON column.

Categories with no items or no requirements evaluate to 0% readiness, not 100%.

## Error Handling

The API uses conventional HTTP status codes:

- **400-level errors** are returned with descriptive messages intended for the client to display. These cover validation failures, authorization denials, and resource-not-found conditions.

- **500-level errors** are sanitized in production through a `safeError()` helper that strips internal details (stack traces, file paths, SQL errors) before sending the response. The full error is logged server-side for debugging.

The client displays error messages through the ToastContext, which renders transient notification banners.
