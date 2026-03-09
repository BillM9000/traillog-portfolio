import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";

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
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS adventures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    troop_id INTEGER NOT NULL REFERENCES troops(id),
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    trek_date TEXT,
    itinerary_id TEXT REFERENCES itineraries(id),
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
`);

// ── Schema Migration ──
const CURRENT_SCHEMA_VERSION = 4;

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
        .run(JSON.stringify(ROUTE_DATA_12_20), JSON.stringify(GLOBAL_INFO_12_20), JSON.stringify(DEFAULT_SKILLS_12_20));
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

    db.prepare("INSERT OR REPLACE INTO platform_settings (key, value) VALUES ('schema_version', ?)").run(String(CURRENT_SCHEMA_VERSION));
  });

  runMigration();
  console.log(`Migrated schema to version ${CURRENT_SCHEMA_VERSION}`);
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

const DEFAULT_SKILLS_12_20 = [
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

// ── Seed Itinerary 12-20 ──
const existingItin = db.prepare("SELECT id FROM itineraries WHERE id = '12-20'").get();
if (!existingItin) {
  db.prepare(`INSERT INTO itineraries (id, name, days, miles, rating, highlights, route_data, training_priorities, default_skills, global_info)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    "12-20", "Itinerary 12-20", 12, 69, "Super Strenuous",
    JSON.stringify(["Baldy Summit 12,441'", "3 Dry Camps", "Tooth of Time", "COPE Challenge", "Conservation Project", "Rock Climbing"]),
    JSON.stringify(ROUTE_DATA_12_20),
    JSON.stringify(TRAINING_PRIORITIES_12_20),
    JSON.stringify(DEFAULT_SKILLS_12_20),
    JSON.stringify(GLOBAL_INFO_12_20),
  );
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

// ── Run migration after seed data constants are defined ──
migrate();

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

