# Threat Model

Last updated: 2026-03-14

This document describes the threat model for TrailLog using the STRIDE framework.
TrailLog is a multi-troop collaborative platform for Scouting America high adventure
trek preparation, built with Express.js, PostgreSQL, and React 18.

---

## Assets

| Asset | Classification | Location |
|-------|---------------|----------|
| User PII (email, name, parent_email, parent_email_2) | Sensitive | PostgreSQL database |
| Password hashes (bcrypt, 10 rounds) | Sensitive | PostgreSQL database |
| Google OAuth IDs | Sensitive | PostgreSQL database |
| Session tokens | Sensitive | PostgreSQL session table |
| Verification tokens (email confirmation) | Sensitive | PostgreSQL database |
| Invitation tokens (troop/adventure invites) | Sensitive | PostgreSQL database |
| Troop and adventure data (names, dates, readiness) | Internal | PostgreSQL database |
| Gear selections and pack weight data | Internal | PostgreSQL database |
| SESSION_SECRET (~80 chars) | Critical | .env file on VPS |
| Google OAuth client secret | Critical | .env file on VPS |
| Gmail SMTP app password | Critical | .env file on VPS |

## Attack Surfaces

### Public Auth Endpoints

- `GET /auth/google` -- Initiates OAuth redirect
- `GET /auth/google/callback` -- Receives Google OAuth callback
- `POST /api/auth/signup` -- Email/password registration
- `POST /api/auth/login` -- Email/password login
- `GET /api/auth/verify/:token` -- Email verification

### API Routes

89 authenticated API routes across these resource groups:

- Troop management (create, list, join, settings)
- Adventure CRUD and member management
- Gear catalog, member gear items, product options
- Achievements and milestone checking
- Invitations (create, accept)
- Admin routes (troop admin, global admin)
- Affiliate click tracking

### Static File Serving

Vite-built SPA served from the same Express server. No separate CDN or static
file server.

### Infrastructure

- Docker container exposing port 3614 on localhost only
- Traefik reverse proxy handling TLS termination
- VPS with SSH access on port 22
- PostgreSQL database on VPS host (172.18.0.1:5432)

## Trust Boundaries

```
  Browser              Traefik              Docker Container         PostgreSQL
    |                    |                       |                     |
    |--- HTTPS/TLS ----->|--- localhost:3614 --->|--- TCP 5432 ------->|
    |                    |                       |                     |
    |  (untrusted)       | (TLS termination)     | (application logic) | (data)
```

1. **Browser to Traefik** -- TLS-encrypted. The browser is untrusted. All input
   must be validated server-side.
2. **Traefik to Docker container** -- Unencrypted localhost traffic. Acceptable
   because both run on the same host and Traefik binds to 127.0.0.1.
3. **Container to PostgreSQL** -- TCP connection from the container to PostgreSQL
   on the VPS host via `172.18.0.1:5432`. The container process runs as non-root
   user `appuser` (uid 1001). Database access requires authentication credentials.
4. **VPS to external services** -- Outbound connections to Google OAuth endpoints
   and Gmail SMTP. These use TLS.

## STRIDE Analysis

### Spoofing

| Threat | Likelihood | Mitigation | Status |
|--------|-----------|------------|--------|
| Session hijacking via cookie theft | Low | httpOnly cookies prevent JavaScript access. secure flag ensures HTTPS-only transmission. sameSite:lax prevents cross-site cookie submission. | Mitigated |
| OAuth token theft | Low | Server-side redirect flow. Google access/refresh tokens are not stored or sent to the client. Token exchange happens entirely on the server. | Mitigated |
| Brute force password guessing | Low | authLimiter restricts login attempts to 20 per 15-minute window. Bcrypt with 10 rounds makes offline cracking expensive. | Mitigated |
| Account takeover via unverified email | Low | Email/password accounts require email verification before login is permitted. Login returns 403 for unverified accounts. | Mitigated |
| Session fixation | Medium | SameSite:lax cookies and HTTPS-only transmission reduce risk. However, no explicit session ID regeneration is performed on login. | Partially mitigated |

### Tampering

| Threat | Likelihood | Mitigation | Status |
|--------|-----------|------------|--------|
| SQL injection | Very Low | 100% parameterized queries via pg (node-postgres) `pool.query()`. Zero string concatenation in any SQL operation across all 89 routes. | Mitigated |
| Request body manipulation | Low | Server-side validation on all inputs. parseId() returns null for non-integer route params. Enum validation on user_type and participation. express.json enforces 1MB body limit. | Mitigated |
| Cross-site request forgery (CSRF) | Very Low | Double-submit cookie pattern: server generates a CSRF token in the session and sets an XSRF-TOKEN cookie; client sends the token as an X-CSRF-Token header on POST/PUT/DELETE/PATCH; server rejects mismatches with 403. Additionally, SameSite:lax cookies prevent cross-origin cookie submission, and JSON Content-Type prevents HTML form submissions. | Mitigated |
| Cross-troop data modification | Low | Custom gear PUT/DELETE queries include `AND troop_id = ?`. Authorization middleware verifies troop membership before granting access. | Mitigated |

