# TrailLog Infrastructure

## Server Environment

| Property | Value |
|----------|-------|
| Provider | Hostinger VPS |
| IP Address | 31.97.134.173 |
| SSH Access | `ssh root@31.97.134.173` |
| SSH Key | `~/.ssh/id_ed25519` (ed25519) |
| Application Path | `/opt/crew614/` |
| Source Repository | `BillM9000/crew614-philmont` (master branch) |

## Docker Configuration

### Container Build

The application uses a multi-stage Docker build based on `node:20-alpine`:

- **Stage 1 (build)**: Installs all dependencies and builds the React client with Vite.
- **Stage 2 (production)**: Copies only production dependencies, the built client assets, and the standalone vote page (`vote-page/`). Runs as a non-root user (`appuser`, UID 1001) for security.

### Container Runtime

| Setting | Value |
|---------|-------|
| Port binding | `127.0.0.1:3614` (localhost only) |
| Docker network | `n8n_default` (external, shared with other VPS services) |
| Data volume | `crew614_data` (named volume, mounted at `/app/data`) |
| Log driver | `json-file` |
| Log max size | 10 MB |
| Log max files | 3 |

The port is bound to localhost only. External traffic reaches the container exclusively through the Traefik reverse proxy.

### Data Persistence

The SQLite database files reside in the `crew614_data` named Docker volume, which maps to `/app/data` inside the container. This volume persists across container rebuilds and restarts.

To reset the database entirely (destructive):

```
docker compose down -v && docker compose up -d
```

The `-v` flag removes the named volume, destroying all data.

## Reverse Proxy

Traefik serves as the reverse proxy and TLS termination point.

### Traffic Flow

```
Internet
  → DNS: traillog.gracezero.ai → 31.97.134.173
    → Traefik (ports 80/443)
      → HTTP 301 redirect to HTTPS (permanent)
      → TLS termination (Let's Encrypt certificate)
        → Proxy to container at 127.0.0.1:3614
```

### TLS

Traefik handles certificate provisioning and renewal automatically through the Let's Encrypt ACME protocol. Certificates renew before expiration without manual intervention. All HTTP traffic is permanently redirected to HTTPS.

## Environment Variables

The application reads 12 environment variables from `/opt/crew614/.env` on the VPS. This file has permissions set to `600` (owner read/write only).

| Variable | Purpose |
|----------|---------|
| `PORT` | Server listen port (3614) |
| `NODE_ENV` | Runtime mode (production) |
| `DATA_DIR` | Path to SQLite data directory (/app/data) |
| `SESSION_SECRET` | Secret key for signing session cookies |
| `GOOGLE_CLIENT_ID` | Google OAuth application ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth application secret |
| `GOOGLE_CALLBACK_URL` | OAuth redirect URI |
| `APP_URL` | Public-facing application URL |
| `ADMIN_EMAIL` | Email address of the global admin user |
| `SMTP_USER` | Gmail address for sending transactional email |
| `SMTP_PASS` | Gmail app password for SMTP authentication |
| `ANTHROPIC_API_KEY` | API key for Claude AI readiness engine (optional) |

## Health Check

The server exposes a health endpoint:

```
GET /api/health
```

Returns a JSON response with the application status, version, and uptime. This endpoint does not require authentication and can be used for external monitoring.

## Deployment Pipeline

Deployment is a manual process with five steps executed from the local development machine:

### Step 1: Build the Client

```bash
npm run build --prefix client
```

Produces optimized static assets in `client/dist/`.

### Step 2: Create the Tarball

```bash
tar czf /tmp/crew614-deploy.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=client/node_modules \
  -C .. crew614/
```

Packages the application source, server code, and built client assets while excluding development dependencies and version control history.

### Step 3: Transfer to VPS

```bash
scp /tmp/crew614-deploy.tar.gz root@31.97.134.173:/tmp/
```

### Step 4: Extract and Rebuild on VPS

```bash
ssh root@31.97.134.173
cd /opt && tar xzf /tmp/crew614-deploy.tar.gz
cd /opt/crew614
docker compose build --no-cache
docker compose up -d
```

The `--no-cache` flag ensures the Docker image is rebuilt from scratch, incorporating all code changes. The `-d` flag starts the container in detached mode.

### Step 5: Verify

Confirm the application is running by checking the health endpoint or loading the site in a browser.

## Backup System

### Automated Backups

A backup script at `/opt/crew614/backup.sh` runs daily at 3:00 AM via cron. The script:

1. Uses SQLite's `.backup` command to create a consistent snapshot of the database (safe even during active writes).
2. Copies the current `.env` file as a configuration snapshot.
3. Maintains a rolling window of 10 backups, automatically deleting the oldest when the limit is exceeded.

### Golden Backup

A manually-created reference backup exists at:

```
/opt/crew614/crew614-GOLDEN-pre-regression-20260310.db
```

This was captured before the schema v7 regression test suite and serves as a known-good restore point.

### Manual Backup

To trigger an immediate backup outside the cron schedule:

```bash
ssh root@31.97.134.173 /opt/crew614/backup.sh
```

## DNS

The domain `traillog.gracezero.ai` resolves to the VPS IP address (`31.97.134.173`). DNS is managed externally; no DNS services run on the VPS itself. The resolution chain is:

```
traillog.gracezero.ai → 31.97.134.173 → Traefik → container:3614
```

## Network Topology

```
┌─────────────────────────────────────────────────┐
│  VPS (31.97.134.173)                            │
│                                                 │
│  ┌──────────────┐                               │
│  │   Traefik    │ ← ports 80/443 (public)       │
│  │  (reverse    │                               │
│  │   proxy)     │                               │
│  └──────┬───────┘                               │
│         │ n8n_default network                    │
│         │                                       │
│  ┌──────┴───────┐     ┌──────────────────────┐  │
│  │  TrailLog    │     │  crew614_data volume  │  │
│  │  container   ├────►│  /app/data/           │  │
│  │  (port 3614) │     │  ├── crew614.db       │  │
│  └──────────────┘     │  └── sessions.db      │  │
│                       └──────────────────────┘  │
└─────────────────────────────────────────────────┘
```

The `n8n_default` Docker network is an external network shared with other services on the VPS. TrailLog joins this network to be reachable by Traefik, which also operates on the same network.
