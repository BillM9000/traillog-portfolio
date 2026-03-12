# Go-Live Checklist

Pre-launch sign-off checklist. Items marked with the app name are specific to this project. Generic items apply to any web app — conditional notes explain when they matter.

---

## 1. Authentication & Sessions

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1.1 | Session expiration (idle timeout) | ✅ | 7-day rolling idle timeout implemented (Set 1). Banking: 5–15 min, Healthcare: 15–20 min |
| 1.2 | Absolute session timeout | ⬜ | Force re-auth after X hours regardless of activity. Critical for high-security apps |
| 1.3 | Password reset / forgot password flow | ✅ | Implemented (Set 3). 1-hour token expiry, enumeration-safe, rate-limited |
| 1.4 | Account lockout after failed attempts | ⬜ | TrailLog has rate limiting (20/15min). Apps with sensitive data should lock after 5–10 failures |
| 1.5 | OAuth token refresh handling | ⬜ | If using OAuth (Google, GitHub, etc.) — ensure tokens refresh gracefully |
| 1.6 | Multi-factor authentication (MFA) | N/A | Required for: financial, healthcare, enterprise. Not needed for TrailLog |
| 1.7 | Password complexity requirements | ⬜ | TrailLog: 8 char min. Adjust per risk level |
| 1.8 | Session invalidation on password change | ⬜ | If user changes password, kill all other sessions |
| 1.9 | Secure cookie flags (httpOnly, secure, sameSite) | ✅ | httpOnly, secure (prod), sameSite=lax — implemented in Set 1 |

## 2. Security

| # | Item | Status | Notes |
|---|------|--------|-------|
| 2.1 | HTTPS / TLS | ✅ | TrailLog: Let's Encrypt via Traefik |
| 2.2 | Security headers (Helmet.js or equivalent) | ✅ | CSP, X-Frame-Options, HSTS, etc. |
| 2.3 | Rate limiting | ✅ | TrailLog: auth 20/15min, API 100/min |
| 2.4 | Input sanitization / XSS prevention | ✅ | TrailLog: esc() helper, parameterized SQL |
| 2.5 | SQL injection protection | ✅ | All 89 routes use parameterized queries |
| 2.6 | CSRF protection | ⬜ | Low risk for JSON APIs with SameSite cookies. Required if app uses form POSTs or cookie-based auth to different origins |
| 2.7 | File upload validation | ⬜ | If app accepts uploads: validate type, size, scan for malware. TrailLog: needed for troop logo feature |
| 2.8 | Dependency vulnerability scan | ✅ | `npm audit` — 0 vulns as of 2026-03-10 |
| 2.9 | Secrets not in code / .env in .gitignore | ⬜ | Verify no API keys, passwords, or tokens in repo |
| 2.10 | Non-root container | ✅ | TrailLog: appuser uid 1001 |
| 2.11 | CORS configuration | ⬜ | If API is consumed by external clients, lock down origins |
| 2.12 | Content Security Policy (CSP) | ⬜ | Restrict script/style sources. Critical for apps embedding user content |
| 2.13 | API authentication on all sensitive routes | ⬜ | Verify no endpoints leak data without auth |
| 2.14 | Data isolation between tenants/orgs | ⬜ | TrailLog: verify no cross-troop data leaks. Critical for any multi-tenant app |
| 2.15 | Penetration testing | N/A | Required for: enterprise SaaS, financial, healthcare. Overkill for small apps |

## 3. Data & Backups

| # | Item | Status | Notes |
|---|------|--------|-------|
| 3.1 | Automated backups | ✅ | TrailLog: daily 3am cron, rolling 10 |
| 3.2 | Backup restore tested | ⬜ | Actually restore a backup and verify it works BEFORE you need it |
| 3.3 | Golden backup before launch | ⬜ | Snapshot of clean DB state pre-launch |
| 3.4 | Database migrations tested | ✅ | Schema v11 migration path verified |
| 3.5 | Off-site backup copy | ⬜ | If single server: keep a copy elsewhere. TrailLog: consider downloading a backup locally |
| 3.6 | Data retention policy | N/A | Required if handling PII under GDPR/CCPA. Define how long data is kept |
| 3.7 | Database connection pooling | N/A | Required for PostgreSQL/MySQL. TrailLog uses SQLite (single file, no pooling needed) |
| 3.8 | Data encryption at rest | N/A | Required for: healthcare (HIPAA), financial. SQLite on encrypted volume if needed |

## 4. Email & Notifications

| # | Item | Status | Notes |
|---|------|--------|-------|
| 4.1 | SMTP credentials working in production | ⬜ | Send a test email from prod environment |
| 4.2 | Email deliverability (SPF/DKIM/DMARC) | ⬜ | Without these, emails may land in spam. TrailLog uses Gmail SMTP which handles this |
| 4.3 | Email send limits | ⬜ | Gmail SMTP: 500/day. Fine for small groups. SES/Sendgrid for scale |
| 4.4 | Unsubscribe mechanism | N/A | Required if sending marketing emails (CAN-SPAM). Transactional emails are exempt |
| 4.5 | Email templates render correctly | ⬜ | Test in Gmail, Outlook, Apple Mail — they all render HTML differently |
| 4.6 | Bounce/error handling | ⬜ | What happens when an email fails? TrailLog: .catch(console.error) — logged but not retried |

