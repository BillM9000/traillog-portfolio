# System Architecture

High-level overview of the TrailLog stack, showing the browser → reverse proxy → application → database path, plus external service integrations (Claude API, Gmail SMTP).

```mermaid
graph TB
    Browser["React 18 SPA<br/>(29 components, 4 contexts)"]
    Traefik["Traefik Reverse Proxy<br/>(TLS termination, Let's Encrypt)"]
    Express["Express.js API<br/>(120+ routes, 12 middleware layers)"]
    SQLite[("SQLite WAL<br/>(schema v22, 22 migrations)")]
    Anthropic["Anthropic Claude API"]
    Gmail["Gmail SMTP<br/>(12 email templates)"]

    Browser -->|"HTTPS (port 443)"| Traefik
    Traefik -->|"HTTP (port 3614, localhost only)"| Express
    Express -->|"Prepared statements"| SQLite
    Express -->|"Sonnet: readiness plans<br/>Haiku: gear recs"| Anthropic
    Anthropic -->|"Structured JSON"| Express
    Express -->|"Transactional email"| Gmail

    subgraph "Docker Container (non-root, uid 1001)"
        Express
        SQLite
    end

    subgraph "External Services"
        Traefik
        Anthropic
        Gmail
    end
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **SQLite over Postgres** | Single-server deployment; WAL mode provides concurrent reads; no network overhead |
| **Traefik over Nginx** | Auto-certificate management via Let's Encrypt ACME; Docker label-based config |
| **localhost-only port binding** | Container port 3614 bound to 127.0.0.1; all external traffic through Traefik |
| **Non-root container** | `appuser` (uid 1001) limits blast radius of container compromise |
| **Two Claude models** | Sonnet for complex reasoning, Haiku for classification — cost optimization |