export function createUser({ google_id, email, password_hash, name, avatar_url, email_verified, verification_token }) {
  const result = db.prepare(
    "INSERT INTO users (google_id, email, password_hash, name, avatar_url, email_verified, verification_token) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(google_id || null, email.toLowerCase(), password_hash || null, name, avatar_url || null, email_verified || 0, verification_token || null);
  return { id: result.lastInsertRowid, google_id, email: email.toLowerCase(), name, avatar_url, email_verified: email_verified || 0, user_type: null, parent_email: null };
}

export function updateUserProfile(id, { name, user_type, parent_email, parent_email_2 }) {
  const sets = [];
  const vals = [];
  if (name !== undefined) { sets.push("name = ?"); vals.push(name); }
  if (user_type !== undefined) { sets.push("user_type = ?"); vals.push(user_type); }
  if (parent_email !== undefined) { sets.push("parent_email = ?"); vals.push(parent_email || null); }
  if (parent_email_2 !== undefined) { sets.push("parent_email_2 = ?"); vals.push(parent_email_2 || null); }
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

export function bindGoogleProfile(userId, googleId, avatarUrl) {
  db.prepare("UPDATE users SET google_id = ?, avatar_url = ? WHERE id = ?").run(googleId, avatarUrl, userId);
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

export function getTroops() {
  return db.prepare("SELECT id, name, description, trek_date, itinerary_id, tier FROM troops ORDER BY id").all();
}

export function getTroop(id) {
  const r = db.prepare("SELECT * FROM troops WHERE id = ?").get(id);
  if (!r) return null;
  return { ...r, itinerary_overrides: JSON.parse(r.itinerary_overrides) };
}

export function createTroop({ name, description, created_by }) {
  const result = db.prepare(
    "INSERT INTO troops (name, description, created_by) VALUES (?, ?, ?)"
  ).run(name, description || "", created_by);
  const troopId = result.lastInsertRowid;

  const memberCount = db.prepare("SELECT COUNT(*) as c FROM troop_members WHERE troop_id = ?").get(troopId).c;
  db.prepare("INSERT INTO troop_members (user_id, troop_id, role, status, color_bg) VALUES (?, ?, 'admin', 'approved', ?)")
    .run(created_by, troopId, COLORS[memberCount % COLORS.length]);

  return { id: troopId, name, description: description || "" };
}

export function updateTroop(troopId, { name, description }) {
  const sets = [];
  const vals = [];
  if (name !== undefined) { sets.push("name = ?"); vals.push(name); }
  if (description !== undefined) { sets.push("description = ?"); vals.push(description); }
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
    SELECT tm.troop_id, tm.role, tm.status, t.name as troop_name, t.trek_date, t.itinerary_id
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
  db.prepare("UPDATE troop_members SET status = 'denied' WHERE troop_id = ? AND user_id = ?").run(troopId, userId);
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

export function createAdventure({ troop_id, name, description, trek_date, depart_date, arrive_date, return_date, home_date, itinerary_id, created_by }) {
  const result = db.prepare(
    "INSERT INTO adventures (troop_id, name, description, trek_date, depart_date, arrive_date, return_date, home_date, itinerary_id, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)"
  ).run(troop_id, name, description || "", trek_date || arrive_date || null, depart_date || null, arrive_date || null, return_date || null, home_date || null, itinerary_id || null, created_by);
  const advId = result.lastInsertRowid;

  // Add creator as admin member
  const creatorMember = db.prepare("SELECT color_bg FROM troop_members WHERE troop_id = ? AND user_id = ?").get(troop_id, created_by);
  const color = creatorMember?.color_bg || COLORS[0];
  db.prepare("INSERT OR IGNORE INTO adventure_members (adventure_id, user_id, role, color_bg) VALUES (?, ?, 'admin', ?)")
    .run(advId, created_by, color);

  // Seed default skills from itinerary
  if (itinerary_id) {
    const itin = getItinerary(itinerary_id);
    if (itin?.default_skills) {
      const insertSkill = db.prepare(
        "INSERT INTO skills (id, troop_id, adventure_id, name, icon, description, category, is_default, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)"
      );
      itin.default_skills.forEach((s, i) => {
        insertSkill.run(`${advId}-${s.id}`, troop_id, advId, s.name, s.icon || "📋", s.desc, s.category || "training", i);
      });
    }
  }

  return { id: advId, troop_id, name, description: description || "", trek_date: trek_date || arrive_date, depart_date, arrive_date, return_date, home_date, itinerary_id, status: "active" };
}

export function updateAdventure(id, { name, description, trek_date, depart_date, arrive_date, return_date, home_date, status }) {
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
  if (sets.length === 0) return;
  vals.push(id);
  db.prepare(`UPDATE adventures SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
}

export function deleteAdventure(id) {
  db.prepare("DELETE FROM link_requests WHERE adventure_id = ?").run(id);
  db.prepare("DELETE FROM achievements WHERE adventure_id = ?").run(id);
  db.prepare("DELETE FROM crew_milestones WHERE adventure_id = ?").run(id);
  db.prepare("DELETE FROM invitations WHERE adventure_id = ?").run(id);
  db.prepare("DELETE FROM adventure_members WHERE adventure_id = ?").run(id);
  db.prepare("DELETE FROM skills WHERE adventure_id = ?").run(id);
  db.prepare("DELETE FROM adventures WHERE id = ?").run(id);
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
  const mapRow = r => ({
    id: r.id, adventure_id: r.adventure_id, user_id: r.user_id,
    name: r.is_manual ? r.manual_name : r.name,
    email: r.email || null, avatar_url: r.avatar_url || null,
    user_type: r.is_manual ? "scout" : r.user_type,
    role: r.role, participation: r.participation || "trekking",
    linked_to: r.linked_to || null, is_manual: !!r.is_manual,
    color: { bg: r.color_bg },
    dates: JSON.parse(r.dates), skills: JSON.parse(r.skills),
    gear: JSON.parse(r.gear), medical: JSON.parse(r.medical), admin_tasks: JSON.parse(r.admin_tasks),
  });
  return [...accountRows.map(mapRow), ...manualRows.map(mapRow)];
}

export function getAdventureMember(adventureId, userId) {
  const r = db.prepare("SELECT * FROM adventure_members WHERE adventure_id = ? AND user_id = ?").get(adventureId, userId);
  if (!r) return null;
  return {
    ...r, color: { bg: r.color_bg }, participation: r.participation || "trekking",
    linked_to: r.linked_to || null, is_manual: !!r.is_manual,
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
  db.prepare("DELETE FROM adventure_members WHERE adventure_id = ? AND user_id = ?").run(adventureId, userId);
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

export function linkMember(adventureId, supportUserId, scoutUserId) {
  db.prepare("UPDATE adventure_members SET linked_to = ? WHERE adventure_id = ? AND user_id = ?")
    .run(scoutUserId, adventureId, supportUserId);
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
  return new SqliteStore();
}

export default db;
