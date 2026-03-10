# Incident Response Plan

This document defines severity classifications, detection methods, containment
procedures, and post-incident processes for TrailLog production incidents.

---

## Primary Contact

| Role | Contact |
|------|---------|
| Global Admin / Operator | billm9000@gmail.com |

---

## Severity Levels

### P1 -- Critical

**Definition:** Data breach, authentication bypass, data loss, or any security
event exposing user data.

**Response time:** Immediate.

**Examples:**
- Unauthorized access to user accounts or admin panel
- Database contents exposed to unauthenticated requests
- Session hijacking or token leakage
- Unrecoverable data loss or deletion

### P2 -- High

**Definition:** Service outage or database unavailability affecting all users.

**Response time:** Within 1 hour.

**Examples:**
- Application unreachable (health check fails)
- Database locked or unresponsive
- Docker container in restart loop
- Traefik or TLS certificate failure

### P3 -- Medium

**Definition:** Degraded functionality affecting some users or features.

**Response time:** Within 24 hours.

**Examples:**
- Slow query performance
- Email delivery failures (invitations, notifications)
- Gear catalog loading errors
- Individual feature regressions

### P4 -- Low

**Definition:** Cosmetic issues, minor UI bugs, or non-urgent improvements.

**Response time:** Next scheduled release.

**Examples:**
- Layout inconsistencies on specific screen sizes
- Typos in UI text
- Non-critical console warnings

---

## Detection Methods

### Automated

- **Health endpoint polling:** `GET /api/health` returns status, version,
  start time, and uptime. A non-200 response or missing fields indicates a
  problem.
- **Docker restart events:** Monitor with `docker events --filter container=crew614`
  for unexpected restart cycles.
- **Log monitoring:** Review `docker logs crew614` for error-level entries.
  The application uses structured error logging; search for `error`,
  `SQLITE_BUSY`, or `ECONNREFUSED` patterns.

### Manual

- **User reports:** Incoming reports via email to the admin address.
- **Periodic health checks:** Manual `curl` against the health endpoint during
  maintenance windows.
- **Backup verification:** Confirming backup freshness with
  `ls -la /opt/crew614/backups/`.

---

## Containment Procedures

### P1 -- Data Breach

1. **Stop the application immediately** to prevent further exposure:
   ```bash
   cd /opt/crew614
   docker compose stop
   ```

2. **Preserve evidence.** Export logs before they rotate:
   ```bash
   docker logs crew614 > /opt/crew614/incident-$(date +%Y%m%d-%H%M%S).log 2>&1
   ```

3. **Assess scope.** Determine which data was accessed, the time window of
   exposure, and the number of affected users.

4. **Rotate all credentials** (see Disaster Recovery, Scenario 5):
   - SESSION_SECRET
   - GOOGLE_CLIENT_SECRET
   - SMTP_PASS

5. **Notify affected users** via email using the existing email infrastructure
   once the application is restored.

6. **Do not restart the application** until the attack vector is identified and
   patched.

### P1 -- Authentication Bypass

1. **Rotate SESSION_SECRET** immediately to invalidate all active sessions:
   ```bash
   # Generate new secret
   openssl rand -hex 32
   # Update /opt/crew614/.env with new value
   ```

2. **Restart the application:**
   ```bash
   cd /opt/crew614
   docker compose up -d
   ```

3. **Review auth logs** for scope of unauthorized access:
   ```bash
   docker logs crew614 2>&1 | grep -i "auth\|login\|session"
   ```

4. **Patch the vulnerability** before full service restoration if the bypass
   mechanism is identified.

### P2 -- Service Outage

1. **Restart the container:**
   ```bash
   cd /opt/crew614
   docker compose restart
   ```

2. **Check logs for root cause:**
   ```bash
   docker logs crew614 --tail 100
   ```

3. **Verify recovery:**
   ```bash
   curl https://traillog.gracezero.ai/api/health
   ```

4. If the container enters a restart loop, check for resource exhaustion:
   ```bash
   docker stats crew614 --no-stream
   df -h
   ```

### P2 -- Database Lock

SQLite WAL mode can occasionally encounter lock contention. Symptoms include
`SQLITE_BUSY` errors in application logs.

1. **Restart the container** to release all database connections:
   ```bash
   cd /opt/crew614
   docker compose restart
   ```

2. **Check for zombie WAL files** (abnormally large `-wal` or `-shm` files):
   ```bash
   docker exec -it crew614 ls -la /app/data/
   ```

3. **Run integrity check:**
   ```bash
   docker exec -it crew614 sqlite3 /app/data/crew614.db ".integrity_check"
   ```

4. If integrity check fails, proceed with database restoration (see Disaster
   Recovery, Scenario 2).

### P3 and P4

1. **Log the issue** with reproduction steps, timestamps, and affected users.
2. **Schedule a fix** in the next appropriate release cycle.
3. **Deploy via the standard pipeline** (see Runbook, section 1).

---

## Communication

- **Affected users** should be notified via email using the existing SMTP
  infrastructure and email templates (e.g., date change notifications can be
  repurposed for incident communication).
- **Status updates** should be sent to stakeholders at regular intervals during
  P1 and P2 incidents (at minimum: initial notification, progress update,
  resolution confirmation).
- **Future improvement:** Consider deploying a simple status page for public
  visibility into service health.

---

## Post-Incident Process

After every P1 or P2 incident:

1. **Root cause analysis (RCA).** Document the timeline, root cause, impact
   scope, and resolution steps. Store the RCA document in the repository under
   `docs/incidents/`.

2. **Threat model update.** If the incident revealed a new attack vector or
   failure mode, update the security documentation and threat model accordingly.

3. **Corrective action.** Deploy fixes through the standard deployment pipeline.
   Verify with health checks and manual testing.

4. **Documentation update.** Update this incident response plan, the disaster
   recovery plan, or the runbook if the incident exposed gaps in existing
   procedures.

5. **Backup verification.** Confirm that the most recent backup is intact and
   restorable after any incident involving the database.

---

## Rate Limiting and Security Controls

TrailLog includes the following built-in protections that help prevent and
mitigate incidents:

| Control | Configuration |
|---------|--------------|
| Auth rate limiting | 20 requests per 15 minutes (`authLimiter`) |
| API rate limiting | 100 requests per minute (`apiLimiter`) |
| Security headers | Helmet.js (default configuration) |
| Error sanitization | `safeError` helper strips internal details in production |
| Session encryption | `SESSION_SECRET` environment variable |
| TLS termination | Traefik with Let's Encrypt auto-renewal |
