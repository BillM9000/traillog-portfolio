# Operations Runbook

This runbook provides step-by-step instructions for common operational tasks on
the TrailLog production environment. Each procedure includes exact commands and
expected outputs. Written so that someone with basic terminal access can follow
it in an emergency.

---

## Environment Reference

| Property | Value |
|----------|-------|
| VPS IP | 31.97.134.173 |
| SSH access | `ssh root@31.97.134.173` |
| SSH key | `~/.ssh/id_ed25519` |
| App URL | https://traillog.gracezero.ai |
| App directory | `/opt/crew614/` |
| Docker container | `crew614` |
| Docker volume | `crew614_data` |
| Database path (inside container) | `/app/data/crew614.db` |
| Environment file | `/opt/crew614/.env` |
| Backup directory | `/opt/crew614/backups/` |
| GitHub repository | `BillM9000/crew614-philmont` (master branch) |

---

## 1. Deploy a New Version

Run these steps from the local development machine.

**Step 1 -- Build the client:**

```bash
npm run build --prefix client
```

Expected output: Vite build completes with a summary of bundled assets and no
errors. The `client/dist/` directory is populated.

**Step 2 -- Create the deployment tarball:**

```bash
tar czf /tmp/crew614-deploy.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=client/node_modules \
  -C .. crew614/
```

Expected output: No output on success. The file `/tmp/crew614-deploy.tar.gz` is
created.

**Step 3 -- Upload to VPS:**

```bash
scp /tmp/crew614-deploy.tar.gz root@31.97.134.173:/tmp/
```

Expected output: Progress bar showing file transfer. Transfer completes with
`100%`.

**Step 4 -- Extract and rebuild on VPS:**

```bash
ssh root@31.97.134.173
cd /opt && tar xzf /tmp/crew614-deploy.tar.gz
cd /opt/crew614
docker compose build --no-cache
docker compose up -d
```

Expected output: Docker build runs through all stages (typically 4-6 build
steps). `docker compose up -d` reports the container as `Started` or
`Recreated`.

**Step 5 -- Verify the deploy:**

```bash
curl https://traillog.gracezero.ai/api/health
```

Expected response:

```json
{"status":"ok","version":"1.0.0","started":"<recent ISO timestamp>","uptime":<small number>}
```

Also confirm the container is running:

```bash
docker ps | grep crew614
```

The `STATUS` column should show `Up` with a recent start time (e.g.,
`Up 30 seconds`).

---

## 2. Check Service Health

**From any machine with internet access:**

```bash
curl https://traillog.gracezero.ai/api/health
```

Expected response:

```json
{"status":"ok","version":"1.0.0","started":"2026-03-10T12:00:00.000Z","uptime":86400}
```

- `status` should be `"ok"`.
- `started` is the ISO timestamp of when the server process started.
- `uptime` is seconds since start.

**From the VPS, check the Docker container directly:**

```bash
docker ps | grep crew614
```

Look at the `STATUS` column. It should show `Up X hours` or `Up X days`. If it
shows `Restarting`, the container is in a crash loop (see section 3 for log
inspection).

---

## 3. View Application Logs

TrailLog uses Morgan (`short` format) to log every HTTP request to stdout. Each
log line includes the HTTP method, URL, status code, and response time in
milliseconds. These logs are captured by Docker and accessible via `docker logs`.

**Tail the last 100 lines and follow new output:**

```bash
docker logs crew614 --tail 100 -f
```

Press `Ctrl+C` to stop following.

**Search for errors only:**

```bash
docker logs crew614 2>&1 | grep -i error
```

**Search for a specific pattern (e.g., database issues):**

```bash
docker logs crew614 2>&1 | grep -i "sqlite\|ECONNREFUSED\|EACCES"
```

**Filter for specific HTTP status codes (e.g., 403 CSRF rejections or 429
rate-limit hits):**

```bash
docker logs crew614 2>&1 | grep " 403 \| 429 "
```

**Filter for slow requests (useful for performance monitoring):**

```bash
docker logs crew614 2>&1 | grep -E "[0-9]{4,} ms"
```

**Note:** Docker log rotation is configured with a max size of 10 MB and 3
rotated files. Older logs are automatically discarded.

---

## 4. Access the Database Shell

Open an interactive SQLite shell inside the running container:

```bash
docker exec -it crew614 sqlite3 /app/data/crew614.db
```

**Useful queries:**

Check user count:

```sql
SELECT count(*) FROM users;
```

Check current schema version:

```sql
SELECT schema_version FROM platform_settings;
```

List all troops:

```sql
SELECT id, name, council, location, is_public FROM troops;
```

List recent users:

```sql
SELECT id, name, email, created_at FROM users ORDER BY created_at DESC LIMIT 10;
```

Check database integrity:

```sql
.integrity_check
```

Exit the shell:

```sql
.quit
```

---

## 5. Manual Backup

Trigger the backup script remotely:

```bash
ssh root@31.97.134.173 /opt/crew614/backup.sh
```

Verify the backup was created:

```bash
ssh root@31.97.134.173 "ls -la /opt/crew614/backups/"
```

Confirm that a new file with the current date and a nonzero file size appears in
the listing.

---

## 6. Restore from Backup

**Step 1 -- Stop the container:**

```bash
cd /opt/crew614
docker compose stop
```

