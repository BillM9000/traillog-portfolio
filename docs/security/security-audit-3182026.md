# TrailLog Security Audit — March 18, 2026

**Auditor:** Claude Code (automated + manual probe)
**Target:** https://traillog.gracezero.ai
**Stack:** React 18 + Vite SPA, Express.js, PostgreSQL, Docker on Hostinger VPS
**Method:** Full code audit (42 files) + live endpoint probing

---

## Summary Scorecard

| Category | Status | Notes |
|---|---|---|
| Unauthenticated API access | **PASS** | All protected routes return 401 |
| IDOR / privilege escalation | **PASS** | Per-resource membership middleware on every route |
| CSRF protection | **PASS** | Double-submit cookie pattern, minor vote exemption |
| Session security | **PASS** | Regeneration after login, secure cookie flags |
| Input validation | **PASS** | 14 Zod schemas + parameterized SQL ($1,$2,$3) |
| Security headers | **PASS** | Helmet + CSP, recommend adding explicit HSTS |
| Error handling | **PASS** | No stack trace leaks in production |
| Source maps | **PASS** | Not deployed to production |
| Port exposure | **PASS** | Localhost-only Docker binding, confirmed blocked externally |
| Rate limiting | **PASS** | Auth: 20/15min, Global API: 100/min |
| Docker hardening | **PASS** | Non-root user (uid 1001), production mode |

---

## Detailed Findings

### 1. Unauthenticated API Route Access

**Result: PASS**

All protected endpoints were probed without a session cookie:

| Endpoint | Response |
|---|---|
| `GET /api/troops` | 401 Unauthorized |
| `GET /api/crews` | Redirect to SPA (no data leak) |
| `GET /api/crews/1` | 401 Unauthorized |
| `GET /api/members` | Redirect to SPA (no data leak) |
| `GET /api/adventures` | Redirect to SPA (no data leak) |
| `GET /api/users` | Redirect to SPA (no data leak) |

**Intentionally public endpoints** (appropriate):
- `/api/health` — `{"status":"ok","version":"1.0.0"}` (operational health only)
- `/api/public-settings` — feature flags only (maintenance_mode, registration_enabled)
- `/api/councils` — 238 BSA council records (public directory data for signup form)
- `/api/vote/*` — standalone vote page, sessionless by design

### 2. IDOR / Horizontal Privilege Escalation

**Result: PASS**

Code audit confirms every resource route chains membership verification middleware:

- **Troop routes:** `requireTroopMember()` or `requireTroopAdmin`
- **Adventure routes:** `requireAdventureMember` or `requireAdventureAdmin`
- **Crew routes:** `requireCrewMember` or `requireCrewSelfOrAdmin`
- **Admin routes:** `requireGlobalAdmin`

Each middleware queries the database to confirm the requesting user belongs to the specific resource. Accessing crew 2 data while authenticated as crew 1 is not possible.

### 3. CSRF Protection

**Result: PASS (minor exemption noted)**

Implementation: Double-submit cookie pattern
- Session generates `crypto.randomBytes(32)` CSRF token
- `XSRF-TOKEN` cookie set (`httpOnly: false` for JS access, `secure: true` in prod, `sameSite: "lax"`)
- All POST/PUT/DELETE/PATCH requests require `X-CSRF-Token` header matching session token
- Validation enforced in Express middleware before any route handler executes

**Minor gap:** `/api/vote` routes are CSRF-exempt (intentional — standalone sessionless page). The DELETE vote endpoint could theoretically be forged, but votes are non-sensitive and non-authenticated. Low risk.

### 4. Session Security

**Result: PASS**

- `req.session.regenerate()` called after both Google OAuth and email/password login (prevents session fixation)
- Cookie flags: `httpOnly: true`, `secure: true` (production), `sameSite: "lax"`
- Session store: PostgreSQL via `connect-pg-simple` (auto-creates sessions table)
- `rolling: true` extends session on activity; `maxAge: 7 days`
- `saveUninitialized: false` prevents empty session creation

### 5. Input Validation

**Result: PASS**

14 Zod schemas covering:
- Auth: signup (email validation, 8+ char password, TOS), login, profile update
- Troop: creation (name required, council ID as positive integer)
- Adventure: creation (date regex validation, type enum)
- Training: date, period (am/pm/all), time_label
- Admin: settings key (100 char limit, schema_version blacklisted)
- Vote: voter_name (2-30 chars), design_id (positive int), vote_slot (literal 1 or 2)

