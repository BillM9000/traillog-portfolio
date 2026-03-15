# Go-Live Checklist

Pre-launch sign-off checklist. Items marked with the app name are specific to this project. Generic items apply to any web app — conditional notes explain when they matter.

---

## 1. Authentication & Sessions

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1.1 | Session expiration (idle timeout) | ✅ | 7-day rolling idle timeout implemented (Set 1). Banking: 5–15 min, Healthcare: 15–20 min |
| 1.2 | Absolute session timeout | N/A | Not needed for TrailLog risk level. 7-day idle timeout is sufficient |
| 1.3 | Password reset / forgot password flow | ✅ | Implemented (Set 3). 1-hour token expiry, enumeration-safe, rate-limited |
| 1.4 | Account lockout after failed attempts | ✅ | Rate limiting covers this (20/15min). Per-account lockout not needed at TrailLog scale |
| 1.5 | OAuth token refresh handling | N/A | TrailLog uses Google OAuth for login only (session-based), not ongoing API access. No token refresh needed |
| 1.6 | Multi-factor authentication (MFA) | N/A | Required for: financial, healthcare, enterprise. Not needed for TrailLog |
| 1.7 | Password complexity requirements | ✅ | 8 char minimum. Appropriate for TrailLog risk level |
| 1.8 | Session invalidation on password change | ✅ | Deletes all other sessions for user on password change (DELETE FROM sessions WHERE sid != current) |
| 1.9 | Secure cookie flags (httpOnly, secure, sameSite) | ✅ | httpOnly, secure (prod), sameSite=lax — implemented in Set 1 |

## 2. Security

| # | Item | Status | Notes |
|---|------|--------|-------|
| 2.1 | HTTPS / TLS | ✅ | TrailLog: Let's Encrypt via Traefik |
| 2.2 | Security headers (Helmet.js or equivalent) | ✅ | CSP, X-Frame-Options, HSTS, etc. |
| 2.3 | Rate limiting | ✅ | TrailLog: auth 20/15min, API 100/min |
| 2.4 | Input sanitization / XSS prevention | ✅ | TrailLog: esc() helper, parameterized SQL |
| 2.5 | SQL injection protection | ✅ | All 89 routes use parameterized queries |
| 2.6 | CSRF protection | ✅ | Double-submit cookie pattern. XSRF-TOKEN cookie + X-CSRF-Token header on POST/PUT/DELETE/PATCH (Set 14) |
| 2.7 | File upload validation | ✅ | Troop logo: 500KB max, PNG/JPG/WebP magic byte check, data URL format validation |
| 2.8 | Dependency vulnerability scan | ✅ | `npm audit` — 0 vulns as of 2026-03-10 |
| 2.9 | Secrets not in code / .env in .gitignore | ✅ | .env gitignored, all secrets via environment variables |
| 2.10 | Non-root container | ✅ | TrailLog: appuser uid 1001 |
| 2.11 | CORS configuration | N/A | Same-origin app only, no cross-origin API consumers |
| 2.12 | Content Security Policy (CSP) | ✅ | scriptSrc: self only (no unsafe-inline), theme-init.js externalized, Google Fonts in styleSrc |
| 2.13 | API authentication on all sensitive routes | ✅ | 90+ routes audited. All sensitive routes use requireAuth. Public: health, councils, logo, auth flows, public-settings |
| 2.14 | Data isolation between tenants/orgs | ✅ | All troop/adventure/crew routes use membership middleware (requireTroopMember, requireAdventureMember, requireCrewMember) |
| 2.15 | Penetration testing | N/A | Required for: enterprise SaaS, financial, healthcare. Overkill for small apps |

## 3. Data & Backups