**Step 2 -- List available backups and choose one:**

```bash
ls -la /opt/crew614/backups/
```

**Step 3 -- Copy the backup into the container volume:**

```bash
docker start crew614
docker cp /opt/crew614/backups/<chosen-backup>.db crew614:/app/data/crew614.db
docker stop crew614
```

**Step 4 -- Restart the container:**

```bash
docker compose start
```

**Step 5 -- Verify:**

```bash
curl https://traillog.gracezero.ai/api/health
```

Also spot-check data:

```bash
docker exec -it crew614 sqlite3 /app/data/crew614.db "SELECT count(*) FROM users;"
```

---

## 7. Reset Database (DESTRUCTIVE)

**WARNING: This permanently deletes ALL application data, including users,
troops, adventures, gear selections, and all other records. This action cannot
be undone. Only use this for development resets or if instructed to start from
a clean state.**

```bash
cd /opt/crew614
docker compose down -v
docker compose up -d
```

The `-v` flag removes the Docker volume containing the database. On startup, the
application creates a fresh database and runs all schema migrations
automatically.

---

## 8. Update an Environment Variable

**Step 1 -- Edit the `.env` file on the VPS:**

```bash
ssh root@31.97.134.173
vi /opt/crew614/.env
```

Make the necessary changes and save the file.

**Step 2 -- Verify file permissions are restrictive:**

```bash
ls -la /opt/crew614/.env
```

Permissions should be `-rw-------` (600). If not:

```bash
chmod 600 /opt/crew614/.env
```

**Step 3 -- Restart the container to pick up the new values:**

```bash
cd /opt/crew614
docker compose up -d
```

**Step 4 -- Verify:**

```bash
curl https://traillog.gracezero.ai/api/health
```

---

## 9. Schema Migration

Schema migrations run **automatically on application startup**. No manual
intervention is required.

- The migration logic lives in `server/db.js` in the `migrate()` function.
- The current schema version is stored in `platform_settings.schema_version`.
- On boot, the application compares the stored version against the latest
  version in code and applies any pending migrations sequentially.

To check the current schema version:

```bash
docker exec -it crew614 sqlite3 /app/data/crew614.db \
  "SELECT schema_version FROM platform_settings;"
```

Expected output for the current release: `22`

If a migration fails, the application will log the error and may fail to start.
Check logs (section 3) for details.

---

## 10. Monitor Disk Usage

**Docker disk usage overview:**

```bash
docker system df
```

This shows space used by images, containers, volumes, and build cache.

**Backup directory size:**

```bash
du -sh /opt/crew614/backups/
```

**Overall VPS disk usage:**

```bash
df -h
```

If disk usage is high:

- Prune unused Docker images: `docker image prune -a`
- Prune build cache: `docker builder prune`
- Verify backup rotation is working (no more than 10 backup sets should exist).

---

## 11. Add or Change Global Admin

The global admin is determined by the `ADMIN_EMAIL` environment variable. Any
user who logs in with this email address receives global admin privileges.

**Step 1 -- Edit the `.env` file:**

```bash
ssh root@31.97.134.173
vi /opt/crew614/.env
```

Change the `ADMIN_EMAIL` value to the desired email address.

**Step 2 -- Restart the container:**

```bash
cd /opt/crew614
docker compose up -d
```

**Step 3 -- Verify** by logging in with the new admin email and confirming
access to the Global Admin panel.

**Note:** The `ADMIN_EMAIL` seeds the first system admin on startup. Multiple
admins are supported via `users.is_admin` column. Use `PUT /api/admin/users/:id/promote`
and `PUT /api/admin/users/:id/demote` to manage additional admins, or use the
Platform Settings tab in the Global Admin panel.

---

## 12. Emergency Service Stop

**Stop the container (preserves all data and the container definition):**

```bash
cd /opt/crew614
docker compose stop
```

The container can be restarted with `docker compose start`.

**Stop and remove the container (preserves the volume and data):**

```bash
cd /opt/crew614
docker compose down
```

The container must be recreated with `docker compose up -d`. Data in the Docker
volume is preserved.

**Do NOT use `docker compose down -v`** unless you intend to destroy all data
(see section 7).

---

## Quick Reference

| Task | Command |
|------|---------|
| Health check | `curl https://traillog.gracezero.ai/api/health` |
| Container status | `docker ps \| grep crew614` |
| Tail logs | `docker logs crew614 --tail 100 -f` |
| Error logs | `docker logs crew614 2>&1 \| grep -i error` |
| CSRF/rate-limit rejections | `docker logs crew614 2>&1 \| grep " 403 \| 429 "` |
| Restart | `cd /opt/crew614 && docker compose restart` |
| Stop | `cd /opt/crew614 && docker compose stop` |
| Start | `cd /opt/crew614 && docker compose start` |
| Full rebuild | `cd /opt/crew614 && docker compose build --no-cache && docker compose up -d` |
| Manual backup | `ssh root@31.97.134.173 /opt/crew614/backup.sh` |
| Check backups | `ls -la /opt/crew614/backups/` |
| DB shell | `docker exec -it crew614 sqlite3 /app/data/crew614.db` |
| Schema version | `docker exec -it crew614 sqlite3 /app/data/crew614.db "SELECT schema_version FROM platform_settings;"` |
| Disk usage | `docker system df` |
