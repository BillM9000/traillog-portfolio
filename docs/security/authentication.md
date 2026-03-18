# Authentication and Authorization

Last updated: 2026-03-17

This document details the authentication flows, session management, authorization
middleware, rate limiting, and input validation used in TrailLog.

---

## Authentication Methods

TrailLog supports two authentication methods:

1. **Google OAuth 2.0** via Passport.js (passport-google-oauth20)
2. **Email/password** via Passport.js local strategy (bcryptjs)

Both methods create identical server-side sessions. There is no token-based
authentication (no JWTs, no bearer tokens).

---

## Google OAuth Flow

```
Browser          Express Server        Google
  |                    |                  |
  |-- GET /auth/google -->               |
  |                    |-- 302 redirect ->|
  |<-- Google consent screen ------------|
  |-- authorize ----------------------->|
  |                    |<-- callback -----|
  |                    |   (code exchange)|
  |                    |   (profile fetch)|
  |                    |-- session create |
  |<-- 302 redirect ---|                  |
  |   to app           |                  |
```

### Step-by-step

1. User clicks "Sign in with Google" in the client.
2. Browser navigates to `GET /auth/google`. This is a full-page navigation, not an
   AJAX request. No Google client-side JavaScript SDK is used.
3. Passport.js redirects the browser to Google's consent screen with the configured
   `client_id`, `redirect_uri`, and scopes (`profile`, `email`).
4. User authorizes the application on Google's consent screen.
5. Google redirects back to `GET /auth/google/callback` with an authorization code.
6. Passport.js exchanges the authorization code for an access token server-side.
7. Passport.js fetches the user profile (id, email, displayName, photo).
8. The access token and refresh token are **not stored**. They are used only for
   the initial profile fetch and then discarded.
9. User resolution logic:
   - If a user exists with this `google_id`, log them in.
   - If a user exists with this email but no `google_id`, link the Google ID to
     the existing account.
   - Otherwise, create a new user record.
10. Display name is normalized via `titleCase()`, which correctly handles prefixes
    such as Mc, Mac, and O' (e.g., "MCDONALD" becomes "McDonald").
11. A server-side session is created via express-session.
12. Browser is redirected to the application root.

### Security Properties

- **No client-side tokens.** The OAuth code exchange happens entirely on the server.
  Google tokens never appear in browser history, localStorage, or client JavaScript.
- **Server-side redirect flow.** The client initiates OAuth with a full-page GET
  request, not a popup or AJAX call.
- **Scope minimization.** Only `profile` and `email` scopes are requested.

---

## Email/Password Flow

### Signup

1. Client sends `POST /api/auth/signup` with `name`, `email`, and `password`.
2. Server validates:
   - All three fields are present and non-empty.
   - Password is at least 8 characters.
   - No existing user with the same email.
3. Password is hashed with **bcryptjs** using 10 salt rounds (async `bcrypt.hash`).
4. A verification token is generated using `crypto.randomBytes(32)` and hex-encoded
   (64-character string).
5. User record is created with `email_verified = 0`.
6. A verification email is sent containing a link to
   `GET /api/auth/verify/:token`.
7. The raw password is never stored, logged, or returned in any response.

### Email Verification

1. User clicks the verification link in their email.
2. `GET /api/auth/verify/:token` looks up the token in the database.
3. If found, sets `email_verified = 1` and clears the token.
4. If not found, returns 400.

### Login

1. Client sends `POST /api/auth/login` with `email` and `password`.
2. Passport local strategy looks up the user by email.
3. If the user does not exist or has no password hash (Google-only account),
   authentication fails with a generic "Invalid email or password" message.
4. If `email_verified = 0`, login is rejected with 403 and a message instructing
   the user to check their email.
5. Password is verified with `bcrypt.compare` (async).
6. On success, a server-side session is created.
7. On failure, a generic "Invalid email or password" message is returned.
   The response does not distinguish between "user not found" and "wrong password."

### Security Properties

- **Bcrypt with 10 rounds.** Cost factor of 10 provides approximately 100ms of
  computation per hash on modern hardware, making brute-force attacks expensive.
- **Async hashing.** `bcrypt.hash` and `bcrypt.compare` are called with await,
  preventing event loop blocking.
- **Generic error messages.** Login failures do not reveal whether the email exists.
- **Email verification required.** Unverified accounts cannot log in.
- **Password reset.** Users can request a password reset via email. The server
  generates a `reset_token` with a 1-hour expiration (`reset_token_expires`),
  sends a reset link, and the user sets a new password. Tokens are single-use
  and cleared after use (schema v13).

---

## Session Management

### Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| Library | express-session v1.19.0 | Server-side session management |
| Store | connect-pg-simple | Persistent sessions in PostgreSQL |
| Cookie name | `connect.sid` (default) | Session identifier |
| httpOnly | `true` | Prevents JavaScript access to session cookie |
| secure | `true` (production) | Cookie sent only over HTTPS |
| sameSite | `"lax"` | Prevents cross-site cookie submission; allows top-level navigations |
| maxAge | 30 days (2,592,000,000 ms) | Session expiration |
| SESSION_SECRET | ~80 random characters | HMAC signing of session ID |

### Session Secret

- Loaded from the `SESSION_SECRET` environment variable in the `.env` file.
- Required in production: the server throws an error and refuses to start if
  `SESSION_SECRET` is not set and `NODE_ENV` is `production`.
