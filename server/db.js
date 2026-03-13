import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const DATA_DIR = process.env.DATA_DIR || "./data";
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(`${DATA_DIR}/crew614.db`);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema ──
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    name TEXT NOT NULL,
    avatar_url TEXT,
    user_type TEXT,
    parent_email TEXT,
    parent_email_2 TEXT,
    email_verified INTEGER NOT NULL DEFAULT 0,
    verification_token TEXT,
    age_confirmed TEXT,
    age_confirmed_at DATETIME,
    reset_token TEXT,
    reset_token_expires DATETIME,
    tos_accepted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS itineraries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    days INTEGER NOT NULL,
    miles REAL NOT NULL,
    rating TEXT NOT NULL DEFAULT 'Strenuous',
    highlights TEXT NOT NULL DEFAULT '[]',
    route_data TEXT NOT NULL DEFAULT '[]',
    training_priorities TEXT NOT NULL DEFAULT '[]',
    default_skills TEXT NOT NULL DEFAULT '[]',
    global_info TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS troops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    trek_date TEXT,
    itinerary_id TEXT REFERENCES itineraries(id),
    itinerary_overrides TEXT NOT NULL DEFAULT '{}',
    tier TEXT NOT NULL DEFAULT 'free',
    amazon_affiliate_tag TEXT,
    council TEXT,
    location TEXT NOT NULL DEFAULT '',
    is_public INTEGER NOT NULL DEFAULT 1,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS adventures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    troop_id INTEGER NOT NULL REFERENCES troops(id),
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    trek_date TEXT,
    depart_date TEXT,
    arrive_date TEXT,
    return_date TEXT,
    home_date TEXT,
    itinerary_id TEXT REFERENCES itineraries(id),
    adventure_type TEXT NOT NULL DEFAULT 'philmont',
    status TEXT NOT NULL DEFAULT 'active',
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS troop_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    troop_id INTEGER NOT NULL REFERENCES troops(id),
    role TEXT NOT NULL DEFAULT 'member',
    status TEXT NOT NULL DEFAULT 'pending',
    color_bg TEXT NOT NULL,
    dates TEXT NOT NULL DEFAULT '[]',
    skills TEXT NOT NULL DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, troop_id)
  );

  CREATE TABLE IF NOT EXISTS adventure_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    adventure_id INTEGER NOT NULL REFERENCES adventures(id),
    user_id INTEGER REFERENCES users(id),
    role TEXT NOT NULL DEFAULT 'member',
    participation TEXT NOT NULL DEFAULT 'trekking',
    linked_to INTEGER REFERENCES users(id),
    linked_to_manual INTEGER,
    linked_scouts TEXT NOT NULL DEFAULT '[]',
    is_manual INTEGER NOT NULL DEFAULT 0,
    manual_name TEXT,
    color_bg TEXT NOT NULL,
    dates TEXT NOT NULL DEFAULT '[]',
    skills TEXT NOT NULL DEFAULT '[]',
    gear TEXT NOT NULL DEFAULT '[]',
    medical TEXT NOT NULL DEFAULT '[]',
    admin_tasks TEXT NOT NULL DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    troop_id INTEGER REFERENCES troops(id),
    adventure_id INTEGER REFERENCES adventures(id),
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '📋',
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'training',
    is_default INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS gear_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'misc',
    affiliate_url TEXT,
    image_url TEXT,
    itinerary_tags TEXT NOT NULL DEFAULT '[]',
    priority TEXT NOT NULL DEFAULT 'recommended',
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expired INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_expired ON sessions(expired);

  CREATE TABLE IF NOT EXISTS invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    troop_id INTEGER NOT NULL REFERENCES troops(id),
    adventure_id INTEGER REFERENCES adventures(id),
    email TEXT NOT NULL,
    invited_by INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending',
    token TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    adventure_id INTEGER NOT NULL REFERENCES adventures(id),
    user_id INTEGER REFERENCES users(id),
    badge_type TEXT NOT NULL,
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(adventure_id, user_id, badge_type)
  );

  CREATE TABLE IF NOT EXISTS crew_milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    adventure_id INTEGER NOT NULL REFERENCES adventures(id),
    milestone_type TEXT NOT NULL,
    reached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(adventure_id, milestone_type)
  );

  CREATE TABLE IF NOT EXISTS link_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    adventure_id INTEGER NOT NULL REFERENCES adventures(id),
    requester_id INTEGER NOT NULL REFERENCES users(id),
    scout_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending',
    reviewed_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    UNIQUE(adventure_id, requester_id, scout_id)
  );

  -- ══ Gear System v5 Tables ══

  CREATE TABLE IF NOT EXISTS gear_catalog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    description TEXT,
    weight_oz REAL,
    weight_class TEXT,
    priority TEXT NOT NULL DEFAULT 'recommended',
    price_tier TEXT,
    msrp REAL,
    rating_stars REAL,
    rating_notes TEXT,
    philmont_compliant INTEGER NOT NULL DEFAULT 1,
    compliance_notes TEXT,
    is_crew_shared INTEGER NOT NULL DEFAULT 0,
    sharing_type TEXT NOT NULL DEFAULT 'personal',
    affiliate_priority TEXT DEFAULT 'Medium',
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS gear_product_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gear_catalog_id INTEGER NOT NULL REFERENCES gear_catalog(id) ON DELETE CASCADE,
    tier TEXT NOT NULL,
    star_rating INTEGER DEFAULT 3,
    product_name TEXT NOT NULL,
    brand TEXT,
    price REAL,
    weight_oz REAL,
    notes TEXT,
    is_ultralight_pick INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    affiliate_url TEXT
  );

  CREATE TABLE IF NOT EXISTS affiliate_clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    product_option_id INTEGER REFERENCES gear_product_options(id),
    gear_catalog_id INTEGER REFERENCES gear_catalog(id),
    url TEXT NOT NULL,
    referrer TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_created ON affiliate_clicks(created_at);

  CREATE TABLE IF NOT EXISTS member_gear (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    adventure_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    gear_catalog_id INTEGER NOT NULL REFERENCES gear_catalog(id),
    status TEXT NOT NULL DEFAULT 'needed',
    selected_option_id INTEGER REFERENCES gear_product_options(id),
    custom_product_name TEXT,
    custom_weight_oz REAL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(adventure_id, user_id, gear_catalog_id)
  );

  CREATE TABLE IF NOT EXISTS gear_ai_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    adventure_id INTEGER,
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS troop_gear_overrides (
    troop_id INTEGER NOT NULL REFERENCES troops(id),
    gear_catalog_id INTEGER NOT NULL REFERENCES gear_catalog(id),
    hidden INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (troop_id, gear_catalog_id)
  );

  CREATE TABLE IF NOT EXISTS troop_custom_gear (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    troop_id INTEGER NOT NULL REFERENCES troops(id),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    description TEXT,
    weight_oz REAL,
    priority TEXT NOT NULL DEFAULT 'recommended',
    is_crew_shared INTEGER NOT NULL DEFAULT 0,
    sharing_type TEXT NOT NULL DEFAULT 'personal',
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS training_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    adventure_id INTEGER NOT NULL REFERENCES adventures(id),
    date TEXT NOT NULL,
    period TEXT NOT NULL DEFAULT 'all',
    time_label TEXT,
    location TEXT,
    notes TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS training_rsvps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES training_events(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'going',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, user_id)
  );
