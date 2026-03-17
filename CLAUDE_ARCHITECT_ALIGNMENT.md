# Claude Certified Architect Foundations — Exam Domain Alignment

This document maps TrailLog's architecture and implementation patterns to the five domains of the [Claude Certified Architect Foundations](https://www.anthropic.com/certification) exam. Each section references specific files and patterns in this repository.

---

## Domain 1: Agentic Architecture & Orchestration (27%)

> *Design and implement agentic systems using Claude, including multi-step task decomposition, tool orchestration, and session management.*

### 1.1 Multi-Step Task Decomposition

**File:** `server/ai-readiness.js`

The readiness coaching engine decomposes a complex assessment into a structured pipeline:

1. **Collect context** — Member fitness assessment, itinerary difficulty, gear status, weeks remaining
2. **Build prompt** — Inject contextual variables into a structured prompt template
3. **Call Claude API** — Async request to `claude-sonnet-4-6` with 2000 max tokens
4. **Parse response** — Strip markdown fences, parse JSON, extract `plan` and `priorities`
5. **Cache result** — Persist plan in SQLite for future retrieval
6. **Award badge** — Trigger achievement system on first plan generation

```javascript
// Simplified flow from ai-readiness.js
const response = await api.messages.create({ model: "claude-sonnet-4-6", ... });
let text = response.content[0].text.trim();
if (text.startsWith("```")) {
  text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
}
const parsed = JSON.parse(text);
```

### 1.2 Background Batch Processing

**File:** `server/gear-ai.js`

The gear recommendation engine runs as a background agent:

- **Batch loop** — Iterates through 76 catalog items, checking cache validity before generating
- **Rate limiting** — 1-second sleep between API calls to stay under rate limits
- **Mutex lock** — `refreshInProgress` flag prevents concurrent refresh runs
- **Scheduling** — Initial run after 30s delay, then every 24 hours via `setInterval`
- **Cost optimization** — Uses `claude-haiku-4-5` for the simpler classification task

### 1.3 Model Selection Strategy

| Task | Model | Reasoning |
|------|-------|-----------|
| Readiness plans | `claude-sonnet-4-6` | Complex reasoning: fitness assessment → personalized 4-phase plan |
| Gear recommendations | `claude-haiku-4-5` | Simpler classification: item → top 3 products |

### 1.4 Graceful Degradation

**File:** `server/ai-readiness.js` — `generateFallbackPlan()`

When the API is unavailable (no key, network error, rate limit), the system falls back to a deterministic plan generator that:
- Uses the same input data (assessment, itinerary, gear status)
- Returns the **same response shape** (`{ plan, priorities, tokens_used: 0 }`)
- Applies heuristic rules (adaptive phase sizing, boot break-in timeline, fitness gap analysis)
- Consuming code doesn't know or care if the plan came from Claude or the fallback

This is a key reliability pattern: **the AI enhances but never gates functionality**.

---

## Domain 2: Tool Design & MCP Integration (18%)

> *Design effective tool schemas, implement MCP servers, and optimize tool distribution across agents.*

### 2.1 Anthropic SDK Integration

**Files:** `server/ai-readiness.js`, `server/gear-ai.js`

Both AI modules use a singleton pattern for the Anthropic client:

```javascript
let client = null;
function getClient() {
  if (!client && process.env.ANTHROPIC_API_KEY) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}
```

Key properties:
- **Lazy initialization** — Client created on first use, not at import time
- **Environment check** — Gracefully returns `null` if no API key (no crash)
- **Singleton** — One client instance reused across all requests

### 2.2 Structured Response Parsing

Both AI modules enforce structured JSON output and handle Claude's tendency to wrap JSON in markdown fences:

```javascript
// Robust JSON extraction pattern used in both AI modules
let text = response.content[0].text.trim();
if (text.startsWith("```")) {
  text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
}
const parsed = JSON.parse(text);
```

### 2.3 API Key Management

- **Docker injection** — `docker-compose.yml`: `ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}`
- **Runtime check** — Both modules verify key existence before attempting API calls
- **No-op mode** — Application fully functional without the key (fallback plans, no gear recs)

---

## Domain 3: Claude Code Configuration & Workflows (20%)

> *Configure Claude Code settings, establish project conventions, and integrate Claude into development workflows.*

### 3.1 Schema Versioning & Migrations

**File:** `server/db.js` — 3200+ lines

The database layer implements a full migration system with 22 incremental schema versions:

```javascript
const CURRENT_SCHEMA_VERSION = 22;

