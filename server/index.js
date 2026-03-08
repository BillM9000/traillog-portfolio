import express from "express";
import cors from "cors";
import { getMembers, addMember, removeMember, updateDates, updateSkills, getSkills, addSkill, removeSkill, resetAll } from "./db.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3614;
const ADMIN_PIN = process.env.ADMIN_PIN || "614";

app.use(cors());
app.use(express.json());

// Serve static frontend in production
app.use(express.static(join(__dirname, "../client/dist")));

// ── Admin check middleware ──
function requireAdmin(req, res, next) {
  const pin = req.headers["x-admin-pin"] || req.body?.pin;
  if (pin !== ADMIN_PIN) return res.status(403).json({ error: "Invalid admin PIN" });
  next();
}

// ── Members ──
app.get("/api/members", (req, res) => {
  try { res.json(getMembers()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/members", requireAdmin, (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name required" });
    const member = addMember(name);
    res.status(201).json(member);
  } catch (e) {
    if (e.message.includes("UNIQUE")) return res.status(409).json({ error: "Name already exists" });
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/members/:id", requireAdmin, (req, res) => {
  try { removeMember(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/members/:id/dates", (req, res) => {
  try {
    const { dates } = req.body;
    if (!Array.isArray(dates)) return res.status(400).json({ error: "dates must be array" });
    updateDates(req.params.id, dates);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/members/:id/skills", (req, res) => {
  try {
    const { skills } = req.body;
    if (!Array.isArray(skills)) return res.status(400).json({ error: "skills must be array" });
    updateSkills(req.params.id, skills);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Skills ──
app.get("/api/skills", (req, res) => {
  try { res.json(getSkills()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/skills", requireAdmin, (req, res) => {
  try {
    const { name, desc } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name required" });
    const skill = addSkill(name, desc);
    res.status(201).json(skill);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/skills/:id", requireAdmin, (req, res) => {
  try {
    const result = removeSkill(req.params.id);
    if (result.error) return res.status(400).json(result);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Admin: verify pin ──
app.post("/api/admin/verify", (req, res) => {
  const { pin } = req.body;
  res.json({ valid: pin === ADMIN_PIN });
});

// ── Admin: reset ──
app.post("/api/admin/reset", requireAdmin, (req, res) => {
  try { resetAll(); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "../client/dist/index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Crew 614 server running on port ${PORT}`);
});
