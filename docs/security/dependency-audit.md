# Dependency Audit

Last updated: 2026-03-14

This document records the results of the most recent dependency security audit,
lists all production dependencies with their risk assessments, and describes the
ongoing audit process.

---

## Audit Summary

| Item | Value |
|------|-------|
| Audit date | 2026-03-10 |
| Tool | `npm audit` (built-in) |
| Server vulnerabilities | 0 |
| Client vulnerabilities | 0 |
| Lock files committed | Yes (server/package-lock.json, client/package-lock.json) |

---

## Server Dependencies

10 production packages.

| Package | Version | Purpose | Risk Notes |
|---------|---------|---------|------------|
| bcryptjs | ^3.0.3 | Password hashing (bcrypt, 10 rounds) | Pure JavaScript implementation. Slower than native `bcrypt` but eliminates native binding requirements and associated build/security risks. No known vulnerabilities. |
| better-sqlite3 | ^11.7.0 | SQLite database driver | Native addon compiled during `npm install`. Requires build tools (python3, make, g++) in the Docker build stage. Compiled binary is architecture-specific. Widely used and actively maintained. |
| express | ^4.21.0 | HTTP server and routing framework | One of the most widely audited Node.js packages. Large maintainer team. Critical to the entire application. |
| express-rate-limit | ^7.5.0 | Request rate limiting | In-memory store by default. Counters reset on server restart, which is acceptable for a single-server deployment. No persistent state required. |
| express-session | ^1.19.0 | Server-side session management | Used with better-sqlite3-session-store for persistent sessions. Session data stored in SQLite, not in memory. |
| helmet | ^8.0.0 | HTTP security headers | Sets sensible security header defaults. CSP is customized for this application (see data-protection.md). Minimal attack surface -- it only modifies response headers. |
| nodemailer | ^8.0.1 | Transactional email (SMTP) | Connects to Gmail SMTP with an app password. Outbound connections only. No inbound mail handling. |
| passport | ^0.7.0 | Authentication framework | Provides the strategy pattern for pluggable authentication. Core library has minimal surface area. |
| passport-google-oauth20 | ^2.0.0 | Google OAuth 2.0 strategy | Server-side redirect flow. Handles the OAuth code exchange and profile fetch. Google tokens are not persisted. |
| passport-local | ^1.0.0 | Email/password authentication strategy | Minimal wrapper around username/password verification. Delegates hashing to bcryptjs. |

### Session Store (transitive dependency)

| Package | Version | Purpose | Risk Notes |
|---------|---------|---------|------------|
| better-sqlite3-session-store | (via express-session) | Persistent session storage in SQLite | Stores sessions in the same SQLite database. Includes hourly garbage collection of expired sessions. |

---

## Client Dependencies

3 production packages (plus Vite as a dev dependency).

| Package | Version | Purpose | Risk Notes |
|---------|---------|---------|------------|
| react | ^18.3.1 | UI component framework | JSX escaping provides default XSS protection. No `dangerouslySetInnerHTML` is used in the codebase. |
| react-dom | ^18.3.1 | DOM rendering for React | Paired with React. Same security profile. |
| @vitejs/plugin-react | ^4.3.4 | Vite build plugin for React (dev only) | Development-time only. Not included in the production Docker image. |

### Build Tool (dev dependency)

| Package | Version | Purpose | Risk Notes |
|---------|---------|---------|------------|
| vite | ^6.0.0 | Frontend build tool and dev server | Used only at build time. The production Docker image serves the pre-built static files via Express, not Vite. Vite is not installed in the production container. |

---

## Supply Chain Security

### Lock Files

Both `server/package-lock.json` and `client/package-lock.json` are committed to
version control. This ensures:

- Reproducible builds with exact dependency versions.
- Protection against dependency confusion attacks (package names and registry URLs
  are pinned).
- `npm ci` (used in Docker builds) installs exactly what is in the lock file and
  fails if the lock file is out of sync with package.json.

### No Postinstall Scripts

No production dependencies execute postinstall scripts. The `better-sqlite3` package
requires native compilation via `node-gyp`, but this is a standard build step, not
an arbitrary script.

### Docker Image

| Practice | Implementation |
|----------|---------------|
| Base image | `node:20-alpine` (minimal attack surface) |
| Multi-stage build | Build stage installs all dependencies; production stage copies only production artifacts |
| Non-root user | Application runs as `appuser` (uid 1001), not root |
| Production install | `npm ci --production` excludes devDependencies from the final image |
| .dockerignore | Excludes `.env`, `.git`, `node_modules`, and other non-essential files from the build context |

---

## Known Considerations

### bcryptjs vs. bcrypt

TrailLog uses `bcryptjs` (pure JavaScript) rather than `bcrypt` (native C++ addon).

| Factor | bcryptjs | bcrypt (native) |
|--------|----------|-----------------|
| Performance | Slower (~3x) | Faster |
| Build requirements | None (pure JS) | Requires native build tools |
| Cross-platform | Works everywhere | Platform-specific binaries |
| Security | Same algorithm, same output | Same algorithm, same output |

The performance difference is negligible for this application's scale. The primary
advantage of bcryptjs is eliminating native build complexity alongside better-sqlite3,
which already requires native compilation.

### express-rate-limit In-Memory Store

The default in-memory store for express-rate-limit means:

- Rate limit counters reset when the server restarts.
- In a multi-server deployment, each server would maintain independent counters.

For TrailLog's single-server architecture, this is acceptable. If the application
scales to multiple servers, consider switching to a Redis-backed store.

---

## Audit Process

### Routine Audit

1. Run `npm audit` in the `server/` directory.
2. Run `npm audit` in the `client/` directory.
3. Review any reported advisories.
4. For each advisory, assess whether the vulnerable code path is reachable in
   TrailLog's usage of the package.
5. If a patch is available and the vulnerability is applicable, update the
   dependency and re-run the audit.
6. Commit updated lock files.

### Commands

```bash
# Server audit
cd server && npm audit

# Client audit
cd client && npm audit

# Update a specific package (if patch available)
cd server && npm update <package-name>

# Full dependency update (review changes carefully)
cd server && npm update
cd client && npm update
```

### Dependabot (Automated)

GitHub Dependabot is configured via `.github/dependabot.yml` to automatically
open pull requests for outdated or vulnerable dependencies. Configuration:

| Setting | Value |
|---------|-------|
| Ecosystems | npm (`/server`) and npm (`/client`) |
| Schedule | Weekly |
| PR creation | Automatic when updates are available |

Dependabot PRs should be reviewed, tested locally, and merged promptly. Critical
security updates raised by Dependabot should follow the same 72-hour patching
SLA as manually discovered CVEs.

### Recommended Cadence

| Activity | Frequency |
|----------|-----------|
| `npm audit` check | Monthly |
| Dependabot PR review | Weekly (as PRs arrive) |
| Dependency version review | Monthly |
| Critical CVE patching | Within 72 hours of disclosure |
| Major version upgrades | Quarterly review, upgrade when stable |

### Responding to Critical CVEs

When a critical vulnerability is disclosed in a dependency:

1. Assess applicability -- does TrailLog use the affected functionality?
2. If applicable, check for a patched version.
3. If a patch exists, update, test, and deploy within 72 hours.
4. If no patch exists, evaluate workarounds or temporary mitigations.
5. Document the decision in this file.

---

## Vulnerability History

No vulnerabilities have been reported or patched to date. This section will be
updated as advisories are addressed.

| Date | Package | Advisory | Severity | Action Taken |
|------|---------|----------|----------|-------------|
| -- | -- | -- | -- | -- |
