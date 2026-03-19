import pg from "pg";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { BSA_COUNCILS } from "./councils.js";

const { Pool } = pg;
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Colors ──
const COLORS = [
  "#E07A5F", "#3D6B5B", "#5B7BB4", "#D4A05A", "#8E6AAF",
  "#C26B5A", "#4A8F8F", "#7A7040", "#B55A8D", "#5A7F5A",
];

// Round to 1 decimal to fix floating-point display bugs
const roundMiles = (v) => v != null ? Math.round(v * 10) / 10 : v;

// Universal Philmont skills
export const PHILMONT_DEFAULT_SKILLS = [
  { id: "loaded", name: "Loaded Pack Hike (8+ mi)", icon: "🎒", desc: "Full weight, terrain with elevation changes", category: "training" },
  { id: "elevation", name: "Elevation / Hill Training", icon: "⛰️", desc: "Stair repeats, hill sprints, incline hikes", category: "training" },
  { id: "water", name: "Water Carry & Purification", icon: "💧", desc: "Practice dry camp water protocol (4-6L carry)", category: "training" },
  { id: "bearbag", name: "Bear Bag Hanging", icon: "🐻", desc: "Required every night on trail — learn PCT hang", category: "training" },
  { id: "stove", name: "Stove & Cook Setup", icon: "🔥", desc: "Crew meal prep, cleanup, and stove maintenance", category: "training" },
  { id: "navigation", name: "Map & Compass Nav", icon: "🧭", desc: "Both North + South sectional maps proficiency", category: "training" },
  { id: "overnight", name: "Full Overnight Shakedown", icon: "🏕️", desc: "Minimum 2 required before trek — full loaded packs", category: "training" },
  { id: "conditioning", name: "Conditioning Program", icon: "🥾", desc: "3-5x/week — ramp up intensity over 4+ months", category: "training" },
  { id: "med-forma", name: "Health Form Part A", icon: "📋", desc: "Annual health history, signed by parent/guardian", category: "medical" },
  { id: "med-formb", name: "Health Form Part B", icon: "📋", desc: "Physical exam signed by physician (within 12 months)", category: "medical" },
  { id: "med-formc", name: "Health Form Part C", icon: "📋", desc: "Pre-participation physical clearance required for Philmont", category: "medical" },
  { id: "med-bmi", name: "BMI Check", icon: "⚖️", desc: "Meets BSA height/weight requirements", category: "medical" },
  { id: "med-meds", name: "Medications Reviewed", icon: "💊", desc: "All medications reviewed with crew advisor and documented", category: "medical" },
  { id: "adm-agreement", name: "Participant Agreement", icon: "✍️", desc: "Philmont participant agreement signed", category: "admin" },
  { id: "adm-emergency", name: "Emergency Contact Card", icon: "🆘", desc: "Emergency contact info submitted to crew leader", category: "admin" },
  { id: "adm-travel", name: "Travel Confirmed", icon: "✈️", desc: "Travel arrangements to/from Philmont confirmed", category: "admin" },
  { id: "adm-fees", name: "Crew Fund Paid", icon: "💰", desc: "Trek fees and crew fund contributions paid in full", category: "admin" },
  { id: "adm-insurance", name: "Insurance Info", icon: "🏥", desc: "Health insurance card copy submitted to crew leader", category: "admin" },
];

// Attendance milestone defaults
const DEFAULT_MILESTONES = [
  { count: 1, icon: "🥾" },
  { count: 3, icon: "🏔️" },
  { count: 5, icon: "⭐" },
];

// ── Initialize Database (seed data) ──
export async function initializeDatabase() {
  // Seed councils
  const sample = (await pool.query("SELECT council_num FROM councils LIMIT 1")).rows[0];
  const needsRefresh = !sample || sample.council_num === null;
  const countRes = (await pool.query("SELECT COUNT(*) as c FROM councils")).rows[0];
  if (needsRefresh || countRes.c < BSA_COUNCILS.length) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const c of BSA_COUNCILS) {
        await client.query(
          `INSERT INTO councils (name, council_num, city, state) VALUES ($1, $2, $3, $4)
           ON CONFLICT(name) DO UPDATE SET council_num = EXCLUDED.council_num, city = EXCLUDED.city, state = EXCLUDED.state`,
          [c.name, c.num, c.city, c.state]
        );
      }
      await client.query("COMMIT");
      console.log(`Seeded/updated ${BSA_COUNCILS.length} BSA councils`);
    } catch (e) { await client.query("ROLLBACK"); throw e; }
    finally { client.release(); }
  }

  // Seed itineraries
  const itinCount = (await pool.query("SELECT COUNT(*) as c FROM itineraries")).rows[0];
  if (Number(itinCount.c) < 48) {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const seedData = JSON.parse(readFileSync(join(__dirname, "itinerary_seed.json"), "utf-8"));
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (const it of seedData) {
          await client.query(
            `INSERT INTO itineraries (id, name, days, miles, rating, highlights, route_data, training_priorities, default_skills, global_info)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name, days=EXCLUDED.days, miles=EXCLUDED.miles, rating=EXCLUDED.rating, highlights=EXCLUDED.highlights, route_data=EXCLUDED.route_data, training_priorities=EXCLUDED.training_priorities, default_skills=EXCLUDED.default_skills, global_info=EXCLUDED.global_info`,
            [it.id, it.name, it.days, it.miles, it.rating,
             JSON.stringify(it.highlights || []), JSON.stringify(it.route_data || []),
             JSON.stringify([]), JSON.stringify([]),
             JSON.stringify({ description: it.description || "", elevations: it.elevations || {}, camps_info: it.camps_info || "", conservation: it.conservation || "" })]
          );
        }
        await client.query("COMMIT");
        console.log(`Seeded ${seedData.length} Philmont itineraries`);
      } catch (e2) { await client.query("ROLLBACK"); throw e2; }
      finally { client.release(); }
    } catch (e) { console.error("Failed to seed itineraries:", e.message); }
  }

  // Backfill default skills for existing Philmont adventures
  try {
    const adventures = (await pool.query("SELECT id, troop_id, adventure_type FROM adventures WHERE status = 'active'")).rows;
    for (const adv of adventures) {
      if ((adv.adventure_type || "philmont") === "philmont") {
        const skillCount = (await pool.query("SELECT COUNT(*) as c FROM skills WHERE adventure_id = $1", [adv.id])).rows[0];
        if (Number(skillCount.c) === 0) {
          await seedAdventureSkills(adv.id, adv.troop_id);
        }
      }
    }
  } catch (e) { /* Fresh DB — safe to skip */ }

  // Seed gear catalog
  await seedGearCatalog();
  console.log("Database initialization complete");
}

async function seedGearCatalog() {
  const count = (await pool.query("SELECT COUNT(*) as c FROM gear_catalog")).rows[0];
  if (Number(count.c) > 0) return;

  console.log("Seeding gear catalog...");
  const S = [
    ["Backpacking Pack (65-75L)", "Pack & Carry", "Backpack", 52, "essential", 0, "Torso-fit suspension; adjustable hip belt mandatory"],
    ["Pack Rain Cover", "Pack & Carry", "Pack Protection", 4, "essential", 0, "Essential for NM afternoon thunderstorms"],
    ["Stuff Sacks / Compression Sacks", "Pack & Carry", "Organization", 6, "recommended", 0, "Keeps gear organized and compressible"],
    ["Dry Bags (2-pack)", "Pack & Carry", "Waterproof Storage", 5, "essential", 0, "Electronics, maps, sleep systems must stay dry"],
    ["Trekking Poles (pair)", "Pack & Carry", "Poles", 18, "recommended", 0, "Reduce knee impact on descent days"],
    ["Backpacking Tent (2-3 person)", "Shelter", "Tent", 56, "essential", 1, "Crew-shared; freestanding preferred for rocky sites"],
    ["Tent Footprint / Ground Cloth", "Shelter", "Tent Protection", 8, "recommended", 1, "Protects tent floor from rocks"],
    ["Tent Stakes (set of 10)", "Shelter", "Hardware", 5, "essential", 1, "Y-beam aluminum recommended for rocky soil"],
    ["Emergency Tarp", "Shelter", "Emergency", 12, "recommended", 1, "Rain shelter during meal breaks or tent failure"],
    ["Sleeping Bag (20°F rated)", "Sleep System", "Sleeping Bag", 40, "essential", 0, "NM altitude nights drop to 20-30°F"],
    ["Sleeping Bag Liner", "Sleep System", "Liner", 8, "optional", 0, "Adds 5-15°F warmth; keeps bag clean"],
    ["Sleeping Pad", "Sleep System", "Pad", 16, "essential", 0, "R-value 3+ for ground insulation at altitude"],
    ["Backpacking Pillow", "Sleep System", "Pillow", 3, "optional", 0, "Worth every gram for 12-night trek"],
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
    ["Hiking Boots (mid-cut, waterproof)", "Footwear", "Boots", 40, "essential", 0, "Break in 50+ miles before arrival; ankle support required"],
    ["Camp Shoes / Sandals", "Footwear", "Camp Footwear", 12, "recommended", 0, "Feet recovery critical on 12-day trek"],
    ["Boot/Sock Liners", "Footwear", "Liners", 1, "optional", 0, "Thin liner under hiking sock reduces blisters"],
    ["Topographic Map (Philmont)", "Navigation", "Maps", 3, "essential", 1, "Official topo provided at check-in; carry at all times"],
    ["Baseplate Compass", "Navigation", "Compass", 2, "essential", 0, "BSA requirement; set NM declination before trek"],
    ["Altimeter Watch", "Navigation", "Electronics", 2, "optional", 0, "Elevation tracking and weather prediction"],
    ["Handheld GPS", "Navigation", "Electronics", 8, "optional", 1, "Backup navigation; inReach for emergency comms"],
    ["Water Bottles (1L x2)", "Hydration & Water", "Bottles", 10, "essential", 0, "2L minimum carry; wide-mouth for filter compatibility"],
    ["Hydration Reservoir (2-3L)", "Hydration & Water", "Bladder", 6, "recommended", 0, "Hands-free hydration on trail"],
    ["Water Filter / Purifier", "Hydration & Water", "Filtration", 3, "essential", 1, "ALL water must be treated; Sawyer Squeeze standard"],
    ["Chemical Water Treatment (backup)", "Hydration & Water", "Treatment", 1, "recommended", 1, "Backup if filter fails or freezes"],
    ["Camp Stove (canister)", "Food & Cooking", "Stove", 3, "essential", 1, "Canister ONLY; white gas prohibited at Philmont"],
    ["Fuel Canisters (isobutane, 100g x4)", "Food & Cooking", "Fuel", 28, "essential", 1, "Plan ~100g per 2 people per day at altitude"],
    ["Cook Pot / Pot Set", "Food & Cooking", "Cookware", 8, "essential", 1, "2L minimum for crew; titanium or aluminum"],
    ["Long-Handle Spork", "Food & Cooking", "Utensils", 1, "essential", 0, "Reaches bottom of freeze-dried pouches"],
    ["Bear Bag / Ursack", "Food & Cooking", "Food Storage", 5, "essential", 1, "ALL scented items in bear storage nightly"],
    ["Trash Compactor Bags (2-pack)", "Food & Cooking", "Waste", 2, "essential", 1, "Pack out ALL trash; LNT mandate"],
    ["Headlamp (primary)", "Fire & Light", "Headlamp", 3, "essential", 0, "200+ lumens; red mode for night vision"],
    ["Backup Headlamp", "Fire & Light", "Headlamp", 2, "recommended", 0, "12 days is long; headlamps fail"],
    ["Extra Batteries (AA/AAA)", "Fire & Light", "Batteries", 8, "essential", 0, "Cold altitude drains batteries faster"],
    ["Lighter / Waterproof Matches", "Fire & Light", "Fire Starting", 1, "essential", 0, "Stove ignition only; open fires prohibited most zones"],
    ["Camp Lantern", "Fire & Light", "Lantern", 3, "optional", 1, "Solar inflatable or LED; crew-shared"],
    ["Personal First Aid Kit", "First Aid & Safety", "First Aid", 16, "essential", 0, "Crew + personal kits; WFA training recommended"],
    ["Blister Kit (dedicated)", "First Aid & Safety", "Blister Care", 3, "essential", 0, "#1 cause of Scout evacuation; Leukotape + moleskin"],
    ["SAM Splint", "First Aid & Safety", "Emergency", 2, "recommended", 1, "Ankle/wrist sprains common on terrain"],
    ["Emergency Whistle", "First Aid & Safety", "Safety", 1, "essential", 0, "3 blasts = distress; attach to shoulder strap"],
    ["Emergency Bivy / Space Blanket", "First Aid & Safety", "Emergency", 3, "recommended", 0, "Hypothermia treatment; weighs almost nothing"],
    ["PLB / Satellite Communicator", "First Aid & Safety", "Communication", 3, "optional", 1, "inReach Mini 2 recommended; zero cell service"],
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
    ["Sunglasses (polarized, UV400)", "Sun & Weather", "Eye Protection", 1, "essential", 0, "UV400 mandatory; cheap glasses cause MORE damage"],
    ["Buff / Neck Gaiter", "Sun & Weather", "Multi-Use", 1.5, "recommended", 0, "12 uses in one item; dust, sun, warmth"],
    ["Trekking Umbrella", "Sun & Weather", "Sun/Rain", 10, "optional", 0, "Stow immediately during lightning"],
    ["Knife / Multi-Tool", "Repair & Tools", "Tools", 4, "essential", 0, "BSA Totin' Chip required; folding blade"],
    ["Duct Tape (compact roll)", "Repair & Tools", "Repair", 2, "essential", 0, "Wrap around trekking pole to save space"],
    ["Tent Pole Repair Sleeve", "Repair & Tools", "Repair", 0.5, "recommended", 1, "Can save a $400 tent from abandonment"],
    ["Paracord (50ft)", "Repair & Tools", "Cordage", 5, "essential", 1, "Bear bag hanging, guyline, emergency lashing"],
    ["Waterproof Phone Case", "Communication", "Protection", 1, "recommended", 0, "Phone = emergency camera + offline maps"],
    ["Portable Battery Bank", "Communication", "Power", 16, "recommended", 1, "10,000mAh = ~3 phone charges; rotating schedule"],
    ["Trail Journal / Notebook", "Communication", "Documentation", 3, "optional", 0, "Rite in the Rain recommended; document your trek"],
    ["Pencils (waterproof, 3-pack)", "Communication", "Documentation", 0.5, "optional", 0, "Pencils write in rain; pens fail in cold"],
  ];

  const sharingOverrides = {
    "Backpacking Tent (2-3 person)": "buddy", "Tent Footprint / Ground Cloth": "buddy",
    "Tent Stakes (set of 10)": "buddy", "Emergency Tarp": "crew",
    "Topographic Map (Philmont)": "provided", "Handheld GPS": "crew",
    "Water Filter / Purifier": "crew", "Chemical Water Treatment (backup)": "crew",
    "Camp Stove (canister)": "crew", "Fuel Canisters (isobutane, 100g x4)": "provided",
    "Cook Pot / Pot Set": "provided", "Bear Bag / Ursack": "provided",
    "Trash Compactor Bags (2-pack)": "crew", "Camp Lantern": "crew",
    "SAM Splint": "crew", "PLB / Satellite Communicator": "crew",
    "Trowel (LNT cat hole)": "crew", "Tent Pole Repair Sleeve": "crew",
    "Paracord (50ft)": "crew", "Portable Battery Bank": "crew",
  };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < S.length; i++) {
      const [name, cat, sub, wt, pri, crew, desc] = S[i];
      const sType = sharingOverrides[name] || (crew ? "crew" : "personal");
      await client.query(
        `INSERT INTO gear_catalog (name, category, subcategory, description, weight_oz, priority, is_crew_shared, sharing_type, philmont_compliant, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9)`,
        [name, cat, sub, desc, wt, pri, crew, sType, i + 1]
      );
    }
    await client.query("COMMIT");
    console.log(`Seeded ${S.length} gear catalog items`);
  } catch (e) { await client.query("ROLLBACK"); throw e; }
  finally { client.release(); }
}