`parseId()` helper safely parses all numeric URL parameters.

SQL injection mitigated by parameterized queries (`$1, $2, $3` placeholders) across all 170+ database functions. No string concatenation in queries.

### 6. Security Headers (Helmet)

**Result: PASS**

```
Content-Security-Policy:
  default-src: 'self'
  script-src:  'self'          (no unsafe-inline for scripts)
  style-src:   'self' 'unsafe-inline' fonts.googleapis.com
  img-src:     'self' data: blob: *.googleusercontent.com
  connect-src: 'self'
  frame-src:   'none'
  object-src:  'none'
  base-uri:    'self'

X-Frame-Options:         DENY (Helmet default)
X-Content-Type-Options:  nosniff (Helmet default)
X-Powered-By:            REMOVED by Helmet
```

**Recommendation:** Add explicit HSTS to Helmet for defense-in-depth:
```js
helmet({ hsts: { maxAge: 31536000, includeSubDomains: true } })
```
Traefik reverse proxy likely handles HSTS already, but belt-and-suspenders is best practice.

**Note:** `style-src: 'unsafe-inline'` is required by Tailwind CSS v4. Acceptable tradeoff given strict input validation prevents style injection.

### 7. Error Handling

**Result: PASS**

`safeError()` middleware checks `NODE_ENV`:
- **Production:** Returns generic `"Something went wrong"` — no stack traces, no file paths
- **Development:** Returns `e.message` only (still no stack traces)
- Docker compose sets `NODE_ENV=production`

### 8. Source Maps

**Result: PASS**

Vite config has no `sourcemap: true` in build config. Default is off. No `.map` files are deployed to production. Original source code is not exposed.

### 9. Port Exposure

**Result: PASS**

- Docker port binding: `127.0.0.1:3614:3614` (localhost only)
- Live probe to `:3614` returned **ECONNREFUSED** — confirmed blocked
- All external traffic routes through Traefik reverse proxy with Let's Encrypt TLS

### 10. Rate Limiting

**Result: PASS**

| Scope | Window | Max Requests |
|---|---|---|
| Auth endpoints (login, signup, password reset) | 15 minutes | 20 |
| Global API | 60 seconds | 100 |

Credential stuffing and brute force attacks are mitigated by the auth-specific rate limiter.

### 11. Docker Hardening

**Result: PASS**

- Base image: `node:20-alpine`
- Non-root user: `appuser` (uid 1001)
- Production dependencies only: `npm install --production`
- `.dockerignore` excludes: `node_modules`, `.git`, `.env`, `.db` files
- No secrets in Dockerfile or docker-compose.yml (env vars injected at runtime)
- Restart policy: `unless-stopped`

---

## Recommendations

| Priority | Action | Status |
|---|---|---|
| Low | Add explicit HSTS to Helmet config | Recommended |
| Info | Consider adding Referrer-Policy header | Optional |
| Info | Monitor `unsafe-inline` in style-src if Tailwind adds CSP nonce support | Future |

---

## OWASP Top 10 Coverage

| OWASP Category | Mitigation |
|---|---|
| A01: Broken Access Control | requireAuth + per-resource membership middleware |
| A02: Cryptographic Failures | HTTPS via Traefik/Let's Encrypt, bcrypt passwords, secure session cookies |
| A03: Injection | Parameterized SQL, Zod input validation, CSP script-src: 'self' |
| A04: Insecure Design | Role-based access (scout/adult/troop admin/global admin), principle of least privilege |
| A05: Security Misconfiguration | Helmet headers, NODE_ENV=production, non-root Docker, no source maps |
| A06: Vulnerable Components | Node 20 LTS, npm audit in CI pipeline |
| A07: Auth Failures | Session regeneration, rate limiting, bcrypt, Google OAuth |
| A08: Data Integrity Failures | CSRF double-submit cookie, Zod schema validation |
| A09: Logging & Monitoring | Pino structured JSON logging, audit trail |
| A10: SSRF | No user-controlled URL fetching in backend |

---

*Generated by Claude Code security audit — March 18, 2026*
