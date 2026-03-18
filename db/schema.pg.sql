-- ============================================================================
-- TrailLog — PostgreSQL Schema Definition
-- ============================================================================
-- Translated from SQLite canonical schema (schema version 25)
-- Generated: 2026-03-18
--
-- Key translations from SQLite:
--   INTEGER PRIMARY KEY AUTOINCREMENT → SERIAL PRIMARY KEY
--   DATETIME DEFAULT CURRENT_TIMESTAMP → TIMESTAMPTZ DEFAULT NOW()
--   datetime('now') → NOW()
--   REAL → DOUBLE PRECISION
--   INTEGER booleans kept as INTEGER (preserves 0/1 JSON wire format)
-- ============================================================================

-- ============================================================================
-- TIER 0: Independent tables (no foreign key dependencies)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id                  SERIAL PRIMARY KEY,
  google_id           TEXT UNIQUE,
  email               TEXT NOT NULL UNIQUE,
  password_hash       TEXT,
  name                TEXT NOT NULL,
  avatar_url          TEXT,
  user_type           TEXT,
  parent_email        TEXT,
  parent_email_2      TEXT,
  email_verified      INTEGER NOT NULL DEFAULT 0,
  verification_token  TEXT,
  age_confirmed       TEXT,
  age_confirmed_at    TIMESTAMPTZ,
  reset_token         TEXT,
  reset_token_expires TIMESTAMPTZ,
  tos_accepted_at     TIMESTAMPTZ,
  is_admin            INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS itineraries (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  days                INTEGER NOT NULL,
  miles               DOUBLE PRECISION NOT NULL,
  rating              TEXT NOT NULL DEFAULT 'Strenuous',
  highlights          TEXT NOT NULL DEFAULT '[]',
  route_data          TEXT NOT NULL DEFAULT '[]',
  training_priorities TEXT NOT NULL DEFAULT '[]',
  default_skills      TEXT NOT NULL DEFAULT '[]',
  global_info         TEXT NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS councils (
  id                  SERIAL PRIMARY KEY,
  name                TEXT NOT NULL UNIQUE,
  council_num         INTEGER,
  city                TEXT,
  state               TEXT
);

CREATE TABLE IF NOT EXISTS platform_settings (
  key                 TEXT PRIMARY KEY,
  value               TEXT NOT NULL
);

-- Note: sessions table managed by connect-pg-simple (createTableIfMissing: true)
-- No need to create it here.

CREATE TABLE IF NOT EXISTS shirt_votes (
  id                  SERIAL PRIMARY KEY,
  voter_name          TEXT NOT NULL,
  design_id           TEXT NOT NULL,
  vote_slot           INTEGER NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(voter_name, vote_slot)
);

CREATE TABLE IF NOT EXISTS gear_catalog (
  id                  SERIAL PRIMARY KEY,
  name                TEXT NOT NULL,
  category            TEXT NOT NULL,
  subcategory         TEXT,
  description         TEXT,
  weight_oz           DOUBLE PRECISION,
  weight_class        TEXT,
  priority            TEXT NOT NULL DEFAULT 'recommended',
  price_tier          TEXT,
  msrp                DOUBLE PRECISION,
  rating_stars        DOUBLE PRECISION,
  rating_notes        TEXT,
  philmont_compliant  INTEGER NOT NULL DEFAULT 1,
  compliance_notes    TEXT,
  is_crew_shared      INTEGER NOT NULL DEFAULT 0,
  sharing_type        TEXT NOT NULL DEFAULT 'personal',
  affiliate_priority  TEXT DEFAULT 'Medium',
  sort_order          INTEGER NOT NULL DEFAULT 0,
  active              INTEGER NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gear_items (
  id                  SERIAL PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS troops (
  id                  SERIAL PRIMARY KEY,
  name                TEXT NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  trek_date           TEXT,
  itinerary_id        TEXT REFERENCES itineraries(id) ON DELETE SET NULL,
  itinerary_overrides TEXT NOT NULL DEFAULT '{}',
  tier                TEXT NOT NULL DEFAULT 'free',
  amazon_affiliate_tag TEXT,
  council             TEXT,
  council_id          INTEGER REFERENCES councils(id) ON DELETE SET NULL,
  location            TEXT NOT NULL DEFAULT '',
  is_public           INTEGER NOT NULL DEFAULT 1,
  created_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS troop_members (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  troop_id            INTEGER NOT NULL REFERENCES troops(id) ON DELETE CASCADE,
  role                TEXT NOT NULL DEFAULT 'member',
  status              TEXT NOT NULL DEFAULT 'pending',
  color_bg            TEXT NOT NULL,
  dates               TEXT NOT NULL DEFAULT '[]',
  skills              TEXT NOT NULL DEFAULT '[]',
  participation       TEXT NOT NULL DEFAULT 'trekking',
  requested_adventures TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, troop_id)
);

CREATE TABLE IF NOT EXISTS gear_product_options (
  id                  SERIAL PRIMARY KEY,
  gear_catalog_id     INTEGER NOT NULL REFERENCES gear_catalog(id) ON DELETE CASCADE,
  tier                TEXT NOT NULL,
  star_rating         INTEGER DEFAULT 3,
  product_name        TEXT NOT NULL,
  brand               TEXT,
  price               DOUBLE PRECISION,
  weight_oz           DOUBLE PRECISION,
  notes               TEXT,
  is_ultralight_pick  INTEGER NOT NULL DEFAULT 0,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  affiliate_url       TEXT
);

CREATE TABLE IF NOT EXISTS troop_gear_overrides (
  troop_id            INTEGER NOT NULL REFERENCES troops(id) ON DELETE CASCADE,
  gear_catalog_id     INTEGER NOT NULL REFERENCES gear_catalog(id) ON DELETE CASCADE,
  hidden              INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (troop_id, gear_catalog_id)
);

CREATE TABLE IF NOT EXISTS troop_custom_gear (
  id                  SERIAL PRIMARY KEY,
  troop_id            INTEGER NOT NULL REFERENCES troops(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  category            TEXT NOT NULL,
  subcategory         TEXT,
  description         TEXT,
  weight_oz           DOUBLE PRECISION,
  priority            TEXT NOT NULL DEFAULT 'recommended',
  is_crew_shared      INTEGER NOT NULL DEFAULT 0,
  sharing_type        TEXT NOT NULL DEFAULT 'personal',
  sort_order          INTEGER NOT NULL DEFAULT 0,
  active              INTEGER NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_gear_recommendations (
  id                  SERIAL PRIMARY KEY,
  gear_catalog_id     INTEGER NOT NULL REFERENCES gear_catalog(id) ON DELETE CASCADE,
  adventure_type      TEXT NOT NULL DEFAULT 'philmont',
  recommendations     TEXT NOT NULL,
  generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ NOT NULL,
  tokens_used         INTEGER DEFAULT 0,
  UNIQUE(gear_catalog_id, adventure_type)
);

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_option_id   INTEGER REFERENCES gear_product_options(id) ON DELETE SET NULL,
  gear_catalog_id     INTEGER REFERENCES gear_catalog(id) ON DELETE SET NULL,
  url                 TEXT NOT NULL,
  referrer            TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gear_ai_logs (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  adventure_id        INTEGER,
  query               TEXT NOT NULL,
  response            TEXT NOT NULL,
  tokens_used         INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TIER 2: Tables referencing Tier 1
-- ============================================================================

CREATE TABLE IF NOT EXISTS adventures (
  id                  SERIAL PRIMARY KEY,
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
  attendance_milestones TEXT,
  created_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS adventure_members (
  id                  SERIAL PRIMARY KEY,
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
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(adventure_id, user_id)
);

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

CREATE TABLE IF NOT EXISTS invitations (
  id                  SERIAL PRIMARY KEY,
  troop_id            INTEGER NOT NULL REFERENCES troops(id) ON DELETE CASCADE,
  adventure_id        INTEGER REFERENCES adventures(id) ON DELETE CASCADE,
  email               TEXT NOT NULL,
  invited_by          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'pending',
  token               TEXT NOT NULL UNIQUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_events (
  id                  SERIAL PRIMARY KEY,
  adventure_id        INTEGER NOT NULL REFERENCES adventures(id) ON DELETE CASCADE,
  date                TEXT NOT NULL,
  period              TEXT NOT NULL DEFAULT 'all',
  time_label          TEXT,
  location            TEXT,
  notes               TEXT,
  type                TEXT NOT NULL DEFAULT 'proposed',
  status              TEXT NOT NULL DEFAULT 'active',
  created_by          INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- member_gear moved to after crews (Tier 3) due to FK dependency

CREATE TABLE IF NOT EXISTS adventure_documents (
  id                  SERIAL PRIMARY KEY,
  adventure_id        INTEGER NOT NULL REFERENCES adventures(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  original_name       TEXT NOT NULL,
  file_path           TEXT NOT NULL,
  mime_type           TEXT,
  size                INTEGER DEFAULT 0,
  description         TEXT DEFAULT '',
  uploaded_by         INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TIER 3: Tables referencing Tier 2
-- ============================================================================

CREATE TABLE IF NOT EXISTS crews (
  id                  SERIAL PRIMARY KEY,
  adventure_id        INTEGER NOT NULL REFERENCES adventures(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  itinerary_id        TEXT REFERENCES itineraries(id) ON DELETE SET NULL,
  depart_date         TEXT,
  arrive_date         TEXT,
  return_date         TEXT,
  home_date           TEXT,
  leader_id           INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS member_gear (
  id                  SERIAL PRIMARY KEY,
  adventure_id        INTEGER NOT NULL REFERENCES adventures(id) ON DELETE CASCADE,
  crew_id             INTEGER REFERENCES crews(id) ON DELETE SET NULL,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gear_catalog_id     INTEGER NOT NULL REFERENCES gear_catalog(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'needed',
  selected_option_id  INTEGER REFERENCES gear_product_options(id) ON DELETE SET NULL,
  custom_product_name TEXT,
  custom_weight_oz    DOUBLE PRECISION,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(adventure_id, user_id, gear_catalog_id)
);

CREATE TABLE IF NOT EXISTS crew_members (
  id                  SERIAL PRIMARY KEY,
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
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(crew_id, user_id)
);

CREATE TABLE IF NOT EXISTS achievements (
  id                  SERIAL PRIMARY KEY,
  adventure_id        INTEGER NOT NULL REFERENCES adventures(id) ON DELETE CASCADE,
  crew_id             INTEGER REFERENCES crews(id) ON DELETE CASCADE,
  user_id             INTEGER REFERENCES users(id) ON DELETE CASCADE,
  badge_type          TEXT NOT NULL,
  earned_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(adventure_id, user_id, badge_type)
);

CREATE TABLE IF NOT EXISTS crew_milestones (
  id                  SERIAL PRIMARY KEY,
  adventure_id        INTEGER NOT NULL REFERENCES adventures(id) ON DELETE CASCADE,
  crew_id             INTEGER REFERENCES crews(id) ON DELETE CASCADE,
  milestone_type      TEXT NOT NULL,
  reached_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(adventure_id, milestone_type)
);

CREATE TABLE IF NOT EXISTS link_requests (
  id                  SERIAL PRIMARY KEY,
  adventure_id        INTEGER NOT NULL REFERENCES adventures(id) ON DELETE CASCADE,
  requester_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scout_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'pending',
  reviewed_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  resolved_at         TIMESTAMPTZ,
  UNIQUE(adventure_id, requester_id, scout_id)
);

CREATE TABLE IF NOT EXISTS training_rsvps (
  id                  SERIAL PRIMARY KEY,
  event_id            INTEGER NOT NULL REFERENCES training_events(id) ON DELETE CASCADE,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'going',
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE TABLE IF NOT EXISTS training_attendance (
  id                  SERIAL PRIMARY KEY,
  event_id            INTEGER NOT NULL REFERENCES training_events(id) ON DELETE CASCADE,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attended            INTEGER NOT NULL DEFAULT 0,
  marked_by           INTEGER REFERENCES users(id) ON DELETE SET NULL,
  marked_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- ============================================================================
-- TIER 4: Tables referencing Tier 3
-- ============================================================================

CREATE TABLE IF NOT EXISTS member_assessments (
  id                  SERIAL PRIMARY KEY,
  crew_id             INTEGER NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_distance_miles DOUBLE PRECISION,
  pack_experience     TEXT CHECK(pack_experience IN ('none', 'day_pack', 'loaded')),
  elevation_access    TEXT CHECK(elevation_access IN ('flat_only', 'some_hills', 'real_elevation')),
  activity_level      TEXT CHECK(activity_level IN ('sedentary', 'lightly_active', 'regularly_active', 'very_active')),
  assessed_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(crew_id, user_id)
);

CREATE TABLE IF NOT EXISTS readiness_plans (
  id                  SERIAL PRIMARY KEY,
  crew_id             INTEGER NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_json           TEXT NOT NULL DEFAULT '{}',
  priorities_json     TEXT NOT NULL DEFAULT '[]',
  weeks_at_generation INTEGER,
  generated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(crew_id, user_id)
);

CREATE TABLE IF NOT EXISTS readiness_progress (
  id                  SERIAL PRIMARY KEY,
  crew_id             INTEGER NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phase_number        INTEGER NOT NULL,
  status              TEXT NOT NULL DEFAULT 'not_started'
                      CHECK(status IN ('not_started', 'working', 'complete')),
  note                TEXT,
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(crew_id, user_id, phase_number)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_troop_members_troop ON troop_members(troop_id);
CREATE INDEX IF NOT EXISTS idx_troop_members_user ON troop_members(user_id);
CREATE INDEX IF NOT EXISTS idx_adventures_troop ON adventures(troop_id);
CREATE INDEX IF NOT EXISTS idx_adventure_members_adventure ON adventure_members(adventure_id);
CREATE INDEX IF NOT EXISTS idx_adventure_members_user ON adventure_members(user_id);
CREATE INDEX IF NOT EXISTS idx_crews_adventure ON crews(adventure_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_crew ON crew_members(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_user ON crew_members(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_adventure ON skills(adventure_id);
CREATE INDEX IF NOT EXISTS idx_invitations_adventure ON invitations(adventure_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_achievements_adventure ON achievements(adventure_id);
CREATE INDEX IF NOT EXISTS idx_link_requests_adventure ON link_requests(adventure_id);
CREATE INDEX IF NOT EXISTS idx_member_gear_adventure_user ON member_gear(adventure_id, user_id);
CREATE INDEX IF NOT EXISTS idx_member_gear_crew ON member_gear(crew_id, user_id);
CREATE INDEX IF NOT EXISTS idx_member_assessments_crew ON member_assessments(crew_id);
CREATE INDEX IF NOT EXISTS idx_readiness_plans_crew ON readiness_plans(crew_id);
CREATE INDEX IF NOT EXISTS idx_readiness_progress_crew ON readiness_progress(crew_id, user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_created ON affiliate_clicks(created_at);
CREATE INDEX IF NOT EXISTS idx_training_events_adventure ON training_events(adventure_id);
CREATE INDEX IF NOT EXISTS idx_training_events_adventure_date ON training_events(adventure_id, date);
CREATE INDEX IF NOT EXISTS idx_adventure_documents_adventure ON adventure_documents(adventure_id);
CREATE INDEX IF NOT EXISTS idx_gear_product_options_catalog ON gear_product_options(gear_catalog_id);
CREATE INDEX IF NOT EXISTS idx_gear_catalog_active_sort ON gear_catalog(active, sort_order);
CREATE INDEX IF NOT EXISTS idx_troop_custom_gear_troop ON troop_custom_gear(troop_id, active);
CREATE INDEX IF NOT EXISTS idx_ai_gear_recs_expires ON ai_gear_recommendations(expires_at);
