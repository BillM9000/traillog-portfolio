-- ============================================================================
-- TrailLog — Canonical Schema Definition
-- ============================================================================
-- Single source of truth for the database schema.
-- Generated: 2026-03-18 from codebase analysis (schema version 25)
--
-- This file documents the TARGET state. The runtime code in server/db.js
-- may differ — this file is authoritative. A future migration will align
-- the runtime code to match this file.
--
-- SQLite-specific: AUTOINCREMENT, TEXT dates, JSON stored as TEXT,
--                  CHECK constraints, composite PKs.
-- ============================================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ============================================================================
-- TIER 0: Independent tables (no foreign key dependencies)
-- ============================================================================

-- User accounts (email/password + Google OAuth)
CREATE TABLE IF NOT EXISTS users (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  google_id           TEXT UNIQUE,
  email               TEXT NOT NULL UNIQUE,
  password_hash       TEXT,
  name                TEXT NOT NULL,
  avatar_url          TEXT,
  user_type           TEXT,                              -- 'adult' | 'scout'
  parent_email        TEXT,
  parent_email_2      TEXT,
  email_verified      INTEGER NOT NULL DEFAULT 0,
  verification_token  TEXT,
  age_confirmed       TEXT,                              -- '13+' | '18+'
  age_confirmed_at    DATETIME,
  reset_token         TEXT,
  reset_token_expires DATETIME,
  tos_accepted_at     DATETIME,
  is_admin            INTEGER NOT NULL DEFAULT 0,        -- global system admin
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Philmont itinerary templates (seeded, 48 treks)
CREATE TABLE IF NOT EXISTS itineraries (
  id                  TEXT PRIMARY KEY,                   -- e.g. '12-6'
  name                TEXT NOT NULL,
  days                INTEGER NOT NULL,
  miles               REAL NOT NULL,
  rating              TEXT NOT NULL DEFAULT 'Strenuous',
  highlights          TEXT NOT NULL DEFAULT '[]',         -- JSON array
  route_data          TEXT NOT NULL DEFAULT '[]',         -- JSON array of day objects
  training_priorities TEXT NOT NULL DEFAULT '[]',         -- JSON array
  default_skills      TEXT NOT NULL DEFAULT '[]',         -- JSON array
  global_info         TEXT NOT NULL DEFAULT '{}',         -- JSON object
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- BSA councils lookup (350+ seeded)
CREATE TABLE IF NOT EXISTS councils (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  name                TEXT NOT NULL UNIQUE,
  council_num         INTEGER,
  city                TEXT,
  state               TEXT
);

-- Global platform settings (maintenance mode, registration, announcements)
CREATE TABLE IF NOT EXISTS platform_settings (
  key                 TEXT PRIMARY KEY,
  value               TEXT NOT NULL
);

-- Express session store
CREATE TABLE IF NOT EXISTS sessions (
  sid                 TEXT PRIMARY KEY,
  sess                TEXT NOT NULL,
  expired             INTEGER NOT NULL
);

-- T-shirt design voting (standalone, no auth)
CREATE TABLE IF NOT EXISTS shirt_votes (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  voter_name          TEXT NOT NULL,
  design_id           TEXT NOT NULL,
  vote_slot           INTEGER NOT NULL DEFAULT 1,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(voter_name, vote_slot)
);

-- Gear catalog — master list of gear items (admin-managed)
CREATE TABLE IF NOT EXISTS gear_catalog (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  name                TEXT NOT NULL,
  category            TEXT NOT NULL,
  subcategory         TEXT,
  description         TEXT,
  weight_oz           REAL,
  weight_class        TEXT,
  priority            TEXT NOT NULL DEFAULT 'recommended',  -- 'essential' | 'recommended' | 'optional'
  price_tier          TEXT,
  msrp                REAL,
  rating_stars        REAL,
  rating_notes        TEXT,
  philmont_compliant  INTEGER NOT NULL DEFAULT 1,
  compliance_notes    TEXT,
  is_crew_shared      INTEGER NOT NULL DEFAULT 0,           -- legacy, superseded by sharing_type
  sharing_type        TEXT NOT NULL DEFAULT 'personal',     -- 'personal' | 'crew' | 'buddy' | 'provided'
  affiliate_priority  TEXT DEFAULT 'Medium',
  sort_order          INTEGER NOT NULL DEFAULT 0,
  active              INTEGER NOT NULL DEFAULT 1,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Legacy gear items table (UNUSED — superseded by gear_catalog in v5)
-- Flagged for removal in a future cleanup phase.
CREATE TABLE IF NOT EXISTS gear_items (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  name                TEXT NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  category            TEXT NOT NULL DEFAULT 'misc',
  affiliate_url       TEXT,
  image_url           TEXT,
  itinerary_tags      TEXT NOT NULL DEFAULT '[]',
  priority            TEXT NOT NULL DEFAULT 'recommended',
  sort_order          INTEGER NOT NULL DEFAULT 0
);

-- ============================================================================
-- TIER 1: Tables referencing only Tier 0
-- ============================================================================

-- Scout troops / units
CREATE TABLE IF NOT EXISTS troops (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  name                TEXT NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  trek_date           TEXT,                                -- legacy single date
  itinerary_id        TEXT REFERENCES itineraries(id) ON DELETE SET NULL,
  itinerary_overrides TEXT NOT NULL DEFAULT '{}',           -- JSON
  tier                TEXT NOT NULL DEFAULT 'free',
  amazon_affiliate_tag TEXT,
  council             TEXT,                                -- legacy text field
  council_id          INTEGER REFERENCES councils(id) ON DELETE SET NULL,
  location            TEXT NOT NULL DEFAULT '',
  is_public           INTEGER NOT NULL DEFAULT 1,
  created_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Troop membership (join requests, approvals)
CREATE TABLE IF NOT EXISTS troop_members (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  troop_id            INTEGER NOT NULL REFERENCES troops(id) ON DELETE CASCADE,
  role                TEXT NOT NULL DEFAULT 'member',       -- 'admin' | 'member'
  status              TEXT NOT NULL DEFAULT 'pending',      -- 'pending' | 'approved' | 'denied'
  color_bg            TEXT NOT NULL,
  dates               TEXT NOT NULL DEFAULT '[]',           -- JSON array
  skills              TEXT NOT NULL DEFAULT '[]',           -- JSON array
  participation       TEXT NOT NULL DEFAULT 'trekking',     -- 'trekking' | 'support'
  requested_adventures TEXT,                                -- JSON array of adventure IDs
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, troop_id)
);

-- Gear product options (affiliate links per gear item)
CREATE TABLE IF NOT EXISTS gear_product_options (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  gear_catalog_id     INTEGER NOT NULL REFERENCES gear_catalog(id) ON DELETE CASCADE,
  tier                TEXT NOT NULL,                        -- 'budget' | 'mid' | 'premium'
  star_rating         INTEGER DEFAULT 3,
  product_name        TEXT NOT NULL,
  brand               TEXT,
  price               REAL,
  weight_oz           REAL,
  notes               TEXT,
  is_ultralight_pick  INTEGER NOT NULL DEFAULT 0,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  affiliate_url       TEXT
);

-- Troop-specific gear overrides (hide catalog items per troop)
CREATE TABLE IF NOT EXISTS troop_gear_overrides (
  troop_id            INTEGER NOT NULL REFERENCES troops(id) ON DELETE CASCADE,
  gear_catalog_id     INTEGER NOT NULL REFERENCES gear_catalog(id) ON DELETE CASCADE,
  hidden              INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (troop_id, gear_catalog_id)
);

-- Troop-specific custom gear items
CREATE TABLE IF NOT EXISTS troop_custom_gear (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  troop_id            INTEGER NOT NULL REFERENCES troops(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  category            TEXT NOT NULL,
  subcategory         TEXT,
  description         TEXT,
  weight_oz           REAL,
  priority            TEXT NOT NULL DEFAULT 'recommended',
  is_crew_shared      INTEGER NOT NULL DEFAULT 0,
  sharing_type        TEXT NOT NULL DEFAULT 'personal',
  sort_order          INTEGER NOT NULL DEFAULT 0,
  active              INTEGER NOT NULL DEFAULT 1,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI gear recommendation cache
CREATE TABLE IF NOT EXISTS ai_gear_recommendations (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  gear_catalog_id     INTEGER NOT NULL REFERENCES gear_catalog(id) ON DELETE CASCADE,
  adventure_type      TEXT NOT NULL DEFAULT 'philmont',
  recommendations     TEXT NOT NULL,                        -- JSON
  generated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at          TEXT NOT NULL,
  tokens_used         INTEGER DEFAULT 0,
  UNIQUE(gear_catalog_id, adventure_type)
);

-- Affiliate link click tracking
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_option_id   INTEGER REFERENCES gear_product_options(id) ON DELETE SET NULL,
  gear_catalog_id     INTEGER REFERENCES gear_catalog(id) ON DELETE SET NULL,
  url                 TEXT NOT NULL,
  referrer            TEXT,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI gear chat logs
CREATE TABLE IF NOT EXISTS gear_ai_logs (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  adventure_id        INTEGER,                              -- optional context
  query               TEXT NOT NULL,
  response            TEXT NOT NULL,
  tokens_used         INTEGER DEFAULT 0,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TIER 2: Tables referencing Tier 1
-- ============================================================================

-- Adventures (a trek within a troop — Philmont, Northern Tier, etc.)
CREATE TABLE IF NOT EXISTS adventures (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  troop_id            INTEGER NOT NULL REFERENCES troops(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  trek_date           TEXT,
  depart_date         TEXT,
  arrive_date         TEXT,
  return_date         TEXT,
  home_date           TEXT,
  itinerary_id        TEXT REFERENCES itineraries(id) ON DELETE SET NULL,
  adventure_type      TEXT NOT NULL DEFAULT 'philmont',
  status              TEXT NOT NULL DEFAULT 'active',
  attendance_milestones TEXT,                               -- JSON
  created_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Adventure members (legacy dual-write target — crew_members is primary)
CREATE TABLE IF NOT EXISTS adventure_members (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  adventure_id        INTEGER NOT NULL REFERENCES adventures(id) ON DELETE CASCADE,
  user_id             INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role                TEXT NOT NULL DEFAULT 'member',
  participation       TEXT NOT NULL DEFAULT 'trekking',
  linked_to           INTEGER REFERENCES users(id) ON DELETE SET NULL,
  linked_to_manual    INTEGER,
  linked_scouts       TEXT NOT NULL DEFAULT '[]',
  is_manual           INTEGER NOT NULL DEFAULT 0,
  manual_name         TEXT,
  color_bg            TEXT NOT NULL,
  dates               TEXT NOT NULL DEFAULT '[]',
  skills              TEXT NOT NULL DEFAULT '[]',
  gear                TEXT NOT NULL DEFAULT '[]',
  medical             TEXT NOT NULL DEFAULT '[]',
  admin_tasks         TEXT NOT NULL DEFAULT '[]',
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(adventure_id, user_id)                             -- ADDED: prevent duplicate membership
);

-- Skills / readiness checklist items
CREATE TABLE IF NOT EXISTS skills (
  id                  TEXT PRIMARY KEY,
  troop_id            INTEGER REFERENCES troops(id) ON DELETE CASCADE,
  adventure_id        INTEGER REFERENCES adventures(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  icon                TEXT NOT NULL DEFAULT '📋',
  description         TEXT NOT NULL DEFAULT '',
  category            TEXT NOT NULL DEFAULT 'training',
  is_default          INTEGER NOT NULL DEFAULT 0,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  is_system           INTEGER NOT NULL DEFAULT 0
);

-- Invitations (email invites to join a troop/adventure)
CREATE TABLE IF NOT EXISTS invitations (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  troop_id            INTEGER NOT NULL REFERENCES troops(id) ON DELETE CASCADE,
  adventure_id        INTEGER REFERENCES adventures(id) ON DELETE CASCADE,
  email               TEXT NOT NULL,
  invited_by          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'pending',
  token               TEXT NOT NULL UNIQUE,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Training events (scheduled hikes, meetings)
CREATE TABLE IF NOT EXISTS training_events (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  adventure_id        INTEGER NOT NULL REFERENCES adventures(id) ON DELETE CASCADE,
  date                TEXT NOT NULL,
  period              TEXT NOT NULL DEFAULT 'all',          -- 'am' | 'pm' | 'all'
  time_label          TEXT,
  location            TEXT,
  notes               TEXT,
  type                TEXT NOT NULL DEFAULT 'proposed',     -- 'proposed' | 'scheduled'
  status              TEXT NOT NULL DEFAULT 'active',       -- 'active' | 'completed' | 'cancelled'
  created_by          INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Member gear selections (per adventure, per user)
CREATE TABLE IF NOT EXISTS member_gear (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  adventure_id        INTEGER NOT NULL REFERENCES adventures(id) ON DELETE CASCADE,
  crew_id             INTEGER REFERENCES crews(id) ON DELETE SET NULL,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gear_catalog_id     INTEGER NOT NULL REFERENCES gear_catalog(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'needed',       -- 'needed' | 'owned' | 'packed'
  selected_option_id  INTEGER REFERENCES gear_product_options(id) ON DELETE SET NULL,
  custom_product_name TEXT,
  custom_weight_oz    REAL,
  notes               TEXT,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(adventure_id, user_id, gear_catalog_id)
);

-- Adventure documents (uploaded files — PDFs, images, spreadsheets)
CREATE TABLE IF NOT EXISTS adventure_documents (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  adventure_id        INTEGER NOT NULL REFERENCES adventures(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  original_name       TEXT NOT NULL,
  file_path           TEXT NOT NULL,
  mime_type           TEXT,
  size                INTEGER DEFAULT 0,
  description         TEXT DEFAULT '',
  uploaded_by         INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TIER 3: Tables referencing Tier 2
-- ============================================================================

-- Crews (sub-groups within an adventure)
CREATE TABLE IF NOT EXISTS crews (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  adventure_id        INTEGER NOT NULL REFERENCES adventures(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  itinerary_id        TEXT REFERENCES itineraries(id) ON DELETE SET NULL,
  depart_date         TEXT,
  arrive_date         TEXT,
  return_date         TEXT,
  home_date           TEXT,
  leader_id           INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Crew members (primary membership table — dual-writes to adventure_members)
CREATE TABLE IF NOT EXISTS crew_members (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  crew_id             INTEGER NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  user_id             INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role                TEXT NOT NULL DEFAULT 'member',
  participation       TEXT NOT NULL DEFAULT 'trekking',
  linked_to           INTEGER REFERENCES users(id) ON DELETE SET NULL,
  linked_to_manual    INTEGER,
  linked_scouts       TEXT NOT NULL DEFAULT '[]',
  is_manual           INTEGER NOT NULL DEFAULT 0,
  manual_name         TEXT,
  color_bg            TEXT NOT NULL,
  dates               TEXT NOT NULL DEFAULT '[]',
  skills              TEXT NOT NULL DEFAULT '[]',
  gear                TEXT NOT NULL DEFAULT '[]',
  medical             TEXT NOT NULL DEFAULT '[]',
  admin_tasks         TEXT NOT NULL DEFAULT '[]',
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(crew_id, user_id)
);

-- Achievements / trail badges
CREATE TABLE IF NOT EXISTS achievements (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  adventure_id        INTEGER NOT NULL REFERENCES adventures(id) ON DELETE CASCADE,
  crew_id             INTEGER REFERENCES crews(id) ON DELETE CASCADE,
  user_id             INTEGER REFERENCES users(id) ON DELETE CASCADE,
  badge_type          TEXT NOT NULL,
  earned_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(adventure_id, user_id, badge_type)
);

-- Crew progress milestones (25%/50%/75%/100% waypoints)
CREATE TABLE IF NOT EXISTS crew_milestones (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  adventure_id        INTEGER NOT NULL REFERENCES adventures(id) ON DELETE CASCADE,
  crew_id             INTEGER REFERENCES crews(id) ON DELETE CASCADE,
  milestone_type      TEXT NOT NULL,
  reached_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(adventure_id, milestone_type)
);

-- Parent-scout link requests
CREATE TABLE IF NOT EXISTS link_requests (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  adventure_id        INTEGER NOT NULL REFERENCES adventures(id) ON DELETE CASCADE,
  requester_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scout_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'pending',
  reviewed_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at         DATETIME,
  UNIQUE(adventure_id, requester_id, scout_id)
);

-- Training event RSVPs
CREATE TABLE IF NOT EXISTS training_rsvps (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id            INTEGER NOT NULL REFERENCES training_events(id) ON DELETE CASCADE,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'going',        -- 'going' | 'cant'
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, user_id)
);

-- Training event attendance records
CREATE TABLE IF NOT EXISTS training_attendance (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id            INTEGER NOT NULL REFERENCES training_events(id) ON DELETE CASCADE,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attended            INTEGER NOT NULL DEFAULT 0,
  marked_by           INTEGER REFERENCES users(id) ON DELETE SET NULL,
  marked_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, user_id)
);

-- ============================================================================
-- TIER 4: Tables referencing Tier 3
-- ============================================================================

-- AI readiness self-assessments (per crew member)
CREATE TABLE IF NOT EXISTS member_assessments (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  crew_id             INTEGER NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_distance_miles REAL,
  pack_experience     TEXT CHECK(pack_experience IN ('none', 'day_pack', 'loaded')),
  elevation_access    TEXT CHECK(elevation_access IN ('flat_only', 'some_hills', 'real_elevation')),
  activity_level      TEXT CHECK(activity_level IN ('sedentary', 'lightly_active', 'regularly_active', 'very_active')),
  assessed_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(crew_id, user_id)
);

-- AI-generated readiness plans
CREATE TABLE IF NOT EXISTS readiness_plans (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  crew_id             INTEGER NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_json           TEXT NOT NULL DEFAULT '{}',
  priorities_json     TEXT NOT NULL DEFAULT '[]',
  weeks_at_generation INTEGER,
  generated_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(crew_id, user_id)
);

-- Readiness plan phase progress tracking
CREATE TABLE IF NOT EXISTS readiness_progress (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  crew_id             INTEGER NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phase_number        INTEGER NOT NULL,
  status              TEXT NOT NULL DEFAULT 'not_started'
                      CHECK(status IN ('not_started', 'working', 'complete')),
  note                TEXT,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(crew_id, user_id, phase_number)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Organized by table. Each index notes the query pattern it serves.

-- sessions: cleanup job (DELETE WHERE expired < ?)
CREATE INDEX IF NOT EXISTS idx_sessions_expired
  ON sessions(expired);

-- troop_members: getUserMemberships (WHERE user_id), getTroopMembers (WHERE troop_id)
CREATE INDEX IF NOT EXISTS idx_troop_members_troop
  ON troop_members(troop_id);
CREATE INDEX IF NOT EXISTS idx_troop_members_user
  ON troop_members(user_id);

-- adventures: getAdventures (WHERE troop_id), getDashboardData
CREATE INDEX IF NOT EXISTS idx_adventures_troop
  ON adventures(troop_id);

-- adventure_members: getAdventureMembers, dual-write sync
CREATE INDEX IF NOT EXISTS idx_adventure_members_adventure
  ON adventure_members(adventure_id);
CREATE INDEX IF NOT EXISTS idx_adventure_members_user
  ON adventure_members(user_id);

-- crews: getDefaultCrew, getCrews (WHERE adventure_id)
CREATE INDEX IF NOT EXISTS idx_crews_adventure
  ON crews(adventure_id);

-- crew_members: getCrewMembers (WHERE crew_id), removeCrewMember
CREATE INDEX IF NOT EXISTS idx_crew_members_crew
  ON crew_members(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_user
  ON crew_members(user_id);

-- skills: getAdventureSkills (WHERE adventure_id AND category)
CREATE INDEX IF NOT EXISTS idx_skills_adventure
  ON skills(adventure_id);

-- invitations: getInvitations (WHERE adventure_id), getInvitationByToken
CREATE INDEX IF NOT EXISTS idx_invitations_adventure
  ON invitations(adventure_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token
  ON invitations(token);

-- achievements: getAchievements (WHERE adventure_id)
CREATE INDEX IF NOT EXISTS idx_achievements_adventure
  ON achievements(adventure_id);

-- link_requests: getLinkRequests (WHERE adventure_id)
CREATE INDEX IF NOT EXISTS idx_link_requests_adventure
  ON link_requests(adventure_id);

-- member_gear: getMemberGear (WHERE adventure_id AND user_id), crew-scoped
CREATE INDEX IF NOT EXISTS idx_member_gear_adventure_user
  ON member_gear(adventure_id, user_id);
CREATE INDEX IF NOT EXISTS idx_member_gear_crew
  ON member_gear(crew_id, user_id);

-- member_assessments / readiness: crew-scoped lookups
CREATE INDEX IF NOT EXISTS idx_member_assessments_crew
  ON member_assessments(crew_id);
CREATE INDEX IF NOT EXISTS idx_readiness_plans_crew
  ON readiness_plans(crew_id);
CREATE INDEX IF NOT EXISTS idx_readiness_progress_crew
  ON readiness_progress(crew_id, user_id);

-- affiliate_clicks: getAffiliateStats (WHERE created_at >= ?, GROUP BY date)
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_created
  ON affiliate_clicks(created_at);

-- ── NEW INDEXES (identified in D5 scan) ──

-- training_events: getTrainingEvents, getNextTrainingEvent (WHERE adventure_id AND date >=)
CREATE INDEX IF NOT EXISTS idx_training_events_adventure
  ON training_events(adventure_id);
CREATE INDEX IF NOT EXISTS idx_training_events_adventure_date
  ON training_events(adventure_id, date);

-- adventure_documents: getAdventureDocuments (WHERE adventure_id ORDER BY created_at)
CREATE INDEX IF NOT EXISTS idx_adventure_documents_adventure
  ON adventure_documents(adventure_id);

-- gear_product_options: JOIN in catalog queries (WHERE gear_catalog_id)
CREATE INDEX IF NOT EXISTS idx_gear_product_options_catalog
  ON gear_product_options(gear_catalog_id);

-- gear_catalog: getGearCatalog (WHERE active=1 ORDER BY sort_order)
CREATE INDEX IF NOT EXISTS idx_gear_catalog_active_sort
  ON gear_catalog(active, sort_order);

-- troop_custom_gear: getTroopCustomGear (WHERE troop_id AND active=1)
CREATE INDEX IF NOT EXISTS idx_troop_custom_gear_troop
  ON troop_custom_gear(troop_id, active);

-- ai_gear_recommendations: getCachedGearRec (WHERE expires_at > datetime('now'))
CREATE INDEX IF NOT EXISTS idx_ai_gear_recs_expires
  ON ai_gear_recommendations(expires_at);

-- ============================================================================
-- INDEX JUSTIFICATION
-- ============================================================================
--
-- EXISTING (19 indexes from ensureIndexes()):
--   idx_sessions_expired .............. session GC cleanup
--   idx_troop_members_troop .......... getTroopMembers WHERE troop_id
--   idx_troop_members_user ........... getUserMemberships WHERE user_id
--   idx_adventure_members_adventure ... getAdventureMembers, deleteAdventure
--   idx_adventure_members_user ........ removeAdventureMember, dual-write
--   idx_crews_adventure ............... getDefaultCrew, getCrews
--   idx_crew_members_crew ............. getCrewMembers
--   idx_crew_members_user ............. removeCrewMember, dual-write cleanup
--   idx_skills_adventure .............. getAdventureSkills
--   idx_invitations_adventure ......... getInvitations
--   idx_invitations_token ............. getInvitationByToken
--   idx_achievements_adventure ........ getAchievements
--   idx_link_requests_adventure ....... getLinkRequests
--   idx_member_gear_adventure_user .... getMemberGear composite lookup
--   idx_member_gear_crew .............. crew-scoped gear queries
--   idx_member_assessments_crew ....... getCrewAssessments
--   idx_readiness_plans_crew .......... getCrewReadinessDashboard
--   idx_readiness_progress_crew ....... getReadinessProgress
--   idx_affiliate_clicks_created ...... getAffiliateStats date range
--
-- NEW (7 indexes added in this schema):
--   idx_adventures_troop .............. getAdventures, deleteTroop cascade
--   idx_training_events_adventure ..... getTrainingEvents
--   idx_training_events_adventure_date  getNextTrainingEvent date filter
--   idx_adventure_documents_adventure . getAdventureDocuments
--   idx_gear_product_options_catalog .. catalog JOIN queries
--   idx_gear_catalog_active_sort ...... gear list WHERE active ORDER sort
--   idx_troop_custom_gear_troop ....... custom gear per troop
--   idx_ai_gear_recs_expires .......... cache expiry lookups
--
-- NOT INDEXED (low-volume, not worth the write overhead):
--   users.reset_token ................. password reset (rare, single lookup)
--   users.verification_token .......... email verify (one-time per user)
--   users.is_admin .................... getSystemAdmins (< 5 rows)
--   shirt_votes.voter_name ........... standalone vote page (tiny table)
-- ============================================================================

-- ============================================================================
-- DISCREPANCIES: Code vs. Target Schema
-- ============================================================================
--
-- 1. adventure_members: code has NO UNIQUE(adventure_id, user_id)
--    Target: UNIQUE(adventure_id, user_id) — prevents duplicate membership
--
-- 2. adventure_documents: code uses RESTRICT on adventure_id FK
--    Target: CASCADE — documents should be deleted with adventure
--
-- 3. Most FK ON DELETE behaviors: code uses RESTRICT (SQLite default)
--    Target: CASCADE on child data (members, gear, skills, etc.)
--            SET NULL on optional references (created_by, leader_id, linked_to)
--    Impact: With CASCADE, manual delete transactions in deleteAdventure()
--            and deleteTroop() become unnecessary (but harmless).
--
-- 4. gear_items table: appears UNUSED — superseded by gear_catalog in schema v5
--    Flagged for removal in a future phase.
--
-- 5. ai_gear_recommendations.gear_catalog_id: code has no FK
--    Target: FK → gear_catalog(id) ON DELETE CASCADE
--
-- 6. gear_ai_logs.adventure_id: code has no FK
--    Target: left as optional (no FK) — adventure context is informational only
--
-- 7. member_gear.adventure_id, user_id: code has no FK on these
--    Target: FK → adventures(id) CASCADE, FK → users(id) CASCADE
--
-- 8. Missing indexes: 7 new indexes added (see NEW section above)
-- ============================================================================