// ── User Queries ──

export async function findUserByGoogleId(googleId) {
  const { rows } = await pool.query("SELECT * FROM users WHERE google_id = $1", [googleId]);
  return rows[0] ?? null;
}

export async function findUserByEmail(email) {
  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email?.toLowerCase()]);
  return rows[0] ?? null;
}

export async function findUserById(id) {
  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function createUser({ google_id, email, password_hash, name, avatar_url, email_verified, verification_token, tos_accepted_at }) {
  const { rows } = await pool.query(
    "INSERT INTO users (google_id, email, password_hash, name, avatar_url, email_verified, verification_token, tos_accepted_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
    [google_id || null, email.toLowerCase(), password_hash || null, name, avatar_url || null, email_verified || 0, verification_token || null, tos_accepted_at || null]
  );
  return { id: rows[0].id, google_id, email: email.toLowerCase(), name, avatar_url, email_verified: email_verified || 0, user_type: null, parent_email: null };
}

export async function updateUserProfile(id, { name, user_type, parent_email, parent_email_2, age_confirmed, tos_accepted_at }) {
  const sets = []; const vals = []; let n = 1;
  if (name !== undefined) { sets.push(`name = $${n++}`); vals.push(name); }
  if (user_type !== undefined) { sets.push(`user_type = $${n++}`); vals.push(user_type); }
  if (parent_email !== undefined) { sets.push(`parent_email = $${n++}`); vals.push(parent_email || null); }
  if (parent_email_2 !== undefined) { sets.push(`parent_email_2 = $${n++}`); vals.push(parent_email_2 || null); }
  if (age_confirmed !== undefined) { sets.push(`age_confirmed = $${n++}`); vals.push(age_confirmed); sets.push("age_confirmed_at = CURRENT_TIMESTAMP"); }
  if (tos_accepted_at !== undefined) { sets.push(`tos_accepted_at = $${n++}`); vals.push(tos_accepted_at); }
  if (sets.length === 0) return;
  vals.push(id);
  await pool.query(`UPDATE users SET ${sets.join(", ")} WHERE id = $${n}`, vals);
}

export async function verifyUserEmail(token) {
  const { rows } = await pool.query("SELECT id, email_verified FROM users WHERE verification_token = $1", [token]);
  const user = rows[0];
  if (!user) return null;
  if (!user.email_verified) {
    await pool.query("UPDATE users SET email_verified = 1 WHERE id = $1", [user.id]);
  }
  return user;
}

export async function setResetToken(email, token, expiresAt) {
  await pool.query("UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3", [token, expiresAt, email.toLowerCase()]);
}

export async function findUserByResetToken(token) {
  const { rows } = await pool.query("SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()", [token]);
  return rows[0] ?? null;
}

export async function clearResetToken(userId) {
  await pool.query("UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = $1", [userId]);
}

export async function updatePassword(userId, passwordHash) {
  await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, userId]);
}

export async function bindGoogleProfile(userId, googleId, avatarUrl) {
  await pool.query("UPDATE users SET google_id = $1, avatar_url = $2 WHERE id = $3", [googleId, avatarUrl, userId]);
}

export async function updateUserNameAvatar(userId, name, avatarUrl) {
  await pool.query("UPDATE users SET name = $1, avatar_url = $2 WHERE id = $3", [name, avatarUrl, userId]);
}

// ── System Admin Management ──

export async function promoteToAdmin(userId) {
  await pool.query("UPDATE users SET is_admin = 1 WHERE id = $1", [userId]);
}

export async function demoteFromAdmin(userId) {
  await pool.query("UPDATE users SET is_admin = 0 WHERE id = $1", [userId]);
}

export async function getSystemAdmins() {
  const { rows } = await pool.query("SELECT id, email, name, is_admin, created_at FROM users WHERE is_admin = 1");
  return rows;
}

export async function getAllUsers() {
  const { rows } = await pool.query("SELECT id, email, name, user_type, is_admin, created_at FROM users ORDER BY name");
  return rows;
}

// ── Dashboard Data ──

export async function getDashboardData(userId, isAdmin) {
  const { rows: memberships } = await pool.query(`
    SELECT tm.troop_id, tm.role, t.name, t.council, t.council_id, c.name as council_name, t.location, t.is_public
    FROM troop_members tm JOIN troops t ON tm.troop_id = t.id
    LEFT JOIN councils c ON t.council_id = c.id
    WHERE tm.user_id = $1 AND tm.status = 'approved'
  `, [userId]);

  const troops = [];
  for (const m of memberships) {
    const { rows: adventures } = await pool.query("SELECT * FROM adventures WHERE troop_id = $1 AND status = 'active' ORDER BY created_at DESC", [m.troop_id]);
    const advList = [];
    for (const a of adventures) {
      const defaultCrew = await getDefaultCrew(a.id);
      let memberCount, trekkingCount;
      if (defaultCrew) {
        memberCount = Number((await pool.query("SELECT COUNT(*) as c FROM crew_members WHERE crew_id = $1", [defaultCrew.id])).rows[0].c);
        trekkingCount = Number((await pool.query("SELECT COUNT(*) as c FROM crew_members WHERE crew_id = $1 AND participation = 'trekking'", [defaultCrew.id])).rows[0].c);
      } else {
        memberCount = Number((await pool.query("SELECT COUNT(*) as c FROM adventure_members WHERE adventure_id = $1", [a.id])).rows[0].c);
        trekkingCount = Number((await pool.query("SELECT COUNT(*) as c FROM adventure_members WHERE adventure_id = $1 AND participation = 'trekking'", [a.id])).rows[0].c);
      }
      const crewCount = Number((await pool.query("SELECT COUNT(*) as c FROM crews WHERE adventure_id = $1", [a.id])).rows[0].c);
      advList.push({
        id: a.id, name: a.name, adventure_type: a.adventure_type,
        depart_date: defaultCrew?.depart_date || a.depart_date,
        arrive_date: defaultCrew?.arrive_date || a.arrive_date,
        return_date: defaultCrew?.return_date || a.return_date,
        home_date: defaultCrew?.home_date || a.home_date,
        itinerary_id: defaultCrew?.itinerary_id || a.itinerary_id,
        crew_count: crewCount, member_count: memberCount, trekking_count: trekkingCount,
        crew_readiness: await computeServerReadiness(a.id),
        next_training: await getNextTrainingEvent(a.id),
      });
    }
    troops.push({
      id: m.troop_id, name: m.name, council: m.council_name || m.council, council_id: m.council_id, location: m.location,
      role: m.role, is_public: m.is_public, adventures: advList,
    });
  }

  const { rows: pendingRows } = await pool.query(`
    SELECT tm.troop_id, t.name as troop_name, COALESCE(c.name, t.council) as council,
           tm.participation, tm.requested_adventures
    FROM troop_members tm JOIN troops t ON tm.troop_id = t.id
    LEFT JOIN councils c ON t.council_id = c.id
    WHERE tm.user_id = $1 AND tm.status = 'pending'
  `, [userId]);
  const pending = pendingRows.map(p => ({
    ...p, requested_adventures: p.requested_adventures ? JSON.parse(p.requested_adventures) : null,
  }));

  const { rows: publicTroops } = await pool.query(`
    SELECT t.id, t.name, COALESCE(c.name, t.council) as council, t.location
    FROM troops t LEFT JOIN councils c ON t.council_id = c.id
    WHERE t.is_public = 1 AND t.id NOT IN (SELECT troop_id FROM troop_members WHERE user_id = $1)
    ORDER BY t.name
  `, [userId]);

  const result = { troops, pending, public_troops: publicTroops };

  if (isAdmin) {
    const totalUsers = Number((await pool.query("SELECT COUNT(*) as c FROM users")).rows[0].c);
    const totalTroops = Number((await pool.query("SELECT COUNT(*) as c FROM troops")).rows[0].c);
    const activeAdventures = Number((await pool.query("SELECT COUNT(*) as c FROM adventures WHERE status = 'active'")).rows[0].c);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const newThisWeek = Number((await pool.query("SELECT COUNT(*) as c FROM users WHERE created_at >= $1", [weekAgo])).rows[0].c);
    result.platform_stats = { total_users: totalUsers, total_troops: totalTroops, active_adventures: activeAdventures, new_this_week: newThisWeek };
  }

  return result;
}

