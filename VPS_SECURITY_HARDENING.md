# VPS Security Hardening Checklist

Reusable checklist for any project deployed to a VPS. Items are ordered by priority (highest risk first). Apply to every VPS you manage — not just the one running the current project.

---

## Audit Date: 2026-03-13

**VPS:** Hostinger, 31.97.134.173
**Services:** TrailLog (crew614), n8n, Flask agents (NASA/X), PostgreSQL, Traefik

---

## 1. Firewall (UFW)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1.1 | UFW installed | ✅ | Installed but **inactive** |
| 1.2 | UFW enabled with default deny | ⬜ | `ufw default deny incoming && ufw default allow outgoing` |
| 1.3 | Allow SSH (22) | ⬜ | `ufw allow 22/tcp` — do this BEFORE enabling UFW or you lock yourself out |
| 1.4 | Allow HTTP (80) | ⬜ | `ufw allow 80/tcp` — Traefik HTTP→HTTPS redirect |
| 1.5 | Allow HTTPS (443) | ⬜ | `ufw allow 443/tcp` — Traefik TLS termination |
| 1.6 | Block all other inbound ports | ⬜ | UFW default deny handles this |
| 1.7 | Enable UFW | ⬜ | `ufw enable` |

### Docker + UFW Gotcha

Docker manipulates iptables directly and **bypasses UFW rules**. If a container publishes a port (e.g., `-p 5001:5001`), UFW cannot block it. Solutions:

1. **Best:** Bind containers to `127.0.0.1` only (e.g., `127.0.0.1:5001:5001` in docker-compose)
2. **Alternative:** Use `DOCKER_OPTS="--iptables=false"` (breaks Docker networking — not recommended)
3. **Alternative:** Use `ufw-docker` utility (third-party, adds Docker-aware rules)

**TrailLog is already safe** — `docker-compose.yml` binds to `127.0.0.1:3614:3614`. Other services need the same treatment.

### Services to Fix (Bind to 127.0.0.1)

| Service | Current Binding | Fix |
|---------|----------------|-----|
| crew614 | `127.0.0.1:3614` | ✅ Already correct |
| n8n | `127.0.0.1:5678` | ✅ Already correct |
| Flask agents (5001-5007) | `0.0.0.0:500x` | ⬜ Change `--host 0.0.0.0` to `--host 127.0.0.1`, or use docker-compose with `127.0.0.1:500x:500x` |
| PostgreSQL | `127.0.0.1:5432` + Docker bridge | ✅ Already correct |

---

## 2. SSH Hardening

| # | Item | Status | Notes |
|---|------|--------|-------|
| 2.1 | SSH key authentication enabled | ✅ | `PubkeyAuthentication yes` |
| 2.2 | Disable password authentication | ⬜ | Add `PasswordAuthentication no` to `/etc/ssh/sshd_config`, then `systemctl restart sshd` |
| 2.3 | Disable root login (optional) | ⬜ | `PermitRootLogin prohibit-password` (allows key, blocks password). Full disable: `PermitRootLogin no` (requires non-root user first) |
| 2.4 | Change default SSH port (optional) | ⬜ | Security through obscurity — reduces log noise but not a real fix |
| 2.5 | fail2ban active | ✅ | Running, protects against brute-force |

### SSH Hardening Procedure (Safe Order)

```bash
# 1. Verify your SSH key works BEFORE changing anything
ssh -i ~/.ssh/your_key root@your-vps  # Confirm this works

# 2. Edit sshd_config
nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
# Set: PermitRootLogin prohibit-password

# 3. Restart SSH (your CURRENT session stays open if it breaks)
systemctl restart sshd

# 4. Test from a NEW terminal (don't close current session)
ssh root@your-vps  # Should work with key, fail with password

# 5. If locked out: use Hostinger console (browser-based) to revert
```

---

## 3. System Updates

| # | Item | Status | Notes |
|---|------|--------|-------|
| 3.1 | OS packages up to date | ⬜ | `apt update && apt upgrade -y` |
| 3.2 | Automatic security updates enabled | ⬜ | `apt install unattended-upgrades && dpkg-reconfigure -plow unattended-upgrades` |
| 3.3 | Docker up to date | ⬜ | `docker --version` — check against latest stable |
| 3.4 | Node.js up to date (in containers) | ⬜ | Check Dockerfile base image version |