`);

// ── Schema Migration ──
const CURRENT_SCHEMA_VERSION = 15;

function migrate() {
  const vRow = db.prepare("SELECT value FROM platform_settings WHERE key = 'schema_version'").get();
  const version = vRow ? parseInt(vRow.value) : 0;
  if (version >= CURRENT_SCHEMA_VERSION) return;

  const runMigration = db.transaction(() => {
    // Add new columns to existing tables (safe — ALTER ADD COLUMN is a no-op if already exists via CREATE)
    const tryAlter = (sql) => { try { db.exec(sql); } catch {} };
    tryAlter("ALTER TABLE itineraries ADD COLUMN global_info TEXT NOT NULL DEFAULT '{}'");
    tryAlter("ALTER TABLE skills ADD COLUMN adventure_id INTEGER REFERENCES adventures(id)");
    tryAlter("ALTER TABLE skills ADD COLUMN category TEXT NOT NULL DEFAULT 'training'");

    // Migrate existing troops with itineraries → create adventures + copy members
    const troops = db.prepare("SELECT * FROM troops WHERE itinerary_id IS NOT NULL").all();
    for (const troop of troops) {
      const exists = db.prepare("SELECT id FROM adventures WHERE troop_id = ? AND itinerary_id = ?").get(troop.id, troop.itinerary_id);
      if (exists) continue;

      const r = db.prepare(
        "INSERT INTO adventures (troop_id, name, description, trek_date, itinerary_id, status, created_by) VALUES (?, ?, '', ?, ?, 'active', ?)"
      ).run(troop.id, `${troop.name} — Philmont`, troop.trek_date, troop.itinerary_id, troop.created_by);
      const advId = r.lastInsertRowid;

      // Copy approved troop members → adventure members
      const members = db.prepare("SELECT * FROM troop_members WHERE troop_id = ? AND status = 'approved'").all(troop.id);
      const ins = db.prepare("INSERT OR IGNORE INTO adventure_members (adventure_id, user_id, role, color_bg, dates, skills) VALUES (?, ?, ?, ?, ?, ?)");
      for (const m of members) ins.run(advId, m.user_id, m.role, m.color_bg, m.dates, m.skills);

      // Point existing skills at this adventure
      db.prepare("UPDATE skills SET adventure_id = ? WHERE troop_id = ?").run(advId, troop.id);
    }

    // Update itinerary 12-20 with enriched data
    const itin = db.prepare("SELECT id FROM itineraries WHERE id = '12-20'").get();
    if (itin) {
      db.prepare("UPDATE itineraries SET route_data = ?, global_info = ?, default_skills = ? WHERE id = '12-20'")
        .run(JSON.stringify(ROUTE_DATA_12_20), JSON.stringify(GLOBAL_INFO_12_20), JSON.stringify(PHILMONT_DEFAULT_SKILLS));
    }

    // ── v2 migration: trek dates, participation, linking, manual members ──
    if (version < 2) {
      // Add 4 date columns to adventures
      tryAlter("ALTER TABLE adventures ADD COLUMN depart_date TEXT");
      tryAlter("ALTER TABLE adventures ADD COLUMN arrive_date TEXT");
      tryAlter("ALTER TABLE adventures ADD COLUMN return_date TEXT");
      tryAlter("ALTER TABLE adventures ADD COLUMN home_date TEXT");
      // Migrate existing trek_date → arrive_date
      db.prepare("UPDATE adventures SET arrive_date = trek_date WHERE trek_date IS NOT NULL AND arrive_date IS NULL").run();

      // Add participation, linking, manual member columns to adventure_members
      tryAlter("ALTER TABLE adventure_members ADD COLUMN participation TEXT NOT NULL DEFAULT 'trekking'");
      tryAlter("ALTER TABLE adventure_members ADD COLUMN linked_to INTEGER REFERENCES users(id)");
      tryAlter("ALTER TABLE adventure_members ADD COLUMN is_manual INTEGER NOT NULL DEFAULT 0");
      tryAlter("ALTER TABLE adventure_members ADD COLUMN manual_name TEXT");
    }

    // ── v3 migration: make user_id nullable for manual members ──
    if (version < 3) {
      // SQLite doesn't support ALTER COLUMN, so recreate the table
      const hasData = db.prepare("SELECT COUNT(*) as c FROM adventure_members").get().c > 0;
      db.exec(`
        CREATE TABLE adventure_members_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          adventure_id INTEGER NOT NULL REFERENCES adventures(id),
          user_id INTEGER REFERENCES users(id),
          role TEXT NOT NULL DEFAULT 'member',
          participation TEXT NOT NULL DEFAULT 'trekking',
          linked_to INTEGER REFERENCES users(id),
          is_manual INTEGER NOT NULL DEFAULT 0,
          manual_name TEXT,
          color_bg TEXT NOT NULL,
          dates TEXT NOT NULL DEFAULT '[]',
          skills TEXT NOT NULL DEFAULT '[]',
          gear TEXT NOT NULL DEFAULT '[]',
          medical TEXT NOT NULL DEFAULT '[]',
          admin_tasks TEXT NOT NULL DEFAULT '[]',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      if (hasData) {
        db.exec(`INSERT INTO adventure_members_new (id, adventure_id, user_id, role, participation, linked_to, is_manual, manual_name, color_bg, dates, skills, gear, medical, admin_tasks, created_at)
          SELECT id, adventure_id, user_id, role, participation, linked_to, is_manual, manual_name, color_bg, dates, skills, gear, medical, admin_tasks, created_at FROM adventure_members`);
      }
      db.exec("DROP TABLE adventure_members");
      db.exec("ALTER TABLE adventure_members_new RENAME TO adventure_members");
    }

    // ── v4 migration: parent_email_2, link_requests table ──
    if (version < 4) {
      tryAlter("ALTER TABLE users ADD COLUMN parent_email_2 TEXT");
      db.exec(`
        CREATE TABLE IF NOT EXISTS link_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          adventure_id INTEGER NOT NULL REFERENCES adventures(id),
          requester_id INTEGER NOT NULL REFERENCES users(id),
          scout_id INTEGER NOT NULL REFERENCES users(id),
          status TEXT NOT NULL DEFAULT 'pending',
          reviewed_by INTEGER REFERENCES users(id),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          resolved_at DATETIME,
          UNIQUE(adventure_id, requester_id, scout_id)
        )
      `);
    }

    // ── v5 migration: gear system overhaul ──
    if (version < 5) {
      // Tables already created by initial schema DDL above.
      // Seed gear catalog if empty (fresh DB or first v5 migration)
      seedGearCatalog();

      // Migrate old gear_items → member_gear: map old checkbox IDs to new gear_catalog
      try {
        const oldItems = db.prepare("SELECT * FROM gear_items ORDER BY sort_order").all();
        if (oldItems.length > 0) {
          const catalogItems = db.prepare("SELECT id, name FROM gear_catalog WHERE active = 1").all();
          // Build name-match map: old gear_items.name → closest gear_catalog.id
          const nameMap = {};
          for (const old of oldItems) {
            const oldLower = old.name.toLowerCase();
            let best = null;
            let bestScore = 0;
            for (const cat of catalogItems) {
              const catLower = cat.name.toLowerCase();
              // Simple substring match scoring
              if (catLower.includes(oldLower) || oldLower.includes(catLower)) {
                const score = Math.min(oldLower.length, catLower.length);
                if (score > bestScore) { bestScore = score; best = cat.id; }
              } else {
                // Word overlap scoring
                const oldWords = oldLower.split(/\s+/);
                const catWords = catLower.split(/\s+/);
                const overlap = oldWords.filter(w => catWords.some(cw => cw.includes(w) || w.includes(cw))).length;
                if (overlap > bestScore) { bestScore = overlap; best = cat.id; }
              }
            }
            if (best) nameMap[old.id] = best;
          }

          // Migrate member gear selections
          const membersWithGear = db.prepare("SELECT adventure_id, user_id, gear FROM adventure_members WHERE gear != '[]' AND gear IS NOT NULL").all();
          const insertMemberGear = db.prepare(
            "INSERT OR IGNORE INTO member_gear (adventure_id, user_id, gear_catalog_id, status) VALUES (?, ?, ?, 'owned')"
          );
          for (const m of membersWithGear) {
            try {
              const gearIds = JSON.parse(m.gear);
              for (const oldId of gearIds) {
                const newId = nameMap[oldId];
                if (newId) insertMemberGear.run(m.adventure_id, m.user_id, newId);
              }
            } catch { /* skip malformed JSON */ }
          }
        }
      } catch (e) {
        console.log("v5 gear migration (old data mapping):", e.message);
      }
    }

    // ── v6 migration: simplified gear + global admin ──
    if (version < 6) {
      tryAlter("ALTER TABLE gear_product_options ADD COLUMN affiliate_url TEXT");
      db.exec(`
        CREATE TABLE IF NOT EXISTS affiliate_clicks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id),
          product_option_id INTEGER REFERENCES gear_product_options(id),
          gear_catalog_id INTEGER REFERENCES gear_catalog(id),
          url TEXT NOT NULL,
          referrer TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_created ON affiliate_clicks(created_at);
      `);
      seedGearCatalog();
    }

    // ── v7 migration: troop council, location, visibility ──
    if (version < 7) {
      tryAlter("ALTER TABLE troops ADD COLUMN council TEXT");
      tryAlter("ALTER TABLE troops ADD COLUMN location TEXT NOT NULL DEFAULT ''");
      tryAlter("ALTER TABLE troops ADD COLUMN is_public INTEGER NOT NULL DEFAULT 1");
    }

    // ── v8 migration: adventure type ──
    if (version < 8) {
      tryAlter("ALTER TABLE adventures ADD COLUMN adventure_type TEXT NOT NULL DEFAULT 'philmont'");
    }

    // ── v9 migration: manual member linking ──
    if (version < 9) {
      tryAlter("ALTER TABLE adventure_members ADD COLUMN linked_to_manual INTEGER");
    }

    // ── v10 migration: multi-scout linking (up to 3 scouts per adult) ──
    if (version < 10) {
      tryAlter("ALTER TABLE adventure_members ADD COLUMN linked_scouts TEXT NOT NULL DEFAULT '[]'");
      // Migrate existing single links into the new array
      const rows = db.prepare("SELECT id, linked_to, linked_to_manual FROM adventure_members WHERE linked_to IS NOT NULL OR linked_to_manual IS NOT NULL").all();
      for (const r of rows) {
        const scouts = [];
        if (r.linked_to) scouts.push(r.linked_to);
        if (r.linked_to_manual) scouts.push(-r.linked_to_manual);
        if (scouts.length > 0) {
          db.prepare("UPDATE adventure_members SET linked_scouts = ? WHERE id = ?").run(JSON.stringify(scouts), r.id);
        }
      }
    }

    // ── v11 migration: training events + time slot availability ──
    if (version < 11) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS training_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          adventure_id INTEGER NOT NULL REFERENCES adventures(id),
          date TEXT NOT NULL,
          period TEXT NOT NULL DEFAULT 'all',
          time_label TEXT,
          location TEXT,
          notes TEXT,
          created_by INTEGER NOT NULL REFERENCES users(id),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS training_rsvps (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER NOT NULL REFERENCES training_events(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id),
          status TEXT NOT NULL DEFAULT 'going',
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(event_id, user_id)
        );
      `);
    }

    // ── v12 migration: age gate (COPPA compliance) ──
    if (version < 12) {
      tryAlter("ALTER TABLE users ADD COLUMN age_confirmed TEXT");
      tryAlter("ALTER TABLE users ADD COLUMN age_confirmed_at DATETIME");
    }

    // ── v13 migration: password reset tokens ──
    if (version < 13) {
      tryAlter("ALTER TABLE users ADD COLUMN reset_token TEXT");
      tryAlter("ALTER TABLE users ADD COLUMN reset_token_expires DATETIME");
    }

    // ── v14 migration: TOS acceptance tracking ──
    if (version < 14) {
      tryAlter("ALTER TABLE users ADD COLUMN tos_accepted_at DATETIME");
    }

    // ── v15 migration: sharing_type replaces is_crew_shared boolean ──
    if (version < 15) {
      tryAlter("ALTER TABLE gear_catalog ADD COLUMN sharing_type TEXT NOT NULL DEFAULT 'personal'");
      tryAlter("ALTER TABLE troop_custom_gear ADD COLUMN sharing_type TEXT NOT NULL DEFAULT 'personal'");
      // Migrate existing is_crew_shared=1 items to 'crew' as baseline
      try {
        db.prepare("UPDATE gear_catalog SET sharing_type = 'crew' WHERE is_crew_shared = 1").run();
        db.prepare("UPDATE troop_custom_gear SET sharing_type = 'crew' WHERE is_crew_shared = 1").run();
        // Set buddy items (tents split between tent partners)
        db.prepare("UPDATE gear_catalog SET sharing_type = 'buddy' WHERE name LIKE '%Tent%' AND name NOT LIKE '%Pole Repair%'").run();
        // Set provided items (Philmont provides these on-site)
        const provided = ["Cook Pot / Pot Set", "Bear Bag / Ursack", "Fuel Canisters (isobutane, 100g x4)", "Topographic Map (Philmont)"];
        const setProvided = db.prepare("UPDATE gear_catalog SET sharing_type = 'provided' WHERE name = ?");
        provided.forEach(n => setProvided.run(n));
      } catch (e) { console.log("v15 sharing_type migration note:", e.message); }
    }

    db.prepare("INSERT OR REPLACE INTO platform_settings (key, value) VALUES ('schema_version', ?)").run(String(CURRENT_SCHEMA_VERSION));
  });

  runMigration();
  console.log(`Migrated schema to version ${CURRENT_SCHEMA_VERSION}`);
}

// Ensure performance indexes exist (idempotent, runs every startup regardless of schema version)
function ensureIndexes() {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_adventure_members_adventure ON adventure_members(adventure_id);
    CREATE INDEX IF NOT EXISTS idx_adventure_members_user ON adventure_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_troop_members_troop ON troop_members(troop_id);
    CREATE INDEX IF NOT EXISTS idx_troop_members_user ON troop_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_member_gear_adventure_user ON member_gear(adventure_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_skills_adventure ON skills(adventure_id);
    CREATE INDEX IF NOT EXISTS idx_invitations_adventure ON invitations(adventure_id);
    CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
    CREATE INDEX IF NOT EXISTS idx_achievements_adventure ON achievements(adventure_id);
    CREATE INDEX IF NOT EXISTS idx_link_requests_adventure ON link_requests(adventure_id);
  `);
  console.log("Performance indexes ensured");
}

// ── Colors ──
const COLORS = [
  "#E07A5F", "#3D6B5B", "#5B7BB4", "#D4A05A", "#8E6AAF",
  "#C26B5A", "#4A8F8F", "#7A7040", "#B55A8D", "#5A7F5A",
];

// ══════════════════════════════════════════
// ENRICHED ITINERARY 12-20 DATA
// ══════════════════════════════════════════

const ROUTE_DATA_12_20 = [
  {
    day: 1, camp: "Camping HQ", elevation: 6700, miles: 0, gain: 0, loss: 0,
    type: "Base Camp", notes: "Arrival, gear issue, shakedown",
    showers: true, food_pickup: null,
    programs: [
      { name: "Check-in & Registration", type: "required", description: "Check in at Camping HQ, submit medical forms and crew paperwork" },
      { name: "Crew Gear Issue", type: "required", description: "Pick up crew gear: stoves, bear bags, water purification, first aid" },
      { name: "Pack Shakedown", type: "required", description: "Ranger reviews and weighs packs — target under 35lbs base weight" },
      { name: "Opening Campfire", type: "required", description: "Welcome ceremony at the Camping HQ amphitheater" },
    ],
    water: null, warnings: [], optional_hikes: [],
  },
  {
    day: 2, camp: "Aguila", elevation: 8420, miles: 5.9, gain: 2920, loss: 1510,
    type: "Trail", notes: "Bus to Zastrow, Ranger Training, steep climb",
    showers: false, food_pickup: null,
    programs: [
      { name: "Ranger Training", type: "required", description: "Meet your Ranger guide. Crew safety review, Leave No Trace, navigation basics" },
    ],
    water: null,
    warnings: [
      "Steep 2,920' elevation gain — pace yourself as you acclimate",
      "Stay hydrated — altitude increases water needs significantly",
    ],
    optional_hikes: [],
  },
  {
    day: 3, camp: "Miners Park", elevation: 7570, miles: 4.6, gain: 2000, loss: 2310,
    type: "Staffed", notes: "Rock Climbing, Continental Tie passthrough, Advisor Coffee",
    showers: true, food_pickup: null,
    programs: [
      { name: "Rock Climbing", type: "program", description: "Staffed rock climbing program at Miners Park — helmets and harnesses provided" },
      { name: "Continental Tie", type: "passthrough", description: "Pass through Continental Tie trail junction near Crater Lake" },
      { name: "Advisor Coffee", type: "optional", description: "Coffee and fellowship for adult advisors at the staff camp" },
    ],
    water: null, warnings: [], optional_hikes: [],
  },
  {
    day: 4, camp: "Clarks Fork", elevation: 7520, miles: 6.8, gain: 3800, loss: 4290,
    type: "Staffed", notes: "Western Lore, Branding/Roping, Campfire Show",
    showers: true, food_pickup: null,
    programs: [
      { name: "Western Lore", type: "program", description: "Branding, roping, and Western heritage activities" },
      { name: "Campfire Show", type: "program", description: "Staff-led campfire program with songs and skits" },
    ],
    water: null, warnings: [],
    optional_hikes: [
      { name: "Tooth of Time", description: "Iconic Philmont landmark — moderate scramble to summit with panoramic views" },
      { name: "Shaefers Peak", description: "Ridge hike with views of the Sangre de Cristo range" },
    ],
  },
  {
    day: 5, camp: "Minnette Meadows", elevation: 8200, miles: 8.2, gain: 3290, loss: 2960,
    type: "Dry Camp", notes: "Food pickup Ute Gulch, carry 4-6L water, burn zone",
    showers: false, food_pickup: "Ute Gulch — pick up resupply food",
    programs: [],
    water: {
      strategy: "Fill all water containers at last reliable source before Ute Gulch. This is a DRY CAMP — no water at campsite.",
      fill_location: "Last creek crossing before Ute Gulch",
      next_source: "Day 6 — Cimarron River area",
      carry_liters: 5,
    },
    warnings: [
      "DRY CAMP — carry minimum 4-6 liters per person",
      "Burn zone — minimal shade, full sun exposure",
      "Longest day so far (8.2 miles) — start early",
      "Hot conditions likely — monitor for heat exhaustion",
    ],
    optional_hikes: [],
  },
  {
    day: 6, camp: "Mistletoe", elevation: 8500, miles: 6.9, gain: 3290, loss: 2730,
    type: "Dry Camp", notes: "Conservation project 10:30am (mandatory), Fire Ecology passthrough",
    showers: false, food_pickup: null,
    programs: [
      { name: "Conservation Project", type: "required", description: "Trail restoration and revegetation in the burn zone. All crew members must participate. ~3 hours of service." },
      { name: "Fire Ecology", type: "passthrough", description: "Interpretive program on wildfire ecology and forest recovery in the burn zone" },
    ],
    water: {
      strategy: "Second consecutive DRY CAMP. Fill from Cimarron River drainage. Purify all water carefully.",
      fill_location: "Cimarron River crossing",
      next_source: "Head of Dean (Day 7) — staffed camp with water",
      carry_liters: 5,
    },
    warnings: [
      "DRY CAMP — second consecutive dry night",
      "Conservation project is MANDATORY at 10:30 AM — plan hiking schedule around it",
      "Still in burn zone — limited shade",
    ],
    optional_hikes: [],
  },
  {
    day: 7, camp: "Head of Dean", elevation: 8000, miles: 5.5, gain: 1820, loss: 1480,
    type: "Staffed", notes: "COPE Challenge Course (Low + High elements), Advisor Coffee",
    showers: true, food_pickup: null,
    programs: [
      { name: "COPE Challenge Course", type: "program", description: "Low and High elements team-building challenge course. Harnesses provided for high elements." },
      { name: "Advisor Coffee", type: "optional", description: "Coffee and fellowship for adult advisors" },
    ],
    water: null,
    warnings: ["Welcome relief after 2 consecutive dry camps — rehydrate well"],
    optional_hikes: [],
  },
  {
    day: 8, camp: "Ewells Park", elevation: 9400, miles: 4.7, gain: 2320, loss: 1670,
    type: "Trail", notes: "Baldy prep day — early bedtime, prep daypacks, filter extra water",
    showers: false, food_pickup: null,
    programs: [],
    water: null,
    warnings: [
      "BALDY PREP — go to bed early tonight (4 AM departure tomorrow)",
      "Prep daypacks tonight: rain gear, warm layer, headlamp, 2L water, snacks",
      "Filter extra water for tomorrow's Baldy summit attempt",
      "Leave full packs at camp — daypacks only for Baldy",
    ],
    optional_hikes: [],
  },
  {
    day: 9, camp: "Ewells Park", elevation: 9400, miles: 11.9, gain: 6650, loss: 6650,
    type: "Layover", notes: "BALDY 12,441' summit — daypacks only, 4 AM start",
    showers: false, food_pickup: null,
    programs: [
      { name: "Baldy Mountain Summit", type: "required", description: "Summit the highest point in Scouting at 12,441'. Round trip from Ewells Park." },
      { name: "French Henry Mine", type: "optional", description: "Historic gold mine tour on the return from Baldy — ask your Ranger" },
    ],
    water: null,
    warnings: [
      "4:00 AM departure — headlamps required",
      "LIGHTNING — be below treeline by noon. No exceptions.",
      "AMS (Acute Mountain Sickness) possible above 11,000' — headache, nausea, dizziness = descend immediately",
      "Total elevation change: 6,650' gain + 6,650' loss — hardest day of the trek",
      "Carry 2+ liters of water and high-energy snacks in daypack",
      "Weather changes rapidly above treeline — bring rain gear and warm layer",
    ],
    optional_hikes: [
      { name: "French Henry Mine", description: "Historic gold mining site — optional detour on Baldy return route" },
    ],
  },
  {
    day: 10, camp: "Pueblano", elevation: 8000, miles: 4.0, gain: 970, loss: 2300,
    type: "Staffed", notes: "Continental Tie & Lumber programs, Campfire Show — celebration camp",
    showers: true, food_pickup: null,
    programs: [
      { name: "Continental Tie & Lumber", type: "program", description: "Crosscut sawing and tie hewing — old-school logging skills" },
      { name: "Campfire Show", type: "program", description: "Celebration campfire program — you conquered Baldy!" },
    ],
    water: null,
    warnings: ["Easy downhill day — enjoy the recovery after Baldy"],
    optional_hikes: [],
  },
  {
    day: 11, camp: "Dean Skyline", elevation: 9200, miles: 6.4, gain: 3290, loss: 2950,
    type: "Dry Camp", notes: "3rd dry camp — fill water from S. Ponil Creek, scenic ridge",
    showers: false, food_pickup: null,
    programs: [],
    water: {
      strategy: "Last DRY CAMP of the trek. Fill all containers at South Ponil Creek before climbing to ridgeline camp.",
      fill_location: "South Ponil Creek",
      next_source: "Ponil Trailhead area (Day 12)",
      carry_liters: 4,
    },
    warnings: [
      "DRY CAMP — 3rd and final dry night",
      "Fill water at South Ponil Creek before the climb",
      "Pack out all remaining food — last night on trail",
      "Scenic ridgeline — enjoy the views on your final full day",
    ],
    optional_hikes: [],
  },
  {
    day: 12, camp: "Camping HQ", elevation: 6700, miles: 3.7, gain: 1470, loss: 2810,
    type: "Base Camp", notes: "Hike to Ponil Trailhead, bus to HQ, gear return, closing campfire",
    showers: true, food_pickup: null,
    programs: [
      { name: "Gear Return", type: "required", description: "Return all crew gear, stoves, and bear bags to Camping HQ" },
      { name: "Closing Campfire", type: "required", description: "Final campfire ceremony — Arrowhead patches awarded" },
    ],
    water: null,
    warnings: ["Pack up camp thoroughly — leave no trace", "Bus pickup at Ponil Trailhead"],
    optional_hikes: [],
  },
];