export async function computeServerReadiness(adventureId) {
  const crew = await getDefaultCrew(adventureId);
  let members;
  if (crew) {
    members = (await pool.query(`SELECT cm.user_id, cm.skills, cm.medical, cm.admin_tasks, cm.participation
      FROM crew_members cm WHERE cm.crew_id = $1 AND cm.participation = 'trekking'`, [crew.id])).rows;
  } else {
    members = (await pool.query(`SELECT am.user_id, am.skills, am.medical, am.admin_tasks, am.participation
      FROM adventure_members am WHERE am.adventure_id = $1 AND am.participation = 'trekking'`, [adventureId])).rows;
  }
  if (members.length === 0) return 0;

  const parsed = members.map(m => ({
    user_id: m.user_id,
    skills: JSON.parse(m.skills || "[]"),
    medical: JSON.parse(m.medical || "[]"),
    admin_tasks: JSON.parse(m.admin_tasks || "[]"),
  }));

  const skills = (await pool.query("SELECT id, category FROM skills WHERE adventure_id = $1", [adventureId])).rows;
  const trainingSkills = skills.filter(s => s.category === "training");
  const medicalSkills = skills.filter(s => s.category === "medical");
  const adminSkills = skills.filter(s => s.category === "admin");

  const pct = (items, field) => {
    if (items.length === 0) return null;
    const total = items.length * parsed.length;
    const done = parsed.reduce((sum, m) =>
      sum + m[field].filter(id => items.some(s => s.id === id)).length, 0);
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  const training = pct(trainingSkills, "skills");
  const medical = pct(medicalSkills, "medical");
  const admin = pct(adminSkills, "admin_tasks");

  const gearCount = Number((await pool.query("SELECT COUNT(*) as c FROM gear_catalog WHERE active = 1")).rows[0].c);
  let gear = 0;
  if (gearCount > 0) {
    const gearTotal = gearCount * parsed.length;
    let gearDone = 0;
    for (const m of parsed) {
      const done = Number((await pool.query("SELECT COUNT(*) as c FROM member_gear WHERE adventure_id = $1 AND user_id = $2 AND (status = 'owned' OR status = 'packed')", [adventureId, m.user_id])).rows[0].c);
      gearDone += done;
    }
    gear = Math.round((gearDone / gearTotal) * 100);
  }

  const activeCats = [training, gear, medical, admin].filter(v => v !== null);
  return activeCats.length > 0 ? Math.round(activeCats.reduce((s, v) => s + v, 0) / activeCats.length) : 0;
}

export async function getNextTrainingEvent(adventureId) {
  const now = new Date().toISOString().split("T")[0];
  const { rows } = await pool.query(
    "SELECT date, time_label, location FROM training_events WHERE adventure_id = $1 AND date >= $2 ORDER BY date ASC LIMIT 1",
    [adventureId, now]
  );
  return rows[0] ?? null;
}

// ── Itinerary Queries ──

export async function getItineraries() {
  const { rows } = await pool.query("SELECT id, name, days, miles, rating, highlights FROM itineraries ORDER BY days, id");
  return rows.map(r => ({ ...r, miles: roundMiles(r.miles), highlights: JSON.parse(r.highlights) }));
}

export async function getItinerary(id) {
  const { rows } = await pool.query("SELECT * FROM itineraries WHERE id = $1", [id]);
  const r = rows[0];
  if (!r) return null;
  const route_data = JSON.parse(r.route_data).map(d => ({ ...d, miles: roundMiles(d.miles) }));
  return {
    ...r, miles: roundMiles(r.miles), highlights: JSON.parse(r.highlights), route_data,
    training_priorities: JSON.parse(r.training_priorities),
    default_skills: JSON.parse(r.default_skills),
    global_info: JSON.parse(r.global_info || "{}"),
  };
}

// ── Council Queries ──

export async function getCouncils() {
  const { rows } = await pool.query("SELECT id, name, council_num, city, state FROM councils ORDER BY name");
  return rows;
}

// ── Troop Queries ──

export async function getTroops(userId) {
  const { rows } = await pool.query(`
    SELECT DISTINCT t.id, t.name, t.description, t.council, t.council_id, c.name as council_name, t.location, t.is_public, t.tier
    FROM troops t
    LEFT JOIN councils c ON t.council_id = c.id
    LEFT JOIN troop_members tm ON t.id = tm.troop_id AND tm.user_id = $1 AND tm.status != 'denied'
    WHERE t.is_public = 1 OR tm.user_id IS NOT NULL
    ORDER BY t.id
  `, [userId]);
  return rows;
}

export async function getTroop(id) {
  const { rows } = await pool.query("SELECT * FROM troops WHERE id = $1", [id]);
  if (!rows[0]) return null;
  return { ...rows[0], itinerary_overrides: JSON.parse(rows[0].itinerary_overrides) };
}

export async function findDuplicateTroop(unitType, unitNumber, councilId) {
  if (!councilId || !unitNumber) return null;
  const { rows } = await pool.query(`
    SELECT t.id, t.name, t.unit_type, t.unit_number, t.council, t.council_id,
           COALESCE(c.name, t.council) as council_name, t.location
    FROM troops t LEFT JOIN councils c ON t.council_id = c.id
    WHERE t.unit_type = $1 AND t.unit_number = $2 AND t.council_id = $3
  `, [unitType, unitNumber, councilId]);
  return rows[0] || null;
}

export async function createTroop({ unit_type, unit_number, name, description, council, council_id, location, is_public, created_by }) {
  let councilName = council || "";
  if (council_id) {
    const c = (await pool.query("SELECT name FROM councils WHERE id = $1", [council_id])).rows[0];
    if (c) councilName = c.name;
  }
  // Compose display name from unit_type + unit_number if provided
  const displayName = (unit_type && unit_number) ? `${unit_type} ${unit_number}` : name;
  const { rows } = await pool.query(
    "INSERT INTO troops (name, unit_type, unit_number, description, council, council_id, location, is_public, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id",
    [displayName, unit_type || "Troop", unit_number || "", description || "", councilName, council_id || null, location || "", is_public !== undefined ? (is_public ? 1 : 0) : 1, created_by]
  );
  const troopId = rows[0].id;
  const memberCount = Number((await pool.query("SELECT COUNT(*) as c FROM troop_members WHERE troop_id = $1", [troopId])).rows[0].c);
  await pool.query("INSERT INTO troop_members (user_id, troop_id, role, status, color_bg) VALUES ($1, $2, 'admin', 'approved', $3)",
    [created_by, troopId, COLORS[memberCount % COLORS.length]]);
  return { id: troopId, name: displayName, unit_type: unit_type || "Troop", unit_number: unit_number || "", description: description || "", council: councilName, council_id: council_id || null, location: location || "", is_public: is_public !== undefined ? (is_public ? 1 : 0) : 1 };
}

export async function updateTroop(troopId, { name, unit_type, unit_number, description, council, council_id, location, is_public }) {
  const sets = []; const vals = []; let n = 1;
  if (unit_type !== undefined) { sets.push(`unit_type = $${n++}`); vals.push(unit_type); }
  if (unit_number !== undefined) { sets.push(`unit_number = $${n++}`); vals.push(unit_number); }
  // Recompose display name if unit fields changed
  if (unit_type !== undefined || unit_number !== undefined) {
    // Fetch current values if only one changed
    const current = (await pool.query("SELECT unit_type, unit_number FROM troops WHERE id = $1", [troopId])).rows[0];
    const finalType = unit_type !== undefined ? unit_type : current?.unit_type || "Troop";
    const finalNum = unit_number !== undefined ? unit_number : current?.unit_number || "";
    if (finalNum) {
      sets.push(`name = $${n++}`); vals.push(`${finalType} ${finalNum}`);
    }
  } else if (name !== undefined) {
    sets.push(`name = $${n++}`); vals.push(name);
  }
  if (description !== undefined) { sets.push(`description = $${n++}`); vals.push(description); }
  if (council_id !== undefined) {
    sets.push(`council_id = $${n++}`); vals.push(council_id);
    const c = (await pool.query("SELECT name FROM councils WHERE id = $1", [council_id])).rows[0];
    if (c) { sets.push(`council = $${n++}`); vals.push(c.name); }
  } else if (council !== undefined) {
    sets.push(`council = $${n++}`); vals.push(council);
  }
  if (location !== undefined) { sets.push(`location = $${n++}`); vals.push(location); }
  if (is_public !== undefined) { sets.push(`is_public = $${n++}`); vals.push(is_public ? 1 : 0); }
  if (sets.length === 0) return;
  vals.push(troopId);
  await pool.query(`UPDATE troops SET ${sets.join(", ")} WHERE id = $${n}`, vals);
}

export async function updateTroopAffiliateTag(troopId, tag) {
  await pool.query("UPDATE troops SET amazon_affiliate_tag = $1 WHERE id = $2", [tag, troopId]);
}

// ── Troop Member Queries ──

export async function getTroopMembers(troopId, statusFilter) {
  let rows;
  if (statusFilter) {
    rows = (await pool.query(
      "SELECT tm.*, u.name, u.email, u.avatar_url, u.user_type FROM troop_members tm JOIN users u ON tm.user_id = u.id WHERE tm.troop_id = $1 AND tm.status = $2 ORDER BY tm.id",
      [troopId, statusFilter]
    )).rows;
  } else {
    rows = (await pool.query(
      "SELECT tm.*, u.name, u.email, u.avatar_url, u.user_type FROM troop_members tm JOIN users u ON tm.user_id = u.id WHERE tm.troop_id = $1 ORDER BY tm.id",
      [troopId]
    )).rows;
  }
  return rows.map(r => ({
    id: r.id, user_id: r.user_id, troop_id: r.troop_id,
    name: r.name, email: r.email, avatar_url: r.avatar_url, user_type: r.user_type,
    role: r.role, status: r.status, color: { bg: r.color_bg },
    dates: JSON.parse(r.dates), skills: JSON.parse(r.skills),
    participation: r.participation || "trekking",
    requested_adventures: r.requested_adventures ? JSON.parse(r.requested_adventures) : null,
  }));
}

export async function getTroopMember(troopId, userId) {
  const { rows } = await pool.query("SELECT * FROM troop_members WHERE troop_id = $1 AND user_id = $2", [troopId, userId]);
  const r = rows[0];
  if (!r) return null;
  return {
    ...r, dates: JSON.parse(r.dates), skills: JSON.parse(r.skills), color: { bg: r.color_bg },
    participation: r.participation || "trekking",
    requested_adventures: r.requested_adventures ? JSON.parse(r.requested_adventures) : null,
  };
}

export async function getUserMemberships(userId) {
  const { rows } = await pool.query(`
    SELECT tm.troop_id, tm.role, tm.status, t.name as troop_name, t.trek_date, t.itinerary_id,
           COALESCE(c.name, t.council) as troop_council, t.council_id as troop_council_id, t.location as troop_location
    FROM troop_members tm JOIN troops t ON tm.troop_id = t.id
    LEFT JOIN councils c ON t.council_id = c.id
    WHERE tm.user_id = $1
  `, [userId]);
  return rows;
}

export async function getUserAdventureMemberships(userId) {
  const { rows } = await pool.query(`
    SELECT am.adventure_id, am.role, a.name as adventure_name, a.trek_date, a.itinerary_id, a.troop_id, a.status,
           t.name as troop_name
    FROM adventure_members am
    JOIN adventures a ON am.adventure_id = a.id
    JOIN troops t ON a.troop_id = t.id
    WHERE am.user_id = $1
  `, [userId]);
  return rows;
}

export async function requestJoinTroop(userId, troopId, { participation, requestedAdventures } = {}) {
  const memberCount = Number((await pool.query("SELECT COUNT(*) as c FROM troop_members WHERE troop_id = $1", [troopId])).rows[0].c);
  const part = participation === "support" ? "support" : "trekking";
  const reqAdvJson = Array.isArray(requestedAdventures) && requestedAdventures.length > 0 ? JSON.stringify(requestedAdventures) : null;
  await pool.query(
    "INSERT INTO troop_members (user_id, troop_id, role, status, color_bg, participation, requested_adventures) VALUES ($1, $2, 'member', 'pending', $3, $4, $5)",
    [userId, troopId, COLORS[memberCount % COLORS.length], part, reqAdvJson]
  );
}

export async function approveTroopMember(troopId, userId) {
  await pool.query("UPDATE troop_members SET status = 'approved' WHERE troop_id = $1 AND user_id = $2", [troopId, userId]);
}

export async function denyTroopMember(troopId, userId) {
  await pool.query("DELETE FROM troop_members WHERE troop_id = $1 AND user_id = $2 AND status = 'pending'", [troopId, userId]);
}

export async function removeTroopMember(troopId, userId) {
  await pool.query("DELETE FROM troop_members WHERE troop_id = $1 AND user_id = $2", [troopId, userId]);
}

export async function updateMemberDates(troopId, userId, dates) {
  await pool.query("UPDATE troop_members SET dates = $1 WHERE troop_id = $2 AND user_id = $3", [JSON.stringify(dates), troopId, userId]);
}

export async function updateMemberSkills(troopId, userId, skills) {
  await pool.query("UPDATE troop_members SET skills = $1 WHERE troop_id = $2 AND user_id = $3", [JSON.stringify(skills), troopId, userId]);
}

export async function getTroopAdmins(troopId) {
  const { rows } = await pool.query(`
    SELECT u.email, u.name FROM troop_members tm
    JOIN users u ON tm.user_id = u.id
    WHERE tm.troop_id = $1 AND tm.role = 'admin' AND tm.status = 'approved'
  `, [troopId]);
  return rows;
}

// ── Adventure Queries ──

export async function getAdventures(troopId) {
  const { rows } = await pool.query("SELECT * FROM adventures WHERE troop_id = $1 ORDER BY created_at DESC", [troopId]);
  return rows;
}

export async function getAdventure(id) {
  const { rows } = await pool.query("SELECT * FROM adventures WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function createAdventure({ troop_id, name, description, trek_date, depart_date, arrive_date, return_date, home_date, itinerary_id, adventure_type, created_by }) {
  const { rows: advRows } = await pool.query(
    "INSERT INTO adventures (troop_id, name, description, trek_date, depart_date, arrive_date, return_date, home_date, itinerary_id, adventure_type, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11) RETURNING id",
    [troop_id, name, description || "", trek_date || arrive_date || null, depart_date || null, arrive_date || null, return_date || null, home_date || null, itinerary_id || null, adventure_type || "philmont", created_by]
  );
  const advId = advRows[0].id;

  const { rows: crewRows } = await pool.query(
    "INSERT INTO crews (adventure_id, name, itinerary_id, depart_date, arrive_date, return_date, home_date, leader_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
    [advId, name, itinerary_id || null, depart_date || null, arrive_date || null, return_date || null, home_date || null, created_by]
  );
  const crewId = crewRows[0].id;

  const creatorMember = (await pool.query("SELECT color_bg FROM troop_members WHERE troop_id = $1 AND user_id = $2", [troop_id, created_by])).rows[0];
  const color = creatorMember?.color_bg || COLORS[0];
  await pool.query("INSERT INTO adventure_members (adventure_id, user_id, role, color_bg) VALUES ($1, $2, 'admin', $3) ON CONFLICT DO NOTHING", [advId, created_by, color]);
  await pool.query("INSERT INTO crew_members (crew_id, user_id, role, color_bg) VALUES ($1, $2, 'admin', $3) ON CONFLICT DO NOTHING", [crewId, created_by, color]);

  if ((adventure_type || "philmont") === "philmont") {
    await seedAdventureSkills(advId, troop_id);
  }

  return { id: advId, troop_id, name, description: description || "", trek_date: trek_date || arrive_date, depart_date, arrive_date, return_date, home_date, itinerary_id, adventure_type: adventure_type || "philmont", status: "active", crew_id: crewId };
}

export async function updateAdventure(id, { name, description, trek_date, depart_date, arrive_date, return_date, home_date, status, itinerary_id, adventure_type }) {
  const sets = []; const vals = []; let n = 1;
  if (name !== undefined) { sets.push(`name = $${n++}`); vals.push(name); }
  if (description !== undefined) { sets.push(`description = $${n++}`); vals.push(description); }
  if (trek_date !== undefined) { sets.push(`trek_date = $${n++}`); vals.push(trek_date); }
  if (depart_date !== undefined) { sets.push(`depart_date = $${n++}`); vals.push(depart_date); }
  if (arrive_date !== undefined) { sets.push(`arrive_date = $${n++}`); vals.push(arrive_date); }
  if (return_date !== undefined) { sets.push(`return_date = $${n++}`); vals.push(return_date); }
  if (home_date !== undefined) { sets.push(`home_date = $${n++}`); vals.push(home_date); }
  if (status !== undefined) { sets.push(`status = $${n++}`); vals.push(status); }
  if (itinerary_id !== undefined) { sets.push(`itinerary_id = $${n++}`); vals.push(itinerary_id); }
  if (adventure_type !== undefined) { sets.push(`adventure_type = $${n++}`); vals.push(adventure_type); }
  if (sets.length === 0) return;
  vals.push(id);
  await pool.query(`UPDATE adventures SET ${sets.join(", ")} WHERE id = $${n}`, vals);

  const crew = await getDefaultCrew(id);
  if (crew) {
    const crewUpdates = {};
    if (name !== undefined) crewUpdates.name = name;
    if (depart_date !== undefined) crewUpdates.depart_date = depart_date;
    if (arrive_date !== undefined) crewUpdates.arrive_date = arrive_date;
    if (return_date !== undefined) crewUpdates.return_date = return_date;
    if (home_date !== undefined) crewUpdates.home_date = home_date;
    if (itinerary_id !== undefined) crewUpdates.itinerary_id = itinerary_id;
    if (Object.keys(crewUpdates).length > 0) await updateCrew(crew.id, crewUpdates);
  }
}

export async function deleteAdventure(id) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const crews = (await client.query("SELECT id FROM crews WHERE adventure_id = $1", [id])).rows;
    for (const c of crews) {
      await client.query("DELETE FROM crew_members WHERE crew_id = $1", [c.id]);
    }
    await client.query("DELETE FROM crews WHERE adventure_id = $1", [id]);
    await client.query("DELETE FROM member_gear WHERE adventure_id = $1", [id]);
    await client.query("DELETE FROM link_requests WHERE adventure_id = $1", [id]);
    await client.query("DELETE FROM achievements WHERE adventure_id = $1", [id]);
    await client.query("DELETE FROM crew_milestones WHERE adventure_id = $1", [id]);
    await client.query("DELETE FROM invitations WHERE adventure_id = $1", [id]);
    await client.query("DELETE FROM adventure_members WHERE adventure_id = $1", [id]);
    await client.query("DELETE FROM skills WHERE adventure_id = $1", [id]);
    await client.query("DELETE FROM adventures WHERE id = $1", [id]);
    await client.query("COMMIT");
  } catch (e) { await client.query("ROLLBACK"); throw e; }
  finally { client.release(); }
}

