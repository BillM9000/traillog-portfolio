# Backup Strategy

This document describes the backup mechanisms, retention policy, and restoration
procedures for the TrailLog production environment.

---

## Overview

TrailLog uses PostgreSQL as its primary data store, running on the VPS host.
All backups are performed using `pg_dump`, which produces a consistent snapshot
even while the application is running.

| Property            | Value                                          |
|---------------------|------------------------------------------------|
| Backup tool         | `pg_dump`                                      |
| Schedule            | Daily at 3:00 AM server local time             |
| Retention           | Rolling 10 backups (oldest auto-deleted)       |
| Storage path        | `/opt/crew614/backups/` on VPS filesystem      |
| Script path         | `/opt/crew614/backup.sh`                       |
| Cron configuration  | Root crontab (`crontab -l` to verify)          |

---

## Automated Daily Backup

The script `/opt/crew614/backup.sh` runs every day at 3:00 AM via cron. It
performs the following steps:

1. Runs `pg_dump -U traillog -d traillog > <destination>` to produce a consistent
   snapshot of the PostgreSQL database.
2. Copies the current `/opt/crew614/.env` file alongside the database backup so
   that environment secrets are preserved with each snapshot.
3. Applies rolling retention: keeps the 10 most recent backups and deletes any
   older files automatically.

Because `pg_dump` uses PostgreSQL's MVCC snapshot isolation, no application
downtime is required. Reads and writes continue normally during the backup window.

---

## Manual Backup

To trigger a backup outside the daily schedule:

```bash
ssh root@31.97.134.173 /opt/crew614/backup.sh
```

---

## Golden Backup

Historical golden backups from the SQLite era (pre-2026-03-18) exist as `.db` files on the VPS.
Current golden backups are PostgreSQL dumps created with `pg_dump`. These serve
as known-good restore points independent of the rolling backup window.

---

## Code Backup

Application source code is maintained in a Git repository:

- **Repository:** `BillM9000/crew614-philmont` on GitHub
- **Primary branch:** `master`

All code changes should be committed and pushed before every production deploy.
The Git history provides a complete audit trail of every code change.

---

## Verification

To confirm backups are running and current:

```bash
ssh root@31.97.134.173 "ls -la /opt/crew614/backups/"
```

Check that:

- At least one backup file exists with a timestamp from the current day or
  the previous day.
- No more than 10 backup sets are present (the rolling policy should handle
  cleanup automatically).
- File sizes are nonzero and consistent with expected database size.

---

## Restoration Procedure

To restore from a backup:

1. Stop the container:
   ```bash
   docker compose stop
   ```

2. Restore the PostgreSQL dump:
   ```bash
   psql -U traillog -d traillog < /opt/crew614/backups/<backup-file>.sql
   ```

3. If restoring `.env` as well, copy it into place:
   ```bash
   cp /opt/crew614/backups/<backup-env-file> /opt/crew614/.env
   chmod 600 /opt/crew614/.env
   ```

4. Restart the container:
   ```bash
   docker compose start
   ```

5. Verify the application is healthy:
   ```bash
   curl https://traillog.gracezero.ai/api/health
   ```

---

## Known Limitations

- **No off-site replication.** All backups reside on the same VPS as the
  production database. A total disk failure or VPS loss would destroy both the
  live database and all automated backups simultaneously.
- **24-hour RPO.** The daily backup schedule means up to 24 hours of data could
  be lost between the last backup and a failure event. PostgreSQL's WAL
  (Write-Ahead Logging) protects against crash-induced corruption but does not
  help if the underlying storage is lost.
- **Golden backup is manual.** The golden backup is not automatically refreshed.
  It should be updated before major releases or schema migrations.

### Recommended Improvements

- Sync daily backups to an external storage provider (S3, Backblaze B2, or
  similar) using a post-backup hook in the backup script.
- Increase backup frequency for high-activity periods (e.g., the weeks
  immediately before a trek departure).
- Periodically test restoration by spinning up a temporary container with a
  backup database to confirm data integrity.