const GLOBAL_INFO_12_20 = {
  conservation_project: {
    day: 6,
    time: "10:30 AM",
    description: "Trail restoration and revegetation work in the burn zone area. Approximately 3 hours of conservation service. All crew members must participate — this is a core part of the Philmont experience.",
    what_to_bring: "Work gloves, sun protection, full water bottles",
  },
  baldy_guide: {
    summit_elevation: 12441,
    start_time: "4:00 AM",
    round_trip_miles: 11.9,
    total_elevation_change: 6650,
    daypack_essentials: [
      "Rain jacket or poncho",
      "Warm layer (fleece or puffy jacket)",
      "Headlamp with fresh batteries",
      "2+ liters of water",
      "High-energy snacks (bars, trail mix, jerky)",
      "Sun protection (hat, sunscreen, sunglasses)",
      "Map and compass",
      "First aid basics (moleskin, tape, ibuprofen)",
    ],
    ams_warning: "Acute Mountain Sickness can occur above 11,000'. Symptoms include headache, nausea, dizziness, and shortness of breath. If symptoms appear, descend immediately. Do not push through AMS symptoms — they can escalate to life-threatening conditions.",
    lightning_protocol: "Be below treeline by noon. If caught above treeline during lightning: spread crew out 50+ feet apart, crouch on sleeping pad with feet together, remove metal-frame packs. Never shelter under isolated trees or on ridgelines.",
  },
  prohibited_items: [
    "Aerosol cans of any kind",
    "Fireworks or explosives",
    "Firearms or ammunition",
    "Alcohol or illegal drugs",
    "Glass containers on trail",
    "Drones or remote-controlled aircraft",
    "Hatchets or saws (Philmont provides where needed)",
    "Electronic devices discouraged on trail (leave at base camp)",
  ],
  trailhead_info: {
    departure: "Bus to Zastrow Turnaround (Day 2 morning)",
    return_route: "Hike out to Ponil Trailhead, bus to Camping HQ (Day 12)",
    parking: "Vehicles parked at Camping HQ lot for the duration of the trek",
  },
  readiness_reminders: [
    { item: "Medical Forms", details: "BSA Annual Health & Medical Record Parts A, B, and C required — due 30 days before departure" },
    { item: "BMI Requirements", details: "BSA height/weight requirements must be met. Consult your physician early if there are concerns." },
    { item: "Boot Break-in", details: "Log 50+ miles in your trek boots before arrival. Never bring new boots to Philmont." },
    { item: "Physical Conditioning", details: "Train 3-5x per week for 4+ months. Include loaded hikes, stair climbing, and sustained cardio." },
    { item: "Wilderness First Aid", details: "WFA or WAFA certification strongly recommended for at least one adult leader." },
    { item: "Shakedown Hikes", details: "Complete minimum 2 full overnight hikes with loaded packs before departure." },
    { item: "Water Purification", details: "Every crew member must be proficient with the water filter system before arrival." },
    { item: "Bear Bag Protocol", details: "Practice bear bag hanging — required every night on trail. Learn the PCT hang method." },
    { item: "Stove Operation", details: "All crew members should be able to operate and clean the crew stove." },
  ],
  maps_required: ["Philmont North Country Map", "Philmont South Country Map"],
  total_miles: 69,
  total_gain: 31820,
  total_loss: 31470,
  dry_camp_days: [5, 6, 11],
  staffed_camps: ["Miners Park", "Clarks Fork", "Head of Dean", "Pueblano"],
};

// Universal Philmont skills — applies to ALL Philmont itineraries (training/medical/admin prep is the same)
export const PHILMONT_DEFAULT_SKILLS = [
  // Training skills
  { id: "loaded", name: "Loaded Pack Hike (8+ mi)", icon: "🎒", desc: "Full weight, terrain with elevation changes", category: "training" },
  { id: "elevation", name: "Elevation / Hill Training", icon: "⛰️", desc: "Stair repeats, hill sprints, incline hikes", category: "training" },
  { id: "water", name: "Water Carry & Purification", icon: "💧", desc: "Practice dry camp water protocol (4-6L carry)", category: "training" },
  { id: "bearbag", name: "Bear Bag Hanging", icon: "🐻", desc: "Required every night on trail — learn PCT hang", category: "training" },
  { id: "stove", name: "Stove & Cook Setup", icon: "🔥", desc: "Crew meal prep, cleanup, and stove maintenance", category: "training" },
  { id: "navigation", name: "Map & Compass Nav", icon: "🧭", desc: "Both North + South sectional maps proficiency", category: "training" },
  { id: "overnight", name: "Full Overnight Shakedown", icon: "🏕️", desc: "Minimum 2 required before trek — full loaded packs", category: "training" },
  { id: "conditioning", name: "Conditioning Program", icon: "🥾", desc: "3-5x/week — ramp up intensity over 4+ months", category: "training" },
  // Medical checklist
  { id: "med-forma", name: "Health Form Part A", icon: "📋", desc: "Annual health history, signed by parent/guardian", category: "medical" },
  { id: "med-formb", name: "Health Form Part B", icon: "📋", desc: "Physical exam signed by physician (within 12 months)", category: "medical" },
  { id: "med-formc", name: "Health Form Part C", icon: "📋", desc: "Pre-participation physical clearance required for Philmont", category: "medical" },
  { id: "med-bmi", name: "BMI Check", icon: "⚖️", desc: "Meets BSA height/weight requirements", category: "medical" },
  { id: "med-meds", name: "Medications Reviewed", icon: "💊", desc: "All medications reviewed with crew advisor and documented", category: "medical" },
  // Admin checklist
  { id: "adm-agreement", name: "Participant Agreement", icon: "✍️", desc: "Philmont participant agreement signed", category: "admin" },
  { id: "adm-emergency", name: "Emergency Contact Card", icon: "🆘", desc: "Emergency contact info submitted to crew leader", category: "admin" },
  { id: "adm-travel", name: "Travel Confirmed", icon: "✈️", desc: "Travel arrangements to/from Philmont confirmed", category: "admin" },
  { id: "adm-fees", name: "Crew Fund Paid", icon: "💰", desc: "Trek fees and crew fund contributions paid in full", category: "admin" },
  { id: "adm-insurance", name: "Insurance Info", icon: "🏥", desc: "Health insurance card copy submitted to crew leader", category: "admin" },
];

const TRAINING_PRIORITIES_12_20 = [
  { icon: "💧", label: "Water carry", detail: "3 dry camps (Days 5, 6, 11) — practice hauling 4-6L/person" },
  { icon: "🥾", label: "Big days", detail: "Day 5 (8.2mi) + Day 9 (11.9mi Baldy) — build to loaded 10+ mi" },
  { icon: "⛰️", label: "Elevation", detail: "Day 9 = 6,650' gain+loss — stair/hill training essential" },
  { icon: "☀️", label: "Heat", detail: "Days 5-6 burn zone, full sun — train in heat when possible" },
  { icon: "⏰", label: "Early starts", detail: "Multiple pre-dawn departures required" },
  { icon: "🏕️", label: "Shakedowns", detail: "Min 2 full overnights with loaded packs before arrival" },
];

/**
 * Seed default Philmont skills into an adventure.
 * Safe to call multiple times — skips skills that already exist.
 */
export function seedAdventureSkills(adventureId, troopId) {
  const existing = db.prepare("SELECT id FROM skills WHERE adventure_id = ?").all(adventureId);
  const existingIds = new Set(existing.map(s => s.id));
  const insertSkill = db.prepare(
    "INSERT INTO skills (id, troop_id, adventure_id, name, icon, description, category, is_default, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)"
  );
  let seeded = 0;
  PHILMONT_DEFAULT_SKILLS.forEach((s, i) => {
    const skillId = `${adventureId}-${s.id}`;
    if (!existingIds.has(skillId)) {
      insertSkill.run(skillId, troopId, adventureId, s.name, s.icon || "📋", s.desc, s.category || "training", i);
      seeded++;
    }
  });
  if (seeded > 0) console.log(`[skills] Seeded ${seeded} default skills for adventure ${adventureId}`);
  return seeded;
}