export async function deleteTroop(troopId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const adventures = (await client.query("SELECT id FROM adventures WHERE troop_id = $1", [troopId])).rows;
    for (const adv of adventures) {
      const crews = (await client.query("SELECT id FROM crews WHERE adventure_id = $1", [adv.id])).rows;
      for (const c of crews) {
        await client.query("DELETE FROM crew_members WHERE crew_id = $1", [c.id]);
      }
      await client.query("DELETE FROM crews WHERE adventure_id = $1", [adv.id]);
      await client.query("DELETE FROM member_gear WHERE adventure_id = $1", [adv.id]);
      await client.query("DELETE FROM link_requests WHERE adventure_id = $1", [adv.id]);
      await client.query("DELETE FROM achievements WHERE adventure_id = $1", [adv.id]);
      await client.query("DELETE FROM crew_milestones WHERE adventure_id = $1", [adv.id]);
      await client.query("DELETE FROM adventure_members WHERE adventure_id = $1", [adv.id]);
      await client.query("DELETE FROM skills WHERE adventure_id = $1", [adv.id]);
    }
    await client.query("DELETE FROM invitations WHERE troop_id = $1", [troopId]);
    await client.query("DELETE FROM skills WHERE troop_id = $1", [troopId]);
    await client.query("DELETE FROM troop_gear_overrides WHERE troop_id = $1", [troopId]);
    await client.query("DELETE FROM troop_custom_gear WHERE troop_id = $1", [troopId]);
    await client.query("DELETE FROM adventures WHERE troop_id = $1", [troopId]);
    await client.query("DELETE FROM troop_members WHERE troop_id = $1", [troopId]);
    await client.query("DELETE FROM troops WHERE id = $1", [troopId]);
    await client.query("COMMIT");
  } catch (e) { await client.query("ROLLBACK"); throw e; }
  finally { client.release(); }
}

// ── Crew Queries ──

export async function getDefaultCrew(adventureId) {
  const { rows } = await pool.query("SELECT * FROM crews WHERE adventure_id = $1 ORDER BY id LIMIT 1", [adventureId]);
  return rows[0] ?? null;
}

export async function getCrews(adventureId) {
  const { rows } = await pool.query("SELECT * FROM crews WHERE adventure_id = $1 ORDER BY id", [adventureId]);
  return rows;
}

export async function getCrew(crewId) {
  const { rows } = await pool.query("SELECT * FROM crews WHERE id = $1", [crewId]);
  return rows[0] ?? null;
}

export async function createCrew({ adventure_id, name, itinerary_id, depart_date, arrive_date, return_date, home_date, leader_id }) {
  const { rows } = await pool.query(
    "INSERT INTO crews (adventure_id, name, itinerary_id, depart_date, arrive_date, return_date, home_date, leader_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
    [adventure_id, name, itinerary_id || null, depart_date || null, arrive_date || null, return_date || null, home_date || null, leader_id || null]
  );
  return { id: rows[0].id, adventure_id, name, itinerary_id, depart_date, arrive_date, return_date, home_date, leader_id };
}

export async function updateCrew(crewId, data) {
  const sets = []; const vals = []; let n = 1;
  const fields = ["name", "itinerary_id", "depart_date", "arrive_date", "return_date", "home_date", "leader_id"];
  for (const f of fields) {
    if (data[f] !== undefined) { sets.push(`${f} = $${n++}`); vals.push(data[f]); }
  }
  if (sets.length === 0) return;
  vals.push(crewId);
  await pool.query(`UPDATE crews SET ${sets.join(", ")} WHERE id = $${n}`, vals);
}

export async function deleteCrew(crewId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const crew = (await client.query("SELECT adventure_id FROM crews WHERE id = $1", [crewId])).rows[0];
    if (!crew) { await client.query("COMMIT"); return; }
    const members = (await client.query("SELECT user_id FROM crew_members WHERE crew_id = $1", [crewId])).rows;
    for (const m of members) {
      if (m.user_id) {
        await client.query("DELETE FROM member_gear WHERE crew_id = $1 AND user_id = $2", [crewId, m.user_id]);
      }
    }
    await client.query("DELETE FROM achievements WHERE crew_id = $1", [crewId]);
    await client.query("DELETE FROM crew_milestones WHERE crew_id = $1", [crewId]);
    await client.query("DELETE FROM crew_members WHERE crew_id = $1", [crewId]);
    await client.query("DELETE FROM crews WHERE id = $1", [crewId]);
    await client.query("COMMIT");
  } catch (e) { await client.query("ROLLBACK"); throw e; }
  finally { client.release(); }
}

// ── Crew Member Queries ──

function mapCrewMemberRow(r) {
  let linkedScouts = [];
  try { linkedScouts = JSON.parse(r.linked_scouts || "[]"); } catch { linkedScouts = []; }
  if (linkedScouts.length === 0) {
    if (r.linked_to) linkedScouts.push(r.linked_to);
    else if (r.linked_to_manual) linkedScouts.push(-r.linked_to_manual);
  }
  return {
    id: r.id, crew_id: r.crew_id, adventure_id: r.adventure_id || null, user_id: r.user_id,
    name: r.is_manual ? r.manual_name : r.name,
    email: r.email || null, avatar_url: r.avatar_url || null,
    user_type: r.is_manual ? "scout" : r.user_type,
    role: r.role, participation: r.participation || "trekking",
    linked_to: linkedScouts[0] || null, linked_scouts: linkedScouts,
    is_manual: !!r.is_manual,
    color: { bg: r.color_bg },
    dates: JSON.parse(r.dates || "[]"), skills: JSON.parse(r.skills || "[]"),
    gear: JSON.parse(r.gear || "[]"), medical: JSON.parse(r.medical || "[]"),
    admin_tasks: JSON.parse(r.admin_tasks || "[]"),
  };
}

export async function getCrewMembers(crewId) {
  const crew = (await pool.query("SELECT adventure_id FROM crews WHERE id = $1", [crewId])).rows[0];
  const adventureId = crew?.adventure_id || null;
  const accountRows = (await pool.query(`
    SELECT cm.*, u.name, u.email, u.avatar_url, u.user_type
    FROM crew_members cm JOIN users u ON cm.user_id = u.id
    WHERE cm.crew_id = $1 AND cm.is_manual = 0 ORDER BY cm.id
  `, [crewId])).rows;
  const manualRows = (await pool.query(
    "SELECT cm.* FROM crew_members cm WHERE cm.crew_id = $1 AND cm.is_manual = 1 ORDER BY cm.id", [crewId]
  )).rows;
  const addAdvId = r => ({ ...r, adventure_id: adventureId });
  return [...accountRows.map(r => mapCrewMemberRow(addAdvId(r))), ...manualRows.map(r => mapCrewMemberRow(addAdvId(r)))];
}

export async function getAllCrewMembers(adventureId) {
  const crews = await getCrews(adventureId);
  const allMembers = [];
  for (const crew of crews) {
    const members = await getCrewMembers(crew.id);
    for (const m of members) {
      allMembers.push({ ...m, crew_name: crew.name });
    }
  }
  return allMembers;
}

export async function getCrewMember(crewId, userId) {
  const { rows } = await pool.query("SELECT * FROM crew_members WHERE crew_id = $1 AND user_id = $2", [crewId, userId]);
  const r = rows[0];
  if (!r) return null;
  let linkedScouts = [];
  try { linkedScouts = JSON.parse(r.linked_scouts || "[]"); } catch { linkedScouts = []; }
  if (linkedScouts.length === 0) {
    if (r.linked_to) linkedScouts.push(r.linked_to);
    else if (r.linked_to_manual) linkedScouts.push(-r.linked_to_manual);
  }
  return {
    ...r, color: { bg: r.color_bg }, participation: r.participation || "trekking",
    linked_to: linkedScouts[0] || null, linked_scouts: linkedScouts, is_manual: !!r.is_manual,
    dates: JSON.parse(r.dates || "[]"), skills: JSON.parse(r.skills || "[]"),
    gear: JSON.parse(r.gear || "[]"), medical: JSON.parse(r.medical || "[]"),
    admin_tasks: JSON.parse(r.admin_tasks || "[]"),
  };
}

export async function addCrewMember(crewId, userId, role = "member", participation = "trekking") {
  const crew = (await pool.query("SELECT adventure_id FROM crews WHERE id = $1", [crewId])).rows[0];
  if (!crew) return null;
  const adv = (await pool.query("SELECT troop_id FROM adventures WHERE id = $1", [crew.adventure_id])).rows[0];
  if (!adv) return null;
  const troopMember = (await pool.query("SELECT color_bg, participation as tp FROM troop_members WHERE troop_id = $1 AND user_id = $2", [adv.troop_id, userId])).rows[0];
  const existingCount = Number((await pool.query("SELECT COUNT(*) as c FROM crew_members WHERE crew_id = $1", [crewId])).rows[0].c);
  const color = troopMember?.color_bg || COLORS[existingCount % COLORS.length];
  const part = participation || troopMember?.tp || "trekking";
  await pool.query("INSERT INTO crew_members (crew_id, user_id, role, color_bg, participation) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING", [crewId, userId, role, color, part]);
  await pool.query("INSERT INTO adventure_members (adventure_id, user_id, role, color_bg, participation) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING", [crew.adventure_id, userId, role, color, part]);
}

export async function removeCrewMember(crewId, userId) {
  const crew = (await pool.query("SELECT adventure_id FROM crews WHERE id = $1", [crewId])).rows[0];
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (crew) {
      await client.query("DELETE FROM member_gear WHERE crew_id = $1 AND user_id = $2", [crewId, userId]);
      await client.query("DELETE FROM achievements WHERE crew_id = $1 AND user_id = $2", [crewId, userId]);
    }
    const adults = (await client.query("SELECT id, linked_scouts FROM crew_members WHERE crew_id = $1 AND linked_scouts != '[]'", [crewId])).rows;
    for (const a of adults) {
      try {
        const scouts = JSON.parse(a.linked_scouts || "[]");
        const filtered = scouts.filter(sid => sid !== userId);
        if (filtered.length !== scouts.length) {
          await client.query("UPDATE crew_members SET linked_scouts = $1 WHERE id = $2", [JSON.stringify(filtered), a.id]);
        }
      } catch {}
    }
    await client.query("DELETE FROM crew_members WHERE crew_id = $1 AND user_id = $2", [crewId, userId]);
    if (crew) {
      await client.query("DELETE FROM adventure_members WHERE adventure_id = $1 AND user_id = $2", [crew.adventure_id, userId]);
    }
    await client.query("COMMIT");
  } catch (e) { await client.query("ROLLBACK"); throw e; }
  finally { client.release(); }
}

export async function updateCrewMemberDates(crewId, userId, dates) {
  await pool.query("UPDATE crew_members SET dates = $1 WHERE crew_id = $2 AND user_id = $3", [JSON.stringify(dates), crewId, userId]);
  const crew = (await pool.query("SELECT adventure_id FROM crews WHERE id = $1", [crewId])).rows[0];
  if (crew) await pool.query("UPDATE adventure_members SET dates = $1 WHERE adventure_id = $2 AND user_id = $3", [JSON.stringify(dates), crew.adventure_id, userId]);
}

export async function updateCrewMemberSkills(crewId, userId, skills) {
  await pool.query("UPDATE crew_members SET skills = $1 WHERE crew_id = $2 AND user_id = $3", [JSON.stringify(skills), crewId, userId]);
  const crew = (await pool.query("SELECT adventure_id FROM crews WHERE id = $1", [crewId])).rows[0];
  if (crew) await pool.query("UPDATE adventure_members SET skills = $1 WHERE adventure_id = $2 AND user_id = $3", [JSON.stringify(skills), crew.adventure_id, userId]);
}

export async function updateCrewMemberGear(crewId, userId, gear) {
  await pool.query("UPDATE crew_members SET gear = $1 WHERE crew_id = $2 AND user_id = $3", [JSON.stringify(gear), crewId, userId]);
  const crew = (await pool.query("SELECT adventure_id FROM crews WHERE id = $1", [crewId])).rows[0];
  if (crew) await pool.query("UPDATE adventure_members SET gear = $1 WHERE adventure_id = $2 AND user_id = $3", [JSON.stringify(gear), crew.adventure_id, userId]);
}

export async function updateCrewMemberMedical(crewId, userId, medical) {
  await pool.query("UPDATE crew_members SET medical = $1 WHERE crew_id = $2 AND user_id = $3", [JSON.stringify(medical), crewId, userId]);
  const crew = (await pool.query("SELECT adventure_id FROM crews WHERE id = $1", [crewId])).rows[0];
  if (crew) await pool.query("UPDATE adventure_members SET medical = $1 WHERE adventure_id = $2 AND user_id = $3", [JSON.stringify(medical), crew.adventure_id, userId]);
}

export async function updateCrewMemberAdmin(crewId, userId, adminTasks) {
  await pool.query("UPDATE crew_members SET admin_tasks = $1 WHERE crew_id = $2 AND user_id = $3", [JSON.stringify(adminTasks), crewId, userId]);
  const crew = (await pool.query("SELECT adventure_id FROM crews WHERE id = $1", [crewId])).rows[0];
  if (crew) await pool.query("UPDATE adventure_members SET admin_tasks = $1 WHERE adventure_id = $2 AND user_id = $3", [JSON.stringify(adminTasks), crew.adventure_id, userId]);
}

export async function updateCrewMemberRole(crewId, userId, role) {
  await pool.query("UPDATE crew_members SET role = $1 WHERE crew_id = $2 AND user_id = $3", [role, crewId, userId]);
  const crew = (await pool.query("SELECT adventure_id FROM crews WHERE id = $1", [crewId])).rows[0];
  if (crew) await pool.query("UPDATE adventure_members SET role = $1 WHERE adventure_id = $2 AND user_id = $3", [role, crew.adventure_id, userId]);
}

export async function updateCrewMemberParticipation(crewId, userId, participation) {
  await pool.query("UPDATE crew_members SET participation = $1 WHERE crew_id = $2 AND user_id = $3", [participation, crewId, userId]);
  const crew = (await pool.query("SELECT adventure_id FROM crews WHERE id = $1", [crewId])).rows[0];
  if (crew) await pool.query("UPDATE adventure_members SET participation = $1 WHERE adventure_id = $2 AND user_id = $3", [participation, crew.adventure_id, userId]);
}

export async function linkCrewMember(crewId, supportUserId, linkedScouts) {
  const scouts = Array.isArray(linkedScouts) ? linkedScouts.slice(0, 3) : [];
  await pool.query("UPDATE crew_members SET linked_scouts = $1 WHERE crew_id = $2 AND user_id = $3", [JSON.stringify(scouts), crewId, supportUserId]);
  const crew = (await pool.query("SELECT adventure_id FROM crews WHERE id = $1", [crewId])).rows[0];
  if (crew) await pool.query("UPDATE adventure_members SET linked_scouts = $1 WHERE adventure_id = $2 AND user_id = $3", [JSON.stringify(scouts), crew.adventure_id, supportUserId]);
}