---

## 4. Monitoring

| # | Item | Status | Notes |
|---|------|--------|-------|
| 4.1 | Uptime monitoring (external) | ⬜ | UptimeRobot (free), Hetrix (free), or Better Uptime — ping health endpoint every 5 min |
| 4.2 | Disk usage alerts | ⬜ | `df -h /` — set alert at 80%. Docker images and logs fill up fast |
| 4.3 | Docker log rotation | ✅ | crew614 has `max-size: 10m, max-file: 3`. Check other containers |
| 4.4 | Resource monitoring | ⬜ | `htop`, or install Netdata/Prometheus for dashboards |
| 4.5 | Failed login monitoring | ✅ | fail2ban handles this |

### Quick Uptime Monitor Setup (UptimeRobot — Free)

1. Sign up at uptimerobot.com
2. Add monitor: HTTPS, URL: `https://traillog.gracezero.ai/api/health`
3. Check interval: 5 minutes
4. Alert contacts: your email + SMS if available
5. Repeat for any other services with health endpoints

---

## 5. Backups

| # | Item | Status | Notes |
|---|------|--------|-------|
| 5.1 | Automated backups running | ✅ | `/opt/crew614/backup.sh` — rolling 10, daily 3am cron |
| 5.2 | Backup restore tested | ⬜ | Must test: restore a backup to a temp DB, verify data integrity |
| 5.3 | Off-site backup copy | ⬜ | Currently all backups are on the same VPS. If VPS dies, backups die too |
| 5.4 | Golden backups for schema changes | ✅ | Taken before each schema migration |

### Backup Restore Test Procedure

```bash
# On VPS
cd /opt/crew614

# 1. Find latest backup
ls -la backups/*.sql

# 2. Create a test database and restore into it
sudo -u postgres createdb traillog_test
sudo -u postgres psql -d traillog_test < backups/latest-backup.sql

# 3. Verify integrity
sudo -u postgres psql -d traillog_test -c "
SELECT count(*) AS users FROM users;
SELECT value AS schema FROM platform_settings WHERE key = 'schema_version';
"

# 4. Clean up
sudo -u postgres dropdb traillog_test
```

---

## 6. TLS / HTTPS

| # | Item | Status | Notes |
|---|------|--------|-------|
| 6.1 | TLS certificate valid | ✅ | Let's Encrypt via Traefik, auto-renewing |
| 6.2 | HTTP → HTTPS redirect | ✅ | Traefik middleware configured |
| 6.3 | HSTS header | ✅ | Helmet.js sets Strict-Transport-Security |
| 6.4 | SSL Labs grade A | ⬜ | Test at ssllabs.com/ssltest — should be A with Traefik defaults |

---

## 7. Application-Level (Per Project)

These are project-specific. TrailLog status shown as example.

| # | Item | TrailLog | Generic Notes |
|---|------|----------|---------------|
| 7.1 | Rate limiting | ✅ | Auth: 20/15min, API: 100/min |
| 7.2 | Input validation | ✅ | parseId(), parameterized SQL |
| 7.3 | Security headers | ✅ | Helmet.js (CSP, X-Frame, etc.) |
| 7.4 | Non-root container | ✅ | appuser uid 1001 |
| 7.5 | Secrets in .env (not code) | ✅ | .env gitignored |
| 7.6 | Error messages sanitized | ✅ | safeError() hides internals in prod |
| 7.7 | Dependencies audited | ✅ | 0 npm vulnerabilities |
| 7.8 | Session security | ✅ | httpOnly, secure, sameSite, 7-day idle |

---

## Priority Order for New VPS Setup

When setting up any new VPS from scratch, do these in order:

1. **SSH keys** — copy your public key before doing anything else
2. **Disable password auth** — `PasswordAuthentication no`
3. **Enable UFW** — allow 22, 80, 443 only
4. **Install fail2ban** — `apt install fail2ban`
5. **Enable auto-updates** — `unattended-upgrades`
6. **Install Docker** — bind all containers to `127.0.0.1`
7. **Set up Traefik** — TLS termination, HTTP redirect
8. **Set up backups** — automated + off-site copy
9. **Set up monitoring** — uptime + disk alerts
10. **Deploy application** — with all app-level security in place

---

*Last updated: 2026-03-13*
*This is a living document. Update as you harden each VPS and learn new best practices.*