// ── Seed 2026 Philmont Itineraries (48 itineraries from official guidebook) ──
const itinCount = db.prepare("SELECT COUNT(*) as c FROM itineraries").get();
if (itinCount.c < 48) {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const seedData = JSON.parse(readFileSync(join(__dirname, "itinerary_seed.json"), "utf-8"));
    const upsert = db.prepare(`INSERT OR REPLACE INTO itineraries (id, name, days, miles, rating, highlights, route_data, training_priorities, default_skills, global_info)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const seedAll = db.transaction(() => {
      for (const it of seedData) {
        upsert.run(
          it.id, it.name, it.days, it.miles, it.rating,
          JSON.stringify(it.highlights || []),
          JSON.stringify(it.route_data || []),
          JSON.stringify([]),
          JSON.stringify([]),
          JSON.stringify({ description: it.description || "", elevations: it.elevations || {}, camps_info: it.camps_info || "", conservation: it.conservation || "" }),
        );
      }
    });
    seedAll();
    console.log(`Seeded ${seedData.length} Philmont itineraries`);
  } catch (e) {
    console.error("Failed to seed itineraries:", e.message);
  }
}

// ── Backfill: seed default skills for existing Philmont adventures that have none ──
try {
  const adventures = db.prepare("SELECT id, troop_id, adventure_type FROM adventures WHERE status = 'active'").all();
  for (const adv of adventures) {
    if ((adv.adventure_type || "philmont") === "philmont") {
      const skillCount = db.prepare("SELECT COUNT(*) as c FROM skills WHERE adventure_id = ?").get(adv.id);
      if (skillCount.c === 0) {
        seedAdventureSkills(adv.id, adv.troop_id);
      }
    }
  }
} catch (e) {
  // Fresh DB may not have adventures table or adventure_type column yet — safe to skip
}

// ── Seed default gear items ──
const gearCount = db.prepare("SELECT COUNT(*) as c FROM gear_items").get();
if (gearCount.c === 0) {
  const insertGear = db.prepare("INSERT INTO gear_items (name, description, category, itinerary_tags, priority, sort_order) VALUES (?, ?, ?, ?, ?, ?)");
  [
    ["Sawyer Squeeze Water Filter", "Essential for dry camps — filter water at every source", "water", '["dry_camp"]', "essential", 1],
    ["Nalgene 32oz Bottles (x2)", "Wide mouth, durable, freeze-proof for mountain water", "water", '["all"]', "essential", 2],
    ["Hydration Bladder 3L", "Hands-free drinking on long hiking days", "water", '["big_day"]', "recommended", 3],
    ["Backpack 60-75L", "Internal frame, rain cover included, hip belt essential", "pack", '["all"]', "essential", 4],
    ["Rain Cover for Pack", "Afternoon thunderstorms are common in the mountains", "pack", '["all"]', "essential", 5],
    ["Hiking Boots (broken in)", "Ankle support critical — break in BEFORE trek", "footwear", '["all"]', "essential", 6],
    ["Merino Wool Socks (3-4 pairs)", "Moisture-wicking, blister prevention", "footwear", '["all"]', "essential", 7],
    ["Camp Shoes / Sandals", "Give feet a break at camp", "footwear", '["all"]', "recommended", 8],
    ["Trekking Poles", "Reduce knee impact on big descent days", "footwear", '["high_elevation","big_day"]', "recommended", 9],
    ["50ft Paracord (Bear Bag)", "Required for bear bag hanging every night", "shelter", '["all"]', "essential", 10],
    ["Sleeping Bag (30F rated)", "Temps drop at 10,000'+ elevation", "shelter", '["high_elevation"]', "essential", 11],
    ["Sleeping Pad (R-value 3+)", "Insulation from ground, comfort for recovery", "shelter", '["all"]', "essential", 12],
    ["Backpacking Stove", "Crew cooking required — practice before trek", "cooking", '["all"]', "essential", 13],
    ["Compass (baseplate)", "Required for navigation training", "navigation", '["all"]', "essential", 14],
    ["Sun Hat / Buff", "Full sun in burn zones Days 5-6", "clothing", '["heat","burn_zone"]', "essential", 15],
    ["Rain Jacket (packable)", "Afternoon thunderstorms are common at high altitude", "clothing", '["all"]', "essential", 16],
    ["Headlamp + Extra Batteries", "Pre-dawn starts require reliable light", "misc", '["early_start"]', "essential", 17],
    ["Moleskin / Blister Kit", "Prevention and treatment for long days", "misc", '["big_day"]', "essential", 18],
  ].forEach(g => insertGear.run(...g));
}

// ── Seed Gear Catalog (inline — no external file) ──
function seedGearCatalog() {
  const count = db.prepare("SELECT COUNT(*) as c FROM gear_catalog").get();
  if (count.c > 0) return;

  console.log("Seeding gear catalog...");
  const S = [
    // Pack & Carry
    ["Backpacking Pack (65-75L)", "Pack & Carry", "Backpack", 52, "essential", 0, "Torso-fit suspension; adjustable hip belt mandatory"],
    ["Pack Rain Cover", "Pack & Carry", "Pack Protection", 4, "essential", 0, "Essential for NM afternoon thunderstorms"],
    ["Stuff Sacks / Compression Sacks", "Pack & Carry", "Organization", 6, "recommended", 0, "Keeps gear organized and compressible"],
    ["Dry Bags (2-pack)", "Pack & Carry", "Waterproof Storage", 5, "essential", 0, "Electronics, maps, sleep systems must stay dry"],
    ["Trekking Poles (pair)", "Pack & Carry", "Poles", 18, "recommended", 0, "Reduce knee impact on descent days"],
    // Shelter
    ["Backpacking Tent (2-3 person)", "Shelter", "Tent", 56, "essential", 1, "Crew-shared; freestanding preferred for rocky sites"],
    ["Tent Footprint / Ground Cloth", "Shelter", "Tent Protection", 8, "recommended", 1, "Protects tent floor from rocks"],
    ["Tent Stakes (set of 10)", "Shelter", "Hardware", 5, "essential", 1, "Y-beam aluminum recommended for rocky soil"],
    ["Emergency Tarp", "Shelter", "Emergency", 12, "recommended", 1, "Rain shelter during meal breaks or tent failure"],
    // Sleep System
    ["Sleeping Bag (20°F rated)", "Sleep System", "Sleeping Bag", 40, "essential", 0, "NM altitude nights drop to 20-30°F"],
    ["Sleeping Bag Liner", "Sleep System", "Liner", 8, "optional", 0, "Adds 5-15°F warmth; keeps bag clean"],
    ["Sleeping Pad", "Sleep System", "Pad", 16, "essential", 0, "R-value 3+ for ground insulation at altitude"],
    ["Backpacking Pillow", "Sleep System", "Pillow", 3, "optional", 0, "Worth every gram for 12-night trek"],
    // Clothing
    ["Base Layer Top (long sleeve)", "Clothing", "Base Layer", 6, "essential", 0, "Merino wool or synthetic; NO cotton"],
    ["Base Layer Bottom (leggings)", "Clothing", "Base Layer", 5, "essential", 0, "Thermal base for cold mornings; doubles as sleep layer"],
    ["Fleece Mid Layer / Jacket", "Clothing", "Insulation", 14, "essential", 0, "Versatile for 40-70°F daily swings"],
    ["Insulating Puffy Jacket", "Clothing", "Insulation", 12, "essential", 0, "Down or synthetic for camp and summit"],
    ["Rain Jacket (waterproof)", "Clothing", "Rain Gear", 12, "essential", 0, "Taped seams; mandatory Philmont packing list"],
    ["Rain Pants (waterproof)", "Clothing", "Rain Gear", 8, "recommended", 0, "Side-zip for easy on/off over boots"],
    ["Hiking Pants (convertible)", "Clothing", "Pants", 16, "essential", 0, "Zip-off legs; UPF 50+; no denim"],
    ["Hiking Shirts (2-pack)", "Clothing", "Shirts", 6, "essential", 0, "Moisture-wicking, UPF 50+; no cotton"],
    ["Merino Wool Hiking Socks (3-pair)", "Clothing", "Socks", 9, "essential", 0, "Blister prevention; #1 cause of early exit"],
    ["Moisture-Wicking Underwear (3-pair)", "Clothing", "Underwear", 6, "essential", 0, "Synthetic or merino; anti-chafe"],
    ["Sun Hat (wide-brim, UPF 50+)", "Clothing", "Headwear", 3, "essential", 0, "NM UV index hits 10-12 (extreme)"],
    ["Warm Beanie Hat", "Clothing", "Headwear", 2, "recommended", 0, "Summit mornings can be below freezing"],
    ["Lightweight Gloves", "Clothing", "Handwear", 2, "recommended", 0, "Liner gloves for cold summit crossings"],
    ["Gaiters (trail or low)", "Clothing", "Gaiters", 4, "optional", 0, "Debris protection on dusty trails"],
    // Footwear
    ["Hiking Boots (mid-cut, waterproof)", "Footwear", "Boots", 40, "essential", 0, "Break in 50+ miles before arrival; ankle support required"],
    ["Camp Shoes / Sandals", "Footwear", "Camp Footwear", 12, "recommended", 0, "Feet recovery critical on 12-day trek"],
    ["Boot/Sock Liners", "Footwear", "Liners", 1, "optional", 0, "Thin liner under hiking sock reduces blisters"],
    // Navigation
    ["Topographic Map (Philmont)", "Navigation", "Maps", 3, "essential", 1, "Official topo provided at check-in; carry at all times"],
    ["Baseplate Compass", "Navigation", "Compass", 2, "essential", 0, "BSA requirement; set NM declination before trek"],
    ["Altimeter Watch", "Navigation", "Electronics", 2, "optional", 0, "Elevation tracking and weather prediction"],
    ["Handheld GPS", "Navigation", "Electronics", 8, "optional", 1, "Backup navigation; inReach for emergency comms"],
    // Hydration & Water Treatment
    ["Water Bottles (1L x2)", "Hydration & Water", "Bottles", 10, "essential", 0, "2L minimum carry; wide-mouth for filter compatibility"],
    ["Hydration Reservoir (2-3L)", "Hydration & Water", "Bladder", 6, "recommended", 0, "Hands-free hydration on trail"],
    ["Water Filter / Purifier", "Hydration & Water", "Filtration", 3, "essential", 1, "ALL water must be treated; Sawyer Squeeze standard"],
    ["Chemical Water Treatment (backup)", "Hydration & Water", "Treatment", 1, "recommended", 1, "Backup if filter fails or freezes"],
    // Food & Cooking
    ["Camp Stove (canister)", "Food & Cooking", "Stove", 3, "essential", 1, "Canister ONLY; white gas prohibited at Philmont"],
    ["Fuel Canisters (isobutane, 100g x4)", "Food & Cooking", "Fuel", 28, "essential", 1, "Plan ~100g per 2 people per day at altitude"],
    ["Cook Pot / Pot Set", "Food & Cooking", "Cookware", 8, "essential", 1, "2L minimum for crew; titanium or aluminum"],
    ["Long-Handle Spork", "Food & Cooking", "Utensils", 1, "essential", 0, "Reaches bottom of freeze-dried pouches"],
    ["Bear Bag / Ursack", "Food & Cooking", "Food Storage", 5, "essential", 1, "ALL scented items in bear storage nightly"],
    ["Trash Compactor Bags (2-pack)", "Food & Cooking", "Waste", 2, "essential", 1, "Pack out ALL trash; LNT mandate"],
    // Fire & Light
    ["Headlamp (primary)", "Fire & Light", "Headlamp", 3, "essential", 0, "200+ lumens; red mode for night vision"],
    ["Backup Headlamp", "Fire & Light", "Headlamp", 2, "recommended", 0, "12 days is long; headlamps fail"],
    ["Extra Batteries (AA/AAA)", "Fire & Light", "Batteries", 8, "essential", 0, "Cold altitude drains batteries faster"],
    ["Lighter / Waterproof Matches", "Fire & Light", "Fire Starting", 1, "essential", 0, "Stove ignition only; open fires prohibited most zones"],
    ["Camp Lantern", "Fire & Light", "Lantern", 3, "optional", 1, "Solar inflatable or LED; crew-shared"],
    // First Aid & Safety
    ["Personal First Aid Kit", "First Aid & Safety", "First Aid", 16, "essential", 0, "Crew + personal kits; WFA training recommended"],
    ["Blister Kit (dedicated)", "First Aid & Safety", "Blister Care", 3, "essential", 0, "#1 cause of Scout evacuation; Leukotape + moleskin"],
    ["SAM Splint", "First Aid & Safety", "Emergency", 2, "recommended", 1, "Ankle/wrist sprains common on terrain"],
    ["Emergency Whistle", "First Aid & Safety", "Safety", 1, "essential", 0, "3 blasts = distress; attach to shoulder strap"],
    ["Emergency Bivy / Space Blanket", "First Aid & Safety", "Emergency", 3, "recommended", 0, "Hypothermia treatment; weighs almost nothing"],
    ["PLB / Satellite Communicator", "First Aid & Safety", "Communication", 3, "optional", 1, "inReach Mini 2 recommended; zero cell service"],
    // Hygiene & Leave No Trace
    ["Trowel (LNT cat hole)", "Hygiene & LNT", "Sanitation", 1, "essential", 1, "6-inch cat holes, 200ft from water"],
    ["WAG Bags", "Hygiene & LNT", "Sanitation", 2, "recommended", 0, "Required in some high-use Philmont zones"],
    ["Biodegradable Soap", "Hygiene & LNT", "Hygiene", 2, "recommended", 1, "Use 200+ feet from water sources"],
    ["Microfiber Towel", "Hygiene & LNT", "Hygiene", 3, "recommended", 0, "Quick-dry; hang on pack to dry while hiking"],
    ["Toothbrush + Toothpaste (travel)", "Hygiene & LNT", "Dental", 1, "essential", 0, "Scented item — bear bag nightly"],
    ["Hand Sanitizer (2oz)", "Hygiene & LNT", "Hygiene", 2, "essential", 0, "Before every meal; prevents GI illness"],
    ["Sunscreen SPF 50+ (2oz)", "Hygiene & LNT", "Sun Protection", 2, "essential", 0, "Scented — bear bag; reapply every 2 hours"],
    ["Lip Balm (SPF 30+)", "Hygiene & LNT", "Sun Protection", 0.5, "essential", 0, "Scented — bear bag; pack 2-3"],
    ["Insect Repellent (DEET/Picaridin)", "Hygiene & LNT", "Bug Protection", 2, "recommended", 0, "Scented — bear bag; DEET degrades nylon"],
    ["Toilet Paper (compressed)", "Hygiene & LNT", "Sanitation", 2, "essential", 0, "Pack out in ziplock; biodegradable preferred"],
    // Sun & Weather Protection
    ["Sunglasses (polarized, UV400)", "Sun & Weather", "Eye Protection", 1, "essential", 0, "UV400 mandatory; cheap glasses cause MORE damage"],
    ["Buff / Neck Gaiter", "Sun & Weather", "Multi-Use", 1.5, "recommended", 0, "12 uses in one item; dust, sun, warmth"],
    ["Trekking Umbrella", "Sun & Weather", "Sun/Rain", 10, "optional", 0, "Stow immediately during lightning"],
    // Repair & Multi-tool
    ["Knife / Multi-Tool", "Repair & Tools", "Tools", 4, "essential", 0, "BSA Totin' Chip required; folding blade"],
    ["Duct Tape (compact roll)", "Repair & Tools", "Repair", 2, "essential", 0, "Wrap around trekking pole to save space"],
    ["Tent Pole Repair Sleeve", "Repair & Tools", "Repair", 0.5, "recommended", 1, "Can save a $400 tent from abandonment"],
    ["Paracord (50ft)", "Repair & Tools", "Cordage", 5, "essential", 1, "Bear bag hanging, guyline, emergency lashing"],
    // Communication & Documentation
    ["Waterproof Phone Case", "Communication", "Protection", 1, "recommended", 0, "Phone = emergency camera + offline maps"],
    ["Portable Battery Bank", "Communication", "Power", 16, "recommended", 1, "10,000mAh = ~3 phone charges; rotating schedule"],
    ["Trail Journal / Notebook", "Communication", "Documentation", 3, "optional", 0, "Rite in the Rain recommended; document your trek"],
    ["Pencils (waterproof, 3-pack)", "Communication", "Documentation", 0.5, "optional", 0, "Pencils write in rain; pens fail in cold"],
  ];

  // sharing_type overrides — items that are buddy, crew, or provided by Philmont
  const sharingOverrides = {
    "Backpacking Tent (2-3 person)": "buddy",
    "Tent Footprint / Ground Cloth": "buddy",
    "Tent Stakes (set of 10)": "buddy",
    "Emergency Tarp": "crew",
    "Topographic Map (Philmont)": "provided",
    "Handheld GPS": "crew",
    "Water Filter / Purifier": "crew",
    "Chemical Water Treatment (backup)": "crew",
    "Camp Stove (canister)": "crew",
    "Fuel Canisters (isobutane, 100g x4)": "provided",
    "Cook Pot / Pot Set": "provided",
    "Bear Bag / Ursack": "provided",
    "Trash Compactor Bags (2-pack)": "crew",
    "Camp Lantern": "crew",
    "SAM Splint": "crew",
    "PLB / Satellite Communicator": "crew",
    "Trowel (LNT cat hole)": "crew",
    "Tent Pole Repair Sleeve": "crew",
    "Paracord (50ft)": "crew",
    "Portable Battery Bank": "crew",
  };

  const insertItem = db.prepare(`
    INSERT INTO gear_catalog (name, category, subcategory, description, weight_oz, priority, is_crew_shared, sharing_type, philmont_compliant, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);
  const seedAll = db.transaction(() => {
    for (let i = 0; i < S.length; i++) {
      const [name, cat, sub, wt, pri, crew, desc] = S[i];
      const sType = sharingOverrides[name] || (crew ? "crew" : "personal");
      insertItem.run(name, cat, sub, desc, wt, pri, crew, sType, i + 1);
    }
  });
  seedAll();
  console.log(`Seeded ${S.length} gear catalog items`);
}

// ── Run migration after seed data constants are defined ──
migrate();
ensureIndexes();

// ══════════════════════════════════════════
// QUERY FUNCTIONS
// ══════════════════════════════════════════

// ── User Queries ──

export function findUserByGoogleId(googleId) {
  return db.prepare("SELECT * FROM users WHERE google_id = ?").get(googleId) || null;
}

export function findUserByEmail(email) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email?.toLowerCase()) || null;
}