export async function addCrewManualMember(crewId, name) {
  const existingCount = Number((await pool.query("SELECT COUNT(*) as c FROM crew_members WHERE crew_id = $1", [crewId])).rows[0].c);
  const color = COLORS[existingCount % COLORS.length];
  const { rows } = await pool.query(
    "INSERT INTO crew_members (crew_id, user_id, role, is_manual, manual_name, color_bg, participation) VALUES ($1, NULL, 'member', 1, $2, $3, 'trekking') RETURNING id",
    [crewId, name, color]
  );
  const crew = (await pool.query("SELECT adventure_id FROM crews WHERE id = $1", [crewId])).rows[0];
  if (crew) {
    await pool.query(
      "INSERT INTO adventure_members (adventure_id, user_id, role, is_manual, manual_name, color_bg, participation) VALUES ($1, NULL, 'member', 1, $2, $3, 'trekking')",
      [crew.adventure_id, name, color]
    );
  }
  return { id: rows[0].id, name, color: { bg: color }, is_manual: true };
}

export async function removeCrewManualMember(crewId, memberId) {
  const negId = -memberId;
  const adults = (await pool.query("SELECT id, linked_scouts FROM crew_members WHERE crew_id = $1 AND linked_scouts != '[]'", [crewId])).rows;
  for (const a of adults) {
    try {
      const scouts = JSON.parse(a.linked_scouts || "[]");
      const filtered = scouts.filter(sid => sid !== negId);
      if (filtered.length !== scouts.length) {
        await pool.query("UPDATE crew_members SET linked_scouts = $1 WHERE id = $2", [JSON.stringify(filtered), a.id]);
      }
    } catch {}
  }
  await pool.query("DELETE FROM crew_members WHERE crew_id = $1 AND id = $2 AND is_manual = 1", [crewId, memberId]);
}

// ── Adventure Member Queries (shimmed through crews) ──

export async function getAdventureMembers(adventureId) {
  const crew = await getDefaultCrew(adventureId);
  if (crew) return getCrewMembers(crew.id);
  const accountRows = (await pool.query(`
    SELECT am.*, u.name, u.email, u.avatar_url, u.user_type
    FROM adventure_members am JOIN users u ON am.user_id = u.id
    WHERE am.adventure_id = $1 AND am.is_manual = 0 ORDER BY am.id
  `, [adventureId])).rows;
  const manualRows = (await pool.query(
    "SELECT am.* FROM adventure_members am WHERE am.adventure_id = $1 AND am.is_manual = 1 ORDER BY am.id", [adventureId]
  )).rows;
  return [...accountRows.map(r => mapCrewMemberRow({ ...r, crew_id: null })), ...manualRows.map(r => mapCrewMemberRow({ ...r, crew_id: null }))];
}

export async function getAdventureMember(adventureId, userId) {
  const crew = await getDefaultCrew(adventureId);
  if (crew) return getCrewMember(crew.id, userId);
  const { rows } = await pool.query("SELECT * FROM adventure_members WHERE adventure_id = $1 AND user_id = $2", [adventureId, userId]);
  const r = rows[0];
  if (!r) return null;
  let linkedScouts = [];
  try { linkedScouts = JSON.parse(r.linked_scouts || "[]"); } catch { linkedScouts = []; }
  if (linkedScouts.length === 0) {
    if (r.linked_to) linkedScouts.push(r.linked_to);
    else if (r.linked_to_manual) linkedScouts.push(-r.linked_to_manual);
  }
  return {
    ...r, color: { bg: r.color_bg }, participation: r.participation || "trekking",
    linked_to: linkedScouts[0] || null, linked_scouts: linkedScouts, is_manual: !!r.is_manual,
    dates: JSON.parse(r.dates), skills: JSON.parse(r.skills),
    gear: JSON.parse(r.gear), medical: JSON.parse(r.medical), admin_tasks: JSON.parse(r.admin_tasks),
  };
}

export async function addAdventureMember(adventureId, userId, role = "member", participation = "trekking") {
  const crew = await getDefaultCrew(adventureId);
  if (crew) return addCrewMember(crew.id, userId, role, participation);
  const adv = (await pool.query("SELECT troop_id FROM adventures WHERE id = $1", [adventureId])).rows[0];
  if (!adv) return null;
  const troopMember = (await pool.query("SELECT color_bg, participation as tp FROM troop_members WHERE troop_id = $1 AND user_id = $2", [adv.troop_id, userId])).rows[0];
  const existingCount = Number((await pool.query("SELECT COUNT(*) as c FROM adventure_members WHERE adventure_id = $1", [adventureId])).rows[0].c);
  const color = troopMember?.color_bg || COLORS[existingCount % COLORS.length];
  const part = participation || troopMember?.tp || "trekking";
  await pool.query("INSERT INTO adventure_members (adventure_id, user_id, role, color_bg, participation) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING", [adventureId, userId, role, color, part]);
}

export async function removeAdventureMember(adventureId, userId) {
  const crew = await getDefaultCrew(adventureId);
  if (crew) return removeCrewMember(crew.id, userId);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM member_gear WHERE adventure_id = $1 AND user_id = $2", [adventureId, userId]);
    await client.query("DELETE FROM achievements WHERE adventure_id = $1 AND user_id = $2", [adventureId, userId]);
    await client.query("DELETE FROM link_requests WHERE adventure_id = $1 AND (requester_id = $2 OR scout_id = $2)", [adventureId, userId]);
    await client.query("DELETE FROM adventure_members WHERE adventure_id = $1 AND user_id = $2", [adventureId, userId]);
    await client.query("COMMIT");
  } catch (e) { await client.query("ROLLBACK"); throw e; }
  finally { client.release(); }
}

export async function updateAdventureMemberDates(adventureId, userId, dates) {
  const crew = await getDefaultCrew(adventureId);
  if (crew) return updateCrewMemberDates(crew.id, userId, dates);
  await pool.query("UPDATE adventure_members SET dates = $1 WHERE adventure_id = $2 AND user_id = $3", [JSON.stringify(dates), adventureId, userId]);
}

export async function updateAdventureMemberSkills(adventureId, userId, skills) {
  const crew = await getDefaultCrew(adventureId);
  if (crew) return updateCrewMemberSkills(crew.id, userId, skills);
  await pool.query("UPDATE adventure_members SET skills = $1 WHERE adventure_id = $2 AND user_id = $3", [JSON.stringify(skills), adventureId, userId]);
}

export async function updateAdventureMemberGear(adventureId, userId, gear) {
  const crew = await getDefaultCrew(adventureId);
  if (crew) return updateCrewMemberGear(crew.id, userId, gear);
  await pool.query("UPDATE adventure_members SET gear = $1 WHERE adventure_id = $2 AND user_id = $3", [JSON.stringify(gear), adventureId, userId]);
}

export async function updateAdventureMemberMedical(adventureId, userId, medical) {
  const crew = await getDefaultCrew(adventureId);
  if (crew) return updateCrewMemberMedical(crew.id, userId, medical);
  await pool.query("UPDATE adventure_members SET medical = $1 WHERE adventure_id = $2 AND user_id = $3", [JSON.stringify(medical), adventureId, userId]);
}

export async function updateAdventureMemberAdmin(adventureId, userId, adminTasks) {
  const crew = await getDefaultCrew(adventureId);
  if (crew) return updateCrewMemberAdmin(crew.id, userId, adminTasks);
  await pool.query("UPDATE adventure_members SET admin_tasks = $1 WHERE adventure_id = $2 AND user_id = $3", [JSON.stringify(adminTasks), adventureId, userId]);
}

export async function updateAdventureMemberRole(adventureId, userId, role) {
  const crew = await getDefaultCrew(adventureId);
  if (crew) return updateCrewMemberRole(crew.id, userId, role);
  await pool.query("UPDATE adventure_members SET role = $1 WHERE adventure_id = $2 AND user_id = $3", [role, adventureId, userId]);
}

export async function updateAdventureMemberParticipation(adventureId, userId, participation) {
  const crew = await getDefaultCrew(adventureId);
  if (crew) return updateCrewMemberParticipation(crew.id, userId, participation);
  await pool.query("UPDATE adventure_members SET participation = $1 WHERE adventure_id = $2 AND user_id = $3", [participation, adventureId, userId]);
}

export async function linkMember(adventureId, supportUserId, linkedScouts) {
  const crew = await getDefaultCrew(adventureId);
  if (crew) return linkCrewMember(crew.id, supportUserId, linkedScouts);
  const scouts = Array.isArray(linkedScouts) ? linkedScouts.slice(0, 3) : [];
  await pool.query("UPDATE adventure_members SET linked_scouts = $1 WHERE adventure_id = $2 AND user_id = $3", [JSON.stringify(scouts), adventureId, supportUserId]);
}

// ── Manual Members (shimmed through crews) ──

export async function addManualMember(adventureId, name) {
  const crew = await getDefaultCrew(adventureId);
  if (crew) return addCrewManualMember(crew.id, name);
  const existingCount = Number((await pool.query("SELECT COUNT(*) as c FROM adventure_members WHERE adventure_id = $1", [adventureId])).rows[0].c);
  const color = COLORS[existingCount % COLORS.length];
  const { rows } = await pool.query(
    "INSERT INTO adventure_members (adventure_id, user_id, role, is_manual, manual_name, color_bg, participation) VALUES ($1, NULL, 'member', 1, $2, $3, 'trekking') RETURNING id",
    [adventureId, name, color]
  );
  return { id: rows[0].id, name, color: { bg: color }, is_manual: true };
}

export async function removeManualMember(adventureId, memberId) {
  const crew = await getDefaultCrew(adventureId);
  if (crew) return removeCrewManualMember(crew.id, memberId);
  const negId = -memberId;
  const adults = (await pool.query("SELECT id, linked_scouts FROM adventure_members WHERE adventure_id = $1 AND linked_scouts != '[]'", [adventureId])).rows;
  for (const a of adults) {
    try {
      const scouts = JSON.parse(a.linked_scouts || "[]");
      const filtered = scouts.filter(sid => sid !== negId);
      if (filtered.length !== scouts.length) {
        await pool.query("UPDATE adventure_members SET linked_scouts = $1 WHERE id = $2", [JSON.stringify(filtered), a.id]);
      }
    } catch {}
  }
  await pool.query("DELETE FROM adventure_members WHERE adventure_id = $1 AND id = $2 AND is_manual = 1", [adventureId, memberId]);
}

// ── Skills Queries ──

export async function getAdventureSkills(adventureId, category) {
  let rows;
  if (category) {
    rows = (await pool.query("SELECT * FROM skills WHERE adventure_id = $1 AND category = $2 ORDER BY sort_order, id", [adventureId, category])).rows;
  } else {
    rows = (await pool.query("SELECT * FROM skills WHERE adventure_id = $1 ORDER BY category, sort_order, id", [adventureId])).rows;
  }
  return rows.map(s => ({
    id: s.id, name: s.name, icon: s.icon, desc: s.description, description: s.description,
    category: s.category, isDefault: !!s.is_default, is_system: s.is_system || 0,
  }));
}

export async function addAdventureSkill(adventureId, name, desc, category = "training", icon = "📋") {
  const adv = (await pool.query("SELECT troop_id FROM adventures WHERE id = $1", [adventureId])).rows[0];
  if (!adv) return null;
  const id = `${adventureId}-custom-${Date.now()}`;
  const maxOrder = (await pool.query("SELECT MAX(sort_order) as m FROM skills WHERE adventure_id = $1", [adventureId])).rows[0].m || 0;
  await pool.query(
    "INSERT INTO skills (id, troop_id, adventure_id, name, icon, description, category, is_default, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8)",
    [id, adv.troop_id, adventureId, name.trim(), icon, desc?.trim() || "", category, maxOrder + 1]
  );
  return { id, name: name.trim(), icon, desc: desc?.trim() || "", category, isDefault: false };
}

export async function removeAdventureSkill(adventureId, skillId) {
  const skill = (await pool.query("SELECT is_default FROM skills WHERE id = $1 AND adventure_id = $2", [skillId, adventureId])).rows[0];
  if (skill?.is_default) return { error: "Cannot remove default skills" };
  await pool.query("DELETE FROM skills WHERE id = $1 AND adventure_id = $2", [skillId, adventureId]);
  return { ok: true };
}

export async function getTroopSkills(troopId) {
  const { rows } = await pool.query("SELECT * FROM skills WHERE troop_id = $1 ORDER BY sort_order, id", [troopId]);
  return rows.map(s => ({
    id: s.id, name: s.name, icon: s.icon, desc: s.description, category: s.category || "training", isDefault: !!s.is_default,
  }));
}

export async function addTroopSkill(troopId, name, desc) {
  const id = `${troopId}-custom-${Date.now()}`;
  const maxOrder = (await pool.query("SELECT MAX(sort_order) as m FROM skills WHERE troop_id = $1", [troopId])).rows[0].m || 0;
  await pool.query(
    "INSERT INTO skills (id, troop_id, name, icon, description, is_default, sort_order) VALUES ($1, $2, $3, '📋', $4, 0, $5)",
    [id, troopId, name.trim(), desc?.trim() || "Custom skill", maxOrder + 1]
  );
  return { id, name: name.trim(), icon: "📋", desc: desc?.trim() || "Custom skill", isDefault: false };
}

export async function removeTroopSkill(troopId, skillId) {
  const skill = (await pool.query("SELECT is_default FROM skills WHERE id = $1 AND troop_id = $2", [skillId, troopId])).rows[0];
  if (skill?.is_default) return { error: "Cannot remove default skills" };
  await pool.query("DELETE FROM skills WHERE id = $1 AND troop_id = $2", [skillId, troopId]);
  return { ok: true };
}

export async function seedAdventureSkills(adventureId, troopId) {
  const existing = (await pool.query("SELECT id FROM skills WHERE adventure_id = $1", [adventureId])).rows;
  const existingIds = new Set(existing.map(s => s.id));
  let seeded = 0;
  for (let i = 0; i < PHILMONT_DEFAULT_SKILLS.length; i++) {
    const s = PHILMONT_DEFAULT_SKILLS[i];
    const skillId = `${adventureId}-${s.id}`;
    if (!existingIds.has(skillId)) {
      await pool.query(
        "INSERT INTO skills (id, troop_id, adventure_id, name, icon, description, category, is_default, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8)",
        [skillId, troopId, adventureId, s.name, s.icon || "📋", s.desc, s.category || "training", i]
      );
      seeded++;
    }
  }
  if (seeded > 0) console.log(`[skills] Seeded ${seeded} default skills for adventure ${adventureId}`);
  return seeded;
}

