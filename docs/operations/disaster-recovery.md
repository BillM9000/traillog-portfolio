# Disaster Recovery Plan

This document defines recovery procedures for five failure scenarios affecting
the TrailLog production environment. Each scenario includes step-by-step
instructions, expected recovery times, and verification steps.

---

## Recovery Objectives

| Metric | Target | Notes |
|--------|--------|-------|
| **RTO** (Recovery Time Objective) | ~5 minutes for container restart; ~1 hour for full VPS rebuild | Assumes backups and Git repo are accessible |
| **RPO** (Recovery Point Objective) | ~24 hours | Daily backup window; WAL mode protects committed transactions within the current backup cycle |

SQLite WAL mode ensures that all committed transactions survive application
crashes. The RPO of 24 hours applies only when restoring from a backup file
after storage-level loss.

---

## Scenario 1 -- Application Crash

**Symptoms:** Health endpoint returns an error or times out. Users see
connection refused or 502 errors through Traefik.

**Recovery:**

The Docker restart policy (`unless-stopped`) will automatically restart the
container after most crashes. If the container is restarting in a loop or fails
to recover:

1. Check container status:
   ```bash
   docker ps -a | grep crew614
   ```

2. Review recent logs for the root cause:
   ```bash
   docker logs crew614 --tail 100
   ```

3. If the container is stuck, perform a manual restart:
   ```bash
   cd /opt/crew614
   docker compose down
   docker compose up -d
   ```

4. Verify recovery:
   ```bash
   curl https://traillog.gracezero.ai/api/health
   ```

**Expected result:** `{"status":"ok","version":"1.0.0",...}` with a fresh
`started` timestamp and low `uptime` value.

---

## Scenario 2 -- Database Corruption