export function findUserById(id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) || null;
}

export function createUser({ google_id, email, password_hash, name, avatar_url, email_verified, verification_token, tos_accepted_at }) {
  const result = db.prepare(
    "INSERT INTO users (google_id, email, password_hash, name, avatar_url, email_verified, verification_token, tos_accepted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(google_id || null, email.toLowerCase(), password_hash || null, name, avatar_url || null, email_verified || 0, verification_token || null, tos_accepted_at || null);
  return { id: result.lastInsertRowid, google_id, email: email.toLowerCase(), name, avatar_url, email_verified: email_verified || 0, user_type: null, parent_email: null };
}

export function updateUserProfile(id, { name, user_type, parent_email, parent_email_2, age_confirmed, tos_accepted_at }) {
  const sets = [];
  const vals = [];
  if (name !== undefined) { sets.push("name = ?"); vals.push(name); }
  if (user_type !== undefined) { sets.push("user_type = ?"); vals.push(user_type); }
  if (parent_email !== undefined) { sets.push("parent_email = ?"); vals.push(parent_email || null); }
  if (parent_email_2 !== undefined) { sets.push("parent_email_2 = ?"); vals.push(parent_email_2 || null); }
  if (age_confirmed !== undefined) { sets.push("age_confirmed = ?"); vals.push(age_confirmed); sets.push("age_confirmed_at = CURRENT_TIMESTAMP"); }
  if (tos_accepted_at !== undefined) { sets.push("tos_accepted_at = ?"); vals.push(tos_accepted_at); }
  if (sets.length === 0) return;
  vals.push(id);
  db.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
}

export function verifyUserEmail(token) {
  const user = db.prepare("SELECT id FROM users WHERE verification_token = ?").get(token);
  if (!user) return null;
  db.prepare("UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?").run(user.id);
  return user;
}

export function setResetToken(email, token, expiresAt) {
  db.prepare("UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?").run(token, expiresAt, email.toLowerCase());
}

export function findUserByResetToken(token) {
  return db.prepare("SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > datetime('now')").get(token) || null;
}

export function clearResetToken(userId) {
  db.prepare("UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?").run(userId);
}

export function updatePassword(userId, passwordHash) {
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, userId);
}

export function bindGoogleProfile(userId, googleId, avatarUrl) {
  db.prepare("UPDATE users SET google_id = ?, avatar_url = ? WHERE id = ?").run(googleId, avatarUrl, userId);
}

export function updateUserNameAvatar(userId, name, avatarUrl) {
  db.prepare("UPDATE users SET name = ?, avatar_url = ? WHERE id = ?").run(name, avatarUrl, userId);
}

// ── Itinerary Queries ──

export function getItineraries() {
  return db.prepare("SELECT id, name, days, miles, rating, highlights FROM itineraries ORDER BY days, id").all()
    .map(r => ({ ...r, highlights: JSON.parse(r.highlights) }));
}

export function getItinerary(id) {
  const r = db.prepare("SELECT * FROM itineraries WHERE id = ?").get(id);
  if (!r) return null;
  return {
    ...r,
    highlights: JSON.parse(r.highlights),
    route_data: JSON.parse(r.route_data),
    training_priorities: JSON.parse(r.training_priorities),
    default_skills: JSON.parse(r.default_skills),
    global_info: JSON.parse(r.global_info || "{}"),
  };
}

// ── Troop Queries ──

export function getTroops(userId) {
  return db.prepare(`
    SELECT DISTINCT t.id, t.name, t.description, t.council, t.location, t.is_public, t.tier
    FROM troops t
    LEFT JOIN troop_members tm ON t.id = tm.troop_id AND tm.user_id = ? AND tm.status != 'denied'
    WHERE t.is_public = 1 OR tm.user_id IS NOT NULL
    ORDER BY t.id
  `).all(userId);
}

export function getTroop(id) {
  const r = db.prepare("SELECT * FROM troops WHERE id = ?").get(id);
  if (!r) return null;
  return { ...r, itinerary_overrides: JSON.parse(r.itinerary_overrides) };
}

