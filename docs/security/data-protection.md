# Data Protection

Last updated: 2026-03-10

This document describes how TrailLog classifies, stores, transmits, and protects
user data. It covers encryption, cookie security, HTTP security headers, backup
procedures, and data retention policies.

---

## Data Classification

### Sensitive Data (stored)

| Data | Storage Location | Protection |
|------|-----------------|------------|
| User emails | `users.email` | Access-controlled via auth middleware |
| Parent emails | `users.parent_email`, `users.parent_email_2` | Access-controlled via auth middleware |
| Password hashes | `users.password_hash` | Bcrypt (10 rounds); never returned in API responses |
| Google OAuth IDs | `users.google_id` | Never returned in client-facing API responses |
| Session tokens | `sessions` table | httpOnly, secure, sameSite:lax cookies |
| Verification tokens | `users.verification_token` | Single-use, cleared after verification |
| Invitation tokens | `invitations.token` | Single-use, status-tracked |

### Non-Sensitive Data (stored)

| Data | Examples |
|------|----------|
| Troop metadata | Troop name, council, location, visibility flag |
| Adventure metadata | Adventure name, dates (depart, arrive, return, home) |
| Gear selections | Item status (needed/owned/packed), custom weights |
| Training and readiness | Training dates, readiness scores, badge achievements |
| Affiliate click logs | Product option ID, URL, referrer, timestamp |

### Data Not Stored

| Data | Reason |
|------|--------|
| Google OAuth access tokens | Discarded after initial profile fetch |
| Google OAuth refresh tokens | Never requested or stored |
| Raw passwords | Only bcrypt hashes are persisted |
| Credit card numbers | No payment processing |
| Social Security numbers | Not collected |
| Medical records | Not collected (readiness tracks completion status only, not medical content) |

---

## Data at Rest

### Database

- **Engine:** SQLite 3 via better-sqlite3
- **Mode:** WAL (Write-Ahead Logging) for crash resilience and concurrent read access
- **Storage:** Docker named volume `crew614_crew614_data`
- **Encryption:** None (no SQLCipher)

### Encryption at Rest -- Trade-off Analysis

SQLite encryption at rest via SQLCipher is not currently implemented. This is a
deliberate trade-off:

| Factor | Assessment |
|--------|-----------|
| Benefit | Protects data if the VPS disk is physically accessed or the Docker volume is exfiltrated |
| Cost | SQLCipher requires native bindings and adds build complexity to the Docker multi-stage build. It also introduces a key management requirement. |
| Current mitigations | Docker container isolation (non-root `appuser`, uid 1001). VPS access restricted to SSH key authentication. .env file permissions set to 600. Database file not bind-mounted to host. |
| Recommendation | Consider host-level disk encryption (LUKS) on the VPS as a lower-complexity alternative that protects all data at rest, not just the database. |

### Environment File

The `.env` file on the VPS contains:

- `SESSION_SECRET` (~80 random characters)
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- `SMTP_PASS` (Gmail app password)
- `ADMIN_EMAIL`
- Database path configuration

Protections:

- File permissions: `600` (read/write for owner only)
- Excluded from version control via `.gitignore`
- Excluded from Docker image via `.dockerignore`
- Backed up alongside database backups (encrypted backup is an improvement area)

---

## Data in Transit

### External Traffic (Browser to Server)

All external traffic is encrypted with TLS.

| Component | Configuration |
|-----------|--------------|
| TLS termination | Traefik reverse proxy |
| Certificate management | Let's Encrypt with automatic renewal |
| HTTP redirect | Permanent redirect (301) from HTTP to HTTPS |
| HSTS | Enabled via Helmet.js (max-age: 15552000 seconds / 180 days, includeSubDomains) |
| Minimum TLS version | Determined by Traefik defaults (TLS 1.2+) |

### Internal Traffic (Traefik to Container)

Traffic between Traefik and the Express.js container is unencrypted, transmitted
over localhost (127.0.0.1). This is acceptable because:

- Both processes run on the same host.
- The Docker container exposes port 3614 only on the localhost interface, not on
  public-facing network interfaces.
- An attacker would need root access to the VPS to intercept this traffic, at which
  point they would already have access to the database file.

---

## Cookie Security

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `httpOnly` | `true` | Prevents JavaScript access to the session cookie. Mitigates XSS-based session theft. |
| `secure` | `true` (production) | Cookie is only sent over HTTPS connections. Prevents transmission over unencrypted HTTP. |
| `sameSite` | `"lax"` | Cookie is sent with same-site requests and top-level navigations. Prevents cross-site request forgery from form submissions on other domains. |
| `maxAge` | 30 days | Session expires after 30 days, requiring re-authentication. |

### CSRF Mitigation

TrailLog does not use CSRF tokens. Instead, CSRF is mitigated by the combination of:

1. **SameSite:lax cookies** -- The browser does not send cookies with cross-origin
   POST, PUT, or DELETE requests.
2. **JSON Content-Type** -- All API mutations accept `application/json`, which
   cannot be submitted by plain HTML forms. Cross-origin `fetch` or `XMLHttpRequest`
   with a JSON body triggers a CORS preflight, and CORS is not configured (same-origin
   only).