- Approximately 80 characters of random data, providing well over 256 bits of
  entropy.

### Session Lifecycle

1. **Creation.** A session is created after successful authentication (either
   OAuth callback or email/password login).
2. **Serialization.** Passport serializes only the user ID into the session.
3. **Deserialization.** On each request, Passport deserializes the user by ID
   from the database.
4. **Expiration.** Sessions expire after 30 days of inactivity (maxAge).
5. **Garbage collection.** The session store runs periodic cleanup of expired
   sessions from the PostgreSQL database.
6. **Logout.** `GET /api/auth/logout` calls `req.logout()` followed by
   `req.session.destroy()`, removing the session from the store.

### Known Limitation

Session IDs are not explicitly regenerated after login (`req.session.regenerate()`
is not called). This is a minor session fixation risk, mitigated by the SameSite
and secure cookie attributes that make it difficult for an attacker to pre-set a
session cookie.

---

## Authorization Middleware

TrailLog uses a layered middleware chain. Each middleware function either calls
`next()` to allow the request to proceed or returns an error response.

### Middleware Layers

| Layer | Function | Checks | Failure Response |
|-------|----------|--------|-----------------|
| 1 | `requireAuth` | `req.isAuthenticated()` returns true | 401 Unauthorized |
| 2 | `requireTroopMember(status)` | User has a membership record for the troop with the specified status (e.g., "approved") | 403 Forbidden |
| 3 | `requireTroopAdmin` | User's role on the troop is "admin" | 403 Forbidden |
| 4 | `requireAdventureMember` | User is a member of the specified adventure | 403 Forbidden |
| 5 | `requireAdventureAdmin` | User is an admin of the adventure, **or** is an admin of the parent troop (fallthrough) | 403 Forbidden |
| 6 | `requireGlobalAdmin` | `user.is_admin === 1` | 403 Forbidden |

Additionally:

- **`requireAdventureSelfOrAdmin`** -- Allows access if the requesting user is
  either the target user (self-edit) or has adventure/troop admin privileges. Used
  on endpoints like member gear item updates where a user may modify their own data.

### Authorization Flow Example

A request to `PUT /api/adventures/:adventureId/members/:userId/gear-item/:gearId`
passes through:

1. `requireAuth` -- Is the user logged in?
2. `requireAdventureMember` -- Is the user a member of this adventure?
3. `requireAdventureSelfOrAdmin` -- Is the user editing their own gear, or are they
   an admin?

### Global Admin

- Determined by the `users.is_admin` column (integer flag).
- The `ADMIN_EMAIL` environment variable seeds the first admin on startup.
- Multiple admins supported: promote via `PUT /api/admin/users/:id/promote`,
  demote via `PUT /api/admin/users/:id/demote`. Self-demote and last-admin
  demote are blocked server-side.
- The `GET /api/auth/me` endpoint includes an `is_global_admin` boolean.
- Global admin has access to: gear catalog, troop overview, affiliate analytics,
  platform settings (maintenance mode, registration, announcements, max troops).

### Troop Scoping

Database queries for troop-specific resources include `troop_id` predicates to
prevent cross-troop data access. For example, custom gear `PUT` and `DELETE`
operations include `AND troop_id = ?` in their `WHERE` clauses, ensuring that even
if a user guesses a valid gear item ID from another troop, the query will not match.

---

## Rate Limiting

Rate limiting is implemented with express-rate-limit v7.5.0.

### Configuration

| Limiter | Scope | Window | Max Requests | Applied To |
|---------|-------|--------|-------------|------------|
| `authLimiter` | Per IP | 15 minutes | 20 | `POST /api/auth/login`, `POST /api/auth/signup` |
| `apiLimiter` | Per IP | 1 minute | 100 | All `/api/` routes |

### Behavior

- Standard rate limit headers are enabled (`RateLimit-*`).
- Legacy `X-RateLimit-*` headers are disabled.
- When the limit is exceeded, the server returns `429 Too Many Requests`.
- The rate limit store is **in-memory** (default for express-rate-limit). Counters
  reset when the server restarts. This is acceptable for a single-server deployment.

---

## Input Validation

### Route Parameter Validation

All route parameters representing database IDs pass through the `parseId()` helper:

- Parses the string as an integer.
- Returns `null` if the input is not a valid integer (NaN, float, empty string).
- Route handlers check for null and return `400 Bad Request`.
- This prevents NaN propagation into SQL queries.

### Body Size Limit

`express.json()` is configured with a 1MB limit (`limit: '1mb'`). Requests with
larger bodies are rejected with `413 Payload Too Large` before reaching any route
handler.

### Field-Level Validation

| Field | Validation |
|-------|-----------|
| Email (invitations) | Regex pattern match |
| Name (gear catalog) | Required, trimmed, non-empty |
| Category (gear catalog) | Required, trimmed, non-empty |
| user_type | Must be "adult" or "scout" |
| participation | Must be "trekking" or "support" |
| Password | Minimum 8 characters |

### Error Response Pattern

- **400** -- Missing or invalid input (hardcoded message, no user data echoed)
- **401** -- Not authenticated
- **403** -- Not authorized (generic message)
- **404** -- Resource not found (generic message)
- **409** -- Conflict (e.g., duplicate email)
- **500** -- Server error (safeError() returns generic message in production)