// ── Gear Queries ──

export async function getGearItems(tags) {
  const { rows } = await pool.query("SELECT * FROM gear_items ORDER BY sort_order");
  return rows.map(g => ({ ...g, itinerary_tags: JSON.parse(g.itinerary_tags) }))
    .filter(g => !tags || tags.length === 0 || g.itinerary_tags.some(t => t === "all" || tags.includes(t)));
}

// ── Platform Settings ──

export async function getSetting(key) {
  const { rows } = await pool.query("SELECT value FROM platform_settings WHERE key = $1", [key]);
  return rows[0]?.value || null;
}

export async function setSetting(key, value) {
  await pool.query(
    "INSERT INTO platform_settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value",
    [key, value]
  );
}

// ── Invitation Queries ──

export async function createInvitation({ troop_id, adventure_id, email, invited_by, token }) {
  const { rows } = await pool.query(
    "INSERT INTO invitations (troop_id, adventure_id, email, invited_by, token) VALUES ($1, $2, $3, $4, $5) RETURNING id",
    [troop_id, adventure_id || null, email.toLowerCase(), invited_by, token]
  );
  return { id: rows[0].id, troop_id, adventure_id, email: email.toLowerCase(), status: "pending", token };
}

export async function getInvitationByToken(token) {
  const { rows } = await pool.query("SELECT * FROM invitations WHERE token = $1", [token]);
  return rows[0] ?? null;
}

export async function getInvitations(adventureId) {
  const { rows } = await pool.query(`
    SELECT i.*, u.name as invited_by_name
    FROM invitations i JOIN users u ON i.invited_by = u.id
    WHERE i.adventure_id = $1 ORDER BY i.created_at DESC
  `, [adventureId]);
  return rows;
}

export async function updateInvitationStatus(id, status) {
  await pool.query("UPDATE invitations SET status = $1 WHERE id = $2", [status, id]);
}

export async function getInvitationsByEmail(email) {
  const { rows } = await pool.query("SELECT * FROM invitations WHERE email = $1 AND status = 'pending'", [email.toLowerCase()]);
  return rows;
}

// ── Achievement & Milestone Queries ──

export async function earnBadge(adventureId, userId, badgeType) {
  try {
    const crew = await getDefaultCrew(adventureId);
    await pool.query(
      "INSERT INTO achievements (adventure_id, crew_id, user_id, badge_type) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
      [adventureId, crew?.id || null, userId, badgeType]
    );
    return true;
  } catch { return false; }
}

export async function getBadges(adventureId, userId) {
  if (userId) {
    return (await pool.query("SELECT * FROM achievements WHERE adventure_id = $1 AND user_id = $2", [adventureId, userId])).rows;
  }
  return (await pool.query("SELECT * FROM achievements WHERE adventure_id = $1", [adventureId])).rows;
}

export async function getCrewMilestones(adventureId) {
  return (await pool.query("SELECT * FROM crew_milestones WHERE adventure_id = $1 ORDER BY reached_at", [adventureId])).rows;
}

export async function addCrewMilestone(adventureId, milestoneType) {
  try {
    const crew = await getDefaultCrew(adventureId);
    await pool.query(
      "INSERT INTO crew_milestones (adventure_id, crew_id, milestone_type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
      [adventureId, crew?.id || null, milestoneType]
    );
    return true;
  } catch { return false; }
}

// ── Parent-Scout Auto-Linking ──

export async function autoLinkAdult(adventureId, adultUserId) {
  const adultUser = await findUserById(adultUserId);
  if (!adultUser || adultUser.user_type !== "adult") return null;
  const crew = await getDefaultCrew(adventureId);
  const table = crew ? "crew_members" : "adventure_members";
  const keyCol = crew ? "crew_id" : "adventure_id";
  const keyVal = crew ? crew.id : adventureId;
  const match = (await pool.query(`
    SELECT cm.user_id FROM ${table} cm
    JOIN users u ON cm.user_id = u.id
    WHERE cm.${keyCol} = $1 AND u.user_type = 'scout' AND cm.is_manual = 0
    AND (LOWER(u.parent_email) = $2 OR LOWER(u.parent_email_2) = $2)
    LIMIT 1
  `, [keyVal, adultUser.email.toLowerCase()])).rows[0];
  if (match) {
    await pool.query(`UPDATE ${table} SET linked_to = $1 WHERE ${keyCol} = $2 AND user_id = $3`, [match.user_id, keyVal, adultUserId]);
    if (crew) await pool.query("UPDATE adventure_members SET linked_to = $1 WHERE adventure_id = $2 AND user_id = $3", [match.user_id, adventureId, adultUserId]);
    return match.user_id;
  }
  return null;
}

export async function autoLinkScout(adventureId, scoutUserId) {
  const scoutUser = await findUserById(scoutUserId);
  if (!scoutUser || scoutUser.user_type !== "scout") return null;
  const parentEmails = [scoutUser.parent_email, scoutUser.parent_email_2]
    .filter(Boolean).map(e => e.toLowerCase());
  if (parentEmails.length === 0) return null;
  const crew = await getDefaultCrew(adventureId);
  const table = crew ? "crew_members" : "adventure_members";
  const keyCol = crew ? "crew_id" : "adventure_id";
  const keyVal = crew ? crew.id : adventureId;
  const placeholders = parentEmails.map((_, i) => `$${i + 2}`).join(", ");
  const match = (await pool.query(`
    SELECT cm.user_id FROM ${table} cm
    JOIN users u ON cm.user_id = u.id
    WHERE cm.${keyCol} = $1 AND u.user_type = 'adult' AND cm.is_manual = 0
    AND cm.linked_to IS NULL AND LOWER(u.email) IN (${placeholders})
    LIMIT 1
  `, [keyVal, ...parentEmails])).rows[0];
  if (match) {
    await pool.query(`UPDATE ${table} SET linked_to = $1 WHERE ${keyCol} = $2 AND user_id = $3`, [scoutUserId, keyVal, match.user_id]);
    if (crew) await pool.query("UPDATE adventure_members SET linked_to = $1 WHERE adventure_id = $2 AND user_id = $3", [scoutUserId, adventureId, match.user_id]);
    return match.user_id;
  }
  return null;
}

// ── Link Requests ──

export async function createLinkRequest(adventureId, requesterId, scoutId) {
  const result = await pool.query(
    "INSERT INTO link_requests (adventure_id, requester_id, scout_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING id",
    [adventureId, requesterId, scoutId]
  );
  return result.rows[0] ? { id: result.rows[0].id } : null;
}

export async function getLinkRequests(adventureId, status) {
  const base = `
    SELECT lr.*, u_req.name as requester_name, u_req.email as requester_email,
           u_scout.name as scout_name
    FROM link_requests lr
    JOIN users u_req ON lr.requester_id = u_req.id
    JOIN users u_scout ON lr.scout_id = u_scout.id
    WHERE lr.adventure_id = $1`;
  if (status) {
    return (await pool.query(base + " AND lr.status = $2 ORDER BY lr.created_at DESC", [adventureId, status])).rows;
  }
  return (await pool.query(base + " ORDER BY lr.created_at DESC", [adventureId])).rows;
}

export async function getMyLinkRequests(adventureId, userId) {
  return (await pool.query(
    "SELECT * FROM link_requests WHERE adventure_id = $1 AND requester_id = $2 ORDER BY created_at DESC",
    [adventureId, userId]
  )).rows;
}

export async function approveLinkRequest(requestId, reviewedBy) {
  const req = (await pool.query("SELECT * FROM link_requests WHERE id = $1 AND status = 'pending'", [requestId])).rows[0];
  if (!req) return null;
  await pool.query("UPDATE link_requests SET status = 'approved', reviewed_by = $1, resolved_at = CURRENT_TIMESTAMP WHERE id = $2", [reviewedBy, requestId]);
  await pool.query("UPDATE adventure_members SET linked_to = $1 WHERE adventure_id = $2 AND user_id = $3", [req.scout_id, req.adventure_id, req.requester_id]);
  const crew = await getDefaultCrew(req.adventure_id);
  if (crew) {
    await pool.query("UPDATE crew_members SET linked_to = $1 WHERE crew_id = $2 AND user_id = $3", [req.scout_id, crew.id, req.requester_id]);
  }
  return req;
}

export async function denyLinkRequest(requestId, reviewedBy) {
  await pool.query("UPDATE link_requests SET status = 'denied', reviewed_by = $1, resolved_at = CURRENT_TIMESTAMP WHERE id = $2", [reviewedBy, requestId]);
}

// ── Gear Catalog (read) ──

export async function getGearCatalog(troopId) {
  const items = (await pool.query("SELECT * FROM gear_catalog WHERE active = 1 ORDER BY sort_order")).rows;
  const allOptions = (await pool.query(`
    SELECT gpo.* FROM gear_product_options gpo
    JOIN gear_catalog gc ON gpo.gear_catalog_id = gc.id
    WHERE gc.active = 1 ORDER BY gpo.sort_order
  `)).rows;
  const optionsByItem = {};
  for (const opt of allOptions) {
    if (!optionsByItem[opt.gear_catalog_id]) optionsByItem[opt.gear_catalog_id] = [];
    optionsByItem[opt.gear_catalog_id].push(opt);
  }
  let hiddenIds = new Set();
  if (troopId) {
    const overrides = (await pool.query("SELECT gear_catalog_id FROM troop_gear_overrides WHERE troop_id = $1 AND hidden = 1", [troopId])).rows;
    hiddenIds = new Set(overrides.map(o => o.gear_catalog_id));
  }
  return items.filter(item => !hiddenIds.has(item.id)).map(item => ({ ...item, options: optionsByItem[item.id] || [] }));
}

export async function getGearCatalogItem(id) {
  const item = (await pool.query("SELECT * FROM gear_catalog WHERE id = $1", [id])).rows[0];
  if (!item) return null;
  const options = (await pool.query("SELECT * FROM gear_product_options WHERE gear_catalog_id = $1 ORDER BY sort_order", [id])).rows;
  return { ...item, options };
}

export async function getGearCategories() {
  return (await pool.query(`
    SELECT category, COUNT(*) as item_count
    FROM gear_catalog WHERE active = 1
    GROUP BY category ORDER BY MIN(sort_order)
  `)).rows;
}

// ── Member Gear ──

export async function getMemberGear(adventureId, userId) {
  return (await pool.query(`
    SELECT mg.*, gc.name as gear_name, gc.category, gc.weight_oz as default_weight_oz,
           gc.priority, gc.is_crew_shared, gc.sharing_type, gc.philmont_compliant, gc.compliance_notes,
           gpo.product_name as selected_product_name, gpo.weight_oz as selected_weight_oz,
           gpo.brand as selected_brand, gpo.price as selected_price
    FROM member_gear mg
    JOIN gear_catalog gc ON mg.gear_catalog_id = gc.id
    LEFT JOIN gear_product_options gpo ON mg.selected_option_id = gpo.id
    WHERE mg.adventure_id = $1 AND mg.user_id = $2
    ORDER BY gc.sort_order
  `, [adventureId, userId])).rows;
}

export async function getAdventureMemberGearAll(adventureId) {
  return (await pool.query(`
    SELECT mg.*, gc.name as gear_name, gc.category, gc.weight_oz as default_weight_oz,
           gc.priority, gc.is_crew_shared, gc.sharing_type
    FROM member_gear mg
    JOIN gear_catalog gc ON mg.gear_catalog_id = gc.id
    WHERE mg.adventure_id = $1
    ORDER BY mg.user_id, gc.sort_order
  `, [adventureId])).rows;
}

export async function upsertMemberGear(adventureId, userId, gearCatalogId, data) {
  const existing = (await pool.query(
    "SELECT id FROM member_gear WHERE adventure_id = $1 AND user_id = $2 AND gear_catalog_id = $3",
    [adventureId, userId, gearCatalogId]
  )).rows[0];

  if (existing) {
    const sets = []; const vals = []; let n = 1;
    if (data.status !== undefined) { sets.push(`status = $${n++}`); vals.push(data.status); }
    if (data.selected_option_id !== undefined) { sets.push(`selected_option_id = $${n++}`); vals.push(data.selected_option_id); }
    if (data.custom_product_name !== undefined) { sets.push(`custom_product_name = $${n++}`); vals.push(data.custom_product_name); }
    if (data.custom_weight_oz !== undefined) { sets.push(`custom_weight_oz = $${n++}`); vals.push(data.custom_weight_oz); }
    if (data.notes !== undefined) { sets.push(`notes = $${n++}`); vals.push(data.notes); }
    if (sets.length > 0) {
      sets.push("updated_at = CURRENT_TIMESTAMP");
      vals.push(existing.id);
      await pool.query(`UPDATE member_gear SET ${sets.join(", ")} WHERE id = $${n}`, vals);
    }
    return existing.id;
  } else {
    const crew = await getDefaultCrew(adventureId);
    const crewId = crew?.id || null;
    const { rows } = await pool.query(
      "INSERT INTO member_gear (adventure_id, crew_id, user_id, gear_catalog_id, status, selected_option_id, custom_product_name, custom_weight_oz, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id",
      [adventureId, crewId, userId, gearCatalogId, data.status || "needed", data.selected_option_id || null, data.custom_product_name || null, data.custom_weight_oz || null, data.notes || null]
    );
    return rows[0].id;
  }
}

export async function bulkSetMemberGear(adventureId, userId, gearSelections) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const sel of gearSelections) {
      await upsertMemberGear(adventureId, userId, sel.gear_catalog_id, sel);
    }
    await client.query("COMMIT");
  } catch (e) { await client.query("ROLLBACK"); throw e; }
  finally { client.release(); }
}

export async function removeMemberGearItem(adventureId, userId, gearCatalogId) {
  await pool.query("DELETE FROM member_gear WHERE adventure_id = $1 AND user_id = $2 AND gear_catalog_id = $3", [adventureId, userId, gearCatalogId]);
}

// ── Pack Weight Calculator ──