### Repudiation

| Threat | Likelihood | Mitigation | Status |
|--------|-----------|------------|--------|
| Unattributable administrative actions | Medium | No comprehensive audit log. Admin actions (member approval/denial, role changes, adventure deletion) are not formally logged with timestamps and actor identity. Console.log provides minimal tracing. | Known gap |
| Disputed account activity | Medium | Sessions track user identity, but no login history or IP logging is implemented. | Known gap |

### Information Disclosure

| Threat | Likelihood | Mitigation | Status |
|--------|-----------|------------|--------|
| Error message leakage | Low | safeError() helper returns generic "Something went wrong" in production. Detailed errors only shown in development mode. All 500 error handlers use safeError(). | Mitigated |
| HTTP header fingerprinting | Low | Helmet.js removes X-Powered-By and sets restrictive security headers. | Mitigated |
| Database exposure | Low | PostgreSQL runs on the VPS host with authentication required. Container connects via Docker bridge network. Container runs as non-root user. Docker socket not exposed. | Mitigated |
| Email exposure in error responses | Low | Intentional 400/403/404/409 responses use hardcoded safe messages. User-specific data is not included in error payloads. | Mitigated |
| Sensitive data in client bundle | Very Low | No tokens, secrets, or API keys in client code. localStorage stores only theme preference. | Mitigated |

### Denial of Service

| Threat | Likelihood | Mitigation | Status |
|--------|-----------|------------|--------|
| Brute force login attempts | Low | authLimiter: 20 requests per 15-minute window on login and signup endpoints. | Mitigated |
| API request flooding | Low | apiLimiter: 100 requests per 1-minute window on all /api/ routes. Standard rate limit headers inform clients of remaining quota. | Mitigated |
| Large payload abuse | Low | express.json body parser limited to 1MB. Requests exceeding this limit are rejected before reaching route handlers. | Mitigated |
| Database connection exhaustion | Low | PostgreSQL connection pool manages concurrent access. Write transactions are short (deleteAdventure wraps 8 table deletions in a single transaction). | Mitigated |

### Elevation of Privilege

| Threat | Likelihood | Mitigation | Status |
|--------|-----------|------------|--------|
| Cross-troop unauthorized access | Low | 6-layer authorization middleware chain. Troop membership verified before adventure access. Troop-scoped SQL queries include troop_id predicates. | Mitigated |
| Admin role self-assignment | Very Low | Global admin is determined by ADMIN_EMAIL environment variable, not by any database field a user could modify. Troop admin role changes require existing admin privileges. | Mitigated |
| Invitation token abuse | Low | Tokens are generated with crypto.randomBytes (32 bytes, hex-encoded). Tokens are single-use and tied to specific adventures. | Mitigated |
| Accessing other users' gear data | Low | Member gear endpoints include user ID in the route and verify the requesting user is either the target user or an adventure/troop admin (requireAdventureSelfOrAdmin). | Mitigated |

## Residual Risks

These are known risks that are accepted or deferred for future improvement.

### No Session Regeneration on Login

**Risk:** Session fixation attacks. If an attacker can set a session cookie before
the victim logs in, the attacker could share the session.

**Current mitigation:** SameSite:lax and secure cookies make it difficult for an
attacker to inject a session cookie cross-origin. The risk is low but not fully
eliminated.

**Recommendation:** Call `req.session.regenerate()` after successful authentication.

### CSP Allows unsafe-inline for Styles

**Risk:** Style injection could be used for data exfiltration (CSS-based attacks).

**Current mitigation:** React's JSX escaping prevents injection of arbitrary HTML.
The `unsafe-inline` directive is required because 21 components use inline styles
(React CSS-in-JS pattern). `script-src` does NOT allow `unsafe-inline`.

**Recommendation:** Migrate to CSS modules or a build-time CSS-in-JS solution to
eliminate the need for `unsafe-inline` in `style-src`.

### No Encryption at Rest

**Risk:** If the VPS is compromised, the PostgreSQL database is readable.

**Current mitigation:** PostgreSQL requires authentication for connections, non-root
container process user, VPS access restricted to SSH key authentication, .env file
permissions set to 600.

**Recommendation:** Consider host-level disk encryption (LUKS) on the VPS to
protect all data at rest.

### Single-Server Architecture

**Risk:** No redundancy. Hardware failure or VPS outage results in complete service
unavailability.

**Current mitigation:** Rolling 10 daily backups via `pg_dump`.
Documented deployment procedure allows rebuilding on a new VPS.

**Recommendation:** Consider off-site backup replication and a documented disaster
recovery runbook with target RTO/RPO.

### No Audit Logging

**Risk:** Security events (login failures, permission changes, data deletions) are
not formally tracked. Incident investigation and forensic analysis would be limited.

**Current mitigation:** Morgan (`short` format) logs all HTTP requests (method,
URL, status, response time) to stdout, captured by Docker logs. Console.log
provides additional operational logging for specific events.

**Recommendation:** Supplement Morgan request logging with structured
security-event logging (e.g., pino or winston) covering authentication,
authorization failures, administrative actions, and data modifications.
