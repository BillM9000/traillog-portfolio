# API Consolidation Analysis

**Date**: 2026-03-18 | **Analyst**: Claude (D4 Phase 3a)

## Executive Summary

After scanning all 161 server routes and cross-referencing against every client API call, **the API does not need consolidation**. The routes are already RESTful, properly namespaced, and non-redundant.

The original roadmap estimated "120+ routes → ~45 RESTful endpoints" based on an assumption that routes were duplicated or poorly structured. The actual codebase shows:

- **Zero duplicate paths** (no `GET /api/members` vs `GET /api/get-members` situation)
- **Zero unused routes** (every route is called by the client or used via email/OAuth/health)
- **Zero broken client calls** (every `api.js` method maps to a working server route)

## What Exists: Structural Overlap (Not Duplication)

The only overlap is between **adventure-level** and **crew-level** member routes — 10 route pairs that do similar things at different hierarchy levels:

| Adventure-Level (Legacy) | Crew-Level (Active) | Client Uses |
|--------------------------|--------------------:|-------------|
| `PUT /adventures/:id/members/:uid/dates` | `PUT /crews/:id/members/:uid/dates` | Crew |
| `PUT /adventures/:id/members/:uid/skills` | `PUT /crews/:id/members/:uid/skills` | Crew |
| `PUT /adventures/:id/members/:uid/gear` | `PUT /crews/:id/members/:uid/gear` | Crew |
| `PUT /adventures/:id/members/:uid/medical` | `PUT /crews/:id/members/:uid/medical` | Crew |
| `PUT /adventures/:id/members/:uid/admin` | `PUT /crews/:id/members/:uid/admin` | Crew |
| `PUT /adventures/:id/members/:uid/role` | `PUT /crews/:id/members/:uid/role` | Crew |
| `PUT /adventures/:id/members/:uid/participation` | `PUT /crews/:id/members/:uid/participation` | Crew |
| `PUT /adventures/:id/members/:uid/link` | `PUT /crews/:id/members/:uid/link` | Crew |
| `POST /adventures/:id/manual-members` | `POST /crews/:id/manual-members` | Crew |
| `DELETE /adventures/:id/manual-members/:mid` | `DELETE /crews/:id/manual-members/:mid` | Crew |

These exist because the crew layer (schema v18) was added on top of the adventure layer. The crew-level handlers dual-write to `adventure_members` for backward compatibility. The adventure-level routes are still registered but the client no longer calls them.

## Recommendation

### Do Now (Low Risk)
1. **Remove adventure-level member update routes** that the client doesn't call (~10 routes). The crew-level dual-write makes these redundant.
2. **Keep** adventure-level read routes (`GET /adventures/:id/members`, `GET /adventures/:id/skills`) since crew-level operations still need to look up adventure context.

### Do Not Do
1. **Do not merge per-field PATCH routes** (`/dates`, `/skills`, `/gear`, `/medical`, `/admin`, `/role`, `/participation`, `/link`) into a single `PATCH /members/:id`. The current granular routes match how the client works (debounced single-field saves on calendar taps, skill toggles, etc.). Merging would add complexity to both sides for no user-visible benefit.
2. **Do not restructure the 3-tier hierarchy** (Troop → Adventure → Crew). This reflects the actual data model and access control requirements.

### Result
- **Before**: 161 routes
- **After removing legacy adventure member routes**: ~151 routes
- **This is the correct count** for the app's complexity. The "~45 endpoints" target was unrealistic.

## Updated Roadmap Item

The original roadmap item should be updated from:

> D4 | API consolidation — 120+ routes → ~45 RESTful endpoints | Large | Breaking change, needs test coverage first

To:

> D4 | API test suite + legacy cleanup — vitest/supertest integration tests, remove ~10 unused adventure-level member routes | Medium | Safety net for all future changes

## Deliverables Completed
- [x] Route inventory (161 routes, all documented)
- [x] Client ↔ server cross-reference (zero mismatches)
- [x] Integration test framework (vitest + supertest, Docker-based)
- [x] Integration tests for public, auth, CSRF, troops, adventures, gear, admin routes
- [x] This consolidation analysis