export async function getMemberPackWeight(adventureId, userId) {
  const gear = (await pool.query(`
    SELECT mg.status, mg.custom_weight_oz,
           gc.category, gc.weight_oz as default_weight_oz, gc.is_crew_shared,
           gc.sharing_type,
           gpo.weight_oz as option_weight_oz
    FROM member_gear mg
    JOIN gear_catalog gc ON mg.gear_catalog_id = gc.id
    LEFT JOIN gear_product_options gpo ON mg.selected_option_id = gpo.id
    WHERE mg.adventure_id = $1 AND mg.user_id = $2 AND mg.status = 'packed'
  `, [adventureId, userId])).rows;

  const byCategory = {};
  let totalOz = 0;
  let crewBuddyCount = 0;
  let providedCount = 0;

  for (const g of gear) {
    const sType = g.sharing_type || "personal";
    if (sType !== "personal") {
      if (sType === "provided") providedCount++;
      else crewBuddyCount++;
      continue;
    }
    const weight = g.custom_weight_oz || g.option_weight_oz || g.default_weight_oz || 0;
    if (!byCategory[g.category]) byCategory[g.category] = { weight_oz: 0, count: 0 };
    byCategory[g.category].weight_oz += weight;
    byCategory[g.category].count += 1;
    totalOz += weight;
  }

  const totalLbs = totalOz / 16;
  const crew = await getDefaultCrew(adventureId);
  const itinId = crew?.itinerary_id || (await getAdventure(adventureId))?.itinerary_id;
  let trekDays = 12;
  if (itinId) {
    const itin = await getItinerary(itinId);
    if (itin?.days) trekDays = itin.days;
  }
  const personalCount = gear.length - crewBuddyCount - providedCount;
  const hasPacked = personalCount > 0;
  const foodLbs = hasPacked ? Math.round(1.75 * trekDays * 10) / 10 : 0;
  const waterLbs = hasPacked ? 6.6 : 0;
  const grandTotalLbs = totalLbs + foodLbs + waterLbs;

  return {
    base_weight_oz: totalOz, base_weight_lbs: Math.round(totalLbs * 10) / 10,
    food_estimate_lbs: foodLbs, trek_days: trekDays, water_lbs: waterLbs,
    grand_total_lbs: Math.round(grandTotalLbs * 10) / 10,
    by_category: byCategory, item_count: personalCount,
    crew_buddy_count: crewBuddyCount, provided_count: providedCount,
    total_packed: gear.length, philmont_limit_lbs: 50, over_limit: grandTotalLbs > 50,
  };
}

// ── Gear Admin ──

export async function createGearCatalogItem(data) {
  const maxOrder = (await pool.query("SELECT MAX(sort_order) as m FROM gear_catalog")).rows[0].m || 0;
  const { rows } = await pool.query(`
    INSERT INTO gear_catalog (name, category, subcategory, description, weight_oz, weight_class, priority, price_tier, msrp, rating_stars, rating_notes, philmont_compliant, compliance_notes, is_crew_shared, sharing_type, affiliate_priority, sort_order)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING id`,
    [data.name, data.category, data.subcategory || null, data.description || null,
     data.weight_oz || null, data.weight_class || null, data.priority || "recommended",
     data.price_tier || null, data.msrp || null, data.rating_stars || null, data.rating_notes || null,
     data.philmont_compliant ?? 1, data.compliance_notes || null,
     data.is_crew_shared || 0, data.sharing_type || "personal", data.affiliate_priority || "Medium", maxOrder + 1]
  );
  return { id: rows[0].id, ...data };
}

export async function updateGearCatalogItem(id, data) {
  const sets = []; const vals = []; let n = 1;
  const fields = ["name", "category", "subcategory", "description", "weight_oz", "weight_class", "priority",
    "price_tier", "msrp", "rating_stars", "rating_notes", "philmont_compliant", "compliance_notes",
    "is_crew_shared", "sharing_type", "affiliate_priority", "sort_order", "active"];
  for (const f of fields) {
    if (data[f] !== undefined) { sets.push(`${f} = $${n++}`); vals.push(data[f]); }
  }
  if (sets.length === 0) return;
  sets.push("updated_at = CURRENT_TIMESTAMP");
  vals.push(id);
  await pool.query(`UPDATE gear_catalog SET ${sets.join(", ")} WHERE id = $${n}`, vals);
}

export async function softDeleteGearCatalogItem(id) {
  await pool.query("UPDATE gear_catalog SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);
}

export async function reorderGearCatalog(orderedIds) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query("UPDATE gear_catalog SET sort_order = $1 WHERE id = $2", [i + 1, orderedIds[i]]);
    }
    await client.query("COMMIT");
  } catch (e) { await client.query("ROLLBACK"); throw e; }
  finally { client.release(); }
}

// ── Product Options Admin ──

export async function addProductOption(gearCatalogId, data) {
  const maxOrder = (await pool.query("SELECT MAX(sort_order) as m FROM gear_product_options WHERE gear_catalog_id = $1", [gearCatalogId])).rows[0].m || 0;
  const { rows } = await pool.query(`
    INSERT INTO gear_product_options (gear_catalog_id, tier, star_rating, product_name, brand, price, weight_oz, notes, is_ultralight_pick, sort_order, affiliate_url)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
    [gearCatalogId, data.tier, data.star_rating || 3, data.product_name, data.brand || null, data.price || null, data.weight_oz || null, data.notes || null, data.is_ultralight_pick || 0, maxOrder + 1, data.affiliate_url || null]
  );
  return { id: rows[0].id, ...data };
}

export async function updateProductOption(optionId, data) {
  const sets = []; const vals = []; let n = 1;
  const fields = ["tier", "star_rating", "product_name", "brand", "price", "weight_oz", "notes", "is_ultralight_pick", "sort_order", "affiliate_url"];
  for (const f of fields) {
    if (data[f] !== undefined) { sets.push(`${f} = $${n++}`); vals.push(data[f]); }
  }
  if (sets.length === 0) return;
  vals.push(optionId);
  await pool.query(`UPDATE gear_product_options SET ${sets.join(", ")} WHERE id = $${n}`, vals);
}

export async function deleteProductOption(optionId) {
  await pool.query("UPDATE member_gear SET selected_option_id = NULL WHERE selected_option_id = $1", [optionId]);
  await pool.query("DELETE FROM gear_product_options WHERE id = $1", [optionId]);
}

// ── Global Admin Queries ──

export async function getAllTroopsAdmin() {
  return (await pool.query(`
    SELECT t.*,
      (SELECT COUNT(*) FROM troop_members WHERE troop_id = t.id AND status = 'approved') as member_count,
      (SELECT COUNT(*) FROM troop_members WHERE troop_id = t.id AND status = 'pending') as pending_count,
      (SELECT COUNT(*) FROM adventures WHERE troop_id = t.id) as adventure_count,
      u.name as creator_name, u.email as creator_email
    FROM troops t
    LEFT JOIN users u ON t.created_by = u.id
    ORDER BY t.created_at DESC
  `)).rows;
}

export async function getTroopMembersAdmin(troopId) {
  return (await pool.query(`
    SELECT tm.id, tm.user_id, tm.troop_id, tm.role, tm.status, tm.created_at,
           u.name, u.email, u.avatar_url, u.user_type
    FROM troop_members tm JOIN users u ON tm.user_id = u.id
    WHERE tm.troop_id = $1 ORDER BY tm.status DESC, tm.role DESC, tm.id
  `, [troopId])).rows;
}

export async function getAllUsersAdmin() {
  return (await pool.query(`
    SELECT u.id, u.email, u.name, u.user_type, u.created_at, u.email_verified,
      (SELECT COUNT(*) FROM troop_members WHERE user_id = u.id AND status = 'approved') as troop_count
    FROM users u ORDER BY u.created_at DESC
  `)).rows;
}

export async function getAllSettings() {
  return (await pool.query("SELECT * FROM platform_settings ORDER BY key")).rows;
}

export async function trackAffiliateClick(userId, productOptionId, gearCatalogId, url, referrer) {
  await pool.query(
    "INSERT INTO affiliate_clicks (user_id, product_option_id, gear_catalog_id, url, referrer) VALUES ($1, $2, $3, $4, $5)",
    [userId, productOptionId || null, gearCatalogId || null, url, referrer || null]
  );
}

export async function getAffiliateStats() {
  const totalClicks = Number((await pool.query("SELECT COUNT(*) as total FROM affiliate_clicks")).rows[0].total);
  const clicksByProduct = (await pool.query(`
    SELECT gc.name as gear_name, gpo.product_name, COUNT(*) as clicks, MAX(ac.created_at) as last_click
    FROM affiliate_clicks ac
    LEFT JOIN gear_product_options gpo ON ac.product_option_id = gpo.id
    LEFT JOIN gear_catalog gc ON ac.gear_catalog_id = gc.id
    GROUP BY ac.product_option_id, ac.gear_catalog_id, gc.name, gpo.product_name
    ORDER BY clicks DESC LIMIT 50
  `)).rows;
  const clicksByDay = (await pool.query(`
    SELECT DATE(created_at) as day, COUNT(*) as clicks
    FROM affiliate_clicks WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at) ORDER BY day
  `)).rows;
  return { totalClicks, clicksByProduct, clicksByDay };
}

// ── Troop Gear Overrides ──

export async function setTroopGearOverride(troopId, gearCatalogId, hidden) {
  await pool.query(
    "INSERT INTO troop_gear_overrides (troop_id, gear_catalog_id, hidden) VALUES ($1, $2, $3) ON CONFLICT(troop_id, gear_catalog_id) DO UPDATE SET hidden = EXCLUDED.hidden",
    [troopId, gearCatalogId, hidden ? 1 : 0]
  );
}

export async function getTroopGearOverrides(troopId) {
  return (await pool.query("SELECT * FROM troop_gear_overrides WHERE troop_id = $1", [troopId])).rows;
}

// ── Troop Custom Gear ──

export async function getTroopCustomGear(troopId) {
  return (await pool.query("SELECT * FROM troop_custom_gear WHERE troop_id = $1 AND active = 1 ORDER BY sort_order", [troopId])).rows;
}

export async function addTroopCustomGear(troopId, data) {
  const maxOrder = (await pool.query("SELECT MAX(sort_order) as m FROM troop_custom_gear WHERE troop_id = $1", [troopId])).rows[0].m || 0;
  const { rows } = await pool.query(`
    INSERT INTO troop_custom_gear (troop_id, name, category, subcategory, description, weight_oz, priority, is_crew_shared, sharing_type, sort_order)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [troopId, data.name, data.category, data.subcategory || null, data.description || null, data.weight_oz || null, data.priority || "recommended", data.is_crew_shared || 0, data.sharing_type || "personal", maxOrder + 1]
  );
  return { id: rows[0].id, troop_id: troopId, ...data };
}

export async function updateTroopCustomGearItem(troopId, id, data) {
  const sets = []; const vals = []; let n = 1;
  const fields = ["name", "category", "subcategory", "description", "weight_oz", "priority", "is_crew_shared", "sharing_type", "sort_order", "active"];
  for (const f of fields) {
    if (data[f] !== undefined) { sets.push(`${f} = $${n++}`); vals.push(data[f]); }
  }
  if (sets.length === 0) return;
  vals.push(id, troopId);
  await pool.query(`UPDATE troop_custom_gear SET ${sets.join(", ")} WHERE id = $${n} AND troop_id = $${n + 1}`, vals);
}

export async function deleteTroopCustomGear(troopId, id) {
  await pool.query("UPDATE troop_custom_gear SET active = 0 WHERE id = $1 AND troop_id = $2", [id, troopId]);
}

// ── AI Logs ──

export async function logAIQuery(userId, adventureId, query, response, tokensUsed) {
  await pool.query("INSERT INTO gear_ai_logs (user_id, adventure_id, query, response, tokens_used) VALUES ($1, $2, $3, $4, $5)",
    [userId, adventureId || null, query, response, tokensUsed || 0]);
}

export async function getAIUsage(userId) {
  const { rows } = await pool.query("SELECT COUNT(*) as query_count, SUM(tokens_used) as total_tokens FROM gear_ai_logs WHERE user_id = $1", [userId]);
  return rows[0];
}

// ── Training Events ──

export async function createTrainingEvent(adventureId, data, createdBy) {
  const { rows } = await pool.query(
    "INSERT INTO training_events (adventure_id, date, period, time_label, location, notes, type, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
    [adventureId, data.date, data.period || "all", data.time_label || null, data.location || null, data.notes || null, data.type || "proposed", createdBy]
  );
  return { id: Number(rows[0].id), ...data, type: data.type || "proposed", status: "active" };
}

export async function getTrainingEvents(adventureId) {
  const events = (await pool.query("SELECT * FROM training_events WHERE adventure_id = $1 ORDER BY date, period", [adventureId])).rows;
  for (const e of events) {
    e.rsvps = (await pool.query(`
      SELECT tr.user_id, tr.status, u.name FROM training_rsvps tr
      JOIN users u ON tr.user_id = u.id WHERE tr.event_id = $1
    `, [e.id])).rows;
    e.attendance = (await pool.query(`
      SELECT ta.user_id, ta.attended, ta.marked_at, u.name FROM training_attendance ta
      JOIN users u ON ta.user_id = u.id WHERE ta.event_id = $1
    `, [e.id])).rows;
  }
  return events;
}

export async function getTrainingEvent(eventId) {
  const e = (await pool.query("SELECT * FROM training_events WHERE id = $1", [eventId])).rows[0];
  if (!e) return null;
  e.rsvps = (await pool.query(`
    SELECT tr.user_id, tr.status, u.name FROM training_rsvps tr
    JOIN users u ON tr.user_id = u.id WHERE tr.event_id = $1
  `, [e.id])).rows;
  return e;
}

export async function deleteTrainingEvent(eventId) {
  await pool.query("DELETE FROM training_events WHERE id = $1", [eventId]);
}

export async function upsertTrainingRsvp(eventId, userId, status) {
  await pool.query(
    `INSERT INTO training_rsvps (event_id, user_id, status, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT(event_id, user_id) DO UPDATE SET status = $3, updated_at = CURRENT_TIMESTAMP`,
    [eventId, userId, status]
  );
}

export async function updateTrainingEventStatus(eventId, type, status) {
  await pool.query("UPDATE training_events SET type = $1, status = $2 WHERE id = $3", [type, status, eventId]);
}

export async function updateTrainingEvent(eventId, data) {
  await pool.query(
    "UPDATE training_events SET date = $1, period = $2, time_label = $3, location = $4, notes = $5 WHERE id = $6",
    [data.date, data.period || "all", data.time_label || null, data.location || null, data.notes || null, eventId]
  );
}

export async function markAttendance(eventId, userId, attended, markedBy) {
  await pool.query(
    `INSERT INTO training_attendance (event_id, user_id, attended, marked_by, marked_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
     ON CONFLICT(event_id, user_id) DO UPDATE SET attended = $3, marked_by = $4, marked_at = CURRENT_TIMESTAMP`,
    [eventId, userId, attended, markedBy]
  );
}

