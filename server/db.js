import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";

const DATA_DIR = process.env.DATA_DIR || "./data";
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(`${DATA_DIR}/crew614.db`);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema ──
db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color_bg TEXT NOT NULL,
    dates TEXT NOT NULL DEFAULT '[]',
    skills TEXT NOT NULL DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '📋',
    description TEXT NOT NULL DEFAULT '',
    is_default INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
`);

// ── Seed default skills if empty ──
const DEFAULT_SKILLS = [
  { id: "loaded", name: "Loaded Pack Hike (8+ mi)", icon: "🎒", desc: "Full weight, terrain with elevation" },
  { id: "elevation", name: "Elevation / Hill Training", icon: "⛰️", desc: "Stair repeats, hill sprints, incline hikes" },
  { id: "water", name: "Water Carry & Purification", icon: "💧", desc: "Practice dry camp water protocol (4-6L)" },
  { id: "bearbag", name: "Bear Bag Hanging", icon: "🐻", desc: "Required every night on trail" },
  { id: "stove", name: "Stove & Cook Setup", icon: "🔥", desc: "Crew meal prep and cleanup" },
  { id: "navigation", name: "Map & Compass Nav", icon: "🧭", desc: "Both North + South sectional maps" },
  { id: "overnight", name: "Full Overnight Shakedown", icon: "🏕️", desc: "Min 2 required before trek" },
  { id: "conditioning", name: "Conditioning Hike", icon: "🥾", desc: "3-5x/week — ramp up intensity now" },
];

const skillCount = db.prepare("SELECT COUNT(*) as c FROM skills").get();
if (skillCount.c === 0) {
  const insert = db.prepare("INSERT INTO skills (id, name, icon, description, is_default, sort_order) VALUES (?, ?, ?, ?, 1, ?)");
  DEFAULT_SKILLS.forEach((s, i) => insert.run(s.id, s.name, s.icon, s.desc, i));
}

// ── Colors ──
const COLORS = [
  "#E07A5F", "#3D6B5B", "#5B7BB4", "#D4A05A", "#8E6AAF",
  "#C26B5A", "#4A8F8F", "#7A7040", "#B55A8D", "#5A7F5A",
];

// ── Queries ──

export function getMembers() {
  const rows = db.prepare("SELECT * FROM members ORDER BY id").all();
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    color: { bg: r.color_bg },
    dates: JSON.parse(r.dates),
    skills: JSON.parse(r.skills),
  }));
}

export function addMember(name) {
  const count = db.prepare("SELECT COUNT(*) as c FROM members").get().c;
  const color = COLORS[count % COLORS.length];
  const result = db.prepare("INSERT INTO members (name, color_bg) VALUES (?, ?)").run(name.trim(), color);
  return { id: result.lastInsertRowid, name: name.trim(), color: { bg: color }, dates: [], skills: [] };
}

export function removeMember(id) {
  return db.prepare("DELETE FROM members WHERE id = ?").run(id);
}

export function updateDates(id, dates) {
  return db.prepare("UPDATE members SET dates = ? WHERE id = ?").run(JSON.stringify(dates), id);
}

export function updateSkills(id, skills) {
  return db.prepare("UPDATE members SET skills = ? WHERE id = ?").run(JSON.stringify(skills), id);
}

export function getSkills() {
  return db.prepare("SELECT * FROM skills ORDER BY sort_order, id").all().map(s => ({
    id: s.id,
    name: s.name,
    icon: s.icon,
    desc: s.description,
    isDefault: !!s.is_default,
  }));
}

export function addSkill(name, desc) {
  const id = `custom-${Date.now()}`;
  const maxOrder = db.prepare("SELECT MAX(sort_order) as m FROM skills").get().m || 0;
  db.prepare("INSERT INTO skills (id, name, icon, description, is_default, sort_order) VALUES (?, ?, '📋', ?, 0, ?)")
    .run(id, name.trim(), desc?.trim() || "Custom skill", maxOrder + 1);
  return { id, name: name.trim(), icon: "📋", desc: desc?.trim() || "Custom skill", isDefault: false };
}

export function removeSkill(id) {
  // Only allow removing non-default skills
  const skill = db.prepare("SELECT is_default FROM skills WHERE id = ?").get(id);
  if (skill?.is_default) return { error: "Cannot remove default skills" };
  db.prepare("DELETE FROM skills WHERE id = ?").run(id);
  // Clean from all members
  const members = db.prepare("SELECT id, skills FROM members").all();
  const update = db.prepare("UPDATE members SET skills = ? WHERE id = ?");
  members.forEach(m => {
    const skills = JSON.parse(m.skills).filter(s => s !== id);
    update.run(JSON.stringify(skills), m.id);
  });
  return { ok: true };
}

export function resetAll() {
  db.prepare("DELETE FROM members").run();
  db.prepare("DELETE FROM skills WHERE is_default = 0").run();
}

export default db;
