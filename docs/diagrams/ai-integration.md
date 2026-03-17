# AI Integration — Readiness Engine

The AI readiness engine generates personalized training plans using Claude's API with a deterministic fallback. This maps to **Exam Domain 1** (Agentic Architecture) and **Domain 5** (Context Management & Reliability).

## Readiness Plan Generation Flow

```mermaid
flowchart TD
    A["Member submits self-assessment<br/>(fitness, pack exp, elevation access, activity level)"] --> B{API key available?}
    B -->|Yes| C["Build context prompt<br/>(assessment + itinerary + gear status + weeks remaining)"]
    C --> D["Call Claude claude-sonnet-4-6<br/>(max_tokens: 2000)"]
    D --> E{API success?}
    E -->|Yes| F["Strip markdown fences<br/>(```json → raw text)"]
    F --> G["JSON.parse response"]
    G --> H["Cache plan in SQLite<br/>(UNIQUE crew_id, user_id)"]
    E -->|No| I["generateFallbackPlan()"]
    B -->|No| I
    I --> J["Deterministic 4-phase plan<br/>(same response shape)"]
    J --> H
    H --> K["Award 'ai_ready' badge<br/>(INSERT OR IGNORE — idempotent)"]
    K --> L["Return { plan, priorities, tokens_used }"]

    style I fill:#f0e6ff,stroke:#7c3aed
    style D fill:#dbeafe,stroke:#2563eb
    style H fill:#dcfce7,stroke:#16a34a
```

## Gear Recommendation Batch Flow

```mermaid
flowchart TD
    START["startGearRefreshSchedule()"] --> DELAY["setTimeout(30s)"]
    DELAY --> LOOP["For each catalog item (76 items)"]
    LOOP --> CACHE{"Cached rec valid?<br/>(< 7 days old)"}
    CACHE -->|Yes| SKIP["Skip (increment skipped counter)"]
    CACHE -->|No| GEN["Call Claude claude-haiku-4-5<br/>(max_tokens: 1500)"]
    GEN --> PARSE{Parse success?}
    PARSE -->|Yes| STORE["Upsert into ai_gear_recommendations<br/>(set 7-day expiry)"]
    PARSE -->|No| FAIL["Log error, increment failed counter"]
    SKIP --> NEXT
    STORE --> RATE["sleep(1000ms) — rate limiting"]
    FAIL --> RATE
    RATE --> NEXT{More items?}
    NEXT -->|Yes| LOOP
    NEXT -->|No| DONE["Log summary: { refreshed, skipped, failed, total }"]
    DONE --> WAIT["setInterval(24h)"]
    WAIT --> LOOP

    style GEN fill:#dbeafe,stroke:#2563eb
    style STORE fill:#dcfce7,stroke:#16a34a
    style FAIL fill:#fee2e2,stroke:#dc2626
```

## Key Patterns

| Pattern | Implementation | Exam Domain |
|---------|---------------|-------------|
| **Graceful degradation** | Fallback returns same response shape as API | Domain 1, 5 |
| **Model selection** | Sonnet for complex reasoning, Haiku for classification | Domain 1 |
| **Structured output** | JSON schema in prompt, markdown fence stripping | Domain 4 |
| **Cache management** | 7-day TTL, skip valid cached entries | Domain 5 |
| **Rate limiting** | 1s sleep between batch API calls | Domain 1 |
| **Idempotency** | INSERT OR IGNORE for badge awards | Domain 5 |
| **Cost tracking** | tokens_used returned with every response | Domain 5 |