## 5. Monitoring & Logging

| # | Item | Status | Notes |
|---|------|--------|-------|
| 5.1 | Health check endpoint | ✅ | TrailLog: /api/health |
| 5.2 | Error logging accessible | ⬜ | TrailLog: Docker logs only. Consider log aggregation for larger apps |
| 5.3 | Uptime monitoring | ⬜ | External service (UptimeRobot, Pingdom) to alert if site goes down |
| 5.4 | Error alerting | ⬜ | Get notified on 500 errors. Sentry, LogRocket, or even email-on-error |
| 5.5 | Performance monitoring / APM | N/A | Required for: high-traffic apps. Overkill for TrailLog's scale |
| 5.6 | Audit logging | N/A | Required for: enterprise, compliance. Log who did what and when |
| 5.7 | Log rotation | ⬜ | Docker handles this by default, but verify logs don't fill disk |

## 6. Infrastructure & Deployment

| # | Item | Status | Notes |
|---|------|--------|-------|
| 6.1 | Production environment tested end-to-end | ⬜ | Full user flow: register → create troop → add members → use features |
| 6.2 | Domain / DNS configured | ✅ | traillog.gracezero.ai |
| 6.3 | SSL certificate auto-renewal | ✅ | Let's Encrypt via Traefik (auto-renews) |
| 6.4 | Container restart policy | ⬜ | Verify `restart: unless-stopped` or `always` in docker-compose |
| 6.5 | Server auto-start on reboot | ⬜ | Docker service enabled on boot? Will app survive a VPS restart? |
| 6.6 | Disk space monitoring | ⬜ | SQLite DB + backups + Docker images can fill small VPS disks |
| 6.7 | Firewall configured | ⬜ | Only expose ports 80, 443, 22. Verify with `ufw status` or equivalent |
| 6.8 | SSH hardened | ⬜ | Key-only auth, no root password login. Important for public-facing servers |
| 6.9 | CI/CD pipeline | N/A | Nice-to-have. TrailLog deploys manually via tar+scp. Fine for solo dev |
| 6.10 | Rollback plan | ⬜ | Can you quickly revert to previous version? Keep last known-good image/backup |
| 6.11 | Load balancing / horizontal scaling | N/A | Required if expecting high traffic. Single server fine for TrailLog |
| 6.12 | CDN for static assets | N/A | Improves performance for global users. Not needed for small user base |

## 7. User Experience

| # | Item | Status | Notes |
|---|------|--------|-------|
| 7.1 | Mobile responsive | ⬜ | Test on actual phones, not just browser dev tools |
| 7.2 | Error states handled gracefully | ⬜ | Network errors, 500s, empty states — user sees helpful message, not blank screen |
| 7.3 | Loading states | ⬜ | Spinners/skeletons while data loads, not frozen UI |
| 7.4 | 404 / not-found page | ⬜ | Bad URLs show a helpful page, not a crash |
| 7.5 | Browser compatibility | ⬜ | Test Chrome, Safari, Firefox at minimum |
| 7.6 | Accessibility basics (a11y) | ⬜ | Keyboard navigation, screen reader labels, color contrast |
| 7.7 | Favicon and page titles | ⬜ | Looks professional in browser tabs |
| 7.8 | Open Graph / social meta tags | N/A | If users will share links on social media. Nice-to-have |

## 8. Legal & Compliance

| # | Item | Status | Notes |
|---|------|--------|-------|
| 8.1 | Privacy policy | ⬜ | Required if collecting any personal data. Even a simple one helps |
| 8.2 | Terms of service | ⬜ | Protects you legally. Required for public apps |
| 8.3 | Cookie consent banner | N/A | Required under GDPR if targeting EU users |
| 8.4 | GDPR data export / deletion | N/A | Required if EU users. Account deletion is good practice regardless |
| 8.5 | COPPA compliance | ✅ N/A | COPPA = under 13 only. BSA high adventure min age is 13 (Sea Base) or 14 (Philmont/NT/Summit). TrailLog users are 13+. Required if app collects data from children under 13 |
| 8.6 | ADA / WCAG compliance | N/A | Required for: government, education, large enterprise. Good practice for all |
| 8.7 | HIPAA compliance | N/A | Required only if handling health data |
| 8.8 | SOC 2 / ISO 27001 | N/A | Required for: enterprise SaaS selling to large companies |
| 8.9 | PCI DSS | N/A | Required only if processing credit card payments directly |

## 9. App-Specific (TrailLog)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 9.1 | Global admin account working | ✅ | billm9000@gmail.com, ADMIN_EMAIL env var |
| 9.2 | Google OAuth working in prod | ⬜ | Test fresh Google sign-in on production URL |
| 9.3 | Email/password registration working | ⬜ | Test full flow: register → verify email → login |
| 9.4 | Troop creation → member join flow | ⬜ | End-to-end with real users |
| 9.5 | Calendar / date picking working | ⬜ | AM/PM/All Day on mobile |
| 9.6 | Training event scheduling + email | ⬜ | Schedule event, verify all members receive email |
| 9.7 | Gear list + pack weight calculation | ⬜ | Spot-check weights with known gear |
| 9.8 | Itinerary viewer | ⬜ | All 48 itineraries load correctly |
| 9.9 | Invite flow working | ⬜ | Send invite, recipient joins correct troop |

---

*Last updated: 2026-03-13*