**Symptoms:** Application errors referencing SQLite (e.g., "database disk image
is malformed"), failed queries, or unexpected empty results.

**Recovery:**

1. Stop the container to prevent further writes:
   ```bash
   cd /opt/crew614
   docker compose stop
   ```

2. Run an integrity check on the database:
   ```bash
   docker start crew614
   docker exec -it crew614 sqlite3 /app/data/crew614.db ".integrity_check"
   docker stop crew614
   ```
   If the result is `ok`, the database is intact and the issue is elsewhere.
   If errors are reported, proceed with restoration.

3. Identify the most recent good backup:
   ```bash
   ls -la /opt/crew614/backups/
   ```

4. Copy the backup database into the container volume:
   ```bash
   docker cp /opt/crew614/backups/<most-recent-backup>.db crew614:/app/data/crew614.db
   ```

5. Start the container:
   ```bash
   docker compose start
   ```

6. Verify the application and data:
   ```bash
   curl https://traillog.gracezero.ai/api/health
   ```

7. Spot-check data by querying the database:
   ```bash
   docker exec -it crew614 sqlite3 /app/data/crew614.db "SELECT count(*) FROM users;"
   ```

**If no automated backup is usable**, restore from a golden backup:

```bash
docker cp /opt/crew614/crew614-GOLDEN-pre-crew-layer-20260314.db crew614:/app/data/crew614.db
docker compose start
```

**Available golden backups (newest first):**

| File | Date | Contents |
|------|------|----------|
| `crew614-GOLDEN-pre-crew-layer-20260314.db` | 2026-03-14 | Schema v17, councils, 1 user, clean state. **Also stored locally** at `C:\Users\billm\...\crew614\backups\` |
| `crew614-GOLDEN-pre-phase1-20260314.db` | 2026-03-14 | Schema v16, pre-councils |
| `crew614-GOLDEN-pre-platform-settings-20260314.db` | 2026-03-14 | Pre-platform settings |
| `crew614-GOLDEN-pre-agegate-20260313.db` | 2026-03-13 | Pre-age gate |
| `crew614-GOLDEN-pre-timeslots-20260312.db` | 2026-03-12 | Pre-time slots |
| `crew614-GOLDEN-pre-regression-20260310.db` | 2026-03-10 | Original baseline |

Note: The app runs migrations on startup, so restoring an older backup
(e.g. schema v16) with current code (schema v17) will auto-migrate. Data
created after the golden snapshot date will be lost.

**Restore verified:** 2026-03-14. Tested `docker compose stop` → `docker cp`
golden backup → `docker compose start`. App booted clean, schema migrated,
data intact.

---

## Scenario 3 -- VPS Failure (Total Loss)

**Symptoms:** VPS is unreachable. SSH connections fail. All services hosted on
the VPS are down.

**Prerequisites:** Access to GitHub repository, a backup of the `.env` file
(from off-site storage or the backup set), and a database backup. Local golden
backup copies are stored at `C:\Users\billm\220claudsession\philmont_app\crew614\backups\`
— these survive a total VPS loss.

**Recovery:**

1. **Provision a new VPS** (Hostinger or equivalent provider).
   - Ubuntu 22.04 or later recommended.
   - Minimum 1 GB RAM, 20 GB disk.

2. **Install Docker and Docker Compose:**
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

3. **Set up the external Docker network** (required for Traefik):
   ```bash
   docker network create n8n_default
   ```

4. **Set up Traefik reverse proxy** with Let's Encrypt TLS, configured to route
   `traillog.gracezero.ai` to port 3614.

5. **Clone the repository:**
   ```bash
   cd /opt
   git clone https://github.com/BillM9000/crew614-philmont.git crew614
   cd /opt/crew614
   ```

6. **Restore the `.env` file.** Recreate it with the required variables if no
   backup copy is available:
   ```
   SESSION_SECRET=<generate a new random string>
   GOOGLE_CLIENT_ID=<from Google Cloud Console>
   GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
   SMTP_USER=billm9000@gmail.com
   SMTP_PASS=<Gmail app password>
   ADMIN_EMAIL=billm9000@gmail.com
   ```
   Set permissions:
   ```bash
   chmod 600 /opt/crew614/.env
   ```

7. **Build and start the application:**
   ```bash
   docker compose build --no-cache
   docker compose up -d
   ```

8. **Restore the database** from the most recent available backup:
   ```bash
   docker cp <path-to-backup>.db crew614:/app/data/crew614.db
   docker compose restart
   ```

9. **Update DNS:** Point `traillog.gracezero.ai` to the new VPS IP address.
   Allow time for DNS propagation (typically 5-30 minutes, up to 48 hours
   depending on TTL settings).

10. **Verify recovery:**
    ```bash
    curl https://traillog.gracezero.ai/api/health
    ```
    Also verify Google OAuth login flow, as the callback URL must resolve to
    the correct domain.

**Estimated time:** ~1 hour assuming all credentials and backups are accessible.

---

## Scenario 4 -- DNS or Domain Failure

**Symptoms:** `traillog.gracezero.ai` does not resolve. The VPS itself is
running and reachable by IP address.

**Immediate mitigation:**

For emergency administrative access, the application can be reached directly
by IP (bypassing Traefik TLS):

```
http://31.97.134.173:3614
```

**Important limitation:** Google OAuth requires the callback URL to match the
registered domain. OAuth-based login will not work when accessing via IP
address. Only email/password authentication (if configured) will be available
on the direct IP endpoint.

**Resolution:**

1. Verify VPS is running:
   ```bash
   ssh root@31.97.134.173 "docker ps | grep crew614"
   ```

2. Check DNS resolution from an external machine:
   ```bash
   nslookup traillog.gracezero.ai
   dig traillog.gracezero.ai
   ```

3. Contact the domain registrar (GraceZero.ai) to resolve DNS configuration
   issues.

4. Verify Traefik is running and the TLS certificate is valid:
   ```bash
   ssh root@31.97.134.173 "docker ps | grep traefik"
   ```

5. Once DNS is restored, verify full functionality:
   ```bash
   curl https://traillog.gracezero.ai/api/health
   ```

---

## Scenario 5 -- Compromised Credentials

**Symptoms:** Unauthorized access detected in logs. Unexpected admin actions.
Credential leak suspected or confirmed.

**Immediate containment:**

1. **Rotate the session secret** to invalidate all active user sessions:
   ```bash
   # Generate a new secret
   openssl rand -hex 32

   # Edit .env and replace SESSION_SECRET value
   vi /opt/crew614/.env
   ```

2. **Rotate Google OAuth credentials:**
   - Go to Google Cloud Console and regenerate the client secret.
   - Update `GOOGLE_CLIENT_SECRET` in `/opt/crew614/.env`.

3. **Rotate SMTP credentials:**
   - Generate a new Gmail app password.
   - Update `SMTP_PASS` in `/opt/crew614/.env`.

4. **Change the global admin email** if the admin account itself was
   compromised:
   ```bash
   # Edit ADMIN_EMAIL in .env
   vi /opt/crew614/.env
   ```

5. **Restart the application** to pick up all credential changes:
   ```bash
   cd /opt/crew614
   docker compose up -d
   ```

6. **Monitor logs** for continued unusual activity:
   ```bash
   docker logs crew614 --tail 200 -f
   ```

7. **Review the database** for unauthorized changes:
   ```bash
   docker exec -it crew614 sqlite3 /app/data/crew614.db \
     "SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT 20;"
   ```

**Post-incident:** Conduct a root cause analysis to determine how credentials
were exposed. Update security practices and rotate any other shared secrets
as needed.