export async function bulkMarkAttendance(eventId, attendeeUserIds, markedBy) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const uid of attendeeUserIds) {
      await client.query(
        `INSERT INTO training_attendance (event_id, user_id, attended, marked_by, marked_at) VALUES ($1, $2, 1, $3, CURRENT_TIMESTAMP)
         ON CONFLICT(event_id, user_id) DO UPDATE SET attended = 1, marked_by = $3, marked_at = CURRENT_TIMESTAMP`,
        [eventId, uid, markedBy]
      );
    }
    await client.query("COMMIT");
  } catch (e) { await client.query("ROLLBACK"); throw e; }
  finally { client.release(); }
}

export async function getEventAttendance(eventId) {
  return (await pool.query(`
    SELECT ta.user_id, ta.attended, ta.marked_at, u.name
    FROM training_attendance ta JOIN users u ON ta.user_id = u.id
    WHERE ta.event_id = $1
  `, [eventId])).rows;
}

export async function getMemberAttendanceCount(adventureId, userId) {
  const row = (await pool.query(`
    SELECT COUNT(*) as count FROM training_attendance ta
    JOIN training_events te ON ta.event_id = te.id
    WHERE te.adventure_id = $1 AND ta.user_id = $2 AND ta.attended = 1 AND te.status = 'completed'
  `, [adventureId, userId])).rows[0];
  return Number(row?.count || 0);
}

// ── Attendance Milestone Config ──

function getAttendanceMilestones(adventureId, advRow) {
  let milestones = DEFAULT_MILESTONES;
  if (advRow?.attendance_milestones) {
    try { milestones = JSON.parse(advRow.attendance_milestones); } catch { /* use defaults */ }
  }
  return milestones.map(ms => ({
    count: ms.count, id_suffix: `attend-${ms.count}`,
    name: ms.count === 1 ? "Attended 1 Training" : `Attended ${ms.count} Trainings`,
    icon: ms.icon || "⭐",
    desc: ms.count === 1 ? "Attended your first training session" : `Attended ${ms.count} training sessions`,
  }));
}

export async function getAdventureMilestoneConfig(adventureId) {
  const adv = (await pool.query("SELECT attendance_milestones FROM adventures WHERE id = $1", [adventureId])).rows[0];
  if (adv?.attendance_milestones) {
    try { return JSON.parse(adv.attendance_milestones); } catch { /* fall through */ }
  }
  return DEFAULT_MILESTONES;
}

export async function setAdventureMilestoneConfig(adventureId, milestones) {
  await pool.query("UPDATE adventures SET attendance_milestones = $1 WHERE id = $2", [JSON.stringify(milestones), adventureId]);
}

export async function syncAttendanceSkills(adventureId) {
  const adv = (await pool.query("SELECT troop_id, attendance_milestones FROM adventures WHERE id = $1", [adventureId])).rows[0];
  if (!adv) return;

  const ATTENDANCE_MILESTONES = getAttendanceMilestones(adventureId, adv);

  for (const ms of ATTENDANCE_MILESTONES) {
    const skillId = `${adventureId}-sys-${ms.id_suffix}`;
    const existing = (await pool.query("SELECT id FROM skills WHERE id = $1", [skillId])).rows[0];
    if (!existing) {
      await pool.query(
        "INSERT INTO skills (id, troop_id, adventure_id, name, icon, description, category, is_default, is_system, sort_order) VALUES ($1, $2, $3, $4, $5, $6, 'training', 1, 1, $7)",
        [skillId, adv.troop_id, adventureId, ms.name, ms.icon, ms.desc, 1000 + ms.count]
      );
    }
  }

  const members = (await pool.query(`
    SELECT DISTINCT ta.user_id, COUNT(*) as count
    FROM training_attendance ta
    JOIN training_events te ON ta.event_id = te.id
    WHERE te.adventure_id = $1 AND ta.attended = 1 AND te.status = 'completed'
    GROUP BY ta.user_id
  `, [adventureId])).rows;

  const crewMembers = (await pool.query(`
    SELECT cm.user_id, cm.skills, cm.id as crew_member_id
    FROM crew_members cm
    JOIN crews c ON cm.crew_id = c.id
    WHERE c.adventure_id = $1
  `, [adventureId])).rows;

  for (const cm of crewMembers) {
    const memberAttendance = members.find(m => m.user_id === cm.user_id);
    const attendCount = Number(memberAttendance?.count || 0);
    let currentSkills = [];
    try { currentSkills = JSON.parse(cm.skills || "[]"); } catch { currentSkills = []; }

    let changed = false;
    for (const ms of ATTENDANCE_MILESTONES) {
      const skillId = `${adventureId}-sys-${ms.id_suffix}`;
      const hasSkill = currentSkills.includes(skillId);
      if (attendCount >= ms.count && !hasSkill) {
        currentSkills.push(skillId);
        changed = true;
      } else if (attendCount < ms.count && hasSkill) {
        currentSkills = currentSkills.filter(s => s !== skillId);
        changed = true;
      }
    }
    if (changed) {
      await pool.query("UPDATE crew_members SET skills = $1 WHERE id = $2", [JSON.stringify(currentSkills), cm.crew_member_id]);
    }
  }
}

// ── AI Readiness Engine ──

export async function getAssessment(crewId, userId) {
  return (await pool.query("SELECT * FROM member_assessments WHERE crew_id = $1 AND user_id = $2", [crewId, userId])).rows[0] ?? null;
}

export async function upsertAssessment(crewId, userId, data) {
  await pool.query(`
    INSERT INTO member_assessments (crew_id, user_id, current_distance_miles, pack_experience, elevation_access, activity_level, assessed_at)
    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    ON CONFLICT(crew_id, user_id) DO UPDATE SET
      current_distance_miles = $3, pack_experience = $4, elevation_access = $5, activity_level = $6, assessed_at = CURRENT_TIMESTAMP`,
    [crewId, userId, data.current_distance_miles, data.pack_experience, data.elevation_access, data.activity_level]
  );
}

export async function getCrewAssessments(crewId) {
  return (await pool.query(`
    SELECT ma.*, u.name, u.avatar_url FROM member_assessments ma
    JOIN users u ON ma.user_id = u.id WHERE ma.crew_id = $1
  `, [crewId])).rows;
}

export async function getReadinessPlan(crewId, userId) {
  const row = (await pool.query("SELECT * FROM readiness_plans WHERE crew_id = $1 AND user_id = $2", [crewId, userId])).rows[0];
  if (!row) return null;
  return { ...row, plan: JSON.parse(row.plan_json), priorities: JSON.parse(row.priorities_json) };
}

export async function upsertReadinessPlan(crewId, userId, planObj, prioritiesArr, weeksAtGen) {
  await pool.query(`
    INSERT INTO readiness_plans (crew_id, user_id, plan_json, priorities_json, weeks_at_generation, generated_at)
    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    ON CONFLICT(crew_id, user_id) DO UPDATE SET
      plan_json = $3, priorities_json = $4, weeks_at_generation = $5, generated_at = CURRENT_TIMESTAMP`,
    [crewId, userId, JSON.stringify(planObj), JSON.stringify(prioritiesArr), weeksAtGen]
  );
}

export async function getReadinessProgress(crewId, userId) {
  return (await pool.query("SELECT * FROM readiness_progress WHERE crew_id = $1 AND user_id = $2 ORDER BY phase_number", [crewId, userId])).rows;
}

export async function upsertReadinessProgress(crewId, userId, phaseNumber, status, note) {
  await pool.query(`
    INSERT INTO readiness_progress (crew_id, user_id, phase_number, status, note, updated_at)
    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    ON CONFLICT(crew_id, user_id, phase_number) DO UPDATE SET
      status = $4, note = $5, updated_at = CURRENT_TIMESTAMP`,
    [crewId, userId, phaseNumber, status, note]
  );
}

export async function getCrewReadinessDashboard(crewId) {
  const members = (await pool.query(`
    SELECT cm.user_id, cm.participation, u.name, u.avatar_url
    FROM crew_members cm JOIN users u ON cm.user_id = u.id
    WHERE cm.crew_id = $1 AND cm.is_manual = 0
  `, [crewId])).rows;

  const assessments = (await pool.query("SELECT * FROM member_assessments WHERE crew_id = $1", [crewId])).rows;
  const plans = (await pool.query("SELECT user_id, plan_json, priorities_json, weeks_at_generation, generated_at FROM readiness_plans WHERE crew_id = $1", [crewId])).rows;
  const progress = (await pool.query("SELECT * FROM readiness_progress WHERE crew_id = $1 ORDER BY phase_number", [crewId])).rows;

  const assessmentMap = {};
  for (const a of assessments) assessmentMap[a.user_id] = a;
  const planMap = {};
  for (const p of plans) planMap[p.user_id] = { ...p, plan: JSON.parse(p.plan_json), priorities: JSON.parse(p.priorities_json) };
  const progressMap = {};
  for (const p of progress) {
    if (!progressMap[p.user_id]) progressMap[p.user_id] = [];
    progressMap[p.user_id].push(p);
  }

  return members.map(m => ({
    user_id: m.user_id, name: m.name, avatar_url: m.avatar_url, participation: m.participation,
    assessment: assessmentMap[m.user_id] || null,
    plan: planMap[m.user_id] || null,
    progress: progressMap[m.user_id] || [],
  }));
}

export async function deleteReadinessPlan(crewId, userId) {
  await pool.query("DELETE FROM readiness_plans WHERE crew_id = $1 AND user_id = $2", [crewId, userId]);
  await pool.query("DELETE FROM readiness_progress WHERE crew_id = $1 AND user_id = $2", [crewId, userId]);
}

export async function getGearStatusSummary(crewId, userId) {
  const crew = (await pool.query("SELECT adventure_id FROM crews WHERE id = $1", [crewId])).rows[0];
  if (!crew) return { total: 0, needed: 0, owned: 0, packed: 0 };
  const statusRows = (await pool.query(`
    SELECT mg.status, COUNT(*) as c FROM member_gear mg
    JOIN gear_catalog gc ON mg.gear_catalog_id = gc.id
    WHERE mg.adventure_id = $1 AND mg.user_id = $2 AND gc.active = 1
    GROUP BY mg.status
  `, [crew.adventure_id, userId])).rows;
  const result = { total: 0, needed: 0, owned: 0, packed: 0 };
  for (const r of statusRows) {
    result[r.status] = Number(r.c);
    result.total += Number(r.c);
  }
  const catalogCount = Number((await pool.query("SELECT COUNT(*) as c FROM gear_catalog WHERE active = 1")).rows[0].c);
  result.needed += (catalogCount - result.total);
  result.total = catalogCount;
  return result;
}

// ── AI Gear Recommendations Cache ──

export async function getCachedGearRec(gearCatalogId, adventureType = "philmont") {
  const row = (await pool.query(
    "SELECT * FROM ai_gear_recommendations WHERE gear_catalog_id = $1 AND adventure_type = $2 AND expires_at > NOW()",
    [gearCatalogId, adventureType]
  )).rows[0];
  if (!row) return null;
  return { ...row, recommendations: JSON.parse(row.recommendations) };
}

export async function upsertGearRec(gearCatalogId, adventureType, recommendations, tokensUsed, expiresAt) {
  await pool.query(`
    INSERT INTO ai_gear_recommendations (gear_catalog_id, adventure_type, recommendations, tokens_used, generated_at, expires_at)
    VALUES ($1, $2, $3, $4, NOW(), $5)
    ON CONFLICT(gear_catalog_id, adventure_type) DO UPDATE SET
      recommendations = EXCLUDED.recommendations, tokens_used = EXCLUDED.tokens_used,
      generated_at = NOW(), expires_at = EXCLUDED.expires_at`,
    [gearCatalogId, adventureType, JSON.stringify(recommendations), tokensUsed, expiresAt]
  );
}

export async function getExpiredGearRecs() {
  return (await pool.query("SELECT * FROM ai_gear_recommendations WHERE expires_at <= NOW()")).rows;
}

export async function getAllGearCatalogItems() {
  return (await pool.query("SELECT * FROM gear_catalog WHERE active = 1 ORDER BY sort_order")).rows;
}

export async function expireAllGearRecs() {
  const result = await pool.query("UPDATE ai_gear_recommendations SET expires_at = NOW() - INTERVAL '1 hour'");
  return result;
}

export async function getLastGearRefreshTime() {
  const row = (await pool.query("SELECT MAX(generated_at) as last_refresh FROM ai_gear_recommendations")).rows[0];
  return row?.last_refresh || null;
}

// ── Adventure Documents ──

export async function getAdventureDocuments(adventureId) {
  return (await pool.query(`
    SELECT d.*, u.name as uploader_name
    FROM adventure_documents d
    LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE d.adventure_id = $1
    ORDER BY d.created_at DESC
  `, [adventureId])).rows;
}

export async function addAdventureDocument(adventureId, name, originalName, filePath, mimeType, size, description, uploadedBy) {
  const result = await pool.query(`
    INSERT INTO adventure_documents (adventure_id, name, original_name, file_path, mime_type, size, description, uploaded_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [adventureId, name, originalName, filePath, mimeType, size, description, uploadedBy]
  );
  return result;
}

export async function getAdventureDocument(docId) {
  return (await pool.query("SELECT * FROM adventure_documents WHERE id = $1", [docId])).rows[0];
}

export async function deleteAdventureDocument(docId) {
  return await pool.query("DELETE FROM adventure_documents WHERE id = $1", [docId]);
}

// ── Onboarding ──

export async function getOnboarding(userId) {
  const row = (await pool.query(
    "SELECT onboarding_role, onboarding_completed, onboarding_steps FROM users WHERE id = $1",
    [userId]
  )).rows[0];
  if (!row) return { role: null, steps: [], completed: false };
  return {
    role: row.onboarding_role || null,
    steps: row.onboarding_steps ? JSON.parse(row.onboarding_steps) : [],
    completed: row.onboarding_completed === 1,
  };
}

export async function setOnboardingRole(userId, role) {
  await pool.query("UPDATE users SET onboarding_role = $1 WHERE id = $2", [role, userId]);
}

export async function completeOnboardingStep(userId, step) {
  const row = (await pool.query("SELECT onboarding_steps FROM users WHERE id = $1", [userId])).rows[0];
  const steps = row?.onboarding_steps ? JSON.parse(row.onboarding_steps) : [];
  if (!steps.includes(step)) {
    steps.push(step);
  }
  await pool.query("UPDATE users SET onboarding_steps = $1 WHERE id = $2", [JSON.stringify(steps), userId]);
  return steps;
}

export async function completeOnboarding(userId) {
  await pool.query("UPDATE users SET onboarding_completed = 1 WHERE id = $1", [userId]);
}