---

## Security Headers

All security headers are configured via Helmet.js v8.

### Content-Security-Policy

```
default-src 'self';
script-src  'self';
style-src   'self' 'unsafe-inline';
img-src     'self' data: https://*.googleusercontent.com;
font-src    'self' fonts.googleapis.com fonts.gstatic.com;
frame-src   'none';
object-src  'none';
base-uri    'self';
```

| Directive | Value | Rationale |
|-----------|-------|-----------|
| `default-src` | `'self'` | Only allow resources from the same origin by default |
| `script-src` | `'self'` | No inline scripts, no external script sources |
| `style-src` | `'self' 'unsafe-inline'` | Inline styles required by 21 React components using CSS-in-JS patterns |
| `img-src` | `'self' data: https://*.googleusercontent.com` | Allows same-origin images, data URIs (for icons), and Google user avatars |
| `font-src` | `'self' fonts.googleapis.com fonts.gstatic.com` | Google Fonts loaded from Google CDN |
| `frame-src` | `'none'` | No iframes allowed; prevents clickjacking via embedded frames |
| `object-src` | `'none'` | No plugins (Flash, Java applets) |
| `base-uri` | `'self'` | Prevents `<base>` tag injection that could redirect relative URLs |

Note: `crossOriginEmbedderPolicy` is disabled to allow loading of Google user
avatar images (cross-origin resources without CORP headers).

### Other Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `SAMEORIGIN` | Prevents the page from being embedded in frames on other domains (clickjacking protection) |
| `X-Content-Type-Options` | `nosniff` | Prevents browsers from MIME-sniffing responses away from the declared Content-Type |
| `Strict-Transport-Security` | `max-age=15552000; includeSubDomains` | Instructs browsers to only connect via HTTPS for 180 days |
| `Referrer-Policy` | `no-referrer` | No referrer information sent with requests, preventing URL leakage |
| `X-DNS-Prefetch-Control` | `off` | Disables DNS prefetching to prevent information leakage via DNS queries |
| `X-Permitted-Cross-Domain-Policies` | `none` | Prevents Adobe Flash and Acrobat from loading data from this domain |
| `X-Powered-By` | Removed | Helmet removes this header to avoid revealing the server technology |

---

## Email Security

### HTML Escaping

All user-controlled values inserted into email templates are sanitized via the
`esc()` function in `email.js`. This function HTML-escapes four characters:

| Character | Escaped As |
|-----------|-----------|
| `&` | `&amp;` |
| `<` | `&lt;` |
| `>` | `&gt;` |
| `"` | `&quot;` |

This prevents XSS in email clients that render HTML. The `esc()` function is applied
across all 9 email templates:

- sendInvitationEmail
- sendDateChangedEmail
- sendBadgeEarnedEmail
- sendMemberApprovedEmail
- sendMemberDeniedEmail
- sendJoinRequestEmail
- sendParentNotificationEmail
- sendVerificationEmail
- (and related helper templates)

### SMTP Configuration

- Provider: Gmail SMTP
- Authentication: App password (stored in .env as SMTP_PASS)
- Connection: TLS-encrypted

---

## Client-Side Security

| Practice | Implementation |
|----------|---------------|
| No alert() calls | All user notifications use the toast system (ToastContext) |
| No dangerouslySetInnerHTML | No raw HTML injection in any React component |
| No secrets in client | localStorage stores only theme preference ("dark"/"light") |
| No tokens in client | Session management is entirely cookie-based (httpOnly) |
| No sensitive data in URLs | No tokens, IDs, or PII in client-side route parameters |

---

## Backup Security

### Configuration

| Setting | Value |
|---------|-------|
| Schedule | Daily at 3:00 AM (cron) |
| Method | SQLite `.backup` command (online backup, no locking) |
| Retention | Rolling 10 backups (oldest auto-deleted) |
| Storage | `/opt/crew614/backups/` on VPS |
| Includes | Database file and .env |

### Current Limitations

| Limitation | Risk | Recommendation |
|-----------|------|----------------|
| Backups not encrypted | If VPS is compromised, backups are readable | Encrypt backups with GPG before storage |
| No off-site replication | Single point of failure for backups | Replicate to an off-site location (S3, separate server) |
| No backup integrity verification | Corruption could go undetected | Add periodic restore-and-verify checks |

---

## Data Retention

| Data Type | Retention Policy |
|-----------|-----------------|
| User accounts | Indefinite (no auto-deletion) |
| Troop and adventure data | Indefinite |
| Sessions (expired) | Deleted hourly by garbage collection |
| Backups | Rolling 10 (oldest auto-deleted on each backup run) |
| Affiliate click logs | Indefinite |

### Improvement Areas

- **User data deletion:** No self-service account deletion or data export. This is
  an improvement area for compliance with data protection regulations (GDPR, CCPA).
- **Right to erasure:** No automated process for handling deletion requests. Requests
  would need to be handled manually by the global administrator.
- **Data minimization:** The application collects only data necessary for trek
  preparation. No analytics or tracking beyond affiliate click logging.