function migrate() {
  const { version } = db.prepare("SELECT version FROM schema_version").get();
  if (version < 12) { /* age gate columns */ }
  if (version < 13) { /* password reset tokens */ }
  // ... through version 22
  db.prepare("UPDATE schema_version SET version = ?").run(CURRENT_SCHEMA_VERSION);
}
```

Each migration:
- Adds columns with `ALTER TABLE ... ADD COLUMN` (safe for SQLite)
- Creates new tables with `CREATE TABLE IF NOT EXISTS`
- Backfills data where needed
- All operations idempotent (safe to re-run)

### 3.2 Comprehensive Architecture Documentation

**File:** `ARCHITECTURE.md`

Living design document maintained throughout development, covering:
- System diagram with all components
- Data model hierarchy
- API route catalog (120+ endpoints)
- Security implementation details
- Deployment pipeline

### 3.3 AI-Specific Database Schema

Three tables support the AI readiness engine:

| Table | Purpose |
|-------|---------|
| `member_assessments` | Stores fitness level, pack experience, elevation access, activity level |
| `readiness_plans` | Cached AI-generated plans with JSON fields + generation timestamp |
| `readiness_progress` | Phase-level completion tracking (not_started → working → complete) |
| `ai_gear_recommendations` | Cached gear recs with 7-day expiry |

### 3.4 Docker Multi-Stage Build

**File:** `Dockerfile`

- **Stage 1 (build):** Full Node.js environment, installs all deps, builds React client with Vite
- **Stage 2 (production):** Alpine image, production deps only, non-root user (`appuser`, UID 1001)
- Security: no dev dependencies, no build tools, no source maps in production image

---

## Domain 4: Prompt Engineering & Structured Output (18%)

> *Apply prompt engineering techniques for complex tasks, implement structured output with validation, and design multi-pass review workflows.*

### 4.1 System Prompt Design

Both AI modules define specialized roles with behavioral constraints:

**Readiness coach (ai-readiness.js):**
- Role definition: "trek readiness coach"
- Behavioral constraint: "never prescribe workouts — describe benchmarks"
- Tone adaptation: "adapt urgency based on time remaining"
- Output format: "respond ONLY with valid JSON, no markdown"

**Gear advisor (gear-ai.js):**
- Role definition: "outdoor gear expert"
- Output constraint: "respond ONLY with valid JSON"

### 4.2 Structured JSON Schema

The readiness prompt specifies an exact JSON response structure:

```json
{
  "plan": {
    "summary": "string — one sentence assessment",
    "total_phases": 4,
    "phases": [{
      "number": 1,
      "name": "string",
      "weeks": "range string",
      "focus": "string",
      "benchmarks": ["array of outcome strings"],
      "pack_weight": "category string"
    }]
  },
  "priorities": [{
    "urgency": "red|yellow|green",
    "title": "string",
    "detail": "string",
    "category": "training|gear|medical|admin"
  }]
}
```

### 4.3 Context-Rich Prompting

The `buildPrompt()` function constructs a multi-section prompt with:

1. **Member assessment context** — 4 fitness parameters with value explanations
2. **Trek details** — Adventure type, departure date, itinerary metrics, hardest-day analysis
3. **Gear status** — Item counts providing situational awareness
4. **Behavioral rules** — Domain-specific heuristics (boot break-in timeline, pack weight progression)

### 4.4 Model-Appropriate Task Routing

Tasks are routed to models based on complexity:
- **Sonnet** for readiness plans: requires nuanced reasoning about fitness levels, time pressure, and multi-phase planning
- **Haiku** for gear recommendations: simpler product classification task where speed and cost matter more than depth

---

## Domain 5: Context Management & Reliability (15%)

> *Implement context preservation strategies, error handling, escalation patterns, and human review workflows.*

### 5.1 Database-Persisted Context

The assessment → plan → progress pipeline preserves context across sessions:

```
User submits assessment → stored in member_assessments (crew_id, user_id indexed)
  → AI generates plan → stored in readiness_plans (JSON + timestamp)
    → User logs progress → stored in readiness_progress (per-phase status)
```

No re-prompting needed — the plan is cached and retrievable. Regeneration is explicit (user action).

### 5.2 Cache Management

**Gear recommendations** use time-based cache expiry:
- 7-day TTL set at generation time
- Background refresh checks `getCachedGearRec()` before calling API
- Reduces API calls by ~90% (skip valid cached entries)

**Readiness plans** use user-triggered invalidation:
- Plans persist until explicitly regenerated
- `UNIQUE(crew_id, user_id)` constraint ensures one plan per member
- Upsert pattern: new plan replaces old without orphaned records

### 5.3 Error Propagation

```javascript
try {
  const response = await api.messages.create({ ... });
  // Parse and return
} catch (err) {
  console.error("[AI Readiness] Claude API error:", err.message);
  return generateFallbackPlan({ ... }); // Same response shape
}
```

- API errors are logged with context (`[AI Readiness]`, `[gear-ai]`)
- Token usage tracked even on success (`response.usage?.input_tokens + response.usage?.output_tokens`)
- Fallback returns identical response shape — consuming code unaffected

### 5.4 Idempotent Side Effects

Badge awards use INSERT OR IGNORE to ensure idempotency:
```javascript
earnBadge(crewId, userId, "ai_ready", "...");
// Uses INSERT OR IGNORE — safe to call multiple times
```

### 5.5 Safety & Disclaimers

AI-generated content includes explicit disclaimers:
- Server: "This AI-generated content is provided for general informational and planning purposes only and does not constitute medical, fitness, or professional advice."
- Client: "Consult a physician before beginning any exercise program."
- The AI never prescribes workouts — only describes outcome benchmarks

### 5.6 Token Cost Monitoring

Both AI modules return `tokens_used` in their responses:
```javascript
return {
  plan: parsed.plan,
  priorities: parsed.priorities,
  tokens_used: response.usage?.input_tokens + response.usage?.output_tokens || 0,
};
```

This enables cost tracking and budgeting at the application level.

---

## Summary

| Domain | Weight | TrailLog Evidence | Strength |
|--------|--------|-------------------|----------|
| **1. Agentic Architecture** | 27% | Two AI engines, model selection, fallback, batch processing, background scheduling | Strong |
| **2. Tool Design & MCP** | 18% | SDK singleton, structured parsing, env var management | Medium |
| **3. Claude Code Config** | 20% | Schema v22 migrations, ARCHITECTURE.md, AI tables, Docker build | Strong |
| **4. Prompt Engineering** | 18% | Role definition, JSON schema, context-rich prompts, model routing | Strong |
| **5. Context Management** | 15% | DB persistence, caching, fallback, idempotency, cost tracking | Strong |