| # | Item | Status | Notes |
|---|------|--------|-------|
| 3.1 | Automated backups | ✅ | TrailLog: daily 3am cron, rolling 10 |
| 3.2 | Backup restore tested | ✅ | Multiple golden backup restores verified during development (docker cp + chown 1001:1001) |
| 3.3 | Golden backup before launch | ✅ | 10+ golden backups on VPS + local copies (pre-regression through post-council-overhaul) |
| 3.4 | Database migrations tested | ✅ | Schema v10→v20 migration path verified (fresh + existing DB) |
| 3.5 | Off-site backup copy | ✅ | Golden backups downloaded to local dev machine (crew614/backups/) |
| 3.6 | Data retention policy | N/A | Required if handling PII under GDPR/CCPA. Define how long data is kept |
| 3.7 | Database connection pooling | N/A | Required for PostgreSQL/MySQL. TrailLog uses SQLite (single file, no pooling needed) |
| 3.8 | Data encryption at rest | N/A | Required for: healthcare (HIPAA), financial. SQLite on encrypted volume if needed |

## 4. Email & Notifications

| # | Item | Status | Notes |
|---|------|--------|-------|
| 4.1 | SMTP credentials working in production | ✅ | Training event email sent from prod (POST 201, 172ms). Gmail delivery pending user verification |
| 4.2 | Email deliverability (SPF/DKIM/DMARC) | ✅ | Gmail SMTP handles SPF/DKIM automatically for @gmail.com sender |
| 4.3 | Email send limits | ✅ | Gmail SMTP 500/day — more than sufficient for TrailLog scale. Upgrade path documented (Resend/Postmark) |
| 4.4 | Unsubscribe mechanism | N/A | Required if sending marketing emails (CAN-SPAM). Transactional emails are exempt |
| 4.5 | Email templates render correctly | ⬜ | Test in Gmail, Outlook, Apple Mail — they all render HTML differently |
| 4.6 | Bounce/error handling | ✅ | Errors logged via .catch(console.error) + morgan. Non-blocking — app continues if email fails |

## 5. Monitoring & Logging

| # | Item | Status | Notes |
|---|------|--------|-------|
| 5.1 | Health check endpoint | ✅ | TrailLog: /api/health |
| 5.2 | Error logging accessible | ✅ | morgan("short") request logging + Docker logs (max-size: 10m, max-file: 3). Sufficient for current scale |
| 5.3 | Uptime monitoring | ⬜ | External service (UptimeRobot, Pingdom) to alert if site goes down |
| 5.4 | Error alerting | ⬜ | Get notified on 500 errors. Sentry, LogRocket, or even email-on-error |
| 5.5 | Performance monitoring / APM | N/A | Required for: high-traffic apps. Overkill for TrailLog's scale |
| 5.6 | Audit logging | N/A | Required for: enterprise, compliance. Log who did what and when |
| 5.7 | Log rotation | ✅ | Docker log rotation configured: max-size 10m, max-file 3 |

## 6. Infrastructure & Deployment

| # | Item | Status | Notes |
|---|------|--------|-------|
| 6.1 | Production environment tested end-to-end | ✅ | Full prod test: dashboard, all 6 tabs, admin panel, training CRUD, gear status, RSVP, reports, help |
| 6.2 | Domain / DNS configured | ✅ | traillog.gracezero.ai |
| 6.3 | SSL certificate auto-renewal | ✅ | Let's Encrypt via Traefik (auto-renews) |
| 6.4 | Container restart policy | ✅ | `restart: unless-stopped` in docker-compose.yml |
| 6.5 | Server auto-start on reboot | ✅ | Docker enabled on boot (`systemctl is-enabled docker` = enabled), container restart: unless-stopped |
| 6.6 | Disk space monitoring | ✅ | 96GB disk, 35% used (64GB free). Docker prune available to reclaim ~46GB. Backup files <10MB total |
| 6.7 | Firewall configured | ⬜ | UFW installed but inactive. Note: Docker bypasses UFW — bind containers to 127.0.0.1 instead. See VPS_SECURITY_HARDENING.md |
| 6.8 | SSH hardened | ✅ | Ed25519 key-only auth, PasswordAuthentication=no, fail2ban active |
| 6.9 | CI/CD pipeline | N/A | Nice-to-have. TrailLog deploys manually via tar+scp. Fine for solo dev |
| 6.10 | Rollback plan | ✅ | Documented in CHANGE_MANAGEMENT.md (Section 6). Golden backup registry + tar rollback procedure |
| 6.11 | Load balancing / horizontal scaling | N/A | Required if expecting high traffic. Single server fine for TrailLog |
| 6.12 | CDN for static assets | N/A | Improves performance for global users. Not needed for small user base |