export function createTroop({ name, description, council, location, is_public, created_by }) {
  const result = db.prepare(
    "INSERT INTO troops (name, description, council, location, is_public, created_by) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(name, description || "", council || "", location || "", is_public !== undefined ? (is_public ? 1 : 0) : 1, created_by);
  const troopId = result.lastInsertRowid;

  const memberCount = db.prepare("SELECT COUNT(*) as c FROM troop_members WHERE troop_id = ?").get(troopId).c;
  db.prepare("INSERT INTO troop_members (user_id, troop_id, role, status, color_bg) VALUES (?, ?, 'admin', 'approved', ?)")
    .run(created_by, troopId, COLORS[memberCount % COLORS.length]);

  return { id: troopId, name, description: description || "", council: council || "", location: location || "", is_public: is_public !== undefined ? (is_public ? 1 : 0) : 1 };
}

export function updateTroop(troopId, { name, description, council, location, is_public }) {
  const sets = [];
  const vals = [];
  if (name !== undefined) { sets.push("name = ?"); vals.push(name); }
  if (description !== undefined) { sets.push("description = ?"); vals.push(description); }
  if (council !== undefined) { sets.push("council = ?"); vals.push(council); }
  if (location !== undefined) { sets.push("location = ?"); vals.push(location); }
  if (is_public !== undefined) { sets.push("is_public = ?"); vals.push(is_public ? 1 : 0); }
  if (sets.length === 0) return;
  vals.push(troopId);
  db.prepare(`UPDATE troops SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
}

export function updateTroopAffiliateTag(troopId, tag) {
  db.prepare("UPDATE troops SET amazon_affiliate_tag = ? WHERE id = ?").run(tag, troopId);
}

// ── Troop Member Queries ──

export function getTroopMembers(troopId, statusFilter) {
  const q = statusFilter
    ? "SELECT tm.*, u.name, u.email, u.avatar_url, u.user_type FROM troop_members tm JOIN users u ON tm.user_id = u.id WHERE tm.troop_id = ? AND tm.status = ? ORDER BY tm.id"
    : "SELECT tm.*, u.name, u.email, u.avatar_url, u.user_type FROM troop_members tm JOIN users u ON tm.user_id = u.id WHERE tm.troop_id = ? ORDER BY tm.id";
  const rows = statusFilter ? db.prepare(q).all(troopId, statusFilter) : db.prepare(q).all(troopId);
  return rows.map(r => ({
    id: r.id, user_id: r.user_id, troop_id: r.troop_id,
    name: r.name, email: r.email, avatar_url: r.avatar_url, user_type: r.user_type,
    role: r.role, status: r.status, color: { bg: r.color_bg },
    dates: JSON.parse(r.dates), skills: JSON.parse(r.skills),
  }));
}

export function getTroopMember(troopId, userId) {
  const r = db.prepare("SELECT * FROM troop_members WHERE troop_id = ? AND user_id = ?").get(troopId, userId);
  if (!r) return null;
  return { ...r, dates: JSON.parse(r.dates), skills: JSON.parse(r.skills), color: { bg: r.color_bg } };
}

export function getUserMemberships(userId) {
  return db.prepare(`
    SELECT tm.troop_id, tm.role, tm.status, t.name as troop_name, t.trek_date, t.itinerary_id,
           t.council as troop_council, t.location as troop_location
    FROM troop_members tm JOIN troops t ON tm.troop_id = t.id WHERE tm.user_id = ?
  `).all(userId);
}

export function getUserAdventureMemberships(userId) {
  return db.prepare(`
    SELECT am.adventure_id, am.role, a.name as adventure_name, a.trek_date, a.itinerary_id, a.troop_id, a.status,
           t.name as troop_name
    FROM adventure_members am
    JOIN adventures a ON am.adventure_id = a.id
    JOIN troops t ON a.troop_id = t.id
    WHERE am.user_id = ?
  `).all(userId);
}

export function requestJoinTroop(userId, troopId) {
  const memberCount = db.prepare("SELECT COUNT(*) as c FROM troop_members WHERE troop_id = ?").get(troopId).c;
  db.prepare("INSERT INTO troop_members (user_id, troop_id, role, status, color_bg) VALUES (?, ?, 'member', 'pending', ?)")
    .run(userId, troopId, COLORS[memberCount % COLORS.length]);
}

export function approveTroopMember(troopId, userId) {
  db.prepare("UPDATE troop_members SET status = 'approved' WHERE troop_id = ? AND user_id = ?").run(troopId, userId);
}

export function denyTroopMember(troopId, userId) {
  db.prepare("DELETE FROM troop_members WHERE troop_id = ? AND user_id = ? AND status = 'pending'").run(troopId, userId);
}

export function removeTroopMember(troopId, userId) {
  db.prepare("DELETE FROM troop_members WHERE troop_id = ? AND user_id = ?").run(troopId, userId);
}

export function updateMemberDates(troopId, userId, dates) {
  db.prepare("UPDATE troop_members SET dates = ? WHERE troop_id = ? AND user_id = ?").run(JSON.stringify(dates), troopId, userId);
}

export function updateMemberSkills(troopId, userId, skills) {
  db.prepare("UPDATE troop_members SET skills = ? WHERE troop_id = ? AND user_id = ?").run(JSON.stringify(skills), troopId, userId);
}

export function getTroopAdmins(troopId) {
  return db.prepare(`
    SELECT u.email, u.name FROM troop_members tm
    JOIN users u ON tm.user_id = u.id
    WHERE tm.troop_id = ? AND tm.role = 'admin' AND tm.status = 'approved'
  `).all(troopId);
}

// ── Adventure Queries ──

export function getAdventures(troopId) {
  return db.prepare("SELECT * FROM adventures WHERE troop_id = ? ORDER BY created_at DESC").all(troopId);
}

export function getAdventure(id) {
  const r = db.prepare("SELECT * FROM adventures WHERE id = ?").get(id);
  return r || null;
}

export function createAdventure({ troop_id, name, description, trek_date, depart_date, arrive_date, return_date, home_date, itinerary_id, adventure_type, created_by }) {
  const result = db.prepare(
    "INSERT INTO adventures (troop_id, name, description, trek_date, depart_date, arrive_date, return_date, home_date, itinerary_id, adventure_type, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)"
  ).run(troop_id, name, description || "", trek_date || arrive_date || null, depart_date || null, arrive_date || null, return_date || null, home_date || null, itinerary_id || null, adventure_type || "philmont", created_by);
  const advId = result.lastInsertRowid;

  // Add creator as admin member
  const creatorMember = db.prepare("SELECT color_bg FROM troop_members WHERE troop_id = ? AND user_id = ?").get(troop_id, created_by);
  const color = creatorMember?.color_bg || COLORS[0];
  db.prepare("INSERT OR IGNORE INTO adventure_members (adventure_id, user_id, role, color_bg) VALUES (?, ?, 'admin', ?)")
    .run(advId, created_by, color);

  // Seed universal Philmont skills for all Philmont adventures
  if ((adventure_type || "philmont") === "philmont") {
    seedAdventureSkills(advId, troop_id);
  }

  return { id: advId, troop_id, name, description: description || "", trek_date: trek_date || arrive_date, depart_date, arrive_date, return_date, home_date, itinerary_id, adventure_type: adventure_type || "philmont", status: "active" };
}

export function updateAdventure(id, { name, description, trek_date, depart_date, arrive_date, return_date, home_date, status, itinerary_id, adventure_type }) {
  const sets = [];
  const vals = [];
  if (name !== undefined) { sets.push("name = ?"); vals.push(name); }
  if (description !== undefined) { sets.push("description = ?"); vals.push(description); }
  if (trek_date !== undefined) { sets.push("trek_date = ?"); vals.push(trek_date); }
  if (depart_date !== undefined) { sets.push("depart_date = ?"); vals.push(depart_date); }
  if (arrive_date !== undefined) { sets.push("arrive_date = ?"); vals.push(arrive_date); }
  if (return_date !== undefined) { sets.push("return_date = ?"); vals.push(return_date); }
  if (home_date !== undefined) { sets.push("home_date = ?"); vals.push(home_date); }
  if (status !== undefined) { sets.push("status = ?"); vals.push(status); }
  if (itinerary_id !== undefined) { sets.push("itinerary_id = ?"); vals.push(itinerary_id); }
  if (adventure_type !== undefined) { sets.push("adventure_type = ?"); vals.push(adventure_type); }
  if (sets.length === 0) return;
  vals.push(id);
  db.prepare(`UPDATE adventures SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
}

export function deleteAdventure(id) {
  const run = db.transaction(() => {
    db.prepare("DELETE FROM member_gear WHERE adventure_id = ?").run(id);
    db.prepare("DELETE FROM link_requests WHERE adventure_id = ?").run(id);
    db.prepare("DELETE FROM achievements WHERE adventure_id = ?").run(id);
    db.prepare("DELETE FROM crew_milestones WHERE adventure_id = ?").run(id);
    db.prepare("DELETE FROM invitations WHERE adventure_id = ?").run(id);
    db.prepare("DELETE FROM adventure_members WHERE adventure_id = ?").run(id);
    db.prepare("DELETE FROM skills WHERE adventure_id = ?").run(id);
    db.prepare("DELETE FROM adventures WHERE id = ?").run(id);
  });
  run();
}

export function deleteTroop(troopId) {
  const run = db.transaction(() => {
    // Get all adventure IDs for this troop
    const adventures = db.prepare("SELECT id FROM adventures WHERE troop_id = ?").all(troopId);
    // Cascade-delete each adventure's child data
    for (const adv of adventures) {
      db.prepare("DELETE FROM member_gear WHERE adventure_id = ?").run(adv.id);
      db.prepare("DELETE FROM link_requests WHERE adventure_id = ?").run(adv.id);
      db.prepare("DELETE FROM achievements WHERE adventure_id = ?").run(adv.id);
      db.prepare("DELETE FROM crew_milestones WHERE adventure_id = ?").run(adv.id);
      db.prepare("DELETE FROM adventure_members WHERE adventure_id = ?").run(adv.id);
      db.prepare("DELETE FROM skills WHERE adventure_id = ?").run(adv.id);
    }
    // Delete troop-level child data
    db.prepare("DELETE FROM invitations WHERE troop_id = ?").run(troopId);
    db.prepare("DELETE FROM skills WHERE troop_id = ?").run(troopId);
    db.prepare("DELETE FROM troop_gear_overrides WHERE troop_id = ?").run(troopId);
    db.prepare("DELETE FROM troop_custom_gear WHERE troop_id = ?").run(troopId);
    db.prepare("DELETE FROM adventures WHERE troop_id = ?").run(troopId);
    db.prepare("DELETE FROM troop_members WHERE troop_id = ?").run(troopId);
    db.prepare("DELETE FROM troops WHERE id = ?").run(troopId);
  });
  run();
}

// ── Adventure Member Queries ──

export function getAdventureMembers(adventureId) {
  // Get account-based members
  const accountRows = db.prepare(`
    SELECT am.*, u.name, u.email, u.avatar_url, u.user_type
    FROM adventure_members am JOIN users u ON am.user_id = u.id
    WHERE am.adventure_id = ? AND am.is_manual = 0 ORDER BY am.id
  `).all(adventureId);
  // Get manual members (no user account)
  const manualRows = db.prepare(`
    SELECT am.* FROM adventure_members am
    WHERE am.adventure_id = ? AND am.is_manual = 1 ORDER BY am.id
  `).all(adventureId);
  const mapRow = r => {
    let linkedScouts = [];
    try { linkedScouts = JSON.parse(r.linked_scouts || "[]"); } catch { linkedScouts = []; }
    // Backward compat: if linked_scouts empty but old columns have data
    if (linkedScouts.length === 0) {
      if (r.linked_to) linkedScouts.push(r.linked_to);
      else if (r.linked_to_manual) linkedScouts.push(-r.linked_to_manual);
    }
    return {
      id: r.id, adventure_id: r.adventure_id, user_id: r.user_id,
      name: r.is_manual ? r.manual_name : r.name,
      email: r.email || null, avatar_url: r.avatar_url || null,
      user_type: r.is_manual ? "scout" : r.user_type,
      role: r.role, participation: r.participation || "trekking",
      linked_to: linkedScouts[0] || null, // backward compat for old code
      linked_scouts: linkedScouts,
      is_manual: !!r.is_manual,
      color: { bg: r.color_bg },
      dates: JSON.parse(r.dates), skills: JSON.parse(r.skills),
      gear: JSON.parse(r.gear), medical: JSON.parse(r.medical), admin_tasks: JSON.parse(r.admin_tasks),
    };
  };
  return [...accountRows.map(mapRow), ...manualRows.map(mapRow)];
}

export function getAdventureMember(adventureId, userId) {
  const r = db.prepare("SELECT * FROM adventure_members WHERE adventure_id = ? AND user_id = ?").get(adventureId, userId);
  if (!r) return null;
  let linkedScouts = [];
  try { linkedScouts = JSON.parse(r.linked_scouts || "[]"); } catch { linkedScouts = []; }
  if (linkedScouts.length === 0) {
    if (r.linked_to) linkedScouts.push(r.linked_to);
    else if (r.linked_to_manual) linkedScouts.push(-r.linked_to_manual);
  }
  return {
    ...r, color: { bg: r.color_bg }, participation: r.participation || "trekking",
    linked_to: linkedScouts[0] || null,
    linked_scouts: linkedScouts,
    is_manual: !!r.is_manual,
    dates: JSON.parse(r.dates), skills: JSON.parse(r.skills),
    gear: JSON.parse(r.gear), medical: JSON.parse(r.medical), admin_tasks: JSON.parse(r.admin_tasks),
  };
}

export function addAdventureMember(adventureId, userId, role = "member") {
  const adv = db.prepare("SELECT troop_id FROM adventures WHERE id = ?").get(adventureId);
  if (!adv) return null;
  const troopMember = db.prepare("SELECT color_bg FROM troop_members WHERE troop_id = ? AND user_id = ?").get(adv.troop_id, userId);
  const existingCount = db.prepare("SELECT COUNT(*) as c FROM adventure_members WHERE adventure_id = ?").get(adventureId).c;
  const color = troopMember?.color_bg || COLORS[existingCount % COLORS.length];
  db.prepare("INSERT OR IGNORE INTO adventure_members (adventure_id, user_id, role, color_bg) VALUES (?, ?, ?, ?)")
    .run(adventureId, userId, role, color);
}

export function removeAdventureMember(adventureId, userId) {
  const run = db.transaction(() => {
    db.prepare("DELETE FROM member_gear WHERE adventure_id = ? AND user_id = ?").run(adventureId, userId);
    db.prepare("DELETE FROM achievements WHERE adventure_id = ? AND user_id = ?").run(adventureId, userId);
    db.prepare("DELETE FROM link_requests WHERE adventure_id = ? AND (requester_id = ? OR scout_id = ?)").run(adventureId, userId, userId);
    // Clean up linked_scouts references: remove this user's ID from any adult's linked_scouts array
    const adults = db.prepare("SELECT id, linked_scouts FROM adventure_members WHERE adventure_id = ? AND linked_scouts != '[]'").all(adventureId);
    for (const a of adults) {
      try {
        const scouts = JSON.parse(a.linked_scouts || "[]");
        const filtered = scouts.filter(sid => sid !== userId);
        if (filtered.length !== scouts.length) {
          db.prepare("UPDATE adventure_members SET linked_scouts = ? WHERE id = ?").run(JSON.stringify(filtered), a.id);
        }
      } catch {}
    }
    db.prepare("DELETE FROM adventure_members WHERE adventure_id = ? AND user_id = ?").run(adventureId, userId);
  });
  run();
}

export function updateAdventureMemberDates(adventureId, userId, dates) {
  db.prepare("UPDATE adventure_members SET dates = ? WHERE adventure_id = ? AND user_id = ?")
    .run(JSON.stringify(dates), adventureId, userId);
}

export function updateAdventureMemberSkills(adventureId, userId, skills) {
  db.prepare("UPDATE adventure_members SET skills = ? WHERE adventure_id = ? AND user_id = ?")
    .run(JSON.stringify(skills), adventureId, userId);
}

export function updateAdventureMemberGear(adventureId, userId, gear) {
  db.prepare("UPDATE adventure_members SET gear = ? WHERE adventure_id = ? AND user_id = ?")
    .run(JSON.stringify(gear), adventureId, userId);
}

export function updateAdventureMemberMedical(adventureId, userId, medical) {
  db.prepare("UPDATE adventure_members SET medical = ? WHERE adventure_id = ? AND user_id = ?")
    .run(JSON.stringify(medical), adventureId, userId);
}

export function updateAdventureMemberAdmin(adventureId, userId, adminTasks) {
  db.prepare("UPDATE adventure_members SET admin_tasks = ? WHERE adventure_id = ? AND user_id = ?")
    .run(JSON.stringify(adminTasks), adventureId, userId);
}

// ── Skills Queries (now adventure-scoped) ──

export function getAdventureSkills(adventureId, category) {
  const q = category
    ? "SELECT * FROM skills WHERE adventure_id = ? AND category = ? ORDER BY sort_order, id"
    : "SELECT * FROM skills WHERE adventure_id = ? ORDER BY category, sort_order, id";
  const rows = category ? db.prepare(q).all(adventureId, category) : db.prepare(q).all(adventureId);
  return rows.map(s => ({
    id: s.id, name: s.name, icon: s.icon, desc: s.description,
    category: s.category, isDefault: !!s.is_default,
  }));
}

export function addAdventureSkill(adventureId, name, desc, category = "training", icon = "📋") {
  const adv = db.prepare("SELECT troop_id FROM adventures WHERE id = ?").get(adventureId);
  if (!adv) return null;
  const id = `${adventureId}-custom-${Date.now()}`;
  const maxOrder = db.prepare("SELECT MAX(sort_order) as m FROM skills WHERE adventure_id = ?").get(adventureId).m || 0;
  db.prepare("INSERT INTO skills (id, troop_id, adventure_id, name, icon, description, category, is_default, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)")
    .run(id, adv.troop_id, adventureId, name.trim(), icon, desc?.trim() || "", category, maxOrder + 1);
  return { id, name: name.trim(), icon, desc: desc?.trim() || "", category, isDefault: false };
}

export function removeAdventureSkill(adventureId, skillId) {
  const skill = db.prepare("SELECT is_default FROM skills WHERE id = ? AND adventure_id = ?").get(skillId, adventureId);
  if (skill?.is_default) return { error: "Cannot remove default skills" };
  db.prepare("DELETE FROM skills WHERE id = ? AND adventure_id = ?").run(skillId, adventureId);
  return { ok: true };
}

// Legacy troop-scoped skill queries (kept for backward compat during transition)
export function getTroopSkills(troopId) {
  return db.prepare("SELECT * FROM skills WHERE troop_id = ? ORDER BY sort_order, id").all(troopId).map(s => ({
    id: s.id, name: s.name, icon: s.icon, desc: s.description, category: s.category || "training", isDefault: !!s.is_default,
  }));
}

export function addTroopSkill(troopId, name, desc) {
  const id = `${troopId}-custom-${Date.now()}`;
  const maxOrder = db.prepare("SELECT MAX(sort_order) as m FROM skills WHERE troop_id = ?").get(troopId).m || 0;
  db.prepare("INSERT INTO skills (id, troop_id, name, icon, description, is_default, sort_order) VALUES (?, ?, ?, '📋', ?, 0, ?)")
    .run(id, troopId, name.trim(), desc?.trim() || "Custom skill", maxOrder + 1);
  return { id, name: name.trim(), icon: "📋", desc: desc?.trim() || "Custom skill", isDefault: false };
}

export function removeTroopSkill(troopId, skillId) {
  const skill = db.prepare("SELECT is_default FROM skills WHERE id = ? AND troop_id = ?").get(skillId, troopId);
  if (skill?.is_default) return { error: "Cannot remove default skills" };
  db.prepare("DELETE FROM skills WHERE id = ? AND troop_id = ?").run(skillId, troopId);
  return { ok: true };
}

// ── Gear Queries ──

export function getGearItems(tags) {
  const items = db.prepare("SELECT * FROM gear_items ORDER BY sort_order").all();
  return items.map(g => ({ ...g, itinerary_tags: JSON.parse(g.itinerary_tags) }))
    .filter(g => !tags || tags.length === 0 || g.itinerary_tags.some(t => t === "all" || tags.includes(t)));
}

// ── Platform Settings ──

export function getSetting(key) {
  const r = db.prepare("SELECT value FROM platform_settings WHERE key = ?").get(key);
  return r?.value || null;
}

export function setSetting(key, value) {
  db.prepare("INSERT OR REPLACE INTO platform_settings (key, value) VALUES (?, ?)").run(key, value);
}

// ── Invitation Queries ──

export function createInvitation({ troop_id, adventure_id, email, invited_by, token }) {
  const result = db.prepare(
    "INSERT INTO invitations (troop_id, adventure_id, email, invited_by, token) VALUES (?, ?, ?, ?, ?)"
  ).run(troop_id, adventure_id || null, email.toLowerCase(), invited_by, token);
  return { id: result.lastInsertRowid, troop_id, adventure_id, email: email.toLowerCase(), status: "pending", token };
}

export function getInvitationByToken(token) {
  return db.prepare("SELECT * FROM invitations WHERE token = ?").get(token) || null;
}

export function getInvitations(adventureId) {
  return db.prepare(`
    SELECT i.*, u.name as invited_by_name
    FROM invitations i JOIN users u ON i.invited_by = u.id
    WHERE i.adventure_id = ? ORDER BY i.created_at DESC
  `).all(adventureId);
}

export function updateInvitationStatus(id, status) {
  db.prepare("UPDATE invitations SET status = ? WHERE id = ?").run(status, id);
}

export function getInvitationsByEmail(email) {
  return db.prepare("SELECT * FROM invitations WHERE email = ? AND status = 'pending'").all(email.toLowerCase());
}

// ── Member Role & Participation ──

export function updateAdventureMemberRole(adventureId, userId, role) {
  db.prepare("UPDATE adventure_members SET role = ? WHERE adventure_id = ? AND user_id = ?")
    .run(role, adventureId, userId);
}

export function updateAdventureMemberParticipation(adventureId, userId, participation) {
  db.prepare("UPDATE adventure_members SET participation = ? WHERE adventure_id = ? AND user_id = ?")
    .run(participation, adventureId, userId);
}

export function linkMember(adventureId, supportUserId, linkedScouts) {
  // linkedScouts: array of values — positive = user_id, negative = -manual adventure_members.id
  // Max 3 scouts per adult
  const scouts = Array.isArray(linkedScouts) ? linkedScouts.slice(0, 3) : [];
  db.prepare("UPDATE adventure_members SET linked_scouts = ? WHERE adventure_id = ? AND user_id = ?")
    .run(JSON.stringify(scouts), adventureId, supportUserId);
}

// ── Manual Members ──

export function addManualMember(adventureId, name) {
  const existingCount = db.prepare("SELECT COUNT(*) as c FROM adventure_members WHERE adventure_id = ?").get(adventureId).c;
  const color = COLORS[existingCount % COLORS.length];
  const result = db.prepare(
    "INSERT INTO adventure_members (adventure_id, user_id, role, is_manual, manual_name, color_bg, participation) VALUES (?, NULL, 'member', 1, ?, ?, 'trekking')"
  ).run(adventureId, name, color);
  return { id: result.lastInsertRowid, name, color: { bg: color }, is_manual: true };
}

export function removeManualMember(adventureId, memberId) {
  // Clean up linked_scouts references: remove -memberId from any adult's linked_scouts array
  const negId = -memberId;
  const adults = db.prepare("SELECT id, linked_scouts FROM adventure_members WHERE adventure_id = ? AND linked_scouts != '[]'").all(adventureId);
  for (const a of adults) {
    try {
      const scouts = JSON.parse(a.linked_scouts || "[]");
      const filtered = scouts.filter(sid => sid !== negId);
      if (filtered.length !== scouts.length) {
        db.prepare("UPDATE adventure_members SET linked_scouts = ? WHERE id = ?").run(JSON.stringify(filtered), a.id);
      }
    } catch {}
  }
  db.prepare("DELETE FROM adventure_members WHERE adventure_id = ? AND id = ? AND is_manual = 1").run(adventureId, memberId);
}

// ── Achievement & Milestone Queries ──

export function earnBadge(adventureId, userId, badgeType) {
  try {
    db.prepare("INSERT OR IGNORE INTO achievements (adventure_id, user_id, badge_type) VALUES (?, ?, ?)")
      .run(adventureId, userId, badgeType);
    return true;
  } catch { return false; }
}

export function getBadges(adventureId, userId) {
  if (userId) {
    return db.prepare("SELECT * FROM achievements WHERE adventure_id = ? AND user_id = ?").all(adventureId, userId);
  }
  return db.prepare("SELECT * FROM achievements WHERE adventure_id = ?").all(adventureId);
}

export function getCrewMilestones(adventureId) {
  return db.prepare("SELECT * FROM crew_milestones WHERE adventure_id = ? ORDER BY reached_at").all(adventureId);
}

export function addCrewMilestone(adventureId, milestoneType) {
  try {
    db.prepare("INSERT OR IGNORE INTO crew_milestones (adventure_id, milestone_type) VALUES (?, ?)")
      .run(adventureId, milestoneType);
    return true;
  } catch { return false; }
}

// ── Parent-Scout Auto-Linking ──

export function autoLinkAdult(adventureId, adultUserId) {
  const adultUser = findUserById(adultUserId);
  if (!adultUser || adultUser.user_type !== "adult") return null;
  // Find scouts in this adventure whose parent_email matches the adult's login email
  const match = db.prepare(`
    SELECT am.user_id FROM adventure_members am
    JOIN users u ON am.user_id = u.id
    WHERE am.adventure_id = ? AND u.user_type = 'scout' AND am.is_manual = 0
    AND (LOWER(u.parent_email) = ? OR LOWER(u.parent_email_2) = ?)
    LIMIT 1
  `).get(adventureId, adultUser.email.toLowerCase(), adultUser.email.toLowerCase());
  if (match) {
    db.prepare("UPDATE adventure_members SET linked_to = ? WHERE adventure_id = ? AND user_id = ?")
      .run(match.user_id, adventureId, adultUserId);
    return match.user_id;
  }
  return null;
}

export function autoLinkScout(adventureId, scoutUserId) {
  const scoutUser = findUserById(scoutUserId);
  if (!scoutUser || scoutUser.user_type !== "scout") return null;
  const parentEmails = [scoutUser.parent_email, scoutUser.parent_email_2]
    .filter(Boolean).map(e => e.toLowerCase());
  if (parentEmails.length === 0) return null;
  // Find unlinked adults in this adventure whose email matches a parent email
  const placeholders = parentEmails.map(() => "?").join(", ");
  const match = db.prepare(`
    SELECT am.user_id FROM adventure_members am
    JOIN users u ON am.user_id = u.id
    WHERE am.adventure_id = ? AND u.user_type = 'adult' AND am.is_manual = 0
    AND am.linked_to IS NULL AND LOWER(u.email) IN (${placeholders})
    LIMIT 1
  `).get(adventureId, ...parentEmails);
  if (match) {
    db.prepare("UPDATE adventure_members SET linked_to = ? WHERE adventure_id = ? AND user_id = ?")
      .run(scoutUserId, adventureId, match.user_id);
    return match.user_id;
  }
  return null;
}

// ── Link Requests ──

export function createLinkRequest(adventureId, requesterId, scoutId) {
  const result = db.prepare(
    "INSERT OR IGNORE INTO link_requests (adventure_id, requester_id, scout_id) VALUES (?, ?, ?)"
  ).run(adventureId, requesterId, scoutId);
  return result.changes > 0 ? { id: result.lastInsertRowid } : null;
}

export function getLinkRequests(adventureId, status) {
  const base = `
    SELECT lr.*, u_req.name as requester_name, u_req.email as requester_email,
           u_scout.name as scout_name
    FROM link_requests lr
    JOIN users u_req ON lr.requester_id = u_req.id
    JOIN users u_scout ON lr.scout_id = u_scout.id
    WHERE lr.adventure_id = ?`;
  if (status) {
    return db.prepare(base + " AND lr.status = ? ORDER BY lr.created_at DESC").all(adventureId, status);
  }
  return db.prepare(base + " ORDER BY lr.created_at DESC").all(adventureId);
}

export function getMyLinkRequests(adventureId, userId) {
  return db.prepare(
    "SELECT * FROM link_requests WHERE adventure_id = ? AND requester_id = ? ORDER BY created_at DESC"
  ).all(adventureId, userId);
}

export function approveLinkRequest(requestId, reviewedBy) {
  const req = db.prepare("SELECT * FROM link_requests WHERE id = ? AND status = 'pending'").get(requestId);
  if (!req) return null;
  db.prepare("UPDATE link_requests SET status = 'approved', reviewed_by = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(reviewedBy, requestId);
  db.prepare("UPDATE adventure_members SET linked_to = ? WHERE adventure_id = ? AND user_id = ?")
    .run(req.scout_id, req.adventure_id, req.requester_id);
  return req;
}

export function denyLinkRequest(requestId, reviewedBy) {
  db.prepare("UPDATE link_requests SET status = 'denied', reviewed_by = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(reviewedBy, requestId);
}

// ══════════════════════════════════════════
// GEAR CATALOG QUERIES
// ══════════════════════════════════════════

// ── Gear Catalog (read) ──

export function getGearCatalog(troopId) {
  const items = db.prepare("SELECT * FROM gear_catalog WHERE active = 1 ORDER BY sort_order").all();

  const allOptions = db.prepare(`
    SELECT gpo.* FROM gear_product_options gpo
    JOIN gear_catalog gc ON gpo.gear_catalog_id = gc.id
    WHERE gc.active = 1 ORDER BY gpo.sort_order
  `).all();

  const optionsByItem = {};
  for (const opt of allOptions) {
    if (!optionsByItem[opt.gear_catalog_id]) optionsByItem[opt.gear_catalog_id] = [];
    optionsByItem[opt.gear_catalog_id].push(opt);
  }

  let hiddenIds = new Set();
  if (troopId) {
    const overrides = db.prepare("SELECT gear_catalog_id FROM troop_gear_overrides WHERE troop_id = ? AND hidden = 1").all(troopId);
    hiddenIds = new Set(overrides.map(o => o.gear_catalog_id));
  }

  return items
    .filter(item => !hiddenIds.has(item.id))
    .map(item => ({ ...item, options: optionsByItem[item.id] || [] }));
}

export function getGearCatalogItem(id) {
  const item = db.prepare("SELECT * FROM gear_catalog WHERE id = ?").get(id);
  if (!item) return null;
  const options = db.prepare("SELECT * FROM gear_product_options WHERE gear_catalog_id = ? ORDER BY sort_order").all(id);
  return { ...item, options };
}

export function getGearCategories() {
  return db.prepare(`
    SELECT category, COUNT(*) as item_count
    FROM gear_catalog WHERE active = 1
    GROUP BY category ORDER BY MIN(sort_order)
  `).all();
}

// ── Member Gear (adventure-scoped) ──

export function getMemberGear(adventureId, userId) {
  return db.prepare(`
    SELECT mg.*, gc.name as gear_name, gc.category, gc.weight_oz as default_weight_oz,
           gc.priority, gc.is_crew_shared, gc.sharing_type, gc.philmont_compliant, gc.compliance_notes,
           gpo.product_name as selected_product_name, gpo.weight_oz as selected_weight_oz,
           gpo.brand as selected_brand, gpo.price as selected_price
    FROM member_gear mg
    JOIN gear_catalog gc ON mg.gear_catalog_id = gc.id
    LEFT JOIN gear_product_options gpo ON mg.selected_option_id = gpo.id
    WHERE mg.adventure_id = ? AND mg.user_id = ?
    ORDER BY gc.sort_order
  `).all(adventureId, userId);
}

export function getAdventureMemberGearAll(adventureId) {
  return db.prepare(`
    SELECT mg.*, gc.name as gear_name, gc.category, gc.weight_oz as default_weight_oz,
           gc.priority, gc.is_crew_shared, gc.sharing_type
    FROM member_gear mg
    JOIN gear_catalog gc ON mg.gear_catalog_id = gc.id
    WHERE mg.adventure_id = ?
    ORDER BY mg.user_id, gc.sort_order
  `).all(adventureId);
}

export function upsertMemberGear(adventureId, userId, gearCatalogId, data) {
  const existing = db.prepare(
    "SELECT id FROM member_gear WHERE adventure_id = ? AND user_id = ? AND gear_catalog_id = ?"
  ).get(adventureId, userId, gearCatalogId);

  if (existing) {
    const sets = [];
    const vals = [];
    if (data.status !== undefined) { sets.push("status = ?"); vals.push(data.status); }
    if (data.selected_option_id !== undefined) { sets.push("selected_option_id = ?"); vals.push(data.selected_option_id); }
    if (data.custom_product_name !== undefined) { sets.push("custom_product_name = ?"); vals.push(data.custom_product_name); }
    if (data.custom_weight_oz !== undefined) { sets.push("custom_weight_oz = ?"); vals.push(data.custom_weight_oz); }
    if (data.notes !== undefined) { sets.push("notes = ?"); vals.push(data.notes); }
    if (sets.length > 0) {
      sets.push("updated_at = CURRENT_TIMESTAMP");
      vals.push(existing.id);
      db.prepare(`UPDATE member_gear SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
    }
    return existing.id;
  } else {
    const result = db.prepare(
      "INSERT INTO member_gear (adventure_id, user_id, gear_catalog_id, status, selected_option_id, custom_product_name, custom_weight_oz, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(adventureId, userId, gearCatalogId, data.status || "needed", data.selected_option_id || null, data.custom_product_name || null, data.custom_weight_oz || null, data.notes || null);
    return result.lastInsertRowid;
  }
}

export function bulkSetMemberGear(adventureId, userId, gearSelections) {
  const upsert = db.transaction(() => {
    for (const sel of gearSelections) {
      upsertMemberGear(adventureId, userId, sel.gear_catalog_id, sel);
    }
  });
  upsert();
}

export function removeMemberGearItem(adventureId, userId, gearCatalogId) {
  db.prepare("DELETE FROM member_gear WHERE adventure_id = ? AND user_id = ? AND gear_catalog_id = ?")
    .run(adventureId, userId, gearCatalogId);
}

// ── Pack Weight Calculator ──

export function getMemberPackWeight(adventureId, userId) {
  const gear = db.prepare(`
    SELECT mg.status, mg.custom_weight_oz,
           gc.category, gc.weight_oz as default_weight_oz, gc.is_crew_shared,
           gc.sharing_type,
           gpo.weight_oz as option_weight_oz
    FROM member_gear mg
    JOIN gear_catalog gc ON mg.gear_catalog_id = gc.id
    LEFT JOIN gear_product_options gpo ON mg.selected_option_id = gpo.id
    WHERE mg.adventure_id = ? AND mg.user_id = ? AND mg.status = 'packed'
  `).all(adventureId, userId);

  const byCategory = {};
  let totalOz = 0;
  let crewBuddyCount = 0;
  let providedCount = 0;

  for (const g of gear) {
    const sType = g.sharing_type || "personal";
    // Only count personal items toward pack weight
    // Crew/buddy gear weight is split and hard to estimate per-person; deferred
    // Provided gear is on-site, no weight impact on travel
    if (sType !== "personal") {
      if (sType === "provided") providedCount++;
      else crewBuddyCount++;
      continue;
    }
    // Use custom weight > selected option weight > default catalog weight
    const weight = g.custom_weight_oz || g.option_weight_oz || g.default_weight_oz || 0;
    if (!byCategory[g.category]) byCategory[g.category] = { weight_oz: 0, count: 0 };
    byCategory[g.category].weight_oz += weight;
    byCategory[g.category].count += 1;
    totalOz += weight;
  }

  const totalLbs = totalOz / 16;
  // Estimates: food ~1.75 lbs/day × trek days, water ~6.6 lbs (3L typical hiking carry)
  // Only add food/water when there are packed items
  const adventure = getAdventure(adventureId);
  let trekDays = 12; // default fallback
  if (adventure?.itinerary_id) {
    const itin = getItinerary(adventure.itinerary_id);
    if (itin?.days) trekDays = itin.days;
  }
  const personalCount = gear.length - crewBuddyCount - providedCount;
  const hasPacked = personalCount > 0;
  const foodLbs = hasPacked ? Math.round(1.75 * trekDays * 10) / 10 : 0;
  const waterLbs = hasPacked ? 6.6 : 0;
  const grandTotalLbs = totalLbs + foodLbs + waterLbs;

  return {
    base_weight_oz: totalOz,
    base_weight_lbs: Math.round(totalLbs * 10) / 10,
    food_estimate_lbs: foodLbs,
    trek_days: trekDays,
    water_lbs: waterLbs,
    grand_total_lbs: Math.round(grandTotalLbs * 10) / 10,
    by_category: byCategory,
    item_count: personalCount,
    crew_buddy_count: crewBuddyCount,
    provided_count: providedCount,
    total_packed: gear.length,
    philmont_limit_lbs: 50,
    over_limit: grandTotalLbs > 50,
  };
}

// ── Gear Admin (global admin CRUD) ──

export function createGearCatalogItem(data) {
  const maxOrder = db.prepare("SELECT MAX(sort_order) as m FROM gear_catalog").get().m || 0;
  const result = db.prepare(`
    INSERT INTO gear_catalog (name, category, subcategory, description, weight_oz, weight_class, priority, price_tier, msrp, rating_stars, rating_notes, philmont_compliant, compliance_notes, is_crew_shared, sharing_type, affiliate_priority, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.name, data.category, data.subcategory || null, data.description || null,
    data.weight_oz || null, data.weight_class || null, data.priority || "recommended",
    data.price_tier || null, data.msrp || null, data.rating_stars || null, data.rating_notes || null,
    data.philmont_compliant ?? 1, data.compliance_notes || null,
    data.is_crew_shared || 0, data.sharing_type || "personal", data.affiliate_priority || "Medium", maxOrder + 1
  );
  return { id: result.lastInsertRowid, ...data };
}

export function updateGearCatalogItem(id, data) {
  const sets = [];
  const vals = [];
  const fields = ["name", "category", "subcategory", "description", "weight_oz", "weight_class", "priority",
    "price_tier", "msrp", "rating_stars", "rating_notes", "philmont_compliant", "compliance_notes",
    "is_crew_shared", "sharing_type", "affiliate_priority", "sort_order", "active"];
  for (const f of fields) {
    if (data[f] !== undefined) { sets.push(`${f} = ?`); vals.push(data[f]); }
  }
  if (sets.length === 0) return;
  sets.push("updated_at = CURRENT_TIMESTAMP");
  vals.push(id);
  db.prepare(`UPDATE gear_catalog SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
}

export function softDeleteGearCatalogItem(id) {
  db.prepare("UPDATE gear_catalog SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
}

export function reorderGearCatalog(orderedIds) {
  const stmt = db.prepare("UPDATE gear_catalog SET sort_order = ? WHERE id = ?");
  const reorder = db.transaction(() => {
    orderedIds.forEach((id, i) => stmt.run(i + 1, id));
  });
  reorder();
}

// ── Product Options Admin ──

export function addProductOption(gearCatalogId, data) {
  const maxOrder = db.prepare("SELECT MAX(sort_order) as m FROM gear_product_options WHERE gear_catalog_id = ?").get(gearCatalogId).m || 0;
  const result = db.prepare(`
    INSERT INTO gear_product_options (gear_catalog_id, tier, star_rating, product_name, brand, price, weight_oz, notes, is_ultralight_pick, sort_order, affiliate_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(gearCatalogId, data.tier, data.star_rating || 3, data.product_name, data.brand || null, data.price || null, data.weight_oz || null, data.notes || null, data.is_ultralight_pick || 0, maxOrder + 1, data.affiliate_url || null);
  return { id: result.lastInsertRowid, ...data };
}

export function updateProductOption(optionId, data) {
  const sets = [];
  const vals = [];
  const fields = ["tier", "star_rating", "product_name", "brand", "price", "weight_oz", "notes", "is_ultralight_pick", "sort_order", "affiliate_url"];
  for (const f of fields) {
    if (data[f] !== undefined) { sets.push(`${f} = ?`); vals.push(data[f]); }
  }
  if (sets.length === 0) return;
  vals.push(optionId);
  db.prepare(`UPDATE gear_product_options SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
}

export function deleteProductOption(optionId) {
  db.prepare("UPDATE member_gear SET selected_option_id = NULL WHERE selected_option_id = ?").run(optionId);
  db.prepare("DELETE FROM gear_product_options WHERE id = ?").run(optionId);
}

// ── Global Admin Queries ──

export function getAllTroopsAdmin() {
  return db.prepare(`
    SELECT t.*,
      (SELECT COUNT(*) FROM troop_members WHERE troop_id = t.id AND status = 'approved') as member_count,
      (SELECT COUNT(*) FROM troop_members WHERE troop_id = t.id AND status = 'pending') as pending_count,
      (SELECT COUNT(*) FROM adventures WHERE troop_id = t.id) as adventure_count,
      u.name as creator_name, u.email as creator_email
    FROM troops t
    LEFT JOIN users u ON t.created_by = u.id
    ORDER BY t.created_at DESC
  `).all();
}

export function getTroopMembersAdmin(troopId) {
  return db.prepare(`
    SELECT tm.id, tm.user_id, tm.troop_id, tm.role, tm.status, tm.created_at,
           u.name, u.email, u.avatar_url, u.user_type
    FROM troop_members tm JOIN users u ON tm.user_id = u.id
    WHERE tm.troop_id = ? ORDER BY tm.status DESC, tm.role DESC, tm.id
  `).all(troopId);
}

export function getAllUsersAdmin() {
  return db.prepare(`
    SELECT u.id, u.email, u.name, u.user_type, u.created_at, u.email_verified,
      (SELECT COUNT(*) FROM troop_members WHERE user_id = u.id AND status = 'approved') as troop_count
    FROM users u ORDER BY u.created_at DESC
  `).all();
}

export function getAllSettings() {
  return db.prepare("SELECT * FROM platform_settings ORDER BY key").all();
}

export function trackAffiliateClick(userId, productOptionId, gearCatalogId, url, referrer) {
  db.prepare(
    "INSERT INTO affiliate_clicks (user_id, product_option_id, gear_catalog_id, url, referrer) VALUES (?, ?, ?, ?, ?)"
  ).run(userId, productOptionId || null, gearCatalogId || null, url, referrer || null);
}

export function getAffiliateStats() {
  const totalClicks = db.prepare("SELECT COUNT(*) as total FROM affiliate_clicks").get().total;
  const clicksByProduct = db.prepare(`
    SELECT gc.name as gear_name, gpo.product_name, COUNT(*) as clicks, MAX(ac.created_at) as last_click
    FROM affiliate_clicks ac
    LEFT JOIN gear_product_options gpo ON ac.product_option_id = gpo.id
    LEFT JOIN gear_catalog gc ON ac.gear_catalog_id = gc.id
    GROUP BY ac.product_option_id, ac.gear_catalog_id
    ORDER BY clicks DESC LIMIT 50
  `).all();
  const clicksByDay = db.prepare(`
    SELECT DATE(created_at) as day, COUNT(*) as clicks
    FROM affiliate_clicks WHERE created_at >= DATE('now', '-30 days')
    GROUP BY DATE(created_at) ORDER BY day
  `).all();
  return { totalClicks, clicksByProduct, clicksByDay };
}

// ── Troop Gear Overrides ──

export function setTroopGearOverride(troopId, gearCatalogId, hidden) {
  db.prepare(
    "INSERT OR REPLACE INTO troop_gear_overrides (troop_id, gear_catalog_id, hidden) VALUES (?, ?, ?)"
  ).run(troopId, gearCatalogId, hidden ? 1 : 0);
}

export function getTroopGearOverrides(troopId) {
  return db.prepare("SELECT * FROM troop_gear_overrides WHERE troop_id = ?").all(troopId);
}

// ── Troop Custom Gear ──

export function getTroopCustomGear(troopId) {
  return db.prepare("SELECT * FROM troop_custom_gear WHERE troop_id = ? AND active = 1 ORDER BY sort_order").all(troopId);
}

export function addTroopCustomGear(troopId, data) {
  const maxOrder = db.prepare("SELECT MAX(sort_order) as m FROM troop_custom_gear WHERE troop_id = ?").get(troopId).m || 0;
  const result = db.prepare(`
    INSERT INTO troop_custom_gear (troop_id, name, category, subcategory, description, weight_oz, priority, is_crew_shared, sharing_type, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(troopId, data.name, data.category, data.subcategory || null, data.description || null, data.weight_oz || null, data.priority || "recommended", data.is_crew_shared || 0, data.sharing_type || "personal", maxOrder + 1);
  return { id: result.lastInsertRowid, troop_id: troopId, ...data };
}

export function updateTroopCustomGearItem(troopId, id, data) {
  const sets = [];
  const vals = [];
  const fields = ["name", "category", "subcategory", "description", "weight_oz", "priority", "is_crew_shared", "sharing_type", "sort_order", "active"];
  for (const f of fields) {
    if (data[f] !== undefined) { sets.push(`${f} = ?`); vals.push(data[f]); }
  }
  if (sets.length === 0) return;
  vals.push(id, troopId);
  db.prepare(`UPDATE troop_custom_gear SET ${sets.join(", ")} WHERE id = ? AND troop_id = ?`).run(...vals);
}

export function deleteTroopCustomGear(troopId, id) {
  db.prepare("UPDATE troop_custom_gear SET active = 0 WHERE id = ? AND troop_id = ?").run(id, troopId);
}

// ── AI Logs ──

export function logAIQuery(userId, adventureId, query, response, tokensUsed) {
  db.prepare("INSERT INTO gear_ai_logs (user_id, adventure_id, query, response, tokens_used) VALUES (?, ?, ?, ?, ?)")
    .run(userId, adventureId || null, query, response, tokensUsed || 0);
}

export function getAIUsage(userId) {
  return db.prepare(`
    SELECT COUNT(*) as query_count, SUM(tokens_used) as total_tokens
    FROM gear_ai_logs WHERE user_id = ?
  `).get(userId);
}

// ── Session Store ──

export function createSessionStore(session) {
  const Store = session.Store;
  class SqliteStore extends Store {
    get(sid, cb) {
      try {
        const row = db.prepare("SELECT sess FROM sessions WHERE sid = ? AND expired > ?").get(sid, Date.now());
        cb(null, row ? JSON.parse(row.sess) : null);
      } catch (e) { cb(e); }
    }
    set(sid, sess, cb) {
      try {
        const maxAge = sess.cookie?.maxAge || 86400000;
        db.prepare("INSERT OR REPLACE INTO sessions (sid, sess, expired) VALUES (?, ?, ?)").run(sid, JSON.stringify(sess), Date.now() + maxAge);
        cb?.(null);
      } catch (e) { cb?.(e); }
    }
    destroy(sid, cb) {
      try { db.prepare("DELETE FROM sessions WHERE sid = ?").run(sid); cb?.(null); } catch (e) { cb?.(e); }
    }
    touch(sid, sess, cb) {
      try {
        const maxAge = sess.cookie?.maxAge || 86400000;
        db.prepare("UPDATE sessions SET expired = ? WHERE sid = ?").run(Date.now() + maxAge, sid);
        cb?.(null);
      } catch (e) { cb?.(e); }
    }
  }
  const store = new SqliteStore();
  // GC: clean expired sessions every hour
  setInterval(() => {
    try { db.prepare("DELETE FROM sessions WHERE expired <= ?").run(Date.now()); }
    catch (e) { console.error("Session GC error:", e.message); }
  }, 60 * 60 * 1000);
  return store;
}

// ── Training Events ──

export function createTrainingEvent(adventureId, data, createdBy) {
  const r = db.prepare(
    "INSERT INTO training_events (adventure_id, date, period, time_label, location, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(adventureId, data.date, data.period || "all", data.time_label || null, data.location || null, data.notes || null, createdBy);
  return { id: Number(r.lastInsertRowid), ...data };
}

export function getTrainingEvents(adventureId) {
  const events = db.prepare("SELECT * FROM training_events WHERE adventure_id = ? ORDER BY date, period").all(adventureId);
  for (const e of events) {
    e.rsvps = db.prepare(`
      SELECT tr.user_id, tr.status, u.name FROM training_rsvps tr
      JOIN users u ON tr.user_id = u.id
      WHERE tr.event_id = ?
    `).all(e.id);
  }
  return events;
}

export function getTrainingEvent(eventId) {
  const e = db.prepare("SELECT * FROM training_events WHERE id = ?").get(eventId);
  if (!e) return null;
  e.rsvps = db.prepare(`
    SELECT tr.user_id, tr.status, u.name FROM training_rsvps tr
    JOIN users u ON tr.user_id = u.id
    WHERE tr.event_id = ?
  `).all(e.id);
  return e;
}

export function deleteTrainingEvent(eventId) {
  db.prepare("DELETE FROM training_events WHERE id = ?").run(eventId);
}

export function upsertTrainingRsvp(eventId, userId, status) {
  db.prepare(
    "INSERT INTO training_rsvps (event_id, user_id, status, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(event_id, user_id) DO UPDATE SET status = ?, updated_at = CURRENT_TIMESTAMP"
  ).run(eventId, userId, status, status);
}

export default db;