## 7. User Experience

| # | Item | Status | Notes |
|---|------|--------|-------|
| 7.1 | Mobile responsive | ⬜ | Test on actual phones, not just browser dev tools |
| 7.2 | Error states handled gracefully | ✅ | ToastContext for user-facing errors, try/catch throughout, safeError() hides internals in prod |
| 7.3 | Loading states | ✅ | Auth loading state, gear saving state, dashboard loading — no frozen UI |
| 7.4 | 404 / not-found page | ✅ | SPA catch-all serves React app for all unmatched routes (client-side routing) |
| 7.5 | Browser compatibility | ⬜ | Test Chrome, Safari, Firefox at minimum |
| 7.6 | Accessibility basics (a11y) | ⬜ | Keyboard navigation, screen reader labels, color contrast |
| 7.7 | Favicon and page titles | ✅ | Custom mountain/trail SVG favicon, "TrailLog" page title |
| 7.8 | Open Graph / social meta tags | N/A | If users will share links on social media. Nice-to-have |

## 8. Legal & Compliance

| # | Item | Status | Notes |
|---|------|--------|-------|
| 8.1 | Privacy policy | ✅ | Served at /privacy — standalone HTML, no auth required, crawlable |
| 8.2 | Terms of service | ✅ | Served at /terms — standalone HTML, no auth required, crawlable |
| 8.3 | TOS acceptance tracking | ✅ | Explicit checkbox on both signup paths (email + Google OAuth). `tos_accepted_at` timestamp stored in DB. Button disabled until checked. Server rejects without it |
| 8.4 | Cookie consent banner | N/A | Required under GDPR if targeting EU users |
| 8.5 | GDPR data export / deletion | N/A | Required if EU users. Account deletion is good practice regardless |
| 8.6 | COPPA compliance | ✅ N/A | COPPA = under 13 only. BSA high adventure min age is 13 (Sea Base) or 14 (Philmont/NT/Summit). TrailLog users are 13+. Required if app collects data from children under 13 |
| 8.7 | ADA / WCAG compliance | N/A | Required for: government, education, large enterprise. Good practice for all |
| 8.8 | HIPAA compliance | N/A | Required only if handling health data |
| 8.8 | SOC 2 / ISO 27001 | N/A | Required for: enterprise SaaS selling to large companies |
| 8.9 | PCI DSS | N/A | Required only if processing credit card payments directly |

## 9. App-Specific (TrailLog)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 9.1 | Global admin account working | ✅ | billm9000@gmail.com, ADMIN_EMAIL env var |
| 9.2 | Google OAuth working in prod | ✅ | /auth/google returns 302 (redirect to Google). Route is wired and functional |
| 9.3 | Email/password registration working | ⬜ | Needs real user test (signup → verify email → login). Routes exist and auth code verified |
| 9.4 | Troop creation → member join flow | ⬜ | Needs 2nd user to test join flow. Troop creation verified in previous GUI tests |
| 9.5 | Calendar / date picking working | ✅ | Tap cycles: All Day → AM → PM → Off. 5-month grid, bulk select, On Trek/Travel icons verified |
| 9.6 | Training event scheduling + email | ✅ | Created event (Apr 19, Busse Woods), RSVP working (Going/Can't), email sent (POST 201) |
| 9.7 | Gear list + pack weight calculation | ✅ | 76 items, 3-state toggle, pack weight: 31.5/50 lbs (3.9 gear + 21 food/12d + 6.6 water). Category filters working |
| 9.8 | Itinerary viewer | ✅ | 12-day trek loaded (Itinerary 12-20). Day-by-day: camps, elevation, miles, programs, camp type badges |
| 9.9 | Invite flow working | ⬜ | Needs 2nd user to test invite acceptance. Invite API routes verified |

---

*Last updated: 2026-03-14*
